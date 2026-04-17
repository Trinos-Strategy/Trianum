// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Re-export OpenZeppelin's non-upgradeable TimelockController so Hardhat compiles
// it and surfaces a factory for tests and deploy scripts. Keeping this as a
// dedicated import file avoids mixing unrelated responsibilities.
import "@openzeppelin/contracts/governance/TimelockController.sol";
