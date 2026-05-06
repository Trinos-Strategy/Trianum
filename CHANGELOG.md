# Changelog

All notable changes to the Trianum Protocol are recorded in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Trianum is a derivative work of the [Kleros protocol](https://github.com/kleros/kleros)
(MIT). Three core files (`KlerosCore.sol`, `DisputeKit.sol`, `SortitionModule.sol`)
retain the Kleros prefix to acknowledge upstream origin; all other contracts,
governance, and the TRN token are Trianum-original. See [NOTICE](./NOTICE).

---

## [Unreleased]

### Fixed
- **`hardhat.config.ts` brace structure and duplicate `etherscan` block** — PR
  [#73](https://github.com/Trinos-Strategy/Trianum/pull/73) (commit `ce43745`,
  merged 2026-05-06). The `xrplEvmDevnet` network block was missing its closing
  brace, causing TypeScript to reject the configuration outright (TS1005). Two
  `etherscan` keys were also declared, with the second silently overwriting the
  first and disabling devnet verification. The networks now sit as siblings
  (devnet, testnet, mainnet) and the `etherscan` block merges `customChains`
  for both `xrplEvmDevnet` and `xrplEvmTestnet` under a single `apiKey` map.
  Compile is green; the suite reports **114 passing, 3 pending, 0 failing**.
  The defect was self-detected during a project-memory audit, not by external
  CI, and resolved through the standard branch-protection PR workflow.

## [0.1.0] — 2026-05-06

### Added
- **Live testnet deployment.** Seven UUPS proxy contracts deployed to the
  XRPL EVM Sidechain testnet (chain ID 1449000) on 2026-05-03:
  - `TRNToken` `0x91b14CCF775141A6B9c7E3E60BF85DDa5de255ef`
  - `SortitionModule` `0xFbdcC4d4f080f759E9B59f757e4c43A3A429763c`
  - `DisputeKit` `0xBbbeb9f3004ED582A3eB1d7F96607418c41771Dc`
  - `EscrowBridge` `0x8dBff83997190a896bB5CAe6B70FB741250E029F`
  - `KlerosCore` `0x1BAC0e629fD897d69d4e67044f16B38A9270F24f`
  - `TimelockController` `0xdeEEb84c3A2CCfb3b640D91012fe0e1d33BEe438`
  - `TrianumGovernor` `0x4eDdB2D27D1Da8D9e9020E31AB2a5b32D7a70A9E`

  Browse on the [Testnet Explorer](https://explorer.testnet.xrplevm.org).
- **KFIP 2026 demonstration disputes.** Three live disputes seeded against
  `MockArbitrable` on 2026-05-06: KFIP-Demo-1 (DeFi rug-pull, 100 XRP),
  KFIP-Demo-2 (NFT ownership, 200 XRP), KFIP-Demo-3 (general breach, 300 XRP).
  Each carries a 10 XRP arbitration fee and exercises the full dispute
  lifecycle: registration → Dual Award drafting → commit-reveal voting →
  reconsideration window → signing → execution.
- **Eight design documents** under `docs/`: Whitepaper v1.0, TRN Token Paper,
  Trianum Hybrid Arbitration Rules v0.2 (Art. 1–35), Annex D (Smart Contract
  Enforceability 4-Step Test), Annex E (Korean Arbitration Act Compliance
  Memorandum), DAO Governance Charter, Game-Theoretic Foundation, Calibration
  Simulation Results.
- **Test suite.** 114 passing unit and integration tests across the seven core
  contracts, with three documented pending items (appeal-flow expansion,
  ERC20Permit signature, quorum-shortfall queue rejection).
- **Seven-jurisdiction comparative-law non-security analysis** for the TRN
  Work Token (Korea, United States, United Kingdom, Singapore, Hong Kong,
  Japan, United Arab Emirates; EU MiCA classified as "other crypto-asset").
- **MIT NOTICE attribution** on the three Kleros-derived contracts
  (`KlerosCore.sol`, `DisputeKit.sol`, `SortitionModule.sol`).
- **Demo runner.** `npm run demo` executes the full dispute lifecycle on a
  local Hardhat network in approximately 41 seconds. `VIDEO_MODE=1 npm run
  demo` produces the screen-recorded version published as the project's
  YouTube live-demo asset.
- **Repository hygiene.** SECURITY.md (private disclosure channel),
  CODE_OF_CONDUCT.md, CONTRIBUTING.md, branch protection on `main`,
  Dependabot configuration, issue and pull-request templates.

[Unreleased]: https://github.com/Trinos-Strategy/Trianum/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Trinos-Strategy/Trianum/releases/tag/v0.1.0
