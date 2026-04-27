# ANNEX D — SMART-CONTRACT ENFORCEABILITY DETERMINATION TEST

## Trianum Hybrid Arbitration Rules — Detailed Reference

**Version**: 1.0
**Issuer**: Trinos
**Effective Date**: 2026-04-27
**Reference Articles**: Article 1(3)–(5), Article 5

---

## 1. Purpose

The Trianum General Court resolves only those disputes whose verdicts can be fully and automatically enforced on-chain. This Annex sets out a structured four-step determination — the **Enforceability Test** — that operationalises Articles 1 and 5 of the Rules.

The Test serves four constituencies:

- **Arbitrators** conducting Scope Verification under Article 5(1).
- **Claimants** performing self-assessment before filing.
- **External counsel** advising on the suitability of disputes for the Trianum forum.
- **Trianum DAO** evaluating proposed expansions to the dispute-category catalogue.

---

## 2. The 4-Step Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1 — On-Chain Target Identification                     │
│  Does the dispute identify a specific, instantiated on-chain  │
│  object?                                                       │
└─────────────────────────────────────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
      YES                    NO ──→ Dismissed (Article 5(2)(c) or (a))
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2 — Binary Outcome Capability                           │
│  Can the result be expressed entirely as Award A or Award B?   │
└─────────────────────────────────────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
      YES                    NO ──→ Dismissed (Article 5(2)(b))
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3 — IArbitrable.rule() Sufficiency                      │
│  Will a single rule() call (or its Axelar GMP-bridged XRPL    │
│  equivalent) close the matter?                                 │
└─────────────────────────────────────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
      YES                    NO ──→ Dismissed (Article 5(2)(a) or (c))
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4 — No Off-Chain Performance Component                  │
│  Is the relief free of any physical, judicial, or human-       │
│  mediated step?                                                │
└─────────────────────────────────────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
      YES ──→ Within scope    NO ──→ Dismissed (Article 5(2)(d))
       │
       ▼
   Dispute admitted (Article 6 proceeds)
