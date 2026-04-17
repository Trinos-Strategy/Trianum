// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEscrowBridge
 * @notice XRPL↔EVM Sidechain escrow bridge via Axelar GMP.
 * @dev KlerosCore calls `releaseFunds` / `refundFunds` to drive rulings cross-chain.
 *      `registerEscrow` is called by the Axelar relayer path (or off-chain bot with
 *      GATEWAY_ROLE) once an escrow has been created on XRPL Mainnet.
 */
interface IEscrowBridge {

    // ──────────── Events ────────────

    event EscrowRegistered(
        bytes32 indexed escrowID,
        uint256 indexed disputeID,
        uint256 amount,
        address claimant,
        address respondent
    );
    event FundsReleaseRequested(
        bytes32 indexed escrowID,
        uint256 indexed disputeID,
        address winner,
        uint256 amount
    );
    event FundsRefundRequested(
        bytes32 indexed escrowID,
        uint256 indexed disputeID
    );
    event RetryRequested(
        bytes32 indexed escrowID,
        uint256 retryCount
    );
    event EscrowFailed(bytes32 indexed escrowID, uint256 retryCount);
    event EscrowResolvedManually(bytes32 indexed escrowID, uint8 newStatus, address indexed guardian);

    // ──────────── Core ────────────

    /// @notice Register an escrow received from XRPL via Axelar GMP.
    function registerEscrow(
        bytes32 _escrowID,
        uint256 _disputeID,
        uint256 _amount,
        address _claimant,
        address _respondent
    ) external;

    /// @notice Release funds to the winning party. KlerosCore only.
    function releaseFunds(bytes32 _escrowID, address _winner) external;

    /// @notice Refund both parties (dispute refused / cancelled). KlerosCore only.
    function refundFunds(bytes32 _escrowID) external;

    /// @notice Re-send the last GMP message (permissionless, up to MAX_RETRIES).
    function retryRelease(bytes32 _escrowID) external;

    // ──────────── Views ────────────

    function getEscrow(bytes32 _escrowID) external view returns (
        uint256 disputeID,
        uint256 amount,
        address claimant,
        address respondent,
        bool released
    );

    function getRetryCount(bytes32 _escrowID) external view returns (uint256);

    /// @notice Raw status code (matches EscrowBridge.EscrowStatus enum).
    function getEscrowStatus(bytes32 _escrowID) external view returns (uint8);
}
