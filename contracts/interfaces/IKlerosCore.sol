// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/DataStructures.sol";

/**
 * @title IArbitrator
 * @notice ERC-792 Arbitrator standard (simplified for K-Kleros)
 */
interface IArbitrator {
    event DisputeCreation(uint256 indexed _disputeID, address indexed _arbitrable);
    event AppealPossible(uint256 indexed _disputeID, address indexed _arbitrable);
    event AppealDecision(uint256 indexed _disputeID, address indexed _arbitrable);

    function createDispute(uint256 _choices, bytes calldata _extraData) external payable returns (uint256 disputeID);
    function arbitrationCost(bytes calldata _extraData) external view returns (uint256 cost);
    function appeal(uint256 _disputeID, bytes calldata _extraData) external payable;
    function appealCost(uint256 _disputeID, bytes calldata _extraData) external view returns (uint256 cost);
    function appealPeriod(uint256 _disputeID) external view returns (uint256 start, uint256 end);
    function currentRuling(uint256 _disputeID) external view returns (uint256 ruling);
}

/**
 * @title IArbitrable
 * @notice ERC-792 Arbitrable standard
 */
interface IArbitrable {
    event Ruling(IArbitrator indexed _arbitrator, uint256 indexed _disputeID, uint256 _ruling);
    function rule(uint256 _disputeID, uint256 _ruling) external;
}

/**
 * @title IKlerosCore
 * @notice K-Kleros 메인 중재 허브 인터페이스
 */
interface IKlerosCore is IArbitrator {

    // ──────────── Events ────────────

    event DisputeCreated(
        uint256 indexed disputeID,
        address indexed arbitrable,
        DataStructures.CourtType courtType,
        uint256 disputeAmount,
        bytes32 escrowID
    );

    event ArbitratorAssigned(
        uint256 indexed disputeID,
        address indexed arbitrator
    );

    event DisputeStatusChanged(
        uint256 indexed disputeID,
        DataStructures.DisputeStatus oldStatus,
        DataStructures.DisputeStatus newStatus
    );

    event RulingExecuted(
        uint256 indexed disputeID,
        uint256 ruling,
        address indexed arbitrable
    );

    event AppealRaised(
        uint256 indexed disputeID,
        uint256 appealRound,
        address indexed appellant
    );

    event EvidenceSubmitted(
        uint256 indexed disputeID,
        address indexed party,
        string evidenceURI
    );

    event AwardSigned(
        uint256 indexed disputeID,
        address indexed arbitrator
    );

    // ──────────── K-Kleros Extension Functions ────────────

    function assignArbitrator(uint256 _disputeID, address _arbitrator) external;
    function closeEvidencePeriod(uint256 _disputeID) external;
    function submitEvidence(uint256 _disputeID, string calldata _evidenceURI) external;
    function signAward(uint256 _disputeID, bytes calldata _signature) external;
    function executeRuling(uint256 _disputeID) external;

    // ──────────── View Functions ────────────

    function getDispute(uint256 _disputeID) external view returns (DataStructures.Dispute memory);
    function getCourtConfig(DataStructures.CourtType _courtType) external view returns (DataStructures.CourtConfig memory);
    function disputeCount() external view returns (uint256);
}