```

---

## 3. Step-by-Step Criteria

### Step 1 — On-Chain Target Identification

**Required (all of the following)**:

- (a) The dispute identifies a specific on-chain target by one of:
  - XRPL Mainnet Escrow: `(Account, OfferSequence)`
  - XRPL EVM Sidechain smart contract: `(contractAddress, disputeId)`
  - Other supported network smart contract: `(network, contractAddress, disputeId)`
- (b) The `disputeId` is registered through `IArbitrable.createDispute()` either prior to or concurrently with the Notice of Claim.
- (c) The disputed object is **instantiated on-chain at the time of the Notice of Claim** — not a future event that has yet to occur on-chain.

**Failure cases**:

- An off-chain agreement that merely references an on-chain payment, without a live on-chain instantiation.
- "A future NFT collection's pre-sale dispute" — no on-chain target yet exists.
- "Some person's transaction at some time" — no transaction hash or account identified.

### Step 2 — Binary Outcome Capability

**Required**: The resolution must reduce to either `ruling = 1` (Claimant prevails entirely) or `ruling = 2` (Respondent prevails entirely), as defined in Article 1(2).

`ruling = 0` (Refuse to Arbitrate) under Article 22(4)(c) and Article 24-ter is a separate procedural outcome — used when the majority of Jurors find that *neither* Award is a defensible reflection of the evidence — not a partial-award mechanism.

**Failure cases**:

- "Order Respondent to pay Claimant 750 RLUSD" — ruling by proportion of disputed amount.
- "Order Respondent to modify line X of the smart contract" — non-binary remedial action.
- "Apportion 50/50 fault between the Parties" — comparative fault.

**Edge case (within scope)**: A 1,000 RLUSD escrow dispute where the Parties have privately settled a portion (e.g., 600 RLUSD) before filing, and the remaining 400 RLUSD is registered as the new disputed amount, is binary as to that residual.

### Step 3 — `IArbitrable.rule()` Sufficiency

**Required (one of)**:

- (a) The disputed contract implements the ERC-792-family `IArbitrable` interface, exposing `rule(uint256 disputeId, uint256 ruling)`. **OR**
- (b) The dispute concerns an XRPL Mainnet Escrow that can be closed by a single Axelar GMP-bridged `EscrowFinish` / `EscrowCancel` call.

**Failure cases**:

- The disputed contract is not `IArbitrable` and cannot be wrapped by the escrow pattern.
- Enforcement requires a separate signature by a multisig holder beyond the rule() call.
- Enforcement requires an external oracle to first publish a value before release.

**Edge case (within scope via wrapper)**: A non-`IArbitrable` contract may be brought within scope by deploying a Trianum-compatible escrow wrapper (see §5 below) that the Parties consent to and pre-fund. The wrapper itself implements `IArbitrable`.

### Step 4 — No Off-Chain Performance Component

**Required (all of the following)**:

The relief sought must not require any of:

- (a) physical delivery of goods;
- (b) personal-service performance;
- (c) court order, writ, or injunction;
- (d) criminal sanction;
- (e) damages quantification depending on judicial discretion.

**Failure cases**:

- "Respondent shall deliver the physical painting corresponding to the NFT within 30 days."
- "Issue an injunction restraining all of Respondent's future transactions."
- "Award Claimant a discretionary defamation damages amount."

**Edge case (within scope)**: Delivery of a digital work product (e.g., a 3D model file) is within scope where delivery can be expressed as an **on-chain attestation** (e.g., Arweave hash, IPFS CID) verifiable through the disputed contract. Mere "upload to Discord" without verification is out of scope.

---

## 4. Worked Examples

| # | Scenario | Step 1 | Step 2 | Step 3 | Step 4 | Outcome |
|---|---|:---:|:---:|:---:|:---:|---|
| 1 | XRPL Escrow conditional release dispute (1,000 RLUSD) | ✓ | ✓ | ✓ | ✓ | **Within scope** |
| 2 | RLUSD payment-on-attestation dispute (digital deliverable + IPFS CID) | ✓ | ✓ | ✓ | ✓ | **Within scope** |
| 3 | XRPL EVM DEX swap dispute (slippage tolerance violation) | ✓ | ✓ | ✓ | ✓ | **Within scope** |
| 4 | NFT royalty enforcement dispute (royalty contract `IArbitrable`) | ✓ | ✓ | ✓ | ✓ | **Within scope** |
| 5 | DAO Timelock resolution-execution dispute (`IArbitrable` Timelock) | ✓ | ✓ | ✓ | ✓ | **Within scope** |
| 6 | Off-chain consulting agreement merely paid in RLUSD | ✗ | (n/a) | (n/a) | (n/a) | Dismissed (Step 1) |
| 7 | LP-position partial-loss apportionment | ✓ | ✗ | (n/a) | (n/a) | Dismissed (Step 2) |
| 8 | Smart-contract dispute requiring third-party EOA freezing injunction | ✓ | ✓ | ✗ | (n/a) | Dismissed (Step 3) |
| 9 | Tokenised real-estate physical-delivery dispute | ✓ | ✓ | ✗ | ✗ | Dismissed (Steps 3, 4) |
| 10 | AI-model licence dispute resolved by "code modification order" | ✓ | ✗ | (n/a) | (n/a) | Dismissed (Step 2) |
| 11 | NFT digital-deliverable dispute (verifiable via IPFS CID attestation) | ✓ | ✓ | ✓ | ✓ | **Within scope** |
| 12 | DeFi flash-loan victim damages dispute requiring loss quantification | ✓ | ✗ | (n/a) | (n/a) | Dismissed (Step 2; class action unsupported) |

---

## 5. Wrapper Contract Pattern

Some Step-3 failures can be remedied by deploying a **Trianum-compatible escrow wrapper** that holds the disputed funds and exposes `IArbitrable`. The wrapper resolves the on-chain enforcement requirement without modifying the underlying contract:

```solidity
// Pseudocode: Trianum-compatible escrow wrapper for non-IArbitrable contracts
contract TrianumEscrowWrapper is IArbitrable {
    address public targetContract;
    address public claimant;
    address public respondent;
    uint256 public lockedAmount;

    constructor(address _target, address _claimant, address _respondent) {
        targetContract = _target;
        claimant = _claimant;
        respondent = _respondent;
    }

    function deposit() external payable {
        lockedAmount = msg.value;
    }

    function rule(uint256 disputeId, uint256 ruling) external override onlyTrianumCore {
        if (ruling == 1) {
            payable(claimant).transfer(lockedAmount);
        } else if (ruling == 2) {
            payable(respondent).transfer(lockedAmount);
        } else {
            // ruling == 0: proportional refund — Article 24(2)
            uint256 half = lockedAmount / 2;
            payable(claimant).transfer(half);
            payable(respondent).transfer(lockedAmount - half);
        }
    }
}
```

**Use conditions**:

- Both Parties consent in writing to the wrapper.
- The Claimant funds the wrapper deployment cost.
- The full disputed amount is deposited into the wrapper before the Notice of Claim.

The wrapped dispute is processed identically to a native `IArbitrable` dispute thereafter.

---

## 6. Frequently Asked Questions

**Q1. The on-chain target exists, but the rule() call requires a follow-up step. Within scope?**

If the follow-up is *public, automatic, and permissionless* (e.g., `executeRuling()` callable by any address after Award status = Signed), the dispute is within scope under Article 24(4). If the follow-up requires a specific signer or off-chain coordination, Step 3 fails.

**Q2. A bug is discovered in the disputed smart contract during proceedings. What happens?**

Article 12-bis applies. Proceedings are suspended for up to 14 days while a DAO-approved security reviewer assesses the bug. If the bug renders the dispute non-enforceable under the Test, the dispute is dismissed under Article 5(2)(c) and the filing fee is refunded in full. Otherwise, proceedings resume from suspension with the 21-day drafting period tolled.

**Q3. What does a "majority Refuse to Arbitrate" outcome mean?**

A majority of Jurors find that neither Award is supported by the evidence. The dispute does not resolve binary; instead, Article 24-ter triggers a single round of Re-Drafting by a different Arbitrator with a fresh Dual Award. A second consecutive Refuse majority closes the dispute under `ruling = 0` (Article 24(2)).

**Q4. Can a dispute concerning a network not on the supported list be admitted?**

Article 13(8) requires the Party to submit alternative documentary proof for unsupported networks, and the Arbitrator must be satisfied that Step 3 enforceability is preserved (typically via the wrapper pattern). The Trianum DAO publishes the current supported-network list at trianum.trinos.group.

**Q5. The disputed amount is variable (e.g., a fluctuating LP position). How is it valued?**

Article 28(2) Fee Lock Snapshot — the disputed amount for fee-computation purposes is fixed at the block timestamp of `createDispute()`. The substantive disputed amount for the Award is determined under the disputed contract's own valuation logic. If the substantive valuation requires judicial discretion, Step 2 fails and the dispute is dismissed.

**Q6. Disputes touching family law, succession, employment, and other categories where Korean law restricts arbitrability. Within scope?**

No. Under Korean Arbitration Act §3, only matters subject to party-disposition rights are arbitrable. Family-law, succession-law, and employment-law disputes (where the latter restricts party-disposition) are outside arbitrability irrespective of the Annex D Test. Such disputes are dismissed under Article 5(2)(b) — non-binary because the underlying right cannot be fully disposed of by the Parties.

---

## 7. Scope Verification Decision Format

When dismissing a claim under Article 5, the Arbitrator publishes the following standardised decision (PII redacted) on the Platform:

```
TRIANUM SCOPE VERIFICATION DECISION

