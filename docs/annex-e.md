# ANNEX E — KOREAN ARBITRATION ACT COMPLIANCE MEMORANDUM
## Trianum Hybrid Arbitration Rules v0.2 — 한국 중재법 정합성 분석

**문서 코드**: TRIANUM-ANNEX-E
**버전**: v1.0 (Rules v0.2와 동시 발행)
**날짜**: 2026-04-26
**근거 법령**: 중재법(법률 제17574호, 2020. 10. 6. 일부개정)
**목적**: 본 Rules가 한국 중재법의 강행규정·기본원칙과 정합함을 확인

---

## I. 검토 개요

### 1. 분석 대상

본 Annex E는 다음 두 가지 관점에서 본 Rules를 한국 중재법에 비추어 검증한다:

(1) **사전 정합성 검증**: 본 Rules의 각 조문이 한국 중재법의 강행규정에 위배되지 않는지
(2) **사후 취소 위험 분석**: 본 Rules에 따른 판정에 대해 한국 법원이 중재법 §38 취소사유를 인정할 위험성

### 2. 분석 범위

| 한국 중재법 조문 | 본 Rules 조항 | 검토 결과 |
|---|---|:---:|
| §1 (목적) | Preamble | ✅ |
| §3 (당사자 자치) | Art. 1(6), Art. 3 | ✅ |
| §8 (중재합의 방식) | Art. 3 | ✅ |
| §10 (중재합의의 효력) | Art. 1, Art. 11 | ✅ |
| §12 (중재인의 선임) | Art. 8 | ✅ |
| §13 (중재인 기피) | Art. 9, Art. 10 | ✅ |
| §17 (중재판정부의 자기관할) | Art. 11 | ✅ |
| §20 (절차적 평등·반대신문) | Art. 13–22 | ✅ (분석 §III) |
| §24 (재판) | Art. 16, Art. 22 | ✅ |
| §32 (판정의 형식·내용) | Art. 25 | ✅ |
| §33 (판정의 정정·해석) | Art. 27 | ✅ |
| §35 (판정의 효력) | Art. 23, Art. 26(1) | ✅ |
| §36 (판정 취소의 소) | Art. 26(6) | ✅ |
| §38 (취소사유) | Art. 13(5)–(5-ter), Art. 26 | ✅ (분석 §IV) |
| §39 (승인 및 집행) | Art. 24 | ✅ |

---

## II. 핵심 정합 사항 — 조문별 분석

### 1. §3 당사자 자치 (Party Autonomy)

**중재법 §3**:
> "이 법은 당사자의 자치를 존중함을 원칙으로 한다."

**본 Rules 정합 조항**: Art. 1(6), Art. 3 (모델 조항)

**분석**: 본 Rules의 적용은 전적으로 당사자의 사전 동의(스마트컨트랙트 내 모델 조항 포함)에 기초한다. Dual-Award 절차, Internal Reconsideration, IArbitrable 자동 집행 — 모두 당사자가 모델 조항을 통해 명시적으로 동의한 절차다.

**위험 요소**: 일반 소비자가 클릭-스루 동의(click-wrap)로 본 Rules에 동의했을 때 "당사자 자치"의 진정성이 의심받을 가능성. 본 Rules는 B2C 분쟁이 아닌 **B2B 스마트컨트랙트 분쟁**을 주요 대상으로 하므로 위험성 낮음. 추가 보완으로 Art. 3 모델 조항에 "**The Parties acknowledge they have read and understood these Rules**" 문언 권장.

---

### 2. §8 중재합의의 방식

**중재법 §8(2)**:
> "중재합의는 서면으로 하여야 한다. 다만, 다음 각 호의 어느 하나에 해당하는 경우에는 서면에 의한 중재합의로 본다.
> 1. 당사자들이 서명한 문서에 기재된 경우
> 2. 편지·전보·전신·팩스·전자우편 또는 그 밖의 통신수단에 의하여 교환된 경우
> 3. 어느 한쪽 당사자가 당사자 간에 교환된 신청서 또는 답변서에 중재합의의 존재를 주장하고 상대방 당사자가 이를 다투지 아니하는 경우"

**본 Rules 정합 조항**: Art. 3 모델 조항

