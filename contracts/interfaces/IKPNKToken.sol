// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IKPNKToken
 * @notice K-PNK Work Token (ERC-20 + ERC20Votes)
 * @dev Total supply: 1,000,000,000 (1B). No revenue distribution. 3 uses only: staking, governance, court creation.
 */
interface IKPNKToken {

    event TransferRestrictionChanged(address indexed account, bool restricted);

    function setTransferRestriction(address _account, bool _restricted) external;
    function isTransferRestricted(address _account) external view returns (bool);
    function initialDistribution(address[] calldata _recipients, uint256[] calldata _amounts) external;
}
