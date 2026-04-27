# DAO Governance Charter

## Trianum Protocol — Governance Structure and Decentralisation Roadmap

**Version**: 1.0
**Issuer**: Trinos, Inc.
**Effective Date**: 2026-04-27

---

## 1. Mission and Scope

The Trianum DAO governs the parameters of the Trianum Protocol. Its mission is to maintain the protocol as a credible neutral arbitration forum for smart-contract-enforceable disputes, balancing three priorities:

1. **Legal soundness** — preserving the protocol's status as a Korean arbitral forum producing awards enforceable under the *Korean Arbitration Act* and the *New York Convention*.
2. **Economic security** — calibrating slashing and redistribution parameters so that honest juror conduct remains the dominant strategy.
3. **Operational sustainability** — funding protocol development, security review, and ecosystem growth from accumulated treasury revenues.

The DAO's authority is parameter-level: it adjusts variables within the framework established by the Rules and this Charter. The Rules themselves may be amended by the DAO under Article 34, but only prospectively and not as to disputes already filed.

---

## 2. Voting Power

### 2.1 Source

Voting power derives from TRN tokens (ERC20Votes-compatible). One TRN equals one vote.

### 2.2 Delegation

A token-holder may delegate voting power to themselves or to another address. Delegation is on-chain, revocable at any time, and snapshot-based: voting weight on a proposal is determined at the block of proposal creation, not at the time of vote.

### 2.3 Quorum and Majority

| Proposal Type | Quorum (% of circulating TRN) | Approval Threshold |
|---|:---:|:---:|
| Standard parameter change | 4% | Simple majority |
| Treasury allocation > 1% of treasury | 6% | Simple majority |
| Court-creation proposal | 8% | 60% supermajority |
| Rules amendment (Article 34) | 10% | 67% supermajority |
| Constitutional change to this Charter | 15% | 75% supermajority |

Quorum percentages are measured against TRN circulating supply at the proposal-creation snapshot.

### 2.4 Conviction Voting

Standard parameter changes use **Conviction Voting**: a voter's effective weight on a proposal grows with the time that vote is locked in, encouraging deliberation over flash-vote tactics. Maximum conviction multiplier is 2× over a 14-day lock period. Detailed conviction-voting parameters are set by the DAO Council (§6) within bounds established at deployment.

---

## 3. Proposal Lifecycle

### 3.1 Stages

Each proposal moves through five stages:

| Stage | Duration | Purpose |
|---|:---:|---|
| Discussion | ≥ 7 days | Off-chain forum debate; no on-chain action |
| Draft | 3 days | On-chain proposal posted with bond; comment period |
| Voting | 14 days | Token-weighted voting; conviction accumulates |
| Timelock | 48 hours | Post-approval delay before execution |
| Execution | atomic | Approved actions executed on-chain |

Emergency proposals (§7) compress these stages.

### 3.2 Proposer Requirements

To post a Draft, a proposer must:

- Hold or have delegated to them at least 0.1% of circulating TRN.
- Post a proposal bond of 100,000 TRN. The bond is refunded if the proposal reaches Voting; forfeited if the proposal is withdrawn or rejected at Draft.

### 3.3 Voter Requirements

Any TRN holder (or delegate) at the proposal-creation snapshot may vote. There is no minimum holding threshold for voting, only for proposing.

---

## 4. Treasury

### 4.1 Composition

The Trianum DAO Treasury holds:

- 25% of total TRN supply, vesting linearly over 4 years from Phase 1 (§8) launch.
- Accumulated RLUSD revenue from the 0.5% treasury fee component (Article 28(1) of the Rules).
- Reconsideration Bond forfeitures from rejected reconsiderations (Article 26(5) of the Rules).
- Slashed-Arbitrator-fee transfers from auto-confirmed awards (Article 23(3) of the Rules).

### 4.2 Multi-Signature Custody

Until DAO Phase 3 (§8), the Treasury is held in a 5-of-9 multi-signature wallet:

- 4 founder/contributor signers
- 3 external advisors (legal, security, ecosystem)
- 2 community-elected signers

In Phase 3, the multisig is replaced by a DAO-controlled smart contract requiring an executed governance proposal for any disbursement.

### 4.3 Spending Categories

| Category | Description | Approval Path |
|---|---|---|
| Ongoing operations | Engineering, legal review, infrastructure | Quarterly budget; standard proposal |
| Security audit programme | External audit firms, bug bounty payouts | DAO Council discretion within $200K/quarter cap |
| Ecosystem grants | Trianum-compatible smart-contract integrations | Standard proposal per grant |
| Strategic partnerships | KCAB, regulator engagement, academic collaborations | Standard proposal |
| Emergency response | Bug remediation, security incident | Emergency proposal (§7) |

---

## 5. Court-Parameter Governance

### 5.1 DAO-Amendable Parameters

The following Rules parameters are DAO-amendable, prospectively only:

| Parameter | Reference | Default | Bounds |
|---|---|:---:|---|
| Slashing Rate | Art. 22(5) | 10% | 5%–30% |
| Redistribution Multiplier | Art. 22(5) | 1.5× | 1.0×–3.0× |
| Refusal Reward Ratio | Art. 28(5) | 30% | 0%–50% |
| Arbitration Fee Rate | Art. 28(1) | 3% | 1%–5% |
| Minimum Jurors | Art. 20(2) | 3 | 3–11 |
| Reconsideration Bond Multiplier (R1) | Art. 26(5) | 2× | 1.5×–5× |
| Reconsideration Window | Art. 22(6), Art. 26(2) | 7 days | 5–14 days |