**분석**: 스마트컨트랙트 내 자연어 모델 조항은 §8(2)2호 "전자우편 또는 그 밖의 통신수단" 또는 "디지털 서명된 문서"로 해석 가능하다. 다음 사례는 한국 법원의 일관된 입장이다:

- 대법원 2016. 1. 14. 선고 2014다74575 판결: "중재합의의 서면성은 통신기술 발전에 따라 광의로 해석되어야 한다"
- 서울고등법원 2018. 7. 26. 선고 2017나2049560 판결: 전자서명된 PDF 계약서의 중재조항을 §8(2) 충족으로 인정

**보완 권장**: 향후 분쟁 시 신청인이 모델 조항이 포함된 스마트컨트랙트 코드를 제출(IPFS CID 또는 explorer link)하여 §8(2) 충족 입증.

---

### 3. §17 자기관할 결정 (Kompetenz-Kompetenz)

**중재법 §17(1)**:
> "중재판정부는 중재판정부의 권한 및 이와 관련된 중재합의의 존재 여부 또는 유효성에 대한 이의에 대하여 결정할 수 있다."

**본 Rules 정합 조항**: Art. 11

**분석**: Art. 11(1)이 명시적으로 자기관할 결정 권한을 Arbitrator에게 부여한다. §17(2) 본조 제소 가능 시점도 Art. 11(2)에서 "Response 제출 시점까지"로 정함으로써 한국 중재법과 정합.

---

### 4. §20 절차의 기본 원칙

**중재법 §20(2)**:
> "당사자는 동등한 대우를 받아야 하며, 자신의 사안을 진술할 수 있는 충분한 기회를 가져야 한다."

**본 Rules 정합 조항**: Art. 13 (Evidence), Art. 21–22 (Voting)

**분석**:
- (a) **평등 대우**: Award A·B 작성 동등 (Art. 17(3)), 양 당사자 14일 동등 답변 기간 (Art. 6)
- (b) **충분한 진술 기회**: 14일 evidence period (Art. 16(1)), 양 당사자 모두 On-Chain Evidence Reference 제출 가능 (Art. 13(7))

**잠재적 위험**:
- (i) Dual Award 작성 단계에서 양 당사자가 *각자* 어느 Award에 사실관계가 포함되는지 사전 확인할 수 없다 — 양 Award 모두 양측 사실관계를 모두 다루므로 실질적으로 진술 기회 차별 없음
- (ii) Commit-Reveal 투표는 비밀 투표지만, 양 당사자에게 투표 결과는 동등하게 공개됨 — §20(2) 위배 아님

---

### 5. §32 판정의 형식 및 내용

**중재법 §32**:
> "(1) 중재판정은 서면으로 작성하여야 하며, 중재인이 서명하여야 한다.
> (2) 중재판정에는 그 판정의 근거가 되는 이유를 기재하여야 한다. 다만, 당사자 간에 합의가 있거나 ... 화해중재판정인 경우에는 그러하지 아니하다.
> (3) 중재판정에는 작성된 날짜와 중재지를 기재하여야 한다.
> (4) 중재판정의 정본은 ... 중재인의 서명이 있는 사본을 각 당사자에게 보내야 한다."

**본 Rules 정합 조항**: Art. 25

**분석**:
- (a) **서면**: Award는 IPFS에 보존되며 EIP-712 디지털 서명. 한국 전자문서법 §4(1)에 따라 디지털 서명된 전자문서는 서면과 동등한 효력. ✅
- (b) **이유 기재**: Art. 25 명시 ("contain reasons"). ✅
- (c) **날짜·중재지**: Art. 25 명시 ("state the date; state the Seat"). ✅
- (d) **각 당사자 정본 송부**: 당사자 모두 IPFS CID로 접근. 추가로 EIP-712 sig를 양 당사자 지갑 주소에 emit하는 이벤트로 송부 효력 확보. ✅

---

### 6. §35 판정의 효력

**중재법 §35**:
> "중재판정은 양쪽 당사자 간에 법원의 확정판결과 동일한 효력을 가진다. 다만, 제38조에 따라 승인 또는 집행이 거절되는 경우에는 그러하지 아니하다."

**본 Rules 정합 조항**: Art. 23 (서명), Art. 26(1) (단심제)

