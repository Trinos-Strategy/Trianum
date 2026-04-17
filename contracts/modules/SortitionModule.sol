// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/ISortitionModule.sol";
import "../interfaces/IKPNKToken.sol";

/**
 * @title SortitionModule
 * @notice Stake-weighted random juror drawing
 * @dev Unstake cooldown: 7 days. Slashing rate: 10% (1000 bps).
 */
contract SortitionModule is AccessControlUpgradeable, UUPSUpgradeable, ISortitionModule {

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE"); // KlerosCore

    uint256 public constant UNSTAKE_COOLDOWN = 7 days;
    uint256 public constant SLASHING_RATE_BPS = 1000; // 10%

    IKPNKToken public kpnk;

    mapping(address => mapping(uint96 => uint256)) public stakes;
    mapping(uint96 => uint256) public totalStaked;

    struct UnstakeRequest {
        uint256 amount;
        uint256 availableAt;
    }
    mapping(address => mapping(uint96 => UnstakeRequest)) private _unstakeRequests;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _kpnk, address _admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        kpnk = IKPNKToken(_kpnk);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // Staking
    function stake(uint96 _courtID, uint256 _amount) external override {
        // TODO: transferFrom K-PNK, update stakes + totalStaked, setTransferRestriction
        revert("Not implemented");
    }

    function requestUnstake(uint96 _courtID, uint256 _amount) external override {
        // TODO: set availableAt = block.timestamp + UNSTAKE_COOLDOWN
        revert("Not implemented");
    }

    function executeUnstake(uint96 _courtID) external override {
        // TODO: require block.timestamp >= availableAt, transfer K-PNK back, lift restriction if fully unstaked
        revert("Not implemented");
    }

    // Drawing (KlerosCore only)
    function draw(uint256 _disputeID, uint96 _courtID, uint256 _count, uint256 _nonce) external override onlyRole(OPERATOR_ROLE) returns (address[] memory) {
        // TODO: stake-weighted random draw using block prevrandao + _nonce
        revert("Not implemented");
    }

    // Penalty / Reward (KlerosCore only)
    function penalize(address _juror, uint256 _disputeID) external override onlyRole(OPERATOR_ROLE) returns (uint256) {
        // TODO: slash SLASHING_RATE_BPS of juror's stake
        revert("Not implemented");
    }

    function reward(address _juror, uint256 _disputeID, uint256 _amount) external override onlyRole(OPERATOR_ROLE) {
        // TODO: mint/transfer reward
        revert("Not implemented");
    }

    // Views
    function getStake(address _juror, uint96 _courtID) external view override returns (uint256) {
        return stakes[_juror][_courtID];
    }

    function getTotalStaked(uint96 _courtID) external view override returns (uint256) {
        return totalStaked[_courtID];
    }

    function getUnstakeRequest(address _juror, uint96 _courtID) external view override returns (uint256, uint256) {
        UnstakeRequest storage r = _unstakeRequests[_juror][_courtID];
        return (r.amount, r.availableAt);
    }

    function isJurorActive(address _juror) external view override returns (bool) {
        // TODO: return true if juror has any active stake
        return false;
    }
}
