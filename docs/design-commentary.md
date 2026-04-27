# Trianum Hybrid Arbitration Rules v0.2
## 설계 해설 보고서 v2.0 — v0.1 → v0.2 변경 근거 및 설계 판단

**문서 코드**: TRIANUM-DESIGN-002
**버전**: v2.0
**날짜**: 2026-04-26
**전제 조건**: 법원 선택은 스마트컨트랙트로 해결 가능한 분쟁만 포함
**대상**: Trinos, Inc. 내부 / KFIP 2026 심사 자료

---

## 1. v2.0 작성 배경

v1.0(2026-04-26 발행)은 Kleros Alpha v1.1.4 → Trianum v0.1 변환을 다뤘다. v2.0은 **사용자(Cassian Kim, Trinos CEO)의 검토 의견** 및 **한국 중재법 정합성 재검증** 결과 v0.1 → v0.2로 이행하는 변경 근거를 정리한다.

---

## 2. v0.1 → v0.2 변경 매트릭스 (전체)

### 2.1 P0 — 필수 변경 (Critical)

| # | 변경 | v0.1 위치 | v0.2 위치 | 사유 | 외부 영향 |
|---|---|---|---|---|---|
| C0 | UI Screen 1 정합 | (UI 별도) | UI 패치 (`05_UI_Alignment_Patch.md`) | UI ↔ Rules 모순 | trianum.trinos.group 배포 |
| C1 | Art. 13(5) "primary evidence" 격상 → "rebuttable presumption with clear and convincing rebuttal" | Art. 13(5) | Art. 13(5)–(5-ter) | 한국 중재법 §38(2)2호 set-aside 위험 | Annex C-2 |
| C2 | "Appeal" → "Internal Reconsideration" | Art. 26 표제·본문, Annex A | Art. 26 (재작성), Annex A 정정 | 한국 중재법 §35·§36 단심제 외관 | KFIP 신청서, 사이트 카피 |
| C3 | Smart-Contract Enforceability 4-Step Test 신설 | (없음) | Annex D | Art. 1·5 적용 기준 명확화, 자의적 dismiss 차단 | Annex D 별도 deliverable |

### 2.2 P1 — 중요 변경 (Important)

| # | 변경 | v0.1 위치 | v0.2 위치 | 사유 |
|---|---|---|---|---|
| P1-1 | Art. 1·5 역할 분리 (substantive ↔ procedural) | Art. 1·5 | Art. 1 (Substantive Scope), Art. 5 (Scope Verification) | 중복·모호성 해소 |
| P1-2 | "equivalent quality" → "equivalent professional rigor" | Art. 17(3) | Art. 17(3) | 중재인 직업윤리 충돌 완화, "preference 금지" 어조 완화 |
| P1-3 | Slashing 비율 footnote + Game Theory Memo 참조 | Art. 22(5) | Art. 22(5) (DAO-amendable 명시) | 게임이론 시뮬레이션 후 calibration |
| P1-4 | `ruling = 0` 처리 정교화 (Refusal Reward 추가) | Art. 24(2) | Art. 24(2), Art. 24-ter (Re-drafting), Art. 28(5) | 비율 명시, 재절차 트리거, 인센티브 |
| P1-5 | Fee Lock-in at Filing Timestamp | (없음) | Art. 28(2) | RLUSD/XRP 변동성 대응 |
| P1-6 | Edge case 조항 신설 | (없음) | Art. 12-bis (Bug), Art. 23-bis (Arbitrator emergency), Art. 24-bis (Bridge failure), Art. 24-ter (Re-drafting) | 운영 리스크 대응 |

### 2.3 P2 — 정리 변경 (Polish)

| # | 변경 | v0.1 위치 | v0.2 위치 | 사유 |
|---|---|---|---|---|
| P2-1 | AI Tool Vendor Disaster Recovery | (없음) | Art. 13(2-bis) | Klippa 의존성 완화 |
| P2-2 | Indigent Party Fee Waiver | (없음) | Art. 28(6) | KFIP 사회적 가치 |
| P2-3 | Annex A의 Solidity Comment Block 삭제 | Annex A | Annex A 본문 + 한국어 모델 조항 추가 | 컴파일 시 소실, 법적 효력 0 |
| P2-4 | Annex B 형식 ↔ dApp UI 매핑 정렬 | Annex B | Annex B (열 추가) | 실용성 |