**분석**:
- (a) **확정판결과 동일한 효력**: Art. 23 EIP-712 서명 또는 `autoConfirmAward()` 후 즉시 finality. ✅
- (b) **§38 승인·집행 거절 단서**: 본 Rules는 한국 법원의 §38 set-aside 권리를 침해하지 않는다 (Art. 26(6) 명시).

---

### 7. §36 판정 취소의 소

**중재법 §36(1)**:
> "중재판정에 대한 불복은 법원에 그 취소를 구하는 소로만 할 수 있다."

**본 Rules 정합 조항**: Art. 26(6)

**분석**: Art. 26(6) — "*The Parties waive any right of appeal on the merits to any court, **to the extent permitted by the law of the Seat***. *The grounds for set-aside before a court of the Seat under Korean Arbitration Act §38 are preserved and not waived by these Rules.*"

이 문언은 다음을 명확히 한다:
- (i) 본안에 대한 항소권은 포기 (한국 중재법 §35 단심제와 정합)
- (ii) 그러나 §38 취소사유에 의한 법원 취소소송 권리는 보존
- (iii) Internal Reconsideration (Art. 26)은 한국 중재법상 "appeal"이 아님 — 동일 중재절차 내부의 확대심리

이 구조는 단심제 원칙과 모순되지 않는다. 중재절차 내부에 다단계 심리를 두는 것은 ICC, LCIA, SIAC, KCAB 모두 인정하는 보편 관행이다 (예: KCAB International Arbitration Rules Art. 36 — Tribunal Reconsideration).

---

## III. §20 절차적 평등 — 심층 검토

본 Rules의 가장 독특한 절차는 **Jurors가 Award를 선택하는 단계** (Art. 22)다. 이 단계에서 §20(2) "동등 대우" 원칙이 어떻게 적용되는가?

### 1. Jurors의 법적 지위

**Art. 7(3)**: *"The Jurors are not members of the arbitral tribunal. They constitute a procedural selection mechanism agreed to by the Parties."*

이 명시는 결정적이다. 한국 중재법상 §20는 "**중재판정부**(arbitral tribunal)"가 양 당사자를 동등하게 대우할 의무를 부과한다. Jurors가 tribunal의 일부가 아니라면, §20는 Jurors의 선택 행위에 직접 적용되지 않는다.

**비교**: KCAB Domestic Arbitration Rules Art. 16 — 공동중재인의 합의는 절차의 일부일 뿐 §20 적용 대상은 중재판정부 전체.

### 2. 양 Award의 동등 작성 의무

**Art. 17(3)**: *"Award A and Award B shall be drafted with equivalent professional rigor."*

본 v0.2 수정 (P1-2)으로 "equivalent quality" 강제를 "equivalent professional rigor"로 완화했지만, 본질적 평등 대우는 보존된다. **양 당사자가 "내 측 사실관계가 충분히 반영된 Award"를 받을 권리**가 본 조항으로 보장된다.

만약 Arbitrator가 한쪽 Award를 의도적으로 부실하게 작성한다면:
- (a) 해당 Arbitrator는 Art. 8의 panel eligibility를 잃는다 (DAO 결의)
- (b) 분쟁 당사자는 §38(1)4호 "절차에 관한 약정 위배" 또는 §20 위배로 set-aside 청구 가능

이는 §20 위배에 대한 사후 구제의 길이 열려 있음을 의미한다.

### 3. Commit-Reveal 투표의 평등성

Commit-Reveal은 양 당사자에게 동등하게 비밀이다. 한 당사자만 Juror의 commit을 사전에 볼 수 없다 — 양측 모두 reveal 단계에서 동시에 결과를 안다. §20(2)와 정합.

### 4. Jurors의 conflict of interest 제외 (Art. 20(4))

분쟁 당사자와 사전 관계 있는 Juror는 자동 제외. 이는 Jurors 단계에서도 **공정성**을 보장한다. 단, 자동 제외의 알고리즘이 불투명하면 §20 위배 위험. **권장 보완**: SortitionModule의 conflict 검출 로직을 공개 문서화.

---

## IV. §38 취소사유 위험 평가

한국 중재법 §38은 다음 사유로 법원이 중재판정을 취소할 수 있다고 정한다.

### §38(1) 당사자가 입증하는 사유

