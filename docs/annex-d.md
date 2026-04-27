# ANNEX D — SMART-CONTRACT ENFORCEABILITY DETERMINATION CRITERIA
## Trianum Hybrid Arbitration Rules v0.2 — Detailed Reference

**문서 코드**: TRIANUM-ANNEX-D
**버전**: v1.0 (Rules v0.2와 동시 발행)
**날짜**: 2026-04-26
**근거 조항**: Article 1(3)·(4)·(5), Article 5
**목적**: Article 5의 Scope Verification 적용 기준 표준화

---

## 1. 본 Annex의 역할

Trianum General Court는 **스마트컨트랙트로 해결 가능한 분쟁만** 수리한다. 본 Annex는 Article 1·5의 추상 기준을 운영 가능한 **4-Step Test**로 구체화한다.

본 Annex는 다음과 관련된다:

- 운영자(Arbitrator): Scope Verification 의무 (Art. 5(1))
- 신청인(Claimant): 신청 전 자가 점검
- 평가위원(KFIP 심사위원): 분쟁범위의 명확성 검증
- DAO 거버넌스: 향후 추가 분쟁범주 검토 시 본 Annex의 4-Step과의 정합성 확인

---

## 2. 4-Step Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1 — On-Chain Target Identification                      │
│  분쟁 대상이 특정 가능한 온체인 객체인가?                          │
└─────────────────────────────────────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
      YES                    NO ──→ 기각 (Article 5(2)(c) 또는 (a))
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2 — Binary Outcome Capability                           │
│  결론을 Award A 또는 Award B로 이분 표현 가능한가?              │
└─────────────────────────────────────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
      YES                    NO ──→ 기각 (Article 5(2)(b))
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3 — IArbitrable.rule() Sufficiency                      │
│  ruling 호출 1회로 집행이 종결되는가?                            │
└─────────────────────────────────────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
      YES                    NO ──→ 기각 (Article 5(2)(a) 또는 (c))
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4 — No Off-Chain Performance                            │
│  물리적 이행·법원 개입·재량적 양정이 필요 없는가?                 │
└─────────────────────────────────────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
      YES ──→ Within Scope    NO ──→ 기각 (Article 5(2)(d))
       │
       ▼
   분쟁 수리 (Article 6 진행)