---

## 3. 핵심 변경 사유 — 심층 해설

### 3.1 P0-C0 — UI ↔ Rules 정합

#### 3.1.1 발견 경위

KFIP 신청서 v0.6 작성 중 배포된 Trianum UI(trianum.trinos.group, Section §07 → §09 Interface)를 검토한 결과, Screen 1이 "Court Selection"을 표제로 General/NFT/DeFi 3개 카드를 보여주고 있었다. 그러나 v0.1 Rules Art. 2는 "*General Court... single unified court... no separate specialized sub-courts*"를 천명한다. **UI가 Rules를 위반하는 상태로 배포됨.**

#### 3.1.2 설계 판단

세 가지 옵션을 검토했다:

| 옵션 | 내용 | 평가 |
|---|---|---|
| (A) Rules 수정: Sub-court 도입 | 다층 법정 구조 채택 | NY Convention Art. V(1)(d) 방어선 약화, KFIP 마감 전 구현 부담 → **거부** |
| (B) UI 수정: Court Selection 화면 제거 | 단순화 | UX 단조 → 분쟁 분류·신청인 길잡이 부재 → **부분 거부** |
| (C) UI 의미 재정의: "Court Selection" → "Scope Verification" | General Court 단일 + 분쟁 카테고리 안내 | UX 보존 + Rules 정합 ✅ → **채택** |

#### 3.1.3 v0.2 반영

- **Rules 측면**: Art. 1(4) 표 헤더에 "*The above categories are **classifications, not separate sub-courts**. All disputes resolve before the same General Court*" 명시
- **UI 측면**: Section §09 Interface Screen 1을 "Court Selection" → "Scope Verification" 으로 변경, 카드 라벨도 "법원 선택" → "분쟁 유형 확인" + General Court 단일 표시 (별도 deliverable `05_UI_Alignment_Patch.md`)

---

### 3.2 P0-C1 — Art. 13(5) "primary evidence" 격상 위험 완화

#### 3.2.1 v0.1의 위험

v0.1 Art. 13(5):
> "*On-chain records constitute **primary evidence** and carry a rebuttable presumption of accuracy. **No off-chain evidence shall prevail against a verified on-chain record absent compelling evidence of oracle manipulation or protocol exploit.***"

이 표현은 "절대 추정"에 가깝다. 한국 중재법 §38(2)2호 "공공질서 위배" 취소사유에 해당될 위험이 있다. 대법원 2018. 12. 14. 선고 2017다277528 판결(중재판정에서 일방 당사자에게 사실상 반증 봉쇄 효과를 부여하면 공공질서 위배)이 이 위험을 입증한다.

#### 3.2.2 v0.2 수정 — 3-tier 구조

| 항 | 내용 | 효과 |
|---|---|---|
| (5) | "**rebuttable presumption** of accuracy" | 추정의 강도 명확화 — 절대 아님 |
| (5-bis) | 4가지 구체적 rebuttal 사유 (oracle, exploit, key compromise, chain reorg) | 추정 한계 명확화 |
| (5-ter) | "presumption is **not absolute**" | 한국 자유심증주의(§202 민사소송법)와 정합 |

#### 3.2.3 한국 민사소송법 친화 문언

"clear and convincing evidence" 표현은 한국 민사소송 실무에서 "고도의 개연성"으로 번역·이해된다. 추정에 대한 반증 강도는 일반 입증(preponderance) → 고도 입증(clear and convincing) → 합리적 의심 없음(beyond reasonable doubt)의 3단계로 구분되며, 본 Rules는 중간 강도를 채택했다.

---

### 3.3 P0-C2 — "Appeal" → "Internal Reconsideration"

#### 3.3.1 v0.1의 위험

v0.1 Art. 26(2):
> "Either Party may **appeal** by calling `appeal()` on KlerosCore..."

