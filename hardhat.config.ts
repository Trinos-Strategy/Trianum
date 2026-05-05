import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
if (!PRIVATE_KEY) console.warn("⚠️  DEPLOYER_PRIVATE_KEY missing in .env");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    xrplevm_devnet: {
      url: process.env.RPC_URL ?? "https://rpc.testnet.xrplevm.org",
      chainId: Number(process.env.CHAIN_ID ?? 1449000),
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // XRPL EVM Sidechain Devnet — the canonical XRPL EVM development
    // network targeted by all Trianum protocol documents (whitepaper,
    // rules, token paper). Chain ID 1440002 is the long-standing
    // devnet identifier; this is NOT mainnet despite the legacy
    // entry name in earlier configs.
    xrplEvmDevnet: {
      url: "https://rpc-evm-sidechain.xrpl.org",
      chainId: 1440002,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    xrplEvmTestnet: {
      url: "https://rpc.testnet.xrplevm.org",
      chainId: 1449000,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    xrplEvmMainnet: {
      url: "https://rpc.xrplevm.org",
      chainId: 1440000,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    // XRPL EVM Sidechain devnet uses an explorer at evm-sidechain.xrpl.org
    // (no API key required for source verification on the public devnet
    // explorer; placeholder value is accepted by hardhat-verify).
    apiKey: {
      xrplEvmDevnet: "no-api-key-required",
    },
    customChains: [
      {
        network: "xrplEvmDevnet",
        chainId: 1440002,
        urls: {
          apiURL: "https://evm-sidechain.xrpl.org/api",
          browserURL: "https://evm-sidechain.xrpl.org",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
  },
  etherscan: {
    apiKey: { xrplEvmTestnet: "empty" },
    customChains: [
      {
        network: "xrplEvmTestnet",
        chainId: 1449000,
        urls: {
          apiURL: "https://explorer.testnet.xrplevm.org/api",
          browserURL: "https://explorer.testnet.xrplevm.org",
        },
      },
    ],
  },
  sourcify: { enabled: true },
  mocha: { timeout: 200000 },
};

export default config;
