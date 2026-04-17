// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/DataStructures.sol";

/**
 * @title IDisputeKit
 * @notice 듀얼 어워드 Commit-Reveal 투표 엔진
 */
interface IDisputeKit {

    event DualAwardCommitted(uint256 indexed disputeID, bytes32 awardAHash, bytes32 awardBHash, bytes32 casePackageRoot);
    event VotingStarted(uint256 indexed disputeID, uint256 roundNumber, uint256 commitDeadline, uint256 revealDeadline);
    event VoteCommitted(uint256 indexed disputeID, address indexed juror, bytes32 commitHash);
    event VoteRevealed(uint256 indexed disputeID, address indexed juror, uint256 choice);
    event VotesTallied(uint256 indexed disputeID, uint256 roundNumber, uint256 votesA, uint256 votesB, uint256 votesRefused, uint256 ruling);
    event TieDetected(uint256 indexed disputeID, uint256 roundNumber);

    // Arbitrator
    function commitDualAward(uint256 _disputeID, bytes32 _awardAHash, bytes32 _awardBHash, bytes32 _casePackageRoot) external;

    // Voting lifecycle
    function startVoting(uint256 _disputeID, address[] calldata _jurors, uint256 _roundNumber) external;
    function commitVote(uint256 _disputeID, bytes32 _commit) external;
    function revealVote(uint256 _disputeID, uint256 _choice, uint256 _salt) external;
    function tallyVotes(uint256 _disputeID) external returns (uint256 ruling);
    function resolveTie(uint256 _disputeID, uint256 _ruling) external;

    // Views
    function getVoteCount(uint256 _disputeID, uint256 _roundNumber) external view returns (uint256 votesA, uint256 votesB, uint256 votesRefused);
    function getDualAwardPackage(uint256 _disputeID) external view returns (DataStructures.DualAwardPackage memory);
    function hasCommitted(uint256 _disputeID, address _juror) external view returns (bool);
    function hasRevealed(uint256 _disputeID, address _juror) external view returns (bool);
    function getRound(uint256 _disputeID, uint256 _roundNumber) external view returns (DataStructures.Round memory);
}
