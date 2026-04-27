# Trianum Protocol Whitepaper

## Cross-Border Smart-Contract Dispute Resolution, Resolved On-Chain

**Version**: 1.0
**Issuer**: Trinos
**Effective Date**: 2026-04-27

---

## 1. Executive Summary

Trianum is a hybrid on-chain arbitration protocol for smart-contract-enforceable disputes. A professional arbitrator drafts two complete, reasoned arbitral awards; a panel of staked jurors selects the award whose factual basis is better supported by the evidence; the arbitrator signs the selected award after a single-instance reconsideration window; the verdict is automatically enforced through `IArbitrable.rule()` on the XRPL EVM Sidechain or, for XRPL Mainnet escrows, through Axelar GMP-bridged `EscrowFinish`/`EscrowCancel`.

The protocol is designed to be **enforceable as a Korean arbitral award** under the *Korean Arbitration Act* and **recognised abroad** under the *New York Convention on the Recognition and Enforcement of Foreign Arbitral Awards*. Three legitimacy pillars converge on a single verdict:

| Pillar | Korean Legal Foundation | On-Chain Implementation |
|:---:|:---:|:---:|
| Common Reason (조리) | Civil Code Article 1 | Stake-weighted Commit-Reveal voting |
| Legal Doctrine (법리) | Arbitration Act — professional arbitrator | Dual-Award drafting |
| Party Autonomy (당사자 자치) | Arbitration Act Article 3 | Arbitration agreement + smart-escrow auto-execution |

---

## 2. Problem Statement

Cross-border smart-contract disputes face a structural mismatch: the underlying obligation lives on a blockchain, while traditional arbitration and litigation produce paper awards that require cumbersome cross-border enforcement procedures.

Concrete problems observed today:

- **Enforcement gap.** A Korean arbitration award against a counterparty resident in another jurisdiction requires recognition and enforcement under the New York Convention before the underlying funds can move. Months pass between award and execution.
- **Cost imbalance.** Filing fees and counsel costs frequently dwarf the disputed amount in $1,000–$100,000 disputes — the exact range where on-chain commerce concentrates.
- **Procedural opacity.** Web-based platforms offering "decentralised" dispute resolution rarely produce reasoned awards that satisfy Article 32 of the Korean Arbitration Act or Article V of the New York Convention.
- **No on-chain finality.** Even where a dispute is resolved, the contract holding the disputed funds requires a separate human-mediated step to execute the verdict.

Trianum addresses each of these gaps directly. Its scope is intentionally narrow — disputes where the verdict can be expressed as `ruling = 1` (Claimant prevails) or `ruling = 2` (Respondent prevails) and executed by a single contract call — and the procedural design within that scope is rigorous.

---

## 3. The Three-Fold Legitimacy Architecture

Three sources of authority converge on every Trianum verdict.

### 3.1 Common Reason (조리)

Korean Civil Code Article 1 recognises 조리 (common reason) as a source of law alongside statute and custom. Trianum operationalises 조리 through stake-weighted Schelling-Point convergence: jurors, unable to communicate, independently identify the award best supported by the evidence. The convergence is verifiable on-chain via the Commit-Reveal protocol and incentivised by stake-weighted slashing-and-redistribution.

### 3.2 Legal Doctrine (법리)

A single professional arbitrator — qualified by law degree, smart-contract literacy, and a non-holding declaration with respect to TRN tokens — drafts two complete, reasoned awards. Each award stands as a defensible legal analysis on its assumed factual basis. Article 32 of the Korean Arbitration Act is satisfied at the moment of arbitrator signature.

### 3.3 Party Autonomy (당사자 자치)

Article 3 of the Korean Arbitration Act recognises party autonomy as a foundational principle. The Trianum model arbitration clause, embedded in the disputed smart contract, expresses both the agreement to arbitrate and consent to the Dual-Award Procedure with juror selection. The smart contract's own terms govern the substance of the dispute; Trianum's Rules govern the procedure.

---

## 4. The Dual-Award Procedure

The procedure is designed to satisfy three constraints simultaneously: procedural equality (Korean Arbitration Act §20), single-instance finality (§35–§36), and on-chain auto-execution.

### 4.1 Phase Map

| Phase | Duration | Key Action |
|---|:---:|---|
| Filing | t = 0 | Claimant calls `createDispute()`; funds frozen; fee locked |
| Scope Verification | + 48 h | Arbitrator applies the 4-Step Enforceability Test |
| Response | + 14 d | Respondent files position and evidence |
| Evidence | 14 d | Both parties may submit evidence |
| Drafting | 21 d | Arbitrator drafts Award A and Award B |
| Voting (Commit) | 48 h | Jurors commit `keccak256(choice, salt)` |
| Voting (Reveal) | 24 h | Jurors reveal; tally computed |
| Reconsideration Window | 7 d | Either party may request expanded-panel review |
| Signing | 3 d | Arbitrator signs after Window expires (single-instance) |
| Execution | atomic | `IArbitrable.rule(disputeId, ruling)` |

### 4.2 Why Dual Awards?