Dispute ID:       [number]
Filing Date:      [YYYY-MM-DD]
Claimant:         [wallet address or pseudonym]
Respondent:       [wallet address or pseudonym]
Disputed Subject: [summary, PII excluded]

ANNEX D TEST RESULTS:
  Step 1 (On-Chain Target):        [PASS / FAIL — reasoning]
  Step 2 (Binary Outcome):         [PASS / FAIL — reasoning]
  Step 3 (rule() Sufficiency):     [PASS / FAIL — reasoning]
  Step 4 (No Off-Chain Performance):[PASS / FAIL — reasoning]

DECISION:  [Within Scope — Proceed / Out of Scope — Dismissed]
DISMISSAL GROUND (if applicable): Article 5(2)(_)

REFUND: 50% of filing fee = [RLUSD amount]
        Refund TX: [tx hash]

ARBITRATOR: [name + EIP-712 signature]
DATE:       [YYYY-MM-DD HH:MM UTC]
```

These decisions form a publicly searchable corpus of admissibility precedent.

---

## 8. Amendment

This Annex may be amended by Trianum DAO governance under Article 34 of the Rules. Material changes to the four-step structure require a 75% supermajority vote; refinements to the worked examples, FAQ, and decision-format may be adopted by simple majority.

---

*© 2026 Trinos | Trianum Protocol*
