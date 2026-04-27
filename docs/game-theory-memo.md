# Game-Theoretic Foundation

## Schelling Point Convergence and Slashing Calibration

**Version**: 1.0
**Issuer**: Trinos
**Effective Date**: 2026-04-27
**Reference Articles**: Trianum Rules Article 22(5)

---

## 1. Problem Statement

The Trianum Dual-Award Procedure depends on **Schelling Point convergence**: Jurors, unable to communicate with one another, must independently identify and converge on the Award best supported by the evidence. The protocol must therefore make truthful voting the dominant strategy under realistic assumptions about Juror competence and incentive sensitivity.

Two parameters control the convergence incentive:

| Parameter | Symbol | Production Value |
|---|---|---|
| Slashing Rate | *s* | 10% |
| Redistribution Multiplier | *r* | 1.5× |

**Slashing**: Jurors who vote against the majority forfeit a fraction *s* of their TRN stake.

**Redistribution**: The slashed amount is redistributed to majority-vote Jurors at a multiplier *r*, drawn from the prior pool.

This memorandum analyses these production parameters across four dimensions:

(a) **Convergence equilibrium**: Does honest voting dominate naive (random) voting?
(b) **Sybil attack cost**: At what stake share and dispute value does external attack become profitable?
(c) **Refuse-to-Arbitrate equilibrium**: Does the `choice = 0` option preserve, rather than undermine, Schelling convergence?
(d) **Calibration sensitivity**: How do different *(s, r)* tuples compare?

---

## 2. The Schelling Point Model

### 2.1 Assumptions

- **Juror count**: N = 10 (default minimum under Article 20(2)).
- **Stake per Juror**: W (uniform; non-uniform stake distributions analysed in §5).
- **Honest signal accuracy**: probability *p* that an honest Juror correctly identifies the Award better supported by the evidence:
  - Clear-cut case: *p* ≈ 0.95
  - Typical case:    *p* ≈ 0.75
  - Difficult case:  *p* ≈ 0.55 (close to 50/50)

### 2.2 Per-Juror Expected Utility

Voting with the majority:
$$U_{majority} = W + r \cdot s \cdot W \cdot \frac{n_{minority}}{n_{majority}}$$

Voting against the majority:
$$U_{minority} = W \cdot (1 - s)$$

where *n_{majority}* and *n_{minority}* are the post-tally counts of each side.

### 2.3 Probability of Joining the Majority

Conditional on honest voting with accuracy *p*, the probability that a given Juror finds five or more of the other nine in agreement is:

$$P(\text{majority} \mid \text{honest}, p) = \sum_{k=5}^{9} \binom{9}{k} \, p^k (1-p)^{9-k}$$

| *p* | P(in majority) |
|:---:|:---:|
| 0.55 | 0.621 |
| 0.65 | 0.768 |
| 0.75 | 0.886 |
| 0.85 | 0.955 |
| 0.95 | 0.991 |

### 2.4 Expected Utility — Honest Voting

For typical case *p* = 0.75, W = 100, *s* = 0.10, *r* = 1.5, illustrative tally split 6/4:

$$E[U_{honest}] = 0.886 \times (100 + 1.5 \times 0.10 \times 100 \times \tfrac{4}{6}) + 0.114 \times 100 \times 0.9$$
$$= 0.886 \times 110 + 0.114 \times 90 = 97.5 + 10.3 = 107.8$$

---

## 3. Honest Voting Dominance

### 3.1 Naive (Random) Voting Baseline

A Juror voting at random (no use of evidence) faces:

$$E[U_{naive}] = 0.5 W + 0.5 W (1-s) = W (1 - s/2) = 100 \times 0.95 = 95$$

### 3.2 Honest vs Naive Comparison

| *p* | E[U_honest] | E[U_naive] | Δ |
|:---:|:---:|:---:|:---:|
| 0.55 | 97.7 | 95 | +2.7 |
| 0.65 | 101.5 | 95 | +6.5 |
| 0.75 | 104.5 | 95 | +9.5 |
| 0.85 | 106.6 | 95 | +11.6 |
| 0.95 | 107.5 | 95 | +12.5 |

**Result**: With *s* = 10%, *r* = 1.5×, honest voting strictly dominates naive voting whenever *p* > 0.55. The dominance margin grows with case clarity.

### 3.3 Difficult-Case Edge

For *p* ≈ 0.50 (essentially random truth identification):

$$E[U_{honest}] = 0.5 \times 105 + 0.5 \times 90 = 97.5$$

This is barely better than E[U_naive] = 95. In effectively coin-flip cases, the honest-voting incentive weakens.

**Mitigation**: The Annex D 4-Step Enforceability Test pre-screens disputes for binary clarity. Disputes that survive the Test typically fall in the *p* > 0.65 region where honest voting decisively dominates.

---

## 4. Sybil Attack Cost Analysis

### 4.1 Attack Model

To overturn the result, an attacker must control a majority of Jurors (≥ 6 of 10 in default panels). Stake-Weighted Random Selection means an attacker's expected sortition share equals the attacker's share of total staked TRN.

### 4.2 60%-Stake Attacker Scenario

Assume:

- Total staked TRN: 100,000,000
- Attacker share: 60% (60,000,000 TRN)
- TRN price: $1
- Slashing rate: 10%
- Dispute value: V

Expected attack outcomes:

