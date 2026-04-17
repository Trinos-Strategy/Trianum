// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "../interfaces/IEscrowBridge.sol";
import "../libraries/DataStructures.sol";

/**
 * @title EscrowBridge
 * @notice XRPL native escrow integration via Axelar GMP
 * @dev MAX_RETRY = 5, Fee rate = 300 bps (3%).
 */
contract EscrowBridge is AccessControlUpgradeable, UUPSUpgradeable, AxelarExecutable, IEscrowBridge {

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE"); // KlerosCore

    uint256 public constant MAX_RETRY = 5;
    uint256 public constant FEE_RATE_BPS = 300; // 3%

    address public klerosCore;

    mapping(bytes32 => DataStructures.Escrow) private escrows;
    mapping(uint256 => bytes32) private disputeToEscrow;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() AxelarExecutable(address(0)) { _disableInitializers(); }

    function initialize(address _klerosCore, address _gateway, address _admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _klerosCore);
        klerosCore = _klerosCore;
        // NOTE: AxelarExecutable.gateway_ is immutable; for upgradeable pattern, gateway must be handled separately.
        // TODO: store _gateway in a state variable for Axelar calls
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function registerEscrow(
        bytes32 _escrowID,
        uint256 _amount,
        address _claimant,
        address _respondent,
        uint96 _courtId,
        bytes32 _xrplCondition
    ) external override onlyRole(OPERATOR_ROLE) {
        // TODO: store escrow, emit EscrowRegistered
        revert("Not implemented");
    }

    function releaseFunds(bytes32 _escrowID, address _winner) external override onlyRole(OPERATOR_ROLE) {
        // TODO: send GMP message to XRPL via Axelar gateway
        revert("Not implemented");
    }

    function refundFunds(bytes32 _escrowID) external override onlyRole(OPERATOR_ROLE) {
        // TODO: send refund GMP message to XRPL
        revert("Not implemented");
    }

    function retryRelease(bytes32 _escrowID) external override {
        // TODO: require retryCount < MAX_RETRY
        revert("Not implemented");
    }

    // Axelar inbound
    function _execute(
        string calldata /*sourceChain*/,
        string calldata /*sourceAddress*/,
        bytes calldata /*payload*/
    ) internal override {
        // TODO: handle ack from XRPL (Executed / Failed), update escrow status
    }

    // Views
    function getEscrow(bytes32 _escrowID) external view override returns (DataStructures.Escrow memory) {
        return escrows[_escrowID];
    }

    function getRetryCount(bytes32 _escrowID) external view override returns (uint256) {
        return escrows[_escrowID].retryCount;
    }
}
