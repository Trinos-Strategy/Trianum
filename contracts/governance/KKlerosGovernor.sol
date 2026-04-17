// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IKKlerosGovernor.sol";
import "../interfaces/IKPNKToken.sol";
import "../libraries/DataStructures.sol";

/**
 * @title KKlerosGovernor
 * @notice DAO governance — Conviction Voting + Guardian Council
 * @dev Conviction formula: kpnkStaked * log2(1 + stakingDays).
 *      Vote cap = 5%. Proposal bond = 10_000e18 K-PNK.
 */
contract KKlerosGovernor is
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    IKKlerosGovernor
{
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint256 public constant VOTE_CAP_BPS = 500; // 5%
    uint256 public constant PROPOSAL_BOND = 10_000e18;

    IKPNKToken public kpnk;
    address public timelock;

    uint256 private _proposalCounter;
    mapping(uint256 => DataStructures.Proposal) private _proposals;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _kpnk, address _timelock, address _admin) external initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
        kpnk = IKPNKToken(_kpnk);
        timelock = _timelock;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function propose(
        DataStructures.ProposalType pType,
        bytes calldata callData,
        string calldata description
    ) external override whenNotPaused returns (uint256) {
        // TODO: collect PROPOSAL_BOND, store proposal, emit ProposalCreated
        revert("Not implemented");
    }

    function castVote(uint256 proposalId, bool support) external override whenNotPaused {
        // TODO: compute conviction = kpnkStaked * log2(1 + stakingDays), cap at VOTE_CAP_BPS
        revert("Not implemented");
    }

    function execute(uint256 proposalId) external override whenNotPaused {
        // TODO: require passed + timelockEnd reached, queue on timelock or call directly
        revert("Not implemented");
    }

    function cancel(uint256 proposalId) external override {
        // TODO: only proposer or admin, refund bond if applicable
        revert("Not implemented");
    }

    // Guardian Council
    function emergencyPause(string calldata reason) external override onlyRole(GUARDIAN_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, reason);
    }

    function emergencyUnpause() external override onlyRole(GUARDIAN_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender);
    }

    function veto(uint256 proposalId) external override onlyRole(GUARDIAN_ROLE) {
        // TODO: mark proposal as Vetoed
        revert("Not implemented");
    }

    // Views
    function getProposal(uint256 proposalId) external view override returns (DataStructures.Proposal memory) {
        return _proposals[proposalId];
    }

    function getConviction(address voter) external view override returns (uint256) {
        // TODO: compute conviction for voter
        return 0;
    }

    function quorumRequired(DataStructures.ProposalType pType) external pure override returns (uint256) {
        // Quorums in bps (10_000 = 100%)
        if (pType == DataStructures.ProposalType.ParameterChange) return 1000;
        if (pType == DataStructures.ProposalType.CourtCreation) return 2000;
        if (pType == DataStructures.ProposalType.TreasurySmall) return 1500;
        if (pType == DataStructures.ProposalType.TreasuryLarge) return 3000;
        if (pType == DataStructures.ProposalType.ContractUpgrade) return 4000;
        if (pType == DataStructures.ProposalType.ConstitutionChange) return 5000;
        return 2000;
    }

    function approvalThreshold(DataStructures.ProposalType pType) external pure override returns (uint256) {
        if (pType == DataStructures.ProposalType.ParameterChange) return 5000;
        if (pType == DataStructures.ProposalType.CourtCreation) return 6000;
        if (pType == DataStructures.ProposalType.TreasurySmall) return 5000;
        if (pType == DataStructures.ProposalType.TreasuryLarge) return 6700;
        if (pType == DataStructures.ProposalType.ContractUpgrade) return 6700;
        if (pType == DataStructures.ProposalType.ConstitutionChange) return 7500;
        return 5000;
    }

    function paused() public view override(PausableUpgradeable, IKKlerosGovernor) returns (bool) {
        return super.paused();
    }
}
