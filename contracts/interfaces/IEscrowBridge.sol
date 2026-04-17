// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/DataStructures.sol";

/**
 * @title IEscrowBridge
 * @notice Axelar GMP를 통한 XRPL 네이티브 에스크로 연동
 */
interface IEscrowBridge {

    event EscrowCreated(bytes32 indexed escrowID, uint256 indexed disputeID, address claimant, address respondent, uint256 amount);
    event EscrowReleased(bytes32 indexed escrowID);
    event EscrowRefunded(bytes32 indexed escrowID);
    event EscrowSplit(bytes32 indexed escrowID, uint256 claimantShare, uint256 respondentShare);
    event BridgedToXRPL(bytes32 indexed escrowID);

    function createEscrow(uint256 _disputeID, address _claimant, address _respondent, uint256 _amount) external returns (bytes32);
    function releaseEscrow(bytes32 _escrowID) external;
    function refundEscrow(bytes32 _escrowID) external;
    function splitEscrow(bytes32 _escrowID, uint256 _claimantShare, uint256 _respondentShare) external;
    function bridgeToXRPL(bytes32 _escrowID) external;

    function getEscrow(bytes32 _escrowID) external view returns (DataStructures.Escrow memory);
    function getEscrowByDispute(uint256 _disputeID) external view returns (DataStructures.Escrow memory);
}
