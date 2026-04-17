// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IKlerosCore.sol";

contract MockArbitrable {
    IKlerosCore public arbitrator;
    mapping(uint256 => uint256) public rulings;

    constructor(address _arbitrator) {
        arbitrator = IKlerosCore(_arbitrator);
    }

    function createDispute(bytes calldata _extraData) external payable returns (uint256) {
        return arbitrator.createDispute{value: msg.value}(2, _extraData);
    }

    function rule(uint256 _disputeID, uint256 _ruling) external {
        require(msg.sender == address(arbitrator), "Only arbitrator");
        rulings[_disputeID] = _ruling;
    }
}