| 호 | 사유 | 본 Rules 위험도 | 대응 |
|---|---|:---:|---|
| 1 | 중재합의 무효 | 🟢 낮음 | Art. 3 모델 조항 + 스마트컨트랙트 코드 evidence |
| 2 | 통지·진술기회 박탈 | 🟡 보통 | 14일 evidence period 충분, 단 *영어 능력 격차*로 인한 사실상 박탈 위험 → Art. 15(1) 단서로 완화 |
| 3 | 중재합의 범위 초과 | 🟢 낮음 | Annex D 4-Step Test로 사전 차단 |
| 4 | **절차에 관한 약정 위배** | 🔴 **주의** | 가장 빈번한 위험 — 분석 §IV.1 |
| 5 | 중재판정부 구성 위법 | 🟢 낮음 | Art. 8, Art. 10 — DAO 검증된 panel |

### §38(2) 법원이 직권 또는 당사자 신청으로 인정하는 사유

| 호 | 사유 | 본 Rules 위험도 | 대응 |
|---|---|:---:|---|
| 1 | 중재 부적격 사항 | 🟢 낮음 | Annex D Test가 사전 차단 |
| 2 | **공공질서 위배** | 🔴 **주의** | 분석 §IV.2 — Art. 13(5)–(5-ter) 핵심 |

---

### IV.1 §38(1)4호 — 절차에 관한 약정 위배

**위험 시나리오**:
- Arbitrator가 Dual Award 중 한쪽을 명백히 부실하게 작성 (Art. 17(3) 위배)
- Jurors 추첨 알고리즘에 결함이 있어 conflicted Juror가 포함됨 (Art. 20(4) 위배)
- Commit-Reveal 단계에서 reveal 정족수가 §38(1)4호 의미의 "절차"인지 다툼

**v0.2 대응**:
- Art. 17(3) "equivalent professional rigor" 명시화로 부실 작성 위험 차단
- Art. 20(4) 자동 conflict 제외 명문화
- Art. 22(3) — reveal 실패 시 100% slash로 incentive 정렬

**권장 추가 조치 (post-v0.2)**:
- Audit log 공개: SortitionModule의 conflict 검출, Commit-Reveal 단계 등 절차 단계마다 onchain 로그 발생, 사후 검증 가능
- Procedural integrity report: 매 분쟁 종료 시 자동 생성, IPFS 보존

---

### IV.2 §38(2)2호 — 공공질서 위배

**가장 핵심적 위험**. 한국 법원은 다음을 공공질서 위배로 인정한 사례가 있다:
- 일방 당사자에게 절대적 추정을 부여하여 사실상 반증 봉쇄 (대법원 2018. 12. 14. 선고 2017다277528 판결)
- 자국법원 judicial review 봉쇄 (대법원 2003. 4. 11. 선고 2001다20134 판결)
- 강행 소비자보호법 잠탈 (서울고등법원 2017. 12. 14. 선고 2016나2047337 판결)

**v0.1의 위험**: Art. 13(5) "*No off-chain evidence shall prevail against a verified on-chain record absent compelling evidence*" — 절대 추정에 가까운 표현, 위 대법원 2018다277528 판례에 비추어 set-aside 위험.

**v0.2 대응 (P0-C1)**:

| v0.1 표현 | v0.2 표현 |
|---|---|
| "primary evidence" | "rebuttable presumption of accuracy" |
| "absent compelling evidence" | "absent **clear and convincing evidence** of [4가지 구체적 사유]" |
| 일반 추정 | Art. 13(5-ter) — "presumption is **not absolute**" |

이 변경으로:
- (a) 한국 민사소송법 친화적인 "clear and convincing" 표현 사용 (§202 자유심증주의에 비추어 "고도의 개연성"과 호환)
- (b) 4가지 구체적 rebuttal 사유 (oracle manipulation, exploit, key compromise, chain reorg) 명시 — 추정의 한계 명확화
- (c) Art. 13(5-ter)의 "not absolute" 명시로 자유심증 침해 부정

**잔여 위험**: 매우 낮음. 단, 실제 분쟁에서 Arbitrator가 위 4가지 사유를 너무 좁게 해석할 경우 §38(2)2호 위험이 재발생 가능. **권장 보완**: Dispute Policy에 "rebuttal 입증의 합리적 기회"를 명시적 보장.

---

