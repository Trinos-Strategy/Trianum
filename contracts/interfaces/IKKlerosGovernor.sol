// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/DataStructures.sol";

/**
 * @title IKKlerosGovernor
 * @notice DAO 거버넌스 — Conviction Voting + Guardian Council
 * @dev Progressive Decentralization 4단계: Core Team → Council → Hybrid DAO → Full DAO
 *
 * Proposal requirements by type:
 *   ParameterChange:    quorum 10%, approval 50%, timelock 24h
 *   CourtCreation:      quorum 20%, approval 60%, timelock 48h
 *   TreasurySmall:      quorum 15%, approval 50%, timelock 24h
 *   TreasuryLarge:      quorum 30%, approval 67%, timelock 72h
 *   ContractUpgrade:    quorum 40%, approval 67%, timelock 7d
 *   ConstitutionChange: quorum 50%, approval 75%, timelock 14d
 */
interface IKKlerosGovernor {

    event ProposalCreated(uint256 indexed proposalId, address proposer, DataStructures.ProposalType pType);
    event VoteCast(uint256 indexed proposalId, address voter, bool support, uint256 conviction);
    event ProposalPassed(uint256 indexed proposalId);
    event ProposalFailed(uint256 indexed proposalId);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalVetoed(uint256 indexed proposalId);
    event EmergencyPause(address indexed caller, string reason);
    event EmergencyUnpause(address indexed caller);

    function propose(DataStructures.ProposalType pType, bytes calldata callData, string calldata description) external returns (uint256 proposalId);
    function castVote(uint256 proposalId, bool support) external;
    function execute(uint256 proposalId) external;
    function cancel(uint256 proposalId) external;

    // Guardian Council
    function emergencyPause(string calldata reason) external;
    function emergencyUnpause() external;
    function veto(uint256 proposalId) external;

    // Views
    function getProposal(uint256 proposalId) external view returns (DataStructures.Proposal memory);
    function getConviction(address voter) external view returns (uint256);
    function quorumRequired(DataStructures.ProposalType pType) external view returns (uint256);
    function approvalThreshold(DataStructures.ProposalType pType) external view returns (uint256);
    function paused() external view returns (bool);
}