The traditional alternative — a single arbitrator issuing a single award — places the entire legitimacy of the verdict on one professional's judgment. A juror panel acting alone, conversely, risks producing an unreasoned outcome that cannot satisfy Article 32's reasoning requirement.

Dual Awards reconcile both constraints: each side receives a fully reasoned award reflecting its position, and the juror panel's role is reduced to **selection between two defensible options** — a procedural mechanism, not an independent fact-finder. The selected award is signed by the same professional arbitrator who drafted both, preserving the §32 reasoning chain.

### 4.3 Internal Reconsideration vs Court Appeal

Korean Arbitration Act §35 establishes single-instance finality. Trianum honours this by providing only **Internal Reconsideration** — an expanded-panel re-vote within the same arbitral proceeding (maximum three rounds). Substantive court appeal is waived to the extent permitted by the Seat (§36); §38 set-aside grounds are expressly preserved.

---

## 5. On-Chain Auto-Execution

Once the arbitrator signs, execution is atomic and permissionless:

```
KlerosCore (XRPL EVM Sidechain) → IArbitrable.rule(disputeId, ruling) → contract release
                                ↓
                    Axelar GMP bridge (for XRPL Mainnet escrows)
                                ↓
                          XRPL EscrowFinish / EscrowCancel
```

No court order. No manual transfer. No off-chain coordination. The verdict moves the funds in the same block (or the next block, for cross-chain bridged execution).

This is the operational answer to the enforcement gap: a Korean arbitral award that takes effect at the speed of a blockchain transaction, bypassing the months-long cross-border enforcement bottleneck of traditional arbitration.

---

## 6. The TRN Work Token

TRN is a **work token**: it confers the right to perform protected work (juror service) and the obligation to bear stake-weighted slashing risk for that work. It is not a profit-share instrument, a dividend right, or a debt claim.

| Function | TRN Use |
|---|---|
| Juror staking | Required to enter the SortitionModule selection pool |
| DAO voting weight | ERC20Votes-compatible delegation |
| Court-creation bonds | DAO proposers post bonds to propose new courts or parameter changes |

The token is structured for **non-security treatment in seven jurisdictions** (United States, European Union, Switzerland, Singapore, United Kingdom, Japan, Republic of Korea). Detailed analysis is provided in the companion **TRN Token Paper**.

Fees flow in RLUSD (Ripple's NYDFS-approved USD stablecoin). TRN does not act as a fee currency; it functions exclusively as a stake-and-governance instrument.

---

## 7. Korean Arbitration Act Foundation

Trianum's Seat is Seoul, Republic of Korea. Every procedural element is mapped to the Korean Arbitration Act:

| Korean Arbitration Act Article | Trianum Provision |
|---|---|
| §3 (party autonomy) | Embedded model clause + explicit consent |
| §8 (form of agreement) | Smart-contract code as written form |
| §17 (kompetenz-kompetenz) | Arbitrator decides own jurisdiction |
| §20 (procedural equality) | Equivalent dual-award drafting + symmetric voting |
| §32 (form of award) | Reasoned, signed, dated, IPFS-preserved |
| §35–§36 (single-instance finality) | Internal Reconsideration only; no court appeal on merits |
| §38 (set-aside grounds) | Expressly preserved; rebuttable on-chain evidence presumption |
| §39 (recognition and enforcement) | Auto-execution; no court order required |

The detailed compliance analysis is set out in the companion **Korean Arbitration Act Compliance Memorandum**.

---

## 8. Roadmap

### 2026

- **Q2** — Public mainnet beta; first 100 disputes processed; published outcome catalogue
- **Q3** — DAO Phase 1 (foundation-multisig governance with TRN-holder advisory votes)
- **Q4** — DAO Phase 2 (TRN-holder direct vote on court parameters)

### 2027

- **Q1** — DAO Phase 3 (full TRN-holder governance over all DAO-amendable parameters)
- **Q2** — Reputation-weighted sortition launches alongside stake-weighted
- **Q3** — Multi-court expansion (specialised courts created by DAO proposal)
- **Q4** — Cross-recognition with KCAB International for foreign-enforcement support

### 2028 and beyond

- **Phase 4 — Full decentralisation** with on-chain DAO judicial review
- Mainnet expansion to additional EVM-compatible chains
- Institutional integrations with traditional arbitration centres

The detailed governance roadmap is set out in the companion **DAO Governance Charter**.

---

## 9. Document Map

This whitepaper is the entry point to the Trianum documentation corpus:

| Document | Subject |
|---|---|
| **Trianum Arbitration Rules** | The 35-article procedural code |
| **Enforceability Test** (Annex D) | The 4-Step admissibility test for disputes |
| **Korean Arbitration Act Compliance** (Annex E) | §1-by-§ Korean Arbitration Act mapping |
| **TRN Token Paper** | Token economics + 7-jurisdiction non-security analysis |
| **DAO Governance Charter** | Governance structure + progressive decentralisation |
| **Game-Theoretic Foundation** | Schelling-Point convergence + Sybil-attack analysis |
| **Calibration Simulation Results** | Empirical validation of slashing parameters |

---

*© 2026 Trinos | Trianum Protocol*
