// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISortitionModule
 * @notice 스테이킹 기반 가중 랜덤 배심원 추첨
 */
interface ISortitionModule {

    event Staked(address indexed juror, uint96 indexed courtID, uint256 amount, uint256 totalStake);
    event UnstakeRequested(address indexed juror, uint96 indexed courtID, uint256 amount, uint256 availableAt);
    event JurorDrawn(uint256 indexed disputeID, address indexed juror, uint96 courtID, uint256 roundNumber);
    event Slashed(address indexed juror, uint256 indexed disputeID, uint256 amount);
    event Rewarded(address indexed juror, uint256 indexed disputeID, uint256 amount);

    // Staking
    function stake(uint96 _courtID, uint256 _amount) external;
    function requestUnstake(uint96 _courtID, uint256 _amount) external;
    function executeUnstake(uint96 _courtID) external;

    // Drawing (KlerosCore only)
    function draw(uint256 _disputeID, uint96 _courtID, uint256 _count, uint256 _nonce) external returns (address[] memory jurors);

    // Penalty / Reward (KlerosCore only)
    function penalize(address _juror, uint256 _disputeID) external returns (uint256 slashedAmount);
    function reward(address _juror, uint256 _disputeID, uint256 _amount) external;

    // Views
    function getStake(address _juror, uint96 _courtID) external view returns (uint256);
    function getTotalStaked(uint96 _courtID) external view returns (uint256);
    function getUnstakeRequest(address _juror, uint96 _courtID) external view returns (uint256 amount, uint256 availableAt);
    function isJurorActive(address _juror) external view returns (bool);
}