```

---

## 3. Step 별 적용 기준 — 정밀화

### Step 1 — On-Chain Target Identification

**충족 조건 (모두 동시에 충족)**:
- (a) 분쟁 대상이 다음 중 하나로 명시적으로 식별된다:
  - XRPL Mainnet Escrow: `(Account, OfferSequence)`
  - XRPL EVM Sidechain 스마트 컨트랙트: `(contractAddress, disputeId)`
  - 기타 지원 네트워크의 컨트랙트: `(network, contractAddress, disputeId)`
- (b) `disputeId`는 `IArbitrable.createDispute()` 호출로 사전에 또는 동시에 등록되어야 한다.
- (c) 분쟁 대상은 **분쟁 발생 시점에 이미 온체인에 instantiated**되어 있어야 한다.

**Fail 사례**:
- 오프체인 계약서에 "이행 시 RLUSD 100을 송금"이라고만 기재되어 있고, 실제 escrow 또는 IArbitrable 컨트랙트가 배포되지 않은 경우
- "다음 달 출시될 NFT 컬렉션에 대한 사전 예약 분쟁" — 미래 사건, 온체인 대상 부재
- "어떤 사람이 어떤 트랜잭션을 했을 것이다" — 특정 트랜잭션 해시·계정 미식별

### Step 2 — Binary Outcome Capability

**충족 조건**:
- 분쟁 결과가 `ruling = 1` (Claimant 전부 승리) 또는 `ruling = 2` (Respondent 전부 승리)로 환원 가능해야 한다.
- "전부 승리"의 정의는 Article 1(2) Binary Principle에 따른다.
- `ruling = 0` (Refused) 처리는 Article 22(4)(c) 및 Article 24-ter에 따라 별도 트랙으로 운영된다 (배심원 다수가 양 Award 모두 부적절로 판단한 경우).

**Fail 사례**:
- "Respondent가 Claimant에게 750 RLUSD를 지급하라" — 분쟁가액의 *비율*에 따른 판정
- "스마트컨트랙트의 코드 X 줄을 수정하라" — 비이분
- "양 당사자가 서로 50%씩 책임진다" — 과실상계

**경계 사례 (Within scope로 처리)**:
- 분쟁가액 1,000 RLUSD escrow 전부 vs 전부 → 양 당사자가 분쟁 등록 *전에* 부분 합의에 도달했고 잔액 X에 대해서만 다투는 경우 → 잔액 X를 새 분쟁가액으로 등록 가능

### Step 3 — `IArbitrable.rule()` Sufficiency

**충족 조건**:
- (a) 분쟁 대상 컨트랙트가 ERC-792 패밀리 `IArbitrable` 인터페이스의 `rule(uint256 disputeId, uint256 ruling)` 함수를 구현하고 있다. **또는**
- (b) XRPL Mainnet Escrow의 경우, Axelar GMP–bridged `EscrowFinish`/`EscrowCancel` 호출 1회로 종결된다.

**Fail 사례**:
- 분쟁 컨트랙트가 `IArbitrable` 미구현, 그리고 escrow 래핑도 불가능한 경우
- 집행에 EOA 보유자의 별도 트랜잭션 서명이 필요한 경우 (예: multisig 추가 승인 필요)
- 집행에 외부 oracle의 별도 trigger가 필요한 경우 (예: 가격 oracle이 특정 임계값을 보고하기 전까지 release 불가)

**경계 사례**:
- 분쟁 컨트랙트가 IArbitrable는 미구현이지만, **주변에 wrapper 컨트랙트**를 배포하여 IArbitrable 호환성을 확보 가능한 경우 → 신청인이 wrapper 비용을 부담하는 조건으로 within scope로 처리

### Step 4 — No Off-Chain Performance Component

**충족 조건**:
- 신청 청구취지(relief sought)가 다음을 *모두* 충족한다:
  - (a) 물리적 인도(physical delivery) 불요
  - (b) 인적 용역(personal service) 제공 불요
  - (c) 법원 명령(court order, writ, injunction) 불요
  - (d) 형사적 제재 불요
  - (e) 손해액 산정(damages quantification)에 재량적 판단 불요

**Fail 사례**:
- "Respondent는 30일 이내에 NFT에 대응하는 실물 그림을 Claimant에게 인도하라"
- "Respondent의 모든 향후 거래에 대해 가처분"
- "Respondent에게 명예훼손 위자료 X원을 산정·지급명령"

**경계 사례**:
- 디지털 콘텐츠(예: 3D 모델 파일) 인도는 **on-chain attestation**(예: Arweave hash, IPFS CID)으로 표현 가능하다면 within scope. 단순히 "Discord에 파일 업로드" 등 검증 메커니즘 부재한 인도는 fail.

---

## 4. Worked Examples — 12개 시나리오

| # | 시나리오 | Step 1 | Step 2 | Step 3 | Step 4 | 결과 |
|---|---|:---:|:---:|:---:|:---:|---|
| 1 | XRPL Escrow conditional release dispute (1,000 RLUSD) | ✓ | ✓ | ✓ | ✓ | **수리** |
| 2 | RLUSD 결제-on-attestation dispute (디지털 deliverable + IPFS CID) | ✓ | ✓ | ✓ | ✓ | **수리** |
| 3 | XRPL EVM DEX 스왑 분쟁 (slippage tolerance violation) | ✓ | ✓ | ✓ | ✓ | **수리** |
| 4 | NFT royalty 미지급 분쟁 (royalty enforcement contract IArbitrable 구현) | ✓ | ✓ | ✓ | ✓ | **수리** |
| 5 | DAO Timelock 결의 집행 분쟁 (Timelock IArbitrable 구현) | ✓ | ✓ | ✓ | ✓ | **수리** |
| 6 | 오프체인 컨설팅 계약 — 단지 RLUSD로 결제됨 | ✗ | (n/a) | (n/a) | (n/a) | **기각** (Step 1) |
| 7 | LP position 부분손실 비율 산정 분쟁 | ✓ | ✗ | (n/a) | (n/a) | **기각** (Step 2) |
| 8 | 스마트컨트랙트 분쟁이지만 제3자 EOA 동결 가처분 필요 | ✓ | ✓ | ✗ | (n/a) | **기각** (Step 3) |
| 9 | 토큰화 부동산 — 실물 부동산 인도 분쟁 | ✓ | ✓ | ✗ | ✗ | **기각** (Step 3, 4) |
| 10 | 인공지능 모델 라이선스 분쟁 — 결과적으로 "코드 수정 명령" | ✓ | ✗ | (n/a) | (n/a) | **기각** (Step 2) |
| 11 | NFT 디지털 인도 분쟁 — IPFS CID로 검증 가능 | ✓ | ✓ | ✓ | ✓ | **수리** |
| 12 | DeFi flash-loan 공격 피해자의 손해배상 분쟁 — 실손 산정 필요 | ✓ | ✗ | (n/a) | (n/a) | **기각** (Step 2; Class action 불가) |

---

## 5. Wrapper Contract 활용 가이드

Step 3 fail 사례 중 일부는 **wrapper contract**로 within scope 진입 가능:

```solidity
// Pseudocode — Trianum-compatible wrapper for non-IArbitrable contract
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
            // ruling == 0: proportional refund — see Article 24(2)
            uint256 half = lockedAmount / 2;
            payable(claimant).transfer(half);
            payable(respondent).transfer(lockedAmount - half);
        }
    }
}
```

**Wrapper 사용 조건** (Trianum DAO 가이드):
- 양 당사자 사전 동의
- Wrapper 배포 비용 신청인 부담
- Wrapper에 disputed amount 전액 deposit 후 분쟁 등록
- 일반 IArbitrable 분쟁과 동일하게 처리

---

## 6. FAQ

**Q1. "온체인 대상이지만 ruling 호출 후에도 추가 작업이 필요한 경우"는 어떻게 처리하나?**

A: Step 3 fail. 단, 추가 작업이 *공개·자동·permissionless*하면 within scope 간주 가능. 예: `executeRuling()`이 ruling 후 누구나 호출하여 자금 이동을 트리거하는 경우는 **자동 집행**의 일부로 간주한다 (Article 24(4)).

**Q2. "분쟁 도중 disputed contract에 버그 발견"은 어떻게 처리하나?**

A: Article 12-bis 적용. 14일 suspension + DAO-approved 보안 검토 → bug가 enforceability를 훼손하면 Article 5(2)(c) 기각, Fee 전액 환불.

**Q3. "Refuse-to-Arbitrate 다수 결과"는 무엇을 의미하나?**

A: 배심원 다수가 양 Award 모두 evidence-supported가 아니라고 판단하는 case. 신뢰 가능한 Award 작성을 위해 새 Arbitrator로 Re-Drafting (Article 24-ter), 1회 한정. 두 번째도 Refuse 다수면 ruling=0 처리 (Article 24(2)).

**Q4. "지원 네트워크 외 분쟁"은 가능한가?**

A: Article 13(8) 단서 — 미지원 네트워크의 경우 신청인이 alternative documentary proof 제출. 단, Step 3에서 enforceability를 별도 입증해야 한다. Trianum DAO가 향후 네트워크 추가 시 본 Annex의 worked example 표 업데이트.

**Q5. "분쟁가액이 가변적인 경우" (예: LP position)?**

A: Article 28(2) Fee Lock Snapshot 적용 — `createDispute()` 시점의 disputed amount로 fee 산정. 단, 본질적 가액 산정에 재량 필요 시 Step 2 fail로 기각.

**Q6. "한국법상 가족·상속 등 특별재산권 관련 분쟁"은 가능한가?**

A: 한국 중재법 §3에 따라 당사자 처분권 있는 사건만 중재 가능. 가족·상속·근로 등 처분권 제한 분쟁은 본 Annex의 Step 1~4 통과 여부와 무관하게 한국법 자체로 중재 부적격. 기각.

---

## 7. Scope Verification 결정문 양식 (Article 5(3)(b))

분쟁 기각 시, Arbitrator는 다음 양식으로 공개해야 한다:

```
TRIANUM SCOPE VERIFICATION DECISION

