// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockAxelarGateway {
    event ContractCall(string destinationChain, string contractAddress, bytes payload);

    function callContract(string calldata destinationChain, string calldata contractAddress, bytes calldata payload) external {
        emit ContractCall(destinationChain, contractAddress, payload);
    }

    function validateContractCall(bytes32, string calldata, string calldata, bytes32) external pure returns (bool) {
        return true;
    }
}