한국 중재법 §35는 "단심제" — 중재판정에 대해 법원 외 항소 절차를 인정하지 않는다. v0.1의 "appeal" 용어는 형식적으로 단심제 위배 외관을 형성한다.

**주의**: 본 Rules의 "appeal" 절차는 *동일 중재절차 내부*의 재심리이므로 실질적으로 한국 중재법 위배는 아니다. 그러나 **외관**이 위험하다 — KFIP 심사위원, 한국 변호사, 외국 법원이 표제만 보고 단심제 위배로 오인할 가능성.

#### 3.3.2 v0.2 정정

용어 전면 교체:

| v0.1 | v0.2 | 영향 범위 |
|---|---|---|
| "Appeal" | "Internal Reconsideration" / "Expanded Panel Review" | 표제, Art. 26 본문 |
| "appeal()" 함수명 | (스마트컨트랙트 호환성 위해 유지하되 주석으로 명확화) | KlerosCore.sol |
| "Appeal Period" | "Reconsideration Window" | Art. 22(6), Art. 23 |
| "Appeal Bond" | "Reconsideration Bond" | Art. 26(5), Schedule 1 |

#### 3.3.3 외관 + 실체 정합

Art. 26(6)에서 다음을 명시:
- (a) "*Internal Reconsideration is part of the same arbitral proceeding... and is not an external appeal*"
- (b) "*The grounds for set-aside before a court of the Seat under Korean Arbitration Act §38 are preserved and not waived*"

이로써 한국 중재법 §35(단심제) 외관 정합 + §36(취소소송) 실체 보존 모두 달성.

#### 3.3.4 비교법적 근거

KCAB International Arbitration Rules Art. 36 — "Tribunal Reconsideration" 라는 동일 용어 사용. ICC, LCIA, SIAC 모두 *동일 절차 내부의 review*를 "appeal"이 아닌 다른 용어로 칭한다. 본 v0.2는 글로벌 관행과 정합.

---

### 3.4 P0-C3 — Annex D 4-Step Enforceability Test 신설

#### 3.4.1 v0.1의 결함

v0.1 Art. 1(4)는 6개 카테고리를 "within scope"로 예시하지만, 새로운 분쟁 유형 출현 시 누가·어떻게 enforceability를 판단하는지 절차 부재. Art. 5(2)도 dismissal 사유를 추상적으로만 나열.

#### 3.4.2 v0.2 — 4-Step Test 표준화

Annex D에 4-Step Decision Tree 도입:

```
Step 1 — On-Chain Target Identification
Step 2 — Binary Outcome Capability
Step 3 — IArbitrable.rule() Sufficiency
Step 4 — No Off-Chain Performance Component
```

각 Step에 (a) 충족 조건, (b) Fail 사례, (c) 경계 사례를 명시. 12개 Worked Examples로 적용 사례를 구체화.

#### 3.4.3 운영 효과

- **Arbitrator**: Scope Verification 기준 표준화 — 자의적 판단 차단
- **Claimant**: 신청 전 자가 점검 가능 — 무익한 분쟁 등록 차단
- **DAO**: 새 분쟁 카테고리 검토 시 4-Step 정합성 확인 — 일관된 거버넌스
- **KFIP 심사위원**: 분쟁 범위의 명확성 검증 가능 — 평가 항목 ↑

---

### 3.5 P1-2 — Art. 17(3) "equivalent quality" 완화

#### 3.5.1 v0.1의 충돌

v0.1 Art. 17(3):
> "*Award A and Award B shall be of **equivalent quality, length, and depth**. The Arbitrator shall not, by drafting, **indicate a preference**.*"

이 문언은 중재인의 직업윤리와 정면 충돌한다. 전문 중재인은 약자/피해자 보호 또는 명백한 사실인정에 따른 양심상 한쪽 award를 더 강하게 작성하고 싶을 수 있다. "preference 표시 금지"가 강행되면 중재인의 합리적 판단을 봉쇄한다.

#### 3.5.2 v0.2 완화 (P1-2)

> "*Award A and Award B shall be drafted with **equivalent professional rigor**. ... The Arbitrator may, in setting out the legal analysis, **identify the strongest argument available on each side**; the Arbitrator shall not, however, by drafting style, formatting, or omission, signal a preference between the two Awards.*"