### 5.2 Calibration Cadence

The DAO publishes calibration recommendations quarterly based on:

- Live dispute volume and outcome distribution
- Schelling-Point performance metrics
- Sybil-attack indicator monitoring
- TRN market capitalisation as a multiple of typical dispute value

Detailed calibration methodology is set out in the **Game-Theoretic Foundation** memorandum.

### 5.3 Cooldown

Parameter changes apply prospectively only. Disputes already registered under the prior parameters retain those parameters through final disposition. A 30-day cooldown between successive changes to the same parameter is observed to permit juror-behaviour adaptation.

---

## 6. The DAO Council

### 6.1 Composition and Term

The DAO Council is a 7-member body that performs operational duties between governance proposals:

- 4 elected members, 1-year staggered terms
- 2 ex-officio members (Trinos, Inc. CTO; Lead Counsel)
- 1 community ombudsperson (rotated quarterly from active jurors)

Until DAO Phase 2, all Council members are appointed by Trinos, Inc. From Phase 2 onward, elected positions are filled by TRN-holder vote.

### 6.2 Council Authority

The Council may, without further DAO vote:

- Authorise expenditures within DAO-approved quarterly budgets
- Engage external auditors and counsel
- Publish calibration recommendations
- Issue emergency procedural notices (subject to DAO ratification within 30 days)
- Approve AI Authenticity Tool vendor changes (Rules Article 13(2-bis))

Council decisions are executed under the Treasury multi-signature scheme until Phase 3.

---

## 7. Emergency Procedures

### 7.1 Trigger Conditions

Emergency procedures may be invoked by Council resolution when:

- A critical smart-contract vulnerability is discovered with active exploitation or imminent risk
- Cross-chain bridge infrastructure (Axelar GMP) suffers extended outage
- Regulatory action in any of the seven jurisdictions analysed in the **TRN Token Paper** materially affects protocol operations
- TRN market capitalisation falls below the Sybil-attack-cost threshold (set at $50M in current parameters)

### 7.2 Emergency Proposal Path

Emergency proposals compress the standard lifecycle:

| Stage | Standard | Emergency |
|---|:---:|:---:|
| Discussion | ≥ 7 days | Concurrent with Draft |
| Draft | 3 days | 24 hours |
| Voting | 14 days | 72 hours |
| Timelock | 48 hours | 6 hours (or zero for critical security patches) |

Emergency proposals require a 60% approval threshold and an 8% quorum. Council emergency notices remain effective until DAO ratification within 30 days.

### 7.3 Pause Authority

The Council holds authority to pause new dispute filings for up to 14 days in case of critical infrastructure failure or active exploitation. In-flight disputes continue under their original parameters; only `createDispute()` calls are blocked during pause.

---

## 8. Progressive Decentralisation Roadmap

### Phase 1 — Foundation Steward (2026 Q2 launch)

- Trinos, Inc. operates as foundation-multisig steward.
- TRN-holders vote in advisory capacity on parameter recommendations.
- All Treasury disbursements require Trinos, Inc. approval.

### Phase 2 — Hybrid Governance (2026 Q4)

- TRN-holders gain direct binding vote on court parameters (Slashing Rate, Multiplier, Fee Rate).
- DAO Council elected by TRN-holders for 4 of 7 seats.
- Treasury continues under foundation-multisig with DAO approval requirement for amounts > $50K.

### Phase 3 — Full DAO Governance (2027 Q1)

- All DAO-amendable parameters under direct TRN-holder vote.
- Treasury moves from multi-signature to DAO-controlled smart contract.
- Trinos, Inc. retains only consultative role (no veto).

### Phase 4 — Constitutional DAO (2028)

- On-chain DAO judicial review for parameter changes that may conflict with the Rules.
- Multi-court expansion under DAO proposal.
- Cross-recognition agreements (KCAB, foreign arbitration institutions) negotiated by DAO.

### Phase Transitions

Each phase transition requires a Phase Transition Proposal — a special proposal subject to:

- 12% quorum, 67% approval
- Independent legal review confirming Korean Arbitration Act compliance is preserved
- Independent security review confirming smart-contract readiness for the new authority distribution

---

## 9. Conflicts of Interest

### 9.1 Arbitrator Independence

Arbitrators on the Trianum DAO-managed panel must declare non-holding of TRN tokens (Rules Article 9(2)). DAO governance over arbitrator panel composition is performed by the Council, not the broader TRN-holder body, to avoid conflict between juror constituency and arbitrator constituency.

### 9.2 Council Member Disclosure

Council members must disclose:

- Any TRN holdings exceeding 0.5% of circulating supply
- Any holdings in DAO-treasury-allocated assets
- Any consulting or other relationships with Trianum-integrated protocols

Disclosures are published on-chain and updated quarterly.

### 9.3 Recusal

Council members recuse from votes on proposals where they have a material conflict. Recusal is recorded on-chain.

---

## 10. Amendment of This Charter

This Charter may be amended by Trianum DAO under the constitutional-change threshold (15% quorum, 75% supermajority approval, 14-day discussion + 14-day voting). Amendments to the progressive decentralisation roadmap (§8) cannot accelerate phase transitions beyond the schedule without the constitutional-change threshold; deceleration may be approved at a lower threshold.

---

*© 2026 Trinos, Inc. | Trianum Protocol*