Dispute ID: [숫자]
Filing Date: [YYYY-MM-DD]
Claimant: [지갑 주소 또는 가명]
Respondent: [지갑 주소 또는 가명]
Disputed Subject: [요약, PII 제외]

ANNEX D 4-STEP TEST RESULTS:
  Step 1 (On-Chain Target):   [PASS / FAIL — 사유]
  Step 2 (Binary Outcome):    [PASS / FAIL — 사유]
  Step 3 (rule() Sufficiency):[PASS / FAIL — 사유]
  Step 4 (No Off-Chain Perf): [PASS / FAIL — 사유]

DECISION:
  [Within Scope — Proceed / Out of Scope — Dismissed]

DISMISSAL GROUND (if applicable):
  Article 5(2)(_)

REFUND:
  50% of filing fee = [RLUSD 금액]
  Refund TX: [tx hash]

ARBITRATOR:
  [Arbitrator name + EIP-712 signature]

DATE: [YYYY-MM-DD HH:MM UTC]
```

이 결정문은 Trianum Platform에 공개되며, 향후 분쟁 시 참조 사례로 사용된다.

---

## 8. 본 Annex의 개정

본 Annex는 Trianum DAO 결의로 개정 가능하다 (Article 34). 단:
- (a) 4-Step Test의 본질적 변경(Step 추가/삭제)은 DAO 정족수 75% 이상 찬성 필요
- (b) Worked Examples 표의 추가는 일반 다수결로 가능
- (c) FAQ의 추가는 DAO Council의 직권으로 가능 (DAO 추인은 분기별)

---

*© 2026 Trinos, Inc. | TRIANUM-ANNEX-D | Trianum Protocol*
*trianum.trinos.group | dk@trinos.group*