#### 3.5.3 효과

- "Quality" → "Rigor" — 동일한 *완성도*는 요구하지만, 동일한 *결론적 설득력*은 요구하지 않음
- "Strongest argument" 명시화 — 중재인이 양측 최강 논거를 작성할 의무 보존
- "Drafting style/formatting/omission" 한정 — preference 표시 금지의 적용 범위 명확화

이로써 중재인 윤리와 절차적 평등 모두 보존.

---

### 3.6 P1-6 — Edge Case 조항 신설

#### 3.6.1 신설 배경

KFIP 심사위원 시각의 적대적 검증에서 "Trianum이 다음 운영 리스크에 어떻게 대응하는가"가 반복적 질문으로 도출됨:

1. 분쟁 도중 분쟁 대상 컨트랙트에 버그 발견 시?
2. Arbitrator가 분쟁 도중 사망 또는 응급상황?
3. Axelar GMP 또는 XRPL 네트워크 정지 시?
4. 배심원 다수가 양 Award 모두 거부(Refuse) 시?

v0.1은 이 4가지 모두 부재.

#### 3.6.2 v0.2 신설 4개 조항

| 조항 | 내용 | 핵심 |
|---|---|---|
| Art. 12-bis | Bug Discovery | 14일 suspension + DAO-approved 검토 + 결과에 따른 dismissal/resume |
| Art. 23-bis | Arbitrator Incapacity | 7일 내 DAO 대체 + 기존 award 유지 또는 Re-drafting |
| Art. 24-bis | Bridge Failure | 72시간 임계 + Pending Execution + 30일 내 대체경로 |
| Art. 24-ter | Refuse Majority Re-drafting | 새 Arbitrator + Fresh Dual Award + 1회 한정 |

#### 3.6.3 일관된 설계 원칙

모든 edge case 조항은 다음 원칙을 따른다:
- (a) **시간제한 명시** (24h, 72h, 7일, 14일, 30일)
- (b) **DAO 거버넌스 트리거** — 단일 사람의 자의 차단
- (c) **Original deposit 보호** — 운영 리스크가 당사자 손해로 전가되지 않음
- (d) **Tolling 규정** — 다른 기간 (drafting, signing) 중지

---

## 4. 외부 영향 매트릭스

본 v0.2 수정이 외부 산출물에 미치는 영향:

| 외부 산출물 | 영향 정도 | 필요 작업 |
|---|:---:|---|
| trianum.trinos.group (UI) | 🔴 High | UI 정합성 패치 (P0-C0) — `05_UI_Alignment_Patch.md` |
| KFIP 신청서 v0.6 → v1.0 | 🟡 Medium | "Appeal" → "Reconsideration" 용어 정정, Annex D 인용 |
| Trianum 데모 영상 (4개) | 🟢 Low | 자막 "Appeal" → "Reconsideration" 옵션 (post-pitch 반영) |
| Pitch deck (작성 예정) | 🟡 Medium | Annex D Test + Annex E 정합성 슬라이드 신설 |
| Smart Contract (KlerosCore.sol) | 🟢 Low | `appeal()` 함수명 유지, NatSpec 주석 정정 |
| Korean Subtitles (NotebookLM) | 🟢 Low | 새 자막 STT 시 정정 |
| Litepaper / Whitepaper | 🟡 Medium | Annex D·E 인용 문장 추가 |

---

## 5. 한국 중재법 정합성 — 핵심 결론 (Annex E 요약)

본 v0.2의 핵심은 다음 4가지 정합성 강화다:

| 한국 중재법 조문 | v0.1 위험 | v0.2 대응 |
|---|---|---|
| §3 (당사자 자치) | 클릭-스루 동의 위험 | Art. 3 모델 조항 + "*acknowledge they have read*" 권장 |
| §20 (절차적 평등) | Art. 17(3) "equivalent quality" 강제 | "equivalent professional rigor" 완화 |
| §35–36 (단심제) | "Appeal" 용어 외관 위반 | "Internal Reconsideration"으로 전면 정정 |
| §38(2)2호 (공공질서) | "primary evidence" 절대 추정 | "rebuttable + clear and convincing rebuttal" 3-tier 구조 |

