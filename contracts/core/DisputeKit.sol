// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IDisputeKit.sol";
import "../libraries/DataStructures.sol";

/**
 * @title DisputeKit
 * @notice Dual-Award Commit-Reveal voting engine
 * @dev Commit: 48h, Reveal: 24h. Commit hash = keccak256(abi.encodePacked(choice, salt)).
 */
contract DisputeKit is AccessControlUpgradeable, UUPSUpgradeable, IDisputeKit {

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE"); // KlerosCore
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    mapping(uint256 => DataStructures.DualAwardPackage) private _dualAwards;
    mapping(uint256 => mapping(uint256 => DataStructures.Round)) private _rounds;
    mapping(uint256 => mapping(address => bytes32)) private _commits;
    mapping(uint256 => mapping(address => bool)) private _hasCommitted;
    mapping(uint256 => mapping(address => bool)) private _hasRevealed;
    mapping(uint256 => uint256) private _currentRound;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function commitDualAward(uint256 _disputeID, bytes32 _awardAHash, bytes32 _awardBHash, bytes32 _casePackageRoot) external override {
        // TODO: verify caller is assigned arbitrator, status == DualAward
        revert("Not implemented");
    }

    function startVoting(uint256 _disputeID, address[] calldata _jurors, uint256 _roundNumber) external override onlyRole(OPERATOR_ROLE) {
        // TODO: implement — set commitDeadline = block.timestamp + 48h, revealDeadline = commitDeadline + 24h
        revert("Not implemented");
    }

    function commitVote(uint256 _disputeID, bytes32 _commit) external override {
        // TODO: verify juror is drawn, within commit phase, not already committed
        revert("Not implemented");
    }

    function revealVote(uint256 _disputeID, uint256 _choice, uint256 _salt) external override {
        // TODO: verify keccak256(abi.encodePacked(_choice, _salt)) == _commits[disputeID][msg.sender]
        revert("Not implemented");
    }

    function tallyVotes(uint256 _disputeID) external override onlyRole(OPERATOR_ROLE) returns (uint256) {
        // TODO: implement — majority wins, tie → TieDetected event
        revert("Not implemented");
    }

    function resolveTie(uint256 _disputeID, uint256 _ruling) external override {
        // TODO: verify caller is arbitrator, tie exists
        revert("Not implemented");
    }

    // Views
    function getVoteCount(uint256 _disputeID, uint256 _roundNumber) external view override returns (uint256, uint256, uint256) {
        DataStructures.Round storage r = _rounds[_disputeID][_roundNumber];
        return (r.votesA, r.votesB, r.votesRefused);
    }

    function getDualAwardPackage(uint256 _disputeID) external view override returns (DataStructures.DualAwardPackage memory) {
        return _dualAwards[_disputeID];
    }

    function hasCommitted(uint256 _disputeID, address _juror) external view override returns (bool) {
        return _hasCommitted[_disputeID][_juror];
    }

    function hasRevealed(uint256 _disputeID, address _juror) external view override returns (bool) {
        return _hasRevealed[_disputeID][_juror];
    }

    function getRound(uint256 _disputeID, uint256 _roundNumber) external view override returns (DataStructures.Round memory) {
        return _rounds[_disputeID][_roundNumber];
    }
}
