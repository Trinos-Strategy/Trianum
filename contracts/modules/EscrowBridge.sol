// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import "../interfaces/IEscrowBridge.sol";
import "../libraries/DataStructures.sol";

/**
 * @title EscrowBridge
 * @notice Axelar GMP bridge for XRPL↔EVM escrow operations
 * @dev Does NOT extend AxelarExecutable to avoid immutable/UUPS conflict.
 *      Instead stores gateway & gasService as regular storage variables.
 *      MAX_RETRY = 5, FEE_RATE = 300 bps (3%).
 */
contract EscrowBridge is
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IEscrowBridge
{
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    uint256 public constant MAX_RETRY = 5;
    uint256 public constant FEE_RATE_BPS = 300; // 3%

    IAxelarGateway public gateway;
    IAxelarGasService public gasService;

    mapping(bytes32 => DataStructures.Escrow) private _escrows;
    mapping(uint256 => bytes32) private _disputeToEscrow;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _gateway,
        address _gasService,
        address _admin
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        gateway = IAxelarGateway(_gateway);
        gasService = IAxelarGasService(_gasService);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ── IEscrowBridge ──
    function createEscrow(uint256 _disputeID, address _claimant, address _respondent, uint256 _amount) external override onlyRole(OPERATOR_ROLE) returns (bytes32) {
        // TODO: implement
        revert("Not implemented");
    }

    function releaseEscrow(bytes32 _escrowID) external override onlyRole(OPERATOR_ROLE) {
        // TODO: implement
        revert("Not implemented");
    }

    function refundEscrow(bytes32 _escrowID) external override onlyRole(OPERATOR_ROLE) {
        // TODO: implement
        revert("Not implemented");
    }

    function splitEscrow(bytes32 _escrowID, uint256 _claimantShare, uint256 _respondentShare) external override onlyRole(OPERATOR_ROLE) {
        // TODO: implement
        revert("Not implemented");
    }

    function bridgeToXRPL(bytes32 _escrowID) external override onlyRole(BRIDGE_ROLE) {
        // TODO: implement — call gateway.callContract() via Axelar GMP
        revert("Not implemented");
    }

    function getEscrow(bytes32 _escrowID) external view override returns (DataStructures.Escrow memory) {
        return _escrows[_escrowID];
    }

    function getEscrowByDispute(uint256 _disputeID) external view override returns (DataStructures.Escrow memory) {
        return _escrows[_disputeToEscrow[_disputeID]];
    }

    // ── Axelar incoming call handler (replaces AxelarExecutable._execute) ──
    function execute(
        bytes32 _commandId,
        string calldata _sourceChain,
        string calldata _sourceAddress,
        bytes calldata _payload
    ) external {
        require(gateway.validateContractCall(_commandId, _sourceChain, _sourceAddress, keccak256(_payload)), "Not approved by gateway");
        // TODO: decode payload and process incoming XRPL escrow events
    }
}