**잔여 위험**: 매우 낮음. 자세한 분석은 `03_Annex_E_KoreanArbitrationAct_Compliance.md` §IV 참조.

---

## 6. 산출물 인덱스

본 v0.2 패키지의 산출물:

| # | 파일 | 분량 | 상태 |
|---|---|---|---|
| 1 | `01_Trianum_Arbitration_Rules_v0.2.md` | 60KB | ✅ 완료 |
| 2 | `02_Annex_D_Enforceability_Criteria.md` | 17KB | ✅ 완료 |
| 3 | `03_Annex_E_KoreanArbitrationAct_Compliance.md` | 22KB | ✅ 완료 |
| 4 | `04_Design_Commentary_v2.0.md` (본 문서) | 16KB | ✅ 완료 |
| 5 | `05_UI_Alignment_Patch.md` (Claude Code 프롬프트 + APPLY 스크립트) | ~10KB | ⏳ 작성 중 |
| 6 | `06_GameTheory_Memo.md` + `slashing_simulation.py` | ~15KB + Python | ⏳ 작성 중 |

---

## 7. 다음 단계

### 7.1 즉시 (KFIP 신청서 v1.0 마감 5/13 전)

| 항목 | 마감 | 담당 |
|---|---|---|
| Rules v0.2 + Annex D + E + Commentary v2.0 | 2026-04-26 ✅ | (이 문서로 완료) |
| UI 정합성 패치 배포 | 2026-04-27 | Hermes Telegram → Cloudflare 자동 재빌드 |
| Game Theory Memo + Python 시뮬레이션 | 2026-05-05 | 내부 분석 |
| KFIP 신청서 v0.6 → v1.0 — Annex D·E 인용 추가 | 2026-05-10 | dk@trinos.group |
| KFIP 신청서 PDF 변환 + 양식 정합화 | 2026-05-12 | dk@trinos.group |
| KFIP 제출 | 2026-05-13 | dk@trinos.group |

### 7.2 Final Pitch (6/25) 전

| 항목 | 마감 | 담당 |
|---|---|---|
| Dispute Policy v0.1 (Annex C·D·E 기반) | 2026-05-25 | 법무 팀 |
| Klippa DocHorizon 한국어 무료 체험 | 2026-05-30 | 플랫폼 팀 |
| Game Theory 시뮬레이션 결과 → Slashing 비율 calibration | 2026-06-05 | 게임이론 팀 |
| KlerosCore.sol NatSpec 주석 v0.2 정합화 | 2026-06-10 | 개발 팀 |
| Pitch deck 12 슬라이드 (Annex D 시각화 포함) | 2026-06-15 | 디자인 팀 |
| KFIP 2026 Final Pitch | 2026-06-25 | Trinos 전 팀 |

---

## 8. 브랜드·명칭 통일 체크리스트 (v2.0 갱신)

모든 향후 문서·UI·코드에서 아래 치환 적용 (v1.0 대비 4건 추가):

| 구버전 (사용 금지) | 현행 (사용) | 신규 (v2.0 추가) |
|---|---|:---:|
| K-Kleros | Trianum | |
| K-PNK | TRN | |
| KlerosCore (외부 명칭) | Trianum Protocol / KlerosCore (컨트랙트 파일명은 유지) | |
| Enforcement Track | Execution Track | |
| K-Kleros Track / Global Track | (없음, 단일 트랙) | |
| Platform administrator (Kleros) | Trianum Platform administrator | |
| **Appeal** | **Internal Reconsideration / Reconsideration** | ✅ |
| **Appeal Period** | **Reconsideration Window** | ✅ |
| **Appeal Bond** | **Reconsideration Bond** | ✅ |
| **primary evidence** (on-chain) | **rebuttable presumption of accuracy (on-chain)** | ✅ |
| **Court Selection** (UI 카피) | **Scope Verification** | ✅ |

---

*© 2026 Trinos, Inc. | TRIANUM-DESIGN-002 v2.0 | Internal Design Document*
*trianum.trinos.group | dk@trinos.group*
