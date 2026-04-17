// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IKKlerosTimelock.sol";

/**
 * @title KKlerosTimelock
 * @notice Governance timelock — delayed execution (24h ~ 14d)
 */
contract KKlerosTimelock is AccessControlUpgradeable, UUPSUpgradeable, IKKlerosTimelock {

    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    uint256 public constant override MIN_DELAY = 24 hours;
    uint256 public constant override MAX_DELAY = 14 days;

    mapping(bytes32 => uint256) public queuedAt; // txHash => eta

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GOVERNOR_ROLE, _admin);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function queueTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 delay
    ) external override onlyRole(GOVERNOR_ROLE) returns (bytes32) {
        // TODO: require delay between MIN_DELAY and MAX_DELAY, store eta
        revert("Not implemented");
    }

    function executeTransaction(
        address target,
        uint256 value,
        bytes calldata data
    ) external override onlyRole(GOVERNOR_ROLE) {
        // TODO: require block.timestamp >= queuedAt[txHash], call target
        revert("Not implemented");
    }

    function cancelTransaction(bytes32 txHash) external override onlyRole(GOVERNOR_ROLE) {
        // TODO: delete queuedAt[txHash], emit TransactionCancelled
        revert("Not implemented");
    }
}
