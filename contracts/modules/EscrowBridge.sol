// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import "../interfaces/IEscrowBridge.sol";

/**
 * @title EscrowBridge
 * @notice Cross-chain escrow bridge between the XRPL EVM Sidechain and XRPL Mainnet.
 * @dev Uses Axelar General Message Passing (GMP). Does NOT inherit `AxelarExecutable`
 *      because its immutable `gateway` state is incompatible with UUPS proxy
 *      initialization. The gateway is stored as a normal state variable and the
 *      receive path is re-implemented as a manual `execute()` entry point that
 *      validates the incoming command via `gateway.validateContractCall`.
 *
 * Lifecycle:
 *   XRPL EscrowCreate ──GMP──▶ `execute()` ──▶ `_registerEscrow()` (status = Registered)
 *   KlerosCore ruling ──▶ `releaseFunds()` / `refundFunds()` (status = ReleaseRequested / RefundRequested)
 *       └── `gateway.callContract(xrpl, xrplDestinationContract, payload)`
 *   Off-chain relayer ──▶ XRPL EscrowFinish or EscrowCancel
 *
 * Retry:
 *   `retryRelease()` is permissionless, up to MAX_RETRIES. If the retry counter
 *   reaches MAX_RETRIES, the escrow is marked `Failed` and a Guardian must
 *   manually resolve it via `resolveManually()`.
 */