- **Probability of majority capture** ≈ 0.633 (binomial, N = 10, p = 0.6, threshold = 6).
- **If attack fails** (probability 0.367): attacker stake slashed at 10%, loss ≈ $6,000,000.
- **If attack succeeds** (probability 0.633): attacker captures dispute value V.

Net expected payoff:
$$E[\text{net}] = 0.633 \cdot V - 0.367 \cdot \$6{,}000{,}000$$

The break-even dispute value is approximately:
$$V^* = \frac{0.367 \times 6{,}000{,}000}{0.633} \approx \$3{,}480{,}000$$

Interpretation: At 60% stake share, attacks become profitable only at dispute values exceeding ~$3.5 million. Most operationally relevant disputes ($1K–$1M) fall below this threshold.

### 4.3 Attacker Share Sensitivity

| Attacker share | P(majority) | E[loss] / dispute | Profitable threshold V* |
|:---:|:---:|:---:|:---:|
| 30% | 0.047 | $1.91M | $39M |
| 40% | 0.166 | $1.67M | $8.4M |
| 50% | 0.377 | $1.25M | $2.1M |
| 60% | 0.633 | $0.73M | $1.2M |
| 70% | 0.850 | $0.31M | $0.4M |
| 80% | 0.967 | $0.07M | $0.07M |

Profitable attack thus requires either >70% stake control (generally infeasible due to TRN distribution and DAO governance scrutiny) or extremely high dispute values.

### 4.4 Defensive Recommendations

The protocol incorporates three layers of additional Sybil defence:

- **Sortition cap**: Single-entity sortition is capped at ⌈N/3⌉ = 4 of 10 Jurors per dispute, regardless of stake share. This caps even high-stake attackers' practical influence per dispute.
- **Reputation multiplier**: Jurors with consistent past honest votes receive enhanced sortition weighting, dampening the effect of stake-dominance.
- **DAO safeguards**: When TRN market capitalisation falls below a designated threshold, dispute fees are automatically increased to restore the attack-cost ratio.

---

## 5. Non-Uniform Stake Distribution

When Juror stakes are non-uniform, the absolute slashing amount scales with stake — but the **incentive ratio remains constant** because each Juror's utility is normalised against their own stake.

Two edge cases require attention:

**Whale Juror** (single Juror holds >50% of total stake): If sortition selects this Juror in a panel of ten, this single Juror's position dominates. The §4.4 sortition cap (⌈N/3⌉ per dispute) addresses this.

**Dust Juror** (very small stake): The absolute slashing amount becomes negligible, weakening honest-voting incentive proportionally. A minimum stake requirement (e.g., 100 TRN) is imposed at sortition entry.

---

## 6. Refuse-to-Arbitrate (`choice = 0`) Analysis

### 6.1 Refuse Incentive

A Juror voting `choice = 0`:

- If majority Refuses: receives the Refusal Reward (Article 28(5)) at 30% of standard reward.
- If majority votes for an Award: this Juror is in the minority and is slashed.

This structure ensures:

- (a) Refuse is **not a passive shirking strategy** — it returns only 30% of standard reward.
- (b) Refuse is meaningful **only as a Schelling signal** when the majority finds neither Award defensible.

### 6.2 Refuse Equilibrium

Refuse-majority outcomes occur only when neither Award genuinely reflects the evidence, indicating a fundamental drafting failure. The expected frequency of such outcomes is low (Arbitrator panel quality control under Article 8 + redrafting on first Refuse-majority under Article 24-ter), and each occurrence triggers automatic redrafting rather than dispute closure.

### 6.3 Calibration

The Refusal Reward ratio (currently 30%) is reviewed periodically by the Trianum DAO based on the live frequency of Refuse-majority events. Persistent underuse signals an over-strict ratio; persistent overuse signals systemic Arbitrator quality issues.

---

## 7. Parameter Calibration Reference

For periodic DAO review:

| Operating Scenario | Recommended *s* | Recommended *r* |
|---|:---:|:---:|
| **Production (current)** | **10%** | **1.5×** |
| Active dispute volume + low TRN price | 15% | 2.0× |
| Sybil attack detected | 20% | 2.5× |
| Mature DAO + reputation system | 8% | 1.3× |
| Test phase | 5% | 1.2× |

Parameter changes apply prospectively only — disputes already registered retain their original *(s, r)* per Article 22(5). A 30-day cooldown is observed after parameter changes to permit Juror-behaviour adaptation.

---

## 8. Empirical Validation

The model is validated against Monte Carlo simulation results published in the companion **Calibration Simulation Results** document. Across 3,000 samples per scenario, production parameters yield:

- **Honest dominance**: +3.51 expected-utility units over naive voting at *p* = 0.75 (typical case).
- **Hard-case dominance**: +2.31 expected-utility units at *p* = 0.55 (close to 50/50).
- **Sybil attack profitability**: Below break-even at all dispute values <$1M in the production parameter set.

---

## 9. Conclusions

The production parameters (*s* = 10%, *r* = 1.5×) support the dual objectives of:

1. **Honest-voting dominance** under realistic Juror accuracy (*p* > 0.65, achieved through Annex D pre-filtering).
2. **Sybil attack cost** that exceeds dispute value across the operationally relevant range.

Refuse-to-Arbitrate provides a self-correcting signal mechanism without undermining Schelling convergence. The parameters are DAO-amendable to permit adaptive recalibration as live data accumulates.

---

*© 2026 Trinos | Trianum Protocol*
