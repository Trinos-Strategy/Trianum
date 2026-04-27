# Slashing Calibration — Simulation Results

**문서 코드**: TRIANUM-SIM-001
**버전**: v1.0
**날짜**: 2026-04-27
**근거**: `slashing_simulation.py` (Monte Carlo, 3,000 samples per scenario)
**상응 메모**: Game Theory Memo

---

## 1. 결과 요약

v0.2 default 매개변수 ($s = 10\%, r = 1.5\times$)는 일반 분쟁 ($p \geq 0.65$)에서 **honest 투표가 우월 전략**임을 검증.

[**📊 인터랙티브 차트 보기**](/docs-assets/chart.html){target="_blank"}

---

## 2. Calibration Sweep — $p = 0.75$ (일반 분쟁)

| Scenario | $s$ | $r$ | $U_{honest}$ | $U_{naive}$ | $\Delta$ | Honest dominant? |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Test phase | 5% | 1.0× | 99.99 | 98.42 | +1.57 | ✓ |
| Mature DAO | 8% | 1.3× | 100.46 | 97.77 | +2.69 | ✓ |
| **v0.2 DEFAULT** | **10%** | **1.5×** | **101.00** | **97.48** | **+3.51** | **✓** |
| Slight tighten | 12% | 1.7× | 101.71 | 97.32 | +4.39 | ✓ |
| High-attack risk | 15% | 2.0× | 103.11 | 97.30 | +5.81 | ✓ |
| Sybil detected | 20% | 2.5× | 106.32 | 97.85 | +8.47 | ✓ |
| Crisis mode | 30% | 3.0× | 112.74 | 98.96 | +13.77 | ✓ |

**해석**: 모든 시나리오에서 honest 투표가 naive(무작위) 투표를 우월. Slashing 강도가 클수록 honest dominance 격차 증가. v0.2 default는 안전 + 적정선 조합.

---

## 3. Hard-case — $p = 0.55$ (분쟁이 50:50에 가까운 어려운 사건)

| Scenario | $s$ | $r$ | $U_{honest}$ | $U_{naive}$ | $\Delta$ |
|---|:---:|:---:|:---:|:---:|:---:|
| Test phase | 5% | 1.0× | 100.08 | 99.09 | +0.99 |
| Mature DAO | 8% | 1.3× | 100.63 | 98.89 | +1.74 |
| **v0.2 DEFAULT** | **10%** | **1.5×** | **101.28** | **98.97** | **+2.31** |
| High-attack risk | 15% | 2.0× | 103.87 | 99.92 | +3.95 |
| Crisis mode | 30% | 3.0× | 115.75 | 105.89 | +9.86 |

**해석**: 어려운 사건에서도 honest dominance 성립. 단 격차가 좁아 ($p \approx 0.55$일 때 v0.2 default $\Delta = +2.31$). 따라서 어려운 사건은 **Annex D 4-Step Test로 사전 차단**하여 분포가 $p > 0.65$ 영역에 머물도록 하는 것이 핵심 안전 장치.

---

## 4. Sybil Attack ROI — v0.2 default 기준

100M TRN total staked + TRN @ \$1 가정.

| Dispute value | Attacker share | $P(majority)$ | $E[gain]$ | $E[loss]$ | Net $E$ | Profitable? |
|---:|:---:|:---:|---:|---:|---:|:---:|
| $10K | 60% | 0.633 | $6,331 | $2,201,380 | -$2,195,049 | ✗ |
| $10K | 80% | 0.967 | $9,672 | $262,348 | -$252,676 | ✗ |
| $100K | 60% | 0.633 | $63,310 | $2,201,380 | -$2,138,070 | ✗ |
| $1M | 60% | 0.633 | $633,100 | $2,201,380 | -$1,568,280 | ✗ |
| $1M | 80% | 0.967 | $967,200 | $262,348 | +$704,852 | ✓ |
| $10M | 60% | 0.633 | $6,331,000 | $2,201,380 | +$4,129,620 | ✓ |

**해석**:
- 일반 분쟁가액 ($10K~$1M) + 60% 미만 attacker share에서는 공격 불수익.
- **공격이 수익성 있는 임계값**: 분쟁가액 ≥ \$1M + attacker share ≥ 80%, 또는 분쟁가액 ≥ \$10M + attacker share ≥ 60%.
- 100M TRN 시가총액 기준에서 60% 장악 ($60M TRN)은 시장 매수 불가 수준 → 사실상 공격 불가.
- TRN 가격 급락 시 공격 비용 임계값 하락 → DAO Safeguard로 fee 자동 인상 권장 (Game Theory Memo §4.3 (c)).

---

## 5. 권장 매개변수 (90일 후 DAO 검토)

| 시나리오 | 권장 $s$ | 권장 $r$ | 비고 |
|---|:---:|:---:|---|
| **현재 (v0.2 default)** | **10%** | **1.5×** | 이번 시뮬레이션 검증 완료 |
| TRN 시총 < \$50M | 15% | 2.0× | Sybil 임계값 상향 |
| Sybil attack 탐지 시 | 20% | 2.5× | DAO 긴급 결의 |
| Reputation system 가동 후 | 8% | 1.3× | 평판 가중치로 추가 안전망 |
| Test/staging | 5% | 1.0× | 인센티브 약하게 운영 |

---

## 6. 재현 방법

### 6.1 Python 시뮬레이션 직접 실행

```bash
cd 01_design/rules_v0.2/
python3 slashing_simulation.py --samples 5000 --p 0.75 --csv output.csv
```

### 6.2 매개변수 튜닝 실험

`slashing_simulation.py`의 `CALIBRATION_GRID` 배열을 수정하여 다른 $(s, r)$ 조합 검증 가능:

```python
CALIBRATION_GRID = [
    (0.05, 1.0, "Test phase"),
    # 추가
    (0.07, 1.2, "Light pressure"),
    # ...
]
```

### 6.3 차트로 시각화

본 페이지의 [📊 인터랙티브 차트](/docs-assets/chart.html)에서 calibration sweep + Sybil ROI를 동적으로 탐색.

---

## 7. 결론

(1) **v0.2 default는 견고**: 모든 시나리오에서 honest dominance 성립, Sybil 공격은 일반 분쟁가액에서 비수익.
(2) **Annex D 4-Step Test가 분쟁 분포의 $p$ 하한 보장**: 어려운 사건을 사전 차단하여 시뮬레이션의 $p > 0.65$ 가정을 유지.
(3) **DAO 거버넌스 발동 조건**: TRN 시가총액·attacker stake share·실 분쟁 데이터를 90일 단위로 모니터링하여 매개변수 재조정.

---

*© 2026 Trinos, Inc. | TRIANUM-SIM-001*
*[← Game Theory Memo](/docs.html?doc=game-theory-memo) · [Rules v0.2 →](/docs.html?doc=rules)*