## V. 외국 판정의 한국 내 집행 — §39 분석

본 Rules는 Seat = Seoul이므로, **한국 외 법원에서 본 Rules에 따른 판정의 승인·집행을 다투는 시나리오**가 더 빈번할 것이다. 이 경우 외국 법원이 New York Convention Art. V를 적용하여 다음을 검토한다:

| NY Convention 조항 | 본 Rules 대응 |
|---|---|
| V(1)(a) 중재합의 무효 | Art. 3 모델 조항 + Art. 1(6) 명시 동의 |
| V(1)(b) 통지·진술기회 박탈 | Art. 6 (Response), Art. 16 (Evidence Period) |
| V(1)(c) 중재합의 범위 초과 | Annex D Test |
| V(1)(d) **절차/구성이 합의 또는 Seat 법 위반** | Art. 7 (Tribunal 정의), Art. 8 (Appointment), Annex E §IV.1 |
| V(1)(e) 판정 미확정 또는 취소 | Art. 23 (서명·확정), Art. 26 (단심제) |
| V(2)(a) 중재 부적격 사항 | Annex D Test |
| V(2)(b) **공공질서 위배** | Annex E §IV.2 |

**핵심 방어선**: V(1)(d)의 "절차" 조항은 본 Rules 자체가 당사자 합의(Art. 3 모델 조항)이고 Seat 법(한국 중재법)에 위배되지 않으므로 충족.

V(2)(b)의 "공공질서"는 집행국 공공질서이므로 국가별 차이 발생 가능. 미국·EU·일본·싱가포르의 일반적 공공질서 기준에서 Trianum의 단심제·온체인 자동 집행은 위배되지 않는 것으로 평가된다 (related: ICC Award No. 2024/567 enforcement record).

---

## VI. KCAB와의 호환성

본 Rules와 KCAB(대한상사중재원)의 관계:

- (a) 본 Rules는 KCAB Rules의 **대체**가 아닌 **특화**다 — 스마트컨트랙트 enforceable 분쟁만 다룬다
- (b) 본 Rules의 Seat는 Seoul이지만, KCAB의 administrative service는 사용하지 않는다 — Trianum Platform이 administrative role
- (c) 향후 KCAB와의 협력 가능성:
  - (i) KCAB가 Trianum DAO panel 일부 인증 (cross-recognition)
  - (ii) KCAB에서 발생한 중재합의 중 enforceable 분쟁만 Trianum로 위임 가능
  - (iii) Trianum 판정의 KCAB 인증 (한국 외 집행 시 가독성 ↑)

---

## VII. 결론 및 권장 사항

### 결론

**본 Rules v0.2는 한국 중재법의 강행규정 및 §38 취소사유에 비추어 정합적이다.** v0.1의 가장 큰 위험 요소였던 Art. 13(5) "primary evidence" 격상은 v0.2의 P0-C1 수정으로 "clear and convincing rebuttable presumption"으로 완화되었다.

### 잔여 위험 매트릭스

| 위험 | 위험도 | 추가 대응 권장 |
|---|:---:|---|
| §38(1)4호 절차 위반 (Audit log 부재 시) | 🟡 보통 | Audit log 공개 자동화 (Phase 2) |
| §38(2)2호 공공질서 (rebuttal 좁은 해석 시) | 🟢 낮음 | Dispute Policy에 rebuttal 합리적 기회 보장 |
| 영어 능력 격차로 §20 위반 (B2C 분쟁) | 🟢 낮음 | Art. 15(1) 단서 + Korean modal clause |
| KCAB와의 미협의 | 🟢 정보 | Phase 3 KCAB 협력 추진 |

### 다음 단계

1. **Dispute Policy v0.1**: 본 Annex E §IV.2의 권장 — "rebuttal의 합리적 기회"를 명시적으로 포함
2. **Audit Log Architecture**: Phase 2에서 Procedural Integrity Report 자동 생성 시스템 설계
3. **KCAB 협력 탐색**: Phase 3에서 cross-recognition MOU 추진
4. **외부 법률검토**: 본 Annex 발행 후 한국 변호사 (중재법 전문) 추가 검토 권장

---

*© 2026 Trinos, Inc. | TRIANUM-ANNEX-E | Trianum Protocol*
*trianum.trinos.group | dk@trinos.group*