contract EscrowBridge is
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IEscrowBridge
{
    // ══════════════════════════════════════════════
    //                  CONSTANTS
    // ══════════════════════════════════════════════

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant KLEROS_CORE_ROLE = keccak256("KLEROS_CORE_ROLE");
    bytes32 public constant GATEWAY_ROLE = keccak256("GATEWAY_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint256 public constant MAX_RETRIES = 3;
    uint256 public constant FEE_RATE_BPS = 300; // 3% (informational; computed elsewhere)

    /// @dev RELEASE / REFUND action markers embedded in GMP payload for off-chain handlers.
    bytes32 public constant ACTION_RELEASE = keccak256("RELEASE");
    bytes32 public constant ACTION_REFUND = keccak256("REFUND");

    // ══════════════════════════════════════════════
    //                   TYPES
    // ══════════════════════════════════════════════

    enum EscrowStatus {
        None,               // 0
        Registered,         // 1
        ReleaseRequested,   // 2
        Released,           // 3
        RefundRequested,    // 4
        Refunded,           // 5
        Failed              // 6 — needs Guardian intervention
    }

    struct EscrowInfo {
        uint256 disputeID;
        uint256 amount;
        address claimant;
        address respondent;
        EscrowStatus status;
        uint256 retryCount;
        bytes32 lastCommandId;   // Axelar command ID (when received via execute())
        address winner;          // non-zero when ReleaseRequested/Released
        bytes lastPayload;       // cached GMP payload for retry
    }

    // ══════════════════════════════════════════════
    //                   STATE
    // ══════════════════════════════════════════════

    IAxelarGateway public gateway;
    string public xrplChainName;
    string public xrplDestinationContract;

    mapping(bytes32 => EscrowInfo) private _escrows;
    mapping(uint256 => bytes32) public escrowToDispute;  // disputeID -> escrowID (reverse lookup)

    // ══════════════════════════════════════════════
    //                   ERRORS
    // ══════════════════════════════════════════════

    error ZeroAddress();
    error EmptyString();
    error EscrowAlreadyRegistered(bytes32 escrowID);
    error EscrowNotRegistered(bytes32 escrowID);
    error InvalidStatusTransition(bytes32 escrowID, EscrowStatus current, EscrowStatus target);
    error WinnerNotParty(bytes32 escrowID, address winner);
    error RetryLimitReached(bytes32 escrowID, uint256 retryCount);
    error NotRetryable(bytes32 escrowID, EscrowStatus status);
    error GatewayValidationFailed(bytes32 commandId);
    error ManualResolutionInvalid(EscrowStatus current, EscrowStatus target);

    // ══════════════════════════════════════════════
    //              CONSTRUCTOR + INIT
    // ══════════════════════════════════════════════

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    /**
     * @param _admin initial admin (also gets ADMIN_ROLE + GUARDIAN_ROLE)
     * @param _gateway Axelar Gateway contract address (EVM Sidechain)
     * @param _klerosCore KlerosCore proxy address (will be granted KLEROS_CORE_ROLE)
     * @param _xrplChainName Axelar chain identifier for XRPL (e.g. "xrpl")
     * @param _xrplDestinationContract XRPL-side relayer address (Axelar destination string)
     */
    function initialize(
        address _admin,
        address _gateway,
        address _klerosCore,
        string calldata _xrplChainName,
        string calldata _xrplDestinationContract
    ) external initializer {
        if (_admin == address(0) || _gateway == address(0) || _klerosCore == address(0))
            revert ZeroAddress();
        if (bytes(_xrplChainName).length == 0 || bytes(_xrplDestinationContract).length == 0)
            revert EmptyString();

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
        _grantRole(GATEWAY_ROLE, _admin); // admin can also act as relayer in MVP
        _grantRole(KLEROS_CORE_ROLE, _klerosCore);

        gateway = IAxelarGateway(_gateway);
        xrplChainName = _xrplChainName;
        xrplDestinationContract = _xrplDestinationContract;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ══════════════════════════════════════════════
    //              REGISTRATION
    // ══════════════════════════════════════════════

    /// @inheritdoc IEscrowBridge
    function registerEscrow(
        bytes32 _escrowID,
        uint256 _disputeID,
        uint256 _amount,
        address _claimant,
        address _respondent
    ) external override onlyRole(GATEWAY_ROLE) {
        _registerEscrow(_escrowID, _disputeID, _amount, _claimant, _respondent, bytes32(0));
    }

    /**
     * @notice Axelar GMP receive handler (manual implementation of `_execute`).
     * @dev Callable by anyone: validity is enforced by `gateway.validateContractCall`.
     *      Payload: abi.encode(bytes32 escrowID, uint256 disputeID, uint256 amount,
     *                          address claimant, address respondent).
     */
    function execute(
        bytes32 _commandId,
        string calldata _sourceChain,
        string calldata _sourceAddress,
        bytes calldata _payload
    ) external {
        bool ok = gateway.validateContractCall(
            _commandId,
            _sourceChain,
            _sourceAddress,
            keccak256(_payload)
        );
        if (!ok) revert GatewayValidationFailed(_commandId);

        (
            bytes32 escrowID,
            uint256 disputeID,
            uint256 amount,
            address claimant,
            address respondent
        ) = abi.decode(_payload, (bytes32, uint256, uint256, address, address));

        _registerEscrow(escrowID, disputeID, amount, claimant, respondent, _commandId);
    }

    function _registerEscrow(
        bytes32 _escrowID,
        uint256 _disputeID,
        uint256 _amount,
        address _claimant,
        address _respondent,
        bytes32 _commandId
    ) internal {
        EscrowInfo storage e = _escrows[_escrowID];
        if (e.status != EscrowStatus.None) revert EscrowAlreadyRegistered(_escrowID);
        if (_claimant == address(0) || _respondent == address(0)) revert ZeroAddress();

        e.disputeID = _disputeID;
        e.amount = _amount;
        e.claimant = _claimant;
        e.respondent = _respondent;
        e.status = EscrowStatus.Registered;
        e.lastCommandId = _commandId;

        escrowToDispute[_disputeID] = _escrowID;

        emit EscrowRegistered(_escrowID, _disputeID, _amount, _claimant, _respondent);
    }

    // ══════════════════════════════════════════════
    //          RELEASE / REFUND (KlerosCore only)
    // ══════════════════════════════════════════════

    /// @inheritdoc IEscrowBridge
    function releaseFunds(bytes32 _escrowID, address _winner)
        external
        override
        onlyRole(KLEROS_CORE_ROLE)
        nonReentrant
    {
        EscrowInfo storage e = _escrows[_escrowID];
        if (e.status == EscrowStatus.None) revert EscrowNotRegistered(_escrowID);
        if (e.status != EscrowStatus.Registered)
            revert InvalidStatusTransition(_escrowID, e.status, EscrowStatus.ReleaseRequested);
        if (_winner != e.claimant && _winner != e.respondent)
            revert WinnerNotParty(_escrowID, _winner);

        e.status = EscrowStatus.ReleaseRequested;
        e.winner = _winner;
        bytes memory payload = abi.encode(_escrowID, _winner, ACTION_RELEASE);
        e.lastPayload = payload;

        gateway.callContract(xrplChainName, xrplDestinationContract, payload);

        emit FundsReleaseRequested(_escrowID, e.disputeID, _winner, e.amount);
    }

    /// @inheritdoc IEscrowBridge
    function refundFunds(bytes32 _escrowID)
        external
        override
        onlyRole(KLEROS_CORE_ROLE)
        nonReentrant
    {
        EscrowInfo storage e = _escrows[_escrowID];
        if (e.status == EscrowStatus.None) revert EscrowNotRegistered(_escrowID);
        if (e.status != EscrowStatus.Registered)
            revert InvalidStatusTransition(_escrowID, e.status, EscrowStatus.RefundRequested);

        e.status = EscrowStatus.RefundRequested;
        bytes memory payload = abi.encode(_escrowID, address(0), ACTION_REFUND);
        e.lastPayload = payload;

        gateway.callContract(xrplChainName, xrplDestinationContract, payload);

        emit FundsRefundRequested(_escrowID, e.disputeID);
    }

    // ══════════════════════════════════════════════
    //              RETRY + MANUAL RESOLUTION
    // ══════════════════════════════════════════════

    /// @inheritdoc IEscrowBridge
    function retryRelease(bytes32 _escrowID) external override nonReentrant {
        EscrowInfo storage e = _escrows[_escrowID];
        if (e.status != EscrowStatus.ReleaseRequested && e.status != EscrowStatus.RefundRequested)
            revert NotRetryable(_escrowID, e.status);
        if (e.retryCount >= MAX_RETRIES) revert RetryLimitReached(_escrowID, e.retryCount);

        e.retryCount += 1;

        // Re-send the cached payload
        gateway.callContract(xrplChainName, xrplDestinationContract, e.lastPayload);
        emit RetryRequested(_escrowID, e.retryCount);

        if (e.retryCount >= MAX_RETRIES) {
            e.status = EscrowStatus.Failed;
            emit EscrowFailed(_escrowID, e.retryCount);
        }
    }

    /**
     * @notice Guardian-only escape hatch to finalize an escrow stuck in Failed.
     * @param _newStatus Must be `Released` or `Refunded`.
     */
    function resolveManually(bytes32 _escrowID, EscrowStatus _newStatus)
        external
        onlyRole(GUARDIAN_ROLE)
    {
        EscrowInfo storage e = _escrows[_escrowID];
        if (e.status != EscrowStatus.Failed)
            revert ManualResolutionInvalid(e.status, _newStatus);
        if (_newStatus != EscrowStatus.Released && _newStatus != EscrowStatus.Refunded)
            revert ManualResolutionInvalid(e.status, _newStatus);

        e.status = _newStatus;
        emit EscrowResolvedManually(_escrowID, uint8(_newStatus), msg.sender);
    }

    // ══════════════════════════════════════════════
    //                   VIEWS
    // ══════════════════════════════════════════════

    /// @inheritdoc IEscrowBridge
    function getEscrow(bytes32 _escrowID)
        external
        view
        override
        returns (uint256 disputeID, uint256 amount, address claimant, address respondent, bool released)
    {
        EscrowInfo storage e = _escrows[_escrowID];
        return (
            e.disputeID,
            e.amount,
            e.claimant,
            e.respondent,
            e.status == EscrowStatus.Released
        );
    }

    /// @inheritdoc IEscrowBridge
    function getRetryCount(bytes32 _escrowID) external view override returns (uint256) {
        return _escrows[_escrowID].retryCount;
    }

    /// @inheritdoc IEscrowBridge
    function getEscrowStatus(bytes32 _escrowID) external view override returns (uint8) {
        return uint8(_escrows[_escrowID].status);
    }

    /// @notice Full escrow struct for advanced frontend queries.
    function getEscrowFull(bytes32 _escrowID) external view returns (EscrowInfo memory) {
        return _escrows[_escrowID];
    }

    // ══════════════════════════════════════════════
    //              ADMIN
    // ══════════════════════════════════════════════

    function setKlerosCore(address _klerosCore) external onlyRole(ADMIN_ROLE) {
        if (_klerosCore == address(0)) revert ZeroAddress();
        _grantRole(KLEROS_CORE_ROLE, _klerosCore);
    }

    function revokeKlerosCore(address _klerosCore) external onlyRole(ADMIN_ROLE) {
        _revokeRole(KLEROS_CORE_ROLE, _klerosCore);
    }

    function setGateway(address _gateway) external onlyRole(ADMIN_ROLE) {
        if (_gateway == address(0)) revert ZeroAddress();
        gateway = IAxelarGateway(_gateway);
    }

    function setChainConfig(string calldata _xrplChainName, string calldata _xrplDestinationContract)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (bytes(_xrplChainName).length == 0 || bytes(_xrplDestinationContract).length == 0)
            revert EmptyString();
        xrplChainName = _xrplChainName;
        xrplDestinationContract = _xrplDestinationContract;
    }
}
