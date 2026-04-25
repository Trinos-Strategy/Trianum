// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITRNToken
 * @notice TRN Work Token — ERC-20 + ERC20Votes + ERC20Permit
 * @dev Total supply: 1,000,000,000 (1B). No revenue distribution.
 *      3 uses only: staking (SortitionModule), governance (Governor), court creation bond.
 *      This is a Work Token, NOT a security.
 */
interface ITRNToken {

    // ──────────── Events ────────────

    event TransferRestrictionChanged(address indexed account, bool restricted);
    event InitialDistributionCompleted(uint256 totalRecipients, uint256 totalAmount);

    // ──────────── Transfer Control (SortitionModule only) ────────────

    function setTransferRestriction(address _account, bool _restricted) external;
    function isTransferRestricted(address _account) external view returns (bool);

    // ──────────── Minting (capped at TOTAL_SUPPLY, batched) ────────────

    function initialDistribution(address[] calldata _recipients, uint256[] calldata _amounts) external;

    // ──────────── Governance cap ────────────

    function getVotesWithCap(address _account) external view returns (uint256);
}
