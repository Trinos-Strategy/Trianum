// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IKlerosCore.sol";
import "../libraries/DataStructures.sol";

// Forward declarations for external module interfaces
interface IDisputeKitLink {
    function startVoting(uint256 _disputeID, address[] calldata _jurors, uint256 _roundNumber) external;
    function tallyVotes(uint256 _disputeID) external returns (uint256 ruling);
}

interface ISortitionModuleLink {
    function draw(uint256 _disputeID, uint96 _courtID, uint256 _count, uint256 _nonce) external returns (address[] memory jurors);
    function penalize(address _juror, uint256 _disputeID) external returns (uint256 slashedAmount);
    function reward(address _juror, uint256 _disputeID, uint256 _amount) external;
}

interface IEscrowBridgeLink {
    function releaseFunds(bytes32 _escrowID, address _winner) external;
    function refundFunds(bytes32 _escrowID) external;
}

/**
 * @title KlerosCore
 * @notice K-Kleros 메인 중재 허브 — 분쟁 생성부터 판정 자동 집행까지
 * @dev UUPS proxy. Coordinates DisputeKit, SortitionModule, EscrowBridge.
 *
 * State Machine:
 *   None → Created → Evidence → DualAward → Commit → Reveal → Resolved → Appealable → Executed
 *                                                                              ↓
 *                                                                          Appealed → Commit (expanded jury)
 *
 * Fee Structure (3% of dispute amount):
 *   - Arbitrator: 1.0%  (100 bps)
 *   - Juror Pool: 1.2%  (120 bps)
 *   - DAO Treasury: 0.5% (50 bps)
 *   - Operations: 0.3%  (30 bps)
 *   - Minimum: 10 XRP equivalent
 *
 * Appeal: 7 days, 2n+1 jury expansion, max 3 rounds, cost doubles per round
 */
