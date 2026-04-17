// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/DataStructures.sol";

/**
 * @title IKlerosCore
 * @notice 메인 중재 허브 — IArbitrator (ERC-792) 구현
 * @dev 분쟁 생성·관리, 법원 설정, 판정 집행
 */
interface IKlerosCore {

    // ── Events ──
    event DisputeCreated(uint256 indexed disputeID, address indexed arbitrable, DataStructures.CourtType courtType, uint256 disputeAmount, bytes32 escrowID);
    event ArbitratorAssigned(uint256 indexed disputeID, address indexed arbitrator);
    event DisputeStatusChanged(uint256 indexed disputeID, DataStructures.DisputeStatus oldStatus, DataStructures.DisputeStatus newStatus);
    event RulingExecuted(uint256 indexed disputeID, uint256 ruling, address indexed arbitrable);
    event AppealRaised(uint256 indexed disputeID, uint256 appealRound, address indexed appellant);

    // ── IArbitrator (ERC-792) ──
    function createDispute(uint256 _choices, bytes calldata _extraData) external payable returns (uint256 disputeID);
    function arbitrationCost(bytes calldata _extraData) external view returns (uint256 cost);
    function appeal(uint256 _disputeID, bytes calldata _extraData) external payable;
    function appealCost(uint256 _disputeID, bytes calldata _extraData) external view returns (uint256 cost);
    function appealPeriod(uint256 _disputeID) external view returns (uint256 start, uint256 end);
    function currentRuling(uint256 _disputeID) external view returns (uint256 ruling);

    // ── K-Kleros Extensions ──
    function assignArbitrator(uint256 _disputeID, address _arbitrator) external;
    function closeEvidencePeriod(uint256 _disputeID) external;
    function signAward(uint256 _disputeID, bytes calldata _signature) external;
    function executeRuling(uint256 _disputeID) external;

    // ── Views ──
    function getDispute(uint256 _disputeID) external view returns (DataStructures.Dispute memory);
    function getCourtConfig(DataStructures.CourtType _courtType) external view returns (DataStructures.CourtConfig memory);
    function disputeCount() external view returns (uint256);
}
