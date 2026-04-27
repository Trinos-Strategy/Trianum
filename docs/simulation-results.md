# Calibration Simulation Results

## Slashing Parameters — Empirical Validation

**Version**: 1.0
**Issuer**: Trinos
**Effective Date**: 2026-04-27
**Method**: Monte Carlo simulation, 3,000 samples per scenario

---

## 1. Summary

The production slashing parameters (*s* = 10%, *r* = 1.5×) preserve honest-voting dominance and render Sybil attacks unprofitable at operationally relevant dispute values.

[**Interactive chart →** `/docs-assets/chart.html`](/docs-assets/chart.html)

---

## 2. Calibration Sweep — Typical Case (*p* = 0.75)

Per-Juror expected utility comparison across calibration scenarios (W = 100 baseline):

| Scenario | *s* | *r* | *U_honest* | *U_naive* | Δ | Honest dominant? |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Test phase | 5% | 1.0× | 99.99 | 98.42 | +1.57 | ✓ |
| Mature DAO | 8% | 1.3× | 100.46 | 97.77 | +2.69 | ✓ |
| **Production** | **10%** | **1.5×** | **101.00** | **97.48** | **+3.51** | **✓** |
| Slight tightening | 12% | 1.7× | 101.71 | 97.32 | +4.39 | ✓ |
| High-attack risk | 15% | 2.0× | 103.11 | 97.30 | +5.81 | ✓ |
| Sybil detected | 20% | 2.5× | 106.32 | 97.85 | +8.47 | ✓ |
| Crisis mode | 30% | 3.0× | 112.74 | 98.96 | +13.77 | ✓ |

**Interpretation**: Honest voting dominates naive voting in every scenario tested. Stricter slashing widens the dominance margin. The production parameters strike a balance between deterrent effect and Juror participation cost.

---

## 3. Difficult Case — *p* = 0.55

Per-Juror expected utility comparison when individual Juror accuracy approaches 50/50:

| Scenario | *s* | *r* | *U_honest* | *U_naive* | Δ |
|---|:---:|:---:|:---:|:---:|:---:|
| Test phase | 5% | 1.0× | 100.08 | 99.09 | +0.99 |
| Mature DAO | 8% | 1.3× | 100.63 | 98.89 | +1.74 |
| **Production** | **10%** | **1.5×** | **101.28** | **98.97** | **+2.31** |
| High-attack risk | 15% | 2.0× | 103.87 | 99.92 | +3.95 |
| Crisis mode | 30% | 3.0× | 115.75 | 105.89 | +9.86 |

**Interpretation**: Honest dominance persists in difficult cases, with a narrower margin (Δ ≈ +2.3 at production). The Annex D 4-Step Enforceability Test pre-filters disputes for binary clarity, keeping the live distribution of *p* in the >0.65 range where honest voting decisively dominates.

---

## 4. Sybil Attack ROI — Production Parameters

Assumptions: 100M TRN total staked, TRN @ $1, *s* = 10%, *r* = 1.5×.

| Dispute value | Attacker share | P(majority) | E[gain] | E[loss] | Net E | Profitable? |
|---:|:---:|:---:|---:|---:|---:|:---:|
| $10K | 60% | 0.633 | $6,331 | $2,201,380 | -$2,195,049 | ✗ |
| $10K | 80% | 0.967 | $9,672 | $262,348 | -$252,676 | ✗ |
| $100K | 60% | 0.633 | $63,310 | $2,201,380 | -$2,138,070 | ✗ |
| $1M | 60% | 0.633 | $633,100 | $2,201,380 | -$1,568,280 | ✗ |
| $1M | 80% | 0.967 | $967,200 | $262,348 | +$704,852 | ✓ |
| $10M | 60% | 0.633 | $6,331,000 | $2,201,380 | +$4,129,620 | ✓ |

**Interpretation**:

- Operationally relevant dispute values ($10K–$1M) yield negative expected returns at all Sybil stake shares ≤ 60%.
- Attack profitability requires either dispute values ≥ $1M paired with stake share ≥ 80%, or dispute values ≥ $10M with stake share ≥ 60%.
- 60% stake control corresponds to $60M TRN — generally infeasible in a liquid market and detectable by DAO governance.
- The attack-cost threshold scales with TRN price; protocol-level safeguards (DAO fee adjustment when TRN market cap drops) are designed to maintain the threshold under market volatility.

---

## 5. Recommended Parameter Ranges for Periodic Review

| Operating Scenario | Recommended *s* | Recommended *r* | Notes |
|---|:---:|:---:|---|
| **Production (current)** | **10%** | **1.5×** | Validated by this simulation |
| Low TRN market cap (< $50M) | 15% | 2.0× | Maintain Sybil deterrence under price pressure |
| Active Sybil attack detected | 20% | 2.5× | DAO emergency resolution |
| Reputation system mature | 8% | 1.3× | Reputation-weighted sortition adds defence |
| Test / staging | 5% | 1.0× | Lighter incentive during pilot phases |

---

## 6. Reproducibility

### 6.1 Method

Each scenario draws 3,000 simulated 10-Juror panels under the assumed accuracy *p*, computes the post-tally per-Juror expected utility, and averages across samples. Sybil ROI uses the binomial distribution for majority capture probability conditional on attacker stake share.

### 6.2 Parameter Tuning

Alternative *(s, r)* combinations may be evaluated by extending the simulation grid and re-running the analysis. The methodology is documented in the companion **Game-Theoretic Foundation** memorandum.

### 6.3 Live Validation

The simulation will be re-run periodically against accumulated live dispute data. Where empirical Schelling-Point performance diverges materially from the model, the Trianum DAO may resolve to recalibrate the parameters under Article 22(5).

---

## 7. Conclusions

(1) **Production parameters are robust**: honest voting dominates in all tested scenarios, including difficult cases.

(2) **Annex D pre-filtering is essential**: it ensures that the live distribution of *p* remains in the regime where honest-voting dominance is decisive. Disputes near *p* ≈ 0.5 are excluded from admission.

(3) **Sybil attacks are economically deterred** at all operationally relevant dispute values under reasonable TRN market conditions.

(4) **DAO governance retains adaptive control** through Article 22(5): the Slashing Rate and Redistribution Multiplier may be re-calibrated based on accumulated live data, subject to a 30-day cooldown that protects in-flight disputes.

---

*© 2026 Trinos | Trianum Protocol*