contract KlerosCore is
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    IKlerosCore
{
    // ══════════════════════════════════════════════
    //                  CONSTANTS
    // ══════════════════════════════════════════════

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ARBITRATOR_PANEL_ROLE = keccak256("ARBITRATOR_PANEL_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    /// @dev Fee distribution basis points (total = 300 bps = 3%)
    uint256 public constant FEE_ARBITRATOR_BPS = 100;   // 1.0%
    uint256 public constant FEE_JUROR_POOL_BPS = 120;   // 1.2%
    uint256 public constant FEE_DAO_TREASURY_BPS = 50;   // 0.5%
    uint256 public constant FEE_OPERATIONS_BPS = 30;     // 0.3%
    uint256 public constant TOTAL_FEE_BPS = 300;         // 3.0%
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @dev Minimum fee in wei (10 XRP ≈ 10e18 wei on XRPL EVM Sidechain)
    uint256 public constant MIN_FEE = 10 ether;

    /// @dev Time parameters
    uint256 public constant EVIDENCE_PERIOD = 14 days;
    uint256 public constant DUAL_AWARD_PERIOD = 21 days;
    uint256 public constant COMMIT_PERIOD = 48 hours;
    uint256 public constant REVEAL_PERIOD = 24 hours;
    uint256 public constant SIGNING_PERIOD = 3 days;
    uint256 public constant APPEAL_PERIOD = 7 days;

    /// @dev Appeal limits
    uint256 public constant MAX_APPEAL_ROUNDS = 3;

    /// @dev Number of choices in K-Kleros (AwardA=1, AwardB=2; 0=Refused)
    uint256 public constant NUM_CHOICES = 2;

    // ══════════════════════════════════════════════
    //                  STATE VARIABLES
    // ══════════════════════════════════════════════

    /// @dev External module references
    IDisputeKitLink public disputeKit;
    ISortitionModuleLink public sortitionModule;
    IEscrowBridgeLink public escrowBridge;

    /// @dev Fee recipient addresses
    address public daoTreasury;
    address public operationsWallet;

    /// @dev Dispute storage
    uint256 private _disputeCount;
    mapping(uint256 => DataStructures.Dispute) private _disputes;

    /// @dev Court configurations
    mapping(DataStructures.CourtType => DataStructures.CourtConfig) private _courtConfigs;

    /// @dev Draw nonce for randomness
    uint256 private _drawNonce;

    /// @dev Dispute parties (for appeal eligibility)
    mapping(uint256 => address) private _disputeClaimant;
    mapping(uint256 => address) private _disputeRespondent;

    // ══════════════════════════════════════════════
    //                  ERRORS
    // ══════════════════════════════════════════════

    error InvalidChoices(uint256 choices);
    error InsufficientFee(uint256 sent, uint256 required);
    error InsufficientDisputeAmount();
    error InvalidDisputeID(uint256 disputeID);
    error InvalidStatusTransition(DataStructures.DisputeStatus current, DataStructures.DisputeStatus target);
    error NotArbitratorOfDispute(uint256 disputeID, address caller);
    error NotPartyOfDispute(uint256 disputeID, address caller);
    error AppealLimitReached(uint256 disputeID, uint256 currentRound);
    error AppealPeriodNotStarted(uint256 disputeID);
    error AppealPeriodExpired(uint256 disputeID);
    error AppealPeriodNotExpired(uint256 disputeID);
    error SigningPeriodExpired(uint256 disputeID);
    error AlreadySigned(uint256 disputeID);
    error CourtNotActive(DataStructures.CourtType courtType);
    error ZeroAddress();

    // ══════════════════════════════════════════════
    //                  MODIFIERS
    // ══════════════════════════════════════════════

    modifier onlyValidDispute(uint256 _disputeID) {
        if (_disputeID >= _disputeCount) revert InvalidDisputeID(_disputeID);
        _;
    }

    modifier onlyStatus(uint256 _disputeID, DataStructures.DisputeStatus _expected) {
        if (_disputes[_disputeID].status != _expected)
            revert InvalidStatusTransition(_disputes[_disputeID].status, _expected);
        _;
    }

    modifier onlyDisputeArbitrator(uint256 _disputeID) {
        if (_disputes[_disputeID].arbitrator != msg.sender)
            revert NotArbitratorOfDispute(_disputeID, msg.sender);
        _;
    }

    modifier onlyDisputeParty(uint256 _disputeID) {
        if (msg.sender != _disputeClaimant[_disputeID] && msg.sender != _disputeRespondent[_disputeID])
            revert NotPartyOfDispute(_disputeID, msg.sender);
        _;
    }

    // ══════════════════════════════════════════════
    //              CONSTRUCTOR + INIT
    // ══════════════════════════════════════════════

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _admin,
        address _disputeKit,
        address _sortitionModule,
        address _escrowBridge,
        address _daoTreasury,
        address _operationsWallet
    ) external initializer {
        if (_admin == address(0) || _disputeKit == address(0) || _sortitionModule == address(0) ||
            _escrowBridge == address(0) || _daoTreasury == address(0) || _operationsWallet == address(0))
            revert ZeroAddress();

        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(ARBITRATOR_PANEL_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);

        disputeKit = IDisputeKitLink(_disputeKit);
        sortitionModule = ISortitionModuleLink(_sortitionModule);
        escrowBridge = IEscrowBridgeLink(_escrowBridge);
        daoTreasury = _daoTreasury;
        operationsWallet = _operationsWallet;

        // Initialize default court configs
        _courtConfigs[DataStructures.CourtType.General] = DataStructures.CourtConfig({
            minJurors: 3, minStake: 1000 ether, feePerJuror: 0, active: true
        });
        _courtConfigs[DataStructures.CourtType.DeFi] = DataStructures.CourtConfig({
            minJurors: 5, minStake: 5000 ether, feePerJuror: 0, active: true
        });
        _courtConfigs[DataStructures.CourtType.NFT] = DataStructures.CourtConfig({
            minJurors: 3, minStake: 1000 ether, feePerJuror: 0, active: true
        });
        _courtConfigs[DataStructures.CourtType.DAO] = DataStructures.CourtConfig({
            minJurors: 7, minStake: 10000 ether, feePerJuror: 0, active: true
        });
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ══════════════════════════════════════════════
    //          IArbitrator (ERC-792) CORE
    // ══════════════════════════════════════════════

    /**
     * @notice 분쟁 생성 (IArbitrator)
     * @param _choices 선택지 수 (K-Kleros에서는 항상 2)
     * @param _extraData ABI(CourtType courtType, bytes32 escrowID, address claimant, address respondent, uint256 disputeAmount)
     * @return disputeID 생성된 분쟁 ID
     */
    function createDispute(uint256 _choices, bytes calldata _extraData)
        external
        payable
        override
        nonReentrant
        whenNotPaused
        returns (uint256 disputeID)
    {
        if (_choices != NUM_CHOICES) revert InvalidChoices(_choices);

        // Decode extra data
        (
            DataStructures.CourtType courtType,
            bytes32 escrowID,
            address claimant,
            address respondent,
            uint256 disputeAmount
        ) = abi.decode(_extraData, (DataStructures.CourtType, bytes32, address, address, uint256));

        // Validate court
        if (!_courtConfigs[courtType].active) revert CourtNotActive(courtType);

        // Validate minimum dispute amount
        if (disputeAmount == 0) revert InsufficientDisputeAmount();

        // Calculate and validate fee
        uint256 requiredFee = _calculateFee(disputeAmount);
        if (msg.value < requiredFee) revert InsufficientFee(msg.value, requiredFee);

        // Create dispute
        disputeID = _disputeCount++;
        DataStructures.Dispute storage d = _disputes[disputeID];
        d.arbitrable = msg.sender;
        d.courtType = courtType;
        d.status = DataStructures.DisputeStatus.Created;
        d.disputeAmount = disputeAmount;
        d.createdAt = block.timestamp;
        d.escrowID = escrowID;
        d.lastStatusChangeAt = block.timestamp;

        // Store parties
        _disputeClaimant[disputeID] = claimant;
        _disputeRespondent[disputeID] = respondent;

        // Distribute fees
        _distributeFees(disputeAmount, requiredFee, address(0)); // No arbitrator yet

        // Refund excess
        if (msg.value > requiredFee) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - requiredFee}("");
            require(refundSuccess, "Refund failed");
        }

        emit DisputeCreated(disputeID, msg.sender, courtType, disputeAmount, escrowID);
        emit DisputeCreation(disputeID, msg.sender); // ERC-792 event

        return disputeID;
    }

    /**
     * @notice 중재 비용 조회 (IArbitrator)
     * @param _extraData ABI(CourtType, ...) — only first field used
     */
    function arbitrationCost(bytes calldata _extraData)
        external
        view
        override
        returns (uint256 cost)
    {
        // For cost estimation, decode just the court type
        // Actual cost depends on disputeAmount which may not be known yet
        // Return minimum fee as baseline
        return MIN_FEE;
    }

    /**
     * @notice 항소 (IArbitrator)
     * @param _disputeID 분쟁 ID
     * @param _extraData 미사용 (reserved)
     */
    function appeal(uint256 _disputeID, bytes calldata _extraData)
        external
        payable
        override
        nonReentrant
        onlyValidDispute(_disputeID)
        onlyStatus(_disputeID, DataStructures.DisputeStatus.Appealable)
        onlyDisputeParty(_disputeID)
    {
        DataStructures.Dispute storage d = _disputes[_disputeID];

        // Check appeal limit
        if (d.appealCount >= MAX_APPEAL_ROUNDS)
            revert AppealLimitReached(_disputeID, d.appealCount);

        // Check appeal period
        uint256 appealStart = d.lastStatusChangeAt;
        uint256 appealEnd = appealStart + APPEAL_PERIOD;
        if (block.timestamp < appealStart) revert AppealPeriodNotStarted(_disputeID);
        if (block.timestamp > appealEnd) revert AppealPeriodExpired(_disputeID);

        // Calculate appeal cost (doubles per round)
        uint256 cost = _calculateAppealCost(_disputeID);
        if (msg.value < cost) revert InsufficientFee(msg.value, cost);

        // Update state
        d.appealCount++;
        d.arbitratorSigned = false; // Reset for new round
        _changeStatus(_disputeID, DataStructures.DisputeStatus.Appealed);

        // Refund excess
        if (msg.value > cost) {
            (bool success, ) = msg.sender.call{value: msg.value - cost}("");
            require(success, "Refund failed");
        }

        emit AppealRaised(_disputeID, d.appealCount, msg.sender);
        emit AppealDecision(_disputeID, d.arbitrable); // ERC-792

        // Immediately draw expanded jury and start new voting round
        _startAppealRound(_disputeID);
    }

    /**
     * @notice 항소 비용 조회
     */
    function appealCost(uint256 _disputeID, bytes calldata /*_extraData*/)
        external
        view
        override
        onlyValidDispute(_disputeID)
        returns (uint256 cost)
    {
        return _calculateAppealCost(_disputeID);
    }

    /**
     * @notice 항소 기간 조회
     */
    function appealPeriod(uint256 _disputeID)
        external
        view
        override
        onlyValidDispute(_disputeID)
        returns (uint256 start, uint256 end)
    {
        DataStructures.Dispute storage d = _disputes[_disputeID];
        if (d.status != DataStructures.DisputeStatus.Appealable) {
            return (0, 0);
        }
        start = d.lastStatusChangeAt;
        end = start + APPEAL_PERIOD;
    }

    /**
     * @notice 현재 판정 조회
     */
    function currentRuling(uint256 _disputeID)
        external
        view
        override
        onlyValidDispute(_disputeID)
        returns (uint256 ruling)
    {
        return _disputes[_disputeID].ruling;
    }

    // ══════════════════════════════════════════════
    //          K-KLEROS EXTENSION FUNCTIONS
    // ══════════════════════════════════════════════

    /**
     * @notice 중재인 배정 (DAO 패널 또는 Admin)
     * @dev Created → Evidence 전이 포함
     */
    function assignArbitrator(uint256 _disputeID, address _arbitrator)
        external
        override
        onlyValidDispute(_disputeID)
        onlyStatus(_disputeID, DataStructures.DisputeStatus.Created)
        onlyRole(ARBITRATOR_PANEL_ROLE)
    {
        if (_arbitrator == address(0)) revert ZeroAddress();

        DataStructures.Dispute storage d = _disputes[_disputeID];
        d.arbitrator = _arbitrator;
        _changeStatus(_disputeID, DataStructures.DisputeStatus.Evidence);

        emit ArbitratorAssigned(_disputeID, _arbitrator);
    }

    /**
     * @notice 증거 제출
     */
    function submitEvidence(uint256 _disputeID, string calldata _evidenceURI)
        external
        override
        onlyValidDispute(_disputeID)
        onlyStatus(_disputeID, DataStructures.DisputeStatus.Evidence)
    {
        emit EvidenceSubmitted(_disputeID, msg.sender, _evidenceURI);
    }

    /**
     * @notice 증거 기간 종료 → DualAward 단계
     * @dev 중재인이 호출하거나, 14일 경과 시 누구나 호출 가능
     */
    function closeEvidencePeriod(uint256 _disputeID)
        external
        override
        onlyValidDispute(_disputeID)
        onlyStatus(_disputeID, DataStructures.DisputeStatus.Evidence)
    {
        DataStructures.Dispute storage d = _disputes[_disputeID];

        // Arbitrator can close anytime; others only after EVIDENCE_PERIOD
        if (msg.sender != d.arbitrator) {
            require(
                block.timestamp >= d.lastStatusChangeAt + EVIDENCE_PERIOD,
                "Evidence period not yet expired"
            );
        }

        _changeStatus(_disputeID, DataStructures.DisputeStatus.DualAward);
    }

    /**
     * @notice 중재인 서명으로 판정 확정
     * @dev Resolved → Appealable 전이
     *      3일 경과 시 autoConfirm()으로 대체 가능
     */
    function signAward(uint256 _disputeID, bytes calldata _signature)
        external
        override
        onlyValidDispute(_disputeID)
        onlyStatus(_disputeID, DataStructures.DisputeStatus.Resolved)
        onlyDisputeArbitrator(_disputeID)
    {
        DataStructures.Dispute storage d = _disputes[_disputeID];
        if (d.arbitratorSigned) revert AlreadySigned(_disputeID);

        // Verify signing is within period
        if (block.timestamp > d.lastStatusChangeAt + SIGNING_PERIOD)
            revert SigningPeriodExpired(_disputeID);

        // TODO: Verify EIP-712 signature against ruling hash (MVP: trust msg.sender == arbitrator)
        d.arbitratorSigned = true;
        _changeStatus(_disputeID, DataStructures.DisputeStatus.Appealable);

        emit AwardSigned(_disputeID, msg.sender);
        emit AppealPossible(_disputeID, d.arbitrable); // ERC-792
    }

    /**
     * @notice 중재인 서명 지연 시 자동 확정 (permissionless)
     * @dev Edge case §6.5: 3일 경과 시 누구나 호출 → Appealable 전이
     *      중재인 보수 50% DAO 트레저리 환수
     */
    function autoConfirmAward(uint256 _disputeID)
        external
        onlyValidDispute(_disputeID)
        onlyStatus(_disputeID, DataStructures.DisputeStatus.Resolved)
    {
        DataStructures.Dispute storage d = _disputes[_disputeID];
        require(
            block.timestamp > d.lastStatusChangeAt + SIGNING_PERIOD,
            "Signing period not yet expired"
        );

        d.arbitratorSigned = true; // Auto-confirmed
        _changeStatus(_disputeID, DataStructures.DisputeStatus.Appealable);

        // Arbitrator penalty: 50% of arbitrator fee goes to DAO
        // (Already distributed at dispute creation — penalty tracked off-chain in MVP)

        emit AwardSigned(_disputeID, address(0)); // address(0) = auto-confirmed
        emit AppealPossible(_disputeID, d.arbitrable);
    }

    /**
     * @notice 판정 집행 (permissionless)
     * @dev 항소 기간 만료 후 누구나 호출 가능
     *      IArbitrable.rule() 호출 → EscrowBridge 연동
     */
    function executeRuling(uint256 _disputeID)
        external
        override
        nonReentrant
        onlyValidDispute(_disputeID)
        onlyStatus(_disputeID, DataStructures.DisputeStatus.Appealable)
    {
        DataStructures.Dispute storage d = _disputes[_disputeID];

        // Ensure appeal period expired
        if (block.timestamp < d.lastStatusChangeAt + APPEAL_PERIOD)
            revert AppealPeriodNotExpired(_disputeID);

        _changeStatus(_disputeID, DataStructures.DisputeStatus.Executed);

        // Call IArbitrable.rule()
        IArbitrable(d.arbitrable).rule(_disputeID, d.ruling);

        // Execute escrow based on ruling
        if (d.ruling == 1) {
            // Award A: claimant wins
            escrowBridge.releaseFunds(d.escrowID, _disputeClaimant[_disputeID]);
        } else if (d.ruling == 2) {
            // Award B: respondent wins
            escrowBridge.releaseFunds(d.escrowID, _disputeRespondent[_disputeID]);
        } else {
            // Refused (ruling=0): refund both parties
            escrowBridge.refundFunds(d.escrowID);
        }

        emit RulingExecuted(_disputeID, d.ruling, d.arbitrable);
    }

    // ══════════════════════════════════════════════
    //          VOTING LIFECYCLE (called by KC itself)
    // ══════════════════════════════════════════════

    /**
     * @notice DualAward 커밋 후 배심원 추첨 및 투표 시작
     * @dev DualAward → Commit 전이. DisputeKit.commitDualAward() 후에 호출.
     *      Phase 1에서는 Admin이 수동 호출 (DisputeKit에서 콜백 전환 예정)
     */
    function startVotingRound(uint256 _disputeID)
        external
        onlyValidDispute(_disputeID)
        onlyStatus(_disputeID, DataStructures.DisputeStatus.DualAward)
        onlyRole(ADMIN_ROLE)
    {
        _drawJuryAndStartVoting(_disputeID, 0); // Round 0 = original
    }

    /**
     * @notice 투표 집계 트리거 (Reveal 종료 후)
     * @dev Reveal → Resolved 전이
     */
    function triggerTally(uint256 _disputeID)
        external
        onlyValidDispute(_disputeID)
        onlyStatus(_disputeID, DataStructures.DisputeStatus.Reveal)
    {
        // Reveal period must have ended (checked by DisputeKit internally)
        uint256 ruling = disputeKit.tallyVotes(_disputeID);

        DataStructures.Dispute storage d = _disputes[_disputeID];
        d.ruling = ruling;
        _changeStatus(_disputeID, DataStructures.DisputeStatus.Resolved);

        // TODO: Trigger slashing/reward via SortitionModule
        // In MVP, slashing is deferred to a separate batch call
    }

    /**
     * @notice Commit→Reveal 전이 (Commit 기간 만료 후)
     */
    function advanceToReveal(uint256 _disputeID)
        external
        onlyValidDispute(_disputeID)
        onlyStatus(_disputeID, DataStructures.DisputeStatus.Commit)
    {
        // Commit period expiry is validated by time
        DataStructures.Dispute storage d = _disputes[_disputeID];
        require(
            block.timestamp >= d.lastStatusChangeAt + COMMIT_PERIOD,
            "Commit period not yet expired"
        );
        _changeStatus(_disputeID, DataStructures.DisputeStatus.Reveal);
    }

    // ══════════════════════════════════════════════
    //                VIEW FUNCTIONS
    // ══════════════════════════════════════════════

    function getDispute(uint256 _disputeID)
        external view override onlyValidDispute(_disputeID)
        returns (DataStructures.Dispute memory)
    {
        return _disputes[_disputeID];
    }

    function getCourtConfig(DataStructures.CourtType _courtType)
        external view override
        returns (DataStructures.CourtConfig memory)
    {
        return _courtConfigs[_courtType];
    }

    function disputeCount() external view override returns (uint256) {
        return _disputeCount;
    }

    function getDisputeParties(uint256 _disputeID)
        external view onlyValidDispute(_disputeID)
        returns (address claimant, address respondent)
    {
        return (_disputeClaimant[_disputeID], _disputeRespondent[_disputeID]);
    }

    // ══════════════════════════════════════════════
    //              ADMIN FUNCTIONS
    // ══════════════════════════════════════════════

    function setDisputeKit(address _disputeKit) external onlyRole(ADMIN_ROLE) {
        if (_disputeKit == address(0)) revert ZeroAddress();
        disputeKit = IDisputeKitLink(_disputeKit);
    }

    function setSortitionModule(address _sortitionModule) external onlyRole(ADMIN_ROLE) {
        if (_sortitionModule == address(0)) revert ZeroAddress();
        sortitionModule = ISortitionModuleLink(_sortitionModule);
    }

    function setEscrowBridge(address _escrowBridge) external onlyRole(ADMIN_ROLE) {
        if (_escrowBridge == address(0)) revert ZeroAddress();
        escrowBridge = IEscrowBridgeLink(_escrowBridge);
    }

    function setDaoTreasury(address _daoTreasury) external onlyRole(ADMIN_ROLE) {
        if (_daoTreasury == address(0)) revert ZeroAddress();
        daoTreasury = _daoTreasury;
    }

    function setOperationsWallet(address _operationsWallet) external onlyRole(ADMIN_ROLE) {
        if (_operationsWallet == address(0)) revert ZeroAddress();
        operationsWallet = _operationsWallet;
    }

    function updateCourtConfig(
        DataStructures.CourtType _courtType,
        uint256 _minJurors,
        uint256 _minStake,
        uint256 _feePerJuror,
        bool _active
    ) external onlyRole(ADMIN_ROLE) {
        _courtConfigs[_courtType] = DataStructures.CourtConfig({
            minJurors: _minJurors,
            minStake: _minStake,
            feePerJuror: _feePerJuror,
            active: _active
        });
    }

    function pause() external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    // ══════════════════════════════════════════════
    //              INTERNAL FUNCTIONS
    // ══════════════════════════════════════════════

    /**
     * @dev Calculate total fee: max(disputeAmount * 3%, MIN_FEE)
     */
    function _calculateFee(uint256 _disputeAmount) internal pure returns (uint256) {
        uint256 percentFee = (_disputeAmount * TOTAL_FEE_BPS) / BPS_DENOMINATOR;
        return percentFee > MIN_FEE ? percentFee : MIN_FEE;
    }

    /**
     * @dev Distribute collected fee to recipients
     *      Arbitrator share held until arbitrator is assigned
     */
    function _distributeFees(uint256 _disputeAmount, uint256 _totalFee, address _arbitrator) internal {
        uint256 arbitratorShare = (_disputeAmount * FEE_ARBITRATOR_BPS) / BPS_DENOMINATOR;
        uint256 daoShare = (_disputeAmount * FEE_DAO_TREASURY_BPS) / BPS_DENOMINATOR;
        uint256 opsShare = (_disputeAmount * FEE_OPERATIONS_BPS) / BPS_DENOMINATOR;
        // jurorPoolShare = totalFee - arbitratorShare - daoShare - opsShare
        // (held in contract for distribution after voting)

        // Ensure shares don't exceed totalFee when MIN_FEE kicks in
        if (arbitratorShare + daoShare + opsShare > _totalFee) {
            // Proportional distribution at minimum fee
            arbitratorShare = (_totalFee * FEE_ARBITRATOR_BPS) / TOTAL_FEE_BPS;
            daoShare = (_totalFee * FEE_DAO_TREASURY_BPS) / TOTAL_FEE_BPS;
            opsShare = (_totalFee * FEE_OPERATIONS_BPS) / TOTAL_FEE_BPS;
        }

        // Transfer DAO and ops shares immediately
        if (daoShare > 0) {
            (bool s1, ) = daoTreasury.call{value: daoShare}("");
            require(s1, "DAO transfer failed");
        }
        if (opsShare > 0) {
            (bool s2, ) = operationsWallet.call{value: opsShare}("");
            require(s2, "Ops transfer failed");
        }

        // Arbitrator share: if assigned, send now; otherwise held in contract
        if (_arbitrator != address(0) && arbitratorShare > 0) {
            (bool s3, ) = _arbitrator.call{value: arbitratorShare}("");
            require(s3, "Arbitrator transfer failed");
        }

        // Juror pool share remains in contract until voting resolution
    }

    /**
     * @dev Appeal cost: base fee * 2^appealCount
     */
    function _calculateAppealCost(uint256 _disputeID) internal view returns (uint256) {
        DataStructures.Dispute storage d = _disputes[_disputeID];
        uint256 baseFee = _calculateFee(d.disputeAmount);
        return baseFee * (2 ** d.appealCount); // Doubles each round
    }

    /**
     * @dev Change dispute status with event emission
     */
    function _changeStatus(uint256 _disputeID, DataStructures.DisputeStatus _newStatus) internal {
        DataStructures.Dispute storage d = _disputes[_disputeID];
        DataStructures.DisputeStatus oldStatus = d.status;
        d.status = _newStatus;
        d.lastStatusChangeAt = block.timestamp;
        emit DisputeStatusChanged(_disputeID, oldStatus, _newStatus);
    }

    /**
     * @dev Draw jury and start voting via DisputeKit
     * @param _roundNumber 0 for original, 1+ for appeal rounds
     */
    function _drawJuryAndStartVoting(uint256 _disputeID, uint256 _roundNumber) internal {
        DataStructures.Dispute storage d = _disputes[_disputeID];
        DataStructures.CourtConfig storage cc = _courtConfigs[d.courtType];

        // Calculate jury size: original = minJurors, appeal = 2*previous+1
        uint256 jurySize = cc.minJurors;
        for (uint256 i = 0; i < _roundNumber; i++) {
            jurySize = 2 * jurySize + 1;
        }

        // Draw jurors via SortitionModule
        _drawNonce++;
        address[] memory jurors = sortitionModule.draw(
            _disputeID,
            uint96(uint256(d.courtType)),
            jurySize,
            _drawNonce
        );

        // Start voting in DisputeKit
        disputeKit.startVoting(_disputeID, jurors, _roundNumber);

        // Transition to Commit
        _changeStatus(_disputeID, DataStructures.DisputeStatus.Commit);
    }

    /**
     * @dev Start appeal round: draw expanded jury and begin new voting
     */
    function _startAppealRound(uint256 _disputeID) internal {
        DataStructures.Dispute storage d = _disputes[_disputeID];
        d.ruling = 0; // Reset ruling for new round
        _drawJuryAndStartVoting(_disputeID, d.appealCount);
    }

    /**
     * @dev Receive ETH (for fee payments)
     */
    receive() external payable {}
}
