# Trianum Protocol

> **Where three justifications render one verdict.**
> 조리·법리·자치가 하나의 판정으로.

XRPL-native decentralized dispute resolution protocol. Three independent sources of legitimacy — common reason (*조리*), legal doctrine (*법리*), and party autonomy (*자치*) — converge through a **Dual Award** procedure and a stake-weighted juror panel into a single enforceable on-chain verdict in 3–5 weeks.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE) ![Tests](https://img.shields.io/badge/tests-114%20passing-brightgreen) ![Stage](https://img.shields.io/badge/stage-MVP%20development-yellow) ![XRPL](https://img.shields.io/badge/chain-XRPL%20EVM%20Sidechain-0ea5e9) ![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636)

> **Heritage note.** Trianum is a derivative work of the [Kleros protocol](https://github.com/kleros/kleros) (MIT-licensed). Three core files (`KlerosCore.sol`, `DisputeKit.sol`, `SortitionModule.sol`) retain the Kleros prefix to acknowledge upstream origin; all other contracts, governance, and the TRN token are Trianum-original. See [NOTICE](./NOTICE).

---

## Table of Contents

- [Why Trianum](#why-trianum)
- [The Three-Fold Structure](#the-three-fold-structure-삼중성)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Demo — Full Dispute Lifecycle](#demo--full-dispute-lifecycle)
- [TRN Token](#trn-token)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deploying to XRPL EVM Sidechain](#deploying-to-xrpl-evm-sidechain)
- [Current Status](#current-status)
- [Contributing](#contributing)
- [Security](#security)
- [License · NOTICE](#license--notice)

---

## Why Trianum

The XRP Ledger settles billions in seconds. Legal systems take years to resolve a single dispute. When a smart contract escrow on XRPL locks funds that later become contested, the current options are a Korean court (18 months to 3 years) or traditional arbitration (≥6 months at 15–30% of disputed value). Neither scales to on-chain transaction velocity.

Trianum fills that gap. Built by international arbitration attorneys on XRPL's EVM Sidechain with Mainnet escrow integration via Axelar GMP, it delivers on-chain verdicts in 3–5 weeks for a flat 3% protocol fee — and does so within a design that is compatible with Korean arbitration law, EU/US securities frameworks, and the 1958 New York Convention regime.

---

## The Three-Fold Structure (삼중성)

The protocol's name — from Latin *tri* (three) + *-anum* (place/belonging) — describes its core: **three independent sources of legitimacy converging into one verdict**. None can substitute for the other two.

| | **조리 (Jo·ri)**<br/>Common Reason | **법리 (Beop·ri)**<br/>Legal Doctrine | **자치 (Ja·chi)**<br/>Party Autonomy |
|---|---|---|---|
| **Agent** | Decentralized jury panel | Single professional arbitrator | Disputing parties |
| **Source** | Shared reason, equity, community norms | Statute, precedent, doctrinal argument | Self-determination of the disputants |
| **Legal anchor** | Korean Civil Code Art. 1 (조리 as a source of law, *法源*) | Korean Arbitration Act + professional expertise | Korean Arbitration Act Art. 3 (party autonomy) |
| **On-chain implementation** | Stake-weighted sortition + Commit-Reveal voting | Dual Award drafting: two signed awards (A/B) | Arbitration clause + escrow deposit + `rule()` auto-execution consent |

## Architecture

Trianum is deployed across **three layers**:

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1 — XRPL Mainnet                                      │
│    native escrow (EscrowCreate / Finish)                     │
│    RLUSD / XRP settlement                                     │
│    verdict hash anchoring (Memo field)                        │
└──────────────────────────────────────────────────────────────┘
                          ⇅ Axelar GMP Bridge
┌──────────────────────────────────────────────────────────────┐
│  Layer 2 — XRPL EVM Sidechain (chain ID 1440002)             │
│    KlerosCore · DisputeKit · SortitionModule                 │
│    TRN Token (ERC-20, Work Token)                            │
│    KlerosGovernor + TimelockController (DAO)                 │
└──────────────────────────────────────────────────────────────┘
```

**Why XRPL?** Integrated payments-to-disputes without double-bridging; 3–5 second block finality; XRP gas cost materially lower than Ethereum L2s; native compatibility with Ripple's RLUSD settlement rail.

---

## Quick Start

**Requirements**: Node.js ≥20, npm.

```bash
git clone https://github.com/Trinos-Strategy/Trianum.git
cd Trianum
npm ci
```

Compile the Solidity contracts (viaIR is enabled for the KlerosCore stack):

```bash
npx hardhat compile
```

Run the full test suite:

```bash
npx hardhat test
```

Expected output: **114 passing** (3 pending — documented TODOs: appeal flow expansion, ERC20Permit signature, quorum-shortfall queue rejection).

---

## Demo — Full Dispute Lifecycle

Run an annotated simulation of the complete dispute lifecycle on your local Hardhat network — from cross-chain escrow registration through Dual Award drafting, jury commit-reveal voting, tally, slashing, and automatic enforcement:

```bash
npm run demo
```

No environment variables, no testnet access, no XRP required. The script uses `MockAxelarGateway` and `MockArbitrable` to simulate the cross-chain pieces while executing every real contract call you would see in production.

What the demo exercises:

1. Deploys all 8 Trianum contracts + governance (~20 seconds)
2. Distributes TRN and stakes 5 jurors in the General Court
3. Registers an XRPL-side escrow and creates an on-chain dispute
4. Walks through Evidence → Dual Award → Commit → Reveal → Tally → Sign → Execute
5. Shows 10% slashing of minority juror + reward distribution to majority
6. Confirms `MockArbitrable.rule()` fired and `EscrowBridge` status transitioned to `ReleaseRequested`

> In production, step 6's status transition would propagate through Axelar GMP to XRPL Mainnet and release the native escrow to the prevailing party's wallet.

---

## TRN Token

### Etymology — *Tri* in three letters

> **TRN** is the first three letters of **Tri**, the Latin root that gave Trianum its name. The ticker is the protocol's DNA compressed into one syllable.

| | Letter | Meaning | On-chain implementation |
|---|---|---|---|
| **T** | Trust | 배심원 스테이킹으로 분쟁 판정의 무결성 예치 | SortitionModule stake + 10% slashing |
| **R** | Render | Commit-Reveal 투표·Dual Award로 결론을 온체인 렌더링 | DisputeKit `commitVote` / `revealVote` / `commitDualAward` |
| **N** | Network | ERC20Votes 위임 + Conviction Voting을 통한 DAO 거버넌스 | TRNToken.delegate · TrianumGovernor |

> **One-liner**: *"TRN unlocks the three of Trianum — three jurors, three chain layers, three pillars of trust converge into one verdict."*

### Specification

| Property | Value |
|---|---|
| **Ticker** | **TRN** |
| **Standard** | ERC-20 + ERC20Votes (OpenZeppelin 5.x) |
| **Chain** | XRPL EVM Sidechain |
| **Total supply** | 1,000,000,000 TRN — fixed, no minting |
| **Classification** | Non-security **Work Token** (7-jurisdiction comparative-law analysis complete: US non-security crypto asset / EU MiCA "other crypto-asset" / Switzerland utility token / UK / Singapore / Japan / Korea 가상자산 non-security) |
| **Purpose** | (1) Juror stake [T], (2) DAO voting weight [N], (3) Court-creation bond |
| **Explicitly excluded** | Revenue sharing · Buybacks · Burn mechanisms · Fee payment medium (fees settle in RLUSD) · Dividends |

Token holders perform work (adjudication) in exchange for stablecoin fees. Holding alone produces no economic return — each of T, R, N requires *active* participation.

## Project Structure

```
contracts/
├─ core/            KlerosCore — central dispute state machine
├─ modules/         SortitionModule (sortition tree), DisputeKit (Dual Award + voting), EscrowBridge (Axelar GMP)
├─ governance/      TrianumGovernor — OZ Governor + ERC20Votes (uses TimelockController from OpenZeppelin)
├─ token/           TRNToken — Trianum work token (ERC-20 + ERC20Votes, UUPS-upgradeable)
├─ interfaces/      IArbitrator, IArbitrable, IKlerosCore, etc.
├─ libraries/       Shared data structures and utilities
└─ mocks/           MockAxelarGateway, MockArbitrable, MockERC20, TimelockImport

scripts/
├─ deploy.ts        Full-protocol deployment (testnet/mainnet)
├─ deploy-testnet.ts  XRPL EVM Sidechain testnet wrapper
├─ demo.ts          Local dispute-lifecycle demo (requires nothing)
└─ verify.ts        Etherscan-style contract verification

test/               117 unit + integration tests (Hardhat / Chai / ethers v6)
hardhat.config.ts
```

---

## Testing

```bash
npx hardhat test                 # 114 passing
npx hardhat coverage             # optional — coverage report
REPORT_GAS=true npx hardhat test # include gas report
```

Integration tests (`test/Integration.test.ts`) cover eight scenarios: happy path, appeal flow (TODO), tie resolution, non-revealer detection, staking lifecycle, governance proposal execution, access control, and emergency pause.

---

## Deploying to XRPL EVM Sidechain

The included deploy pipeline targets two networks out of the box:

- `xrplEvmTestnet` (chain ID 1440001) — `https://rpc-evm-sidechain-testnet.xrpl.org`
- `xrplEvmMainnet` (chain ID 1440002) — `https://rpc-evm-sidechain.xrpl.org`

Before deploying, copy `.env.example` → `.env` and populate:

```bash
DEPLOYER_PRIVATE_KEY=        # hex-encoded, no 0x prefix
AXELAR_GATEWAY_TESTNET=      # Axelar Gateway contract address on XRPL EVM testnet
AXELAR_GATEWAY_MAINNET=      # ...or mainnet
```

**Axelar Gateway addresses.** Current XRPL EVM Gateway addresses are published by Axelar. For testnet deployment, verify the address in Axelar's public documentation or testnet contract registry before use; if unavailable, deploy `MockAxelarGateway` for initial end-to-end testing and wire the real gateway once published.

Then:

```bash
# Set AXELAR_GATEWAY in the shell (deploy.ts reads this variable)
export AXELAR_GATEWAY=$AXELAR_GATEWAY_TESTNET
npx hardhat run scripts/deploy-testnet.ts --network xrplEvmTestnet
```

Deployment order (handled by `deploy.ts`): TRNToken → SortitionModule → DisputeKit → EscrowBridge → KlerosCore → TimelockController → TrianumGovernor. All proxies are UUPS-upgradeable.

---

## Current Status

**Stage**: MVP development — all design, core contracts, and local simulation work. Testnet deployment and end-to-end XRPL Mainnet integration are in progress.

| Component | Status |
|---|---|
| Design documents (6) | ✅ Complete |
| Trianum Rules (Art. 1–35) | ✅ Complete |
| Smart contract suite | ✅ Compiles · 114 tests pass |
| Regulatory analysis (7-jurisdiction non-security) | ✅ Complete |
| Security audit (external) | ⬜ Planned for Phase 2 |
| XRPL EVM Sidechain testnet deployment | 🟡 Deployment scripts ready; live addresses TBD |
| XRPL Mainnet native-escrow integration | 🟡 EVM side complete; XRPL-side companion contract is a stub |
| Frontend / dApp | ⬜ Not in this repository |
| Production launch | ⬜ Post-KFIP 2026 acceleration |

This repository is therefore **production-grade as a Solidity protocol** and **work-in-progress as a deployed end-to-end service**. It is in this state by design: the KFIP 2026 submission frames this as a funded acceleration target, not a shipped product.

---

## Contributing

We welcome contributions in the following areas:

- 🧑‍⚖️ **Legal modelling** — Korean arbitration/mediation process formalization
- 🛠️ **Solidity engineering** — gas optimization, further Kleros-core porting, security review
- 🧪 **Test engineering** — coverage expansion, property-based tests, fuzzing
- 🔐 **Security** — Slither static analysis, audit checklists
- 🌐 **i18n / UX** — Korean–English documentation, frontend bridge work
- 📝 **Documentation** — architecture diagrams, tutorials

**Workflow**:

1. Open an issue before substantial changes so we can align scope
2. Branch naming: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`
3. `main` is protected. All changes land through PRs with CI green (`npx hardhat compile` + `npx hardhat test`)
4. Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(escrow): …`, `fix(hardhat): …`)

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community standards.

---

## Security

- Do **not** file vulnerability reports as public issues. See [SECURITY.md](./SECURITY.md) for private disclosure.
- Dependabot alerts and `.github/dependabot.yml` automate dependency updates.
- Secret scanning and push protection are active on the repository.

---

## License · NOTICE

- **License**: MIT — see [LICENSE](./LICENSE).
- **NOTICE**: This project is a derivative work of the [Kleros protocol](https://github.com/kleros/kleros) (MIT). Three files (`KlerosCore.sol`, `DisputeKit.sol`, `SortitionModule.sol`) contain substantial derivative code. Attribution is given in [NOTICE](./NOTICE); the Trianum brand and Korean legal-system adaptations are original.
- **Built by**: [Trinos, Inc.](https://swonlaw.com) (주식회사 트리노스) — International arbitration attorneys and blockchain engineers.

---

*Trianum — Where Three Justifications Render One Verdict.*


## 📹 Videos

| Video | Length | Audience |
|---|---|---|
| 🎬 [**Quick Intro**](https://youtu.be/tFePfDK-uCY) | 1:58 (EN) | TL;DR — what Trianum is |
| ⚡ [**Live Demo**](https://youtu.be/a0DT_gRv4v8) | 0:51 | Working code: full dispute lifecycle on local Hardhat |
| 🇰🇷 [**Full Walkthrough — Korean**](https://youtu.be/cjRywj8qdWY) | 5:38 | Deep dive in 한국어 (단심제·삼중성·법적 정합) |
| 🇬🇧 [**Full Walkthrough — English**](https://youtu.be/D7FGOLxhfB0) | 5:51 | Deep dive in English (single-instance, three-fold) |

> The Live Demo is a screen recording of `VIDEO_MODE=1 npm run demo` on this repository — proof that the protocol runs end-to-end (deploy → stake → dispute → Dual Award → Commit-Reveal → tally → appeal window → final signing → execution) in under a minute on any developer machine.
