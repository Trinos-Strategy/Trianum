// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IKKlerosTimelock
 * @notice 거버넌스 결의 타임락 — 24h ~ 14d 지연 실행
 */
interface IKKlerosTimelock {

    event TransactionQueued(bytes32 indexed txHash, uint256 eta);
    event TransactionExecuted(bytes32 indexed txHash);
    event TransactionCancelled(bytes32 indexed txHash);

    function queueTransaction(address target, uint256 value, bytes calldata data, uint256 delay) external returns (bytes32 txHash);
    function executeTransaction(address target, uint256 value, bytes calldata data) external;
    function cancelTransaction(bytes32 txHash) external;

    function MIN_DELAY() external view returns (uint256);  // 24 hours
    function MAX_DELAY() external view returns (uint256);  // 14 days
}
