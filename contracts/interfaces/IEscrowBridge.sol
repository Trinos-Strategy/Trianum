// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/DataStructures.sol";

/**
 * @title IEscrowBridge
 * @notice Axelar GMP를 통한 XRPL 네이티브 에스크로 연동
 */
interface IEscrowBridge {

    event EscrowRegistered(bytes32 indexed escrowID, uint256 indexed disputeID, uint256 amount, address claimant, address respondent);
    event FundsReleaseRequested(bytes32 indexed escrowID, uint256 indexed disputeID, address winner, uint256 amount);
    event FundsRefundRequested(bytes32 indexed escrowID, uint256 indexed disputeID);
    event RetryRequested(bytes32 indexed escrowID, uint256 retryCount);

    function registerEscrow(bytes32 _escrowID, uint256 _amount, address _claimant, address _respondent, uint96 _courtId, bytes32 _xrplCondition) external;
    function releaseFunds(bytes32 _escrowID, address _winner) external;
    function refundFunds(bytes32 _escrowID) external;
    function retryRelease(bytes32 _escrowID) external;

    function getEscrow(bytes32 _escrowID) external view returns (DataStructures.Escrow memory);
    function getRetryCount(bytes32 _escrowID) external view returns (uint256);
}
