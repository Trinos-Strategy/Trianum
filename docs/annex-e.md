# ANNEX E — KOREAN ARBITRATION ACT COMPLIANCE

## Trianum Hybrid Arbitration Rules — Compliance Memorandum

**Version**: 1.0
**Issuer**: Trinos
**Effective Date**: 2026-04-27
**Governing Statute**: Korean Arbitration Act (Act No. 17574, partially amended 6 October 2020)

---

## I. Overview

This memorandum analyses the Trianum Hybrid Arbitration Rules against the Korean Arbitration Act on two dimensions:

(1) **Ex-ante alignment** — whether each Rule provision conforms to the mandatory provisions of the Korean Arbitration Act.
(2) **Set-aside risk assessment** — whether a Korean court could find grounds under Korean Arbitration Act §38 to set aside an Award rendered under these Rules.

The analysis concludes that the Rules are aligned with the Act and that residual set-aside risk is low, with specific risk-mitigation features built into the procedural design.

---

## II. Provision-by-Provision Compliance Map

| Korean Arbitration Act | Trianum Rules Provision | Status |
|---|---|:---:|
| §1 (purpose) | Preamble | ✓ |
| §3 (party autonomy) | Art. 1(6), Art. 3 | ✓ |
| §8 (form of arbitration agreement) | Art. 3 (model clause) | ✓ |
| §10 (effect of arbitration agreement) | Art. 1, Art. 11 | ✓ |
| §12 (appointment of arbitrators) | Art. 8 | ✓ |
| §13 (challenge of arbitrator) | Art. 9, Art. 10 | ✓ |
| §17 (kompetenz-kompetenz) | Art. 11 | ✓ |
| §20 (procedural equality and right to be heard) | Art. 13–22 | ✓ (analysis §IV) |
| §24 (hearings) | Art. 16, Art. 22 | ✓ |
| §32 (form and content of award) | Art. 25 | ✓ |
| §33 (correction and interpretation) | Art. 27 | ✓ |
| §35 (effect of award) | Art. 23, Art. 26(1) | ✓ |
| §36 (set-aside action) | Art. 26(6) | ✓ |
| §38 (grounds for set-aside) | Art. 13(5)–(5-ter), Art. 26 | ✓ (analysis §V) |
| §39 (recognition and enforcement) | Art. 24 | ✓ |

---

## III. Key Compliance Provisions Analysed

### 1. §3 — Party Autonomy

Korean Arbitration Act §3:
> "*This Act shall respect the principle of party autonomy.*"

The Rules apply only by Party agreement, expressed through the model clause embedded in the disputed smart contract (Article 3). Each substantive feature — the Dual-Award Procedure, Internal Reconsideration, automatic on-chain enforcement — is consented to by reference under Article 1(6) when the Parties agree to the Rules.

A residual concern with click-wrap consent in B2C contexts is mitigated by the Rules' substantive scope: Trianum is designed for B2B smart-contract disputes where parties typically execute deliberate code commitments. The model clause includes acknowledgement language that parties have read and understood the Rules.

### 2. §8 — Form of the Arbitration Agreement

Korean Arbitration Act §8(2):
> "*The arbitration agreement shall be made in writing. However, an arbitration agreement is also deemed to be made in writing in any of the following cases: 1. when contained in a document signed by the parties; 2. when exchanged by letter, telegraph, telex, fax, electronic mail, or other means of communication; 3. when one party asserts the existence of an arbitration agreement in a complaint or response exchanged between the parties and the other party does not contest it.*"

A natural-language model clause embedded in a smart contract qualifies under §8(2)2 as "electronic mail or other means of communication" or alternatively as a digitally signed document. Korean courts have consistently interpreted §8(2) broadly in light of evolving communication technology. In the event of a challenge, the Party relying on the agreement submits the smart-contract source code (with IPFS CID or block-explorer link) as evidence of the written form.

### 3. §17 — Kompetenz-Kompetenz

Korean Arbitration Act §17(1):
> "*The arbitral tribunal may rule on its own jurisdiction, including any objections with respect to the existence or validity of the arbitration agreement.*"

Article 11(1) of the Rules expressly vests jurisdiction-determination authority in the Arbitrator. Article 11(2) sets the timing of objections (no later than the Response), aligned with §17(2) of the Act.

### 4. §20 — Procedural Equality

Korean Arbitration Act §20(2):
> "*The parties shall be treated equally and shall be given a full opportunity to present their case.*"

The Rules implement this through:

- **Equal drafting**: Article 17(3) — Award A and Award B are drafted with equivalent professional rigor; the Arbitrator may not signal a preference through drafting style, formatting, or omission.
- **Equal evidence period**: Article 6 provides each Party 14 days to submit its position and evidence.
- **Equal access to on-chain evidence**: Article 13(7)–(8) — either Party may submit an On-Chain Evidence Reference; the Platform verifies symmetrically.
- **Symmetric confidentiality**: Commit-Reveal voting (Articles 21–22) is opaque to both Parties; the tally is revealed simultaneously.

The procedural-equality principle is examined in further depth in §IV below.

### 5. §32 — Form and Content of the Award

Korean Arbitration Act §32:
> "*(1) An arbitral award shall be made in writing and signed by the arbitrator(s).
> (2) An arbitral award shall state the reasons upon which it is based, except where the parties have agreed otherwise or where the award is on agreed terms.
> (3) An arbitral award shall state the date and the place of arbitration.
> (4) A signed copy of the arbitral award shall be delivered to each party.*"

Article 25 of the Rules satisfies all four requirements:

- **In writing**: The Award is preserved on IPFS with an EIP-712 digital signature. Korean Electronic Documents Act §4(1) treats digitally signed electronic documents as equivalent to writing.
- **Reasons**: Article 25 requires reasons.
- **Date and seat**: Article 25 requires both.
- **Delivery to each party**: Both Parties access the Award via IPFS CID; the EIP-712 signature event emitted to both wallet addresses constitutes delivery.

### 6. §35 — Effect of the Award

Korean Arbitration Act §35:
> "*An arbitral award shall have the same effect between the parties as the final judgment of a court, except where recognition or enforcement is refused under Article 38.*"

Article 23 establishes the moment of finality (signature or auto-confirmation) and Article 26(1) declares the Award final and binding from that moment. The §38 set-aside path remains available — Article 26(6) expressly preserves it.

### 7. §36 — Set-Aside Action

Korean Arbitration Act §36(1):
> "*Recourse against an arbitral award shall be made only by an action for setting aside the award before the court.*"

Article 26(6) of the Rules:
> "*The Parties waive any right of appeal on the merits to any court, to the extent permitted by the law of the Seat. The grounds for set-aside before a court of the Seat under Korean Arbitration Act §38 are preserved and not waived by these Rules.*"

This provision draws three distinctions:

- (i) Substantive appeal to courts is waived (consistent with §35 single-instance finality).
- (ii) §38 set-aside rights are preserved (consistent with §36 mandatory provision).
- (iii) The Internal Reconsideration mechanism (Article 26) is part of the same arbitral proceeding and does not constitute an appeal.

The mechanism mirrors comparable institutional rules — for example, KCAB International Arbitration Rules Article 36 (Tribunal Reconsideration), ICC, LCIA, and SIAC all provide intra-arbitral review mechanisms distinct from court appeals.

---

## IV. Article §20 — Procedural Equality in Detail

The Trianum procedure includes a feature unique among institutional rules: Jurors select between two arbitrator-drafted Awards. The §20 analysis below demonstrates that this mechanism preserves procedural equality.

### 1. The Legal Status of Jurors

Article 7(3):
> "*The Jurors are not members of the arbitral tribunal. They constitute a procedural selection mechanism agreed to by the Parties.*"

This characterisation is decisive. Korean Arbitration Act §20 imposes equal-treatment duties on the **arbitral tribunal**. Where Jurors are not part of the tribunal, §20 does not directly govern their selection action — the duty applies to the Arbitrator, who structures the choice.

This characterisation has analogues in Korean and international institutional practice: party-appointed expert panels, shadow tribunals, and consultative drafting committees are recognised procedural devices that augment a sole arbitrator without expanding the tribunal.

### 2. Equivalent Drafting of Both Awards

Article 17(3) ensures both Parties receive an Award "*with equivalent professional rigor*" — meaning that the Party's position is fully and competently presented in its preferred Award irrespective of the Arbitrator's eventual view of the merits.

Where the Arbitrator drafts an inferior Award:

- The Arbitrator faces removal from the panel under Article 8 by Trianum DAO resolution.
- The aggrieved Party may seek set-aside under Korean Arbitration Act §38(1)4 (procedural-agreement breach) or §20 (procedural equality).

Procedural-equality protection is therefore structurally enforced through both administrative (panel removal) and judicial (set-aside) channels.

### 3. Symmetry of Commit-Reveal Voting

Commit-Reveal voting is opaque to both Parties symmetrically — neither Party knows individual Juror commitments before the Reveal Phase. The tally outcome is revealed to both Parties simultaneously. No procedural asymmetry exists.

### 4. Conflict-of-Interest Exclusion

Article 20(4) provides automatic replacement of Jurors with conflicts of interest. The SortitionModule's conflict-detection logic is publicly documented to ensure transparency, satisfying the §20 fairness requirement.

---

## V. §38 Set-Aside Risk Assessment

The Korean Arbitration Act §38 lists exhaustive grounds for set-aside. Each is examined below in respect of the Trianum Rules.

### §38(1) — Party-Initiated Grounds

| Ground | Analysis | Risk |
|---|---|:---:|
| 1. Invalid arbitration agreement | Article 3 model clause is embedded in the disputed smart contract; Korean courts treat smart-contract code as written form | Low |
| 2. Lack of notice / opportunity to be heard | Article 6 (14-day Response period); Article 13 evidence procedure; Korean-language support under Article 15(1) | Low–Medium |
| 3. Award beyond the scope of arbitration agreement | Annex D Test pre-screens dispute admissibility | Low |
| 4. Procedural breach of agreement | See discussion below | **Medium** |
| 5. Improper composition of tribunal | Article 8 (DAO-vetted panel); Article 10 (challenge procedure) | Low |

#### §38(1)4 — Procedural-Agreement Breach (highest residual risk)

The most plausible set-aside pathway is a Party arguing that the Arbitrator drafted one of the Dual Awards inferiorly, breaching Article 17(3). The Rules respond with:

- **Structural symmetry** — Article 17(3) explicit requirement of equivalent rigor.
- **Audit trail** — On-chain logging of dispute lifecycle (`SortitionModule` Juror selection, Commit-Reveal hashes, tally) provides post-facto verifiability.
- **Administrative remedy** — Trianum DAO panel removal under Article 8.

Risk-mitigation feature: Each dispute generates a publishable Procedural Integrity Report drawn from on-chain logs, available to a court reviewing a §38(1)4 challenge.

### §38(2) — Court-Initiated Grounds

| Ground | Analysis | Risk |
|---|---|:---:|
| 1. Subject matter not arbitrable | Annex D Test; family-law, succession, certain employment claims excluded under Article 5(2) | Low |
| 2. Public policy violation | See discussion below | **Low** (post-mitigation) |

#### §38(2)2 — Public-Policy Considerations (rebuttable presumption mechanic)

A Korean court evaluating Article 13(5) would consider whether the on-chain evidence's "rebuttable presumption of accuracy" effectively forecloses the disputing Party from contesting the record — a recognised public-policy concern in Korean arbitration jurisprudence (e.g., Supreme Court 2018. 12. 14. 2017Da277528).

The Rules address this concern through three layers:

1. The presumption is **rebuttable**, not absolute (Article 13(5)).
2. **Four enumerated rebuttal grounds** are identified explicitly (Article 13(5-bis)): oracle manipulation, smart-contract exploit, key compromise, chain-reorganisation. The list is non-exhaustive, but the enumeration provides procedural clarity.
3. The presumption is **expressly not absolute** (Article 13(5-ter)) — where rebuttal evidence is presented, the Arbitrator weighs the on-chain record alongside other evidence in accordance with the Dispute Policy, the Korean Arbitration Act, and the standards of natural justice.

The rebuttal standard — "*clear and convincing evidence*" — is intermediate, sitting between preponderance and beyond reasonable doubt, comparable to Korean civil-procedure "고도의 개연성" (high probability). It is sufficiently strict to preserve the practical force of on-chain finality, while permitting genuine challenges to proceed.

---

## VI. Cross-Border Enforcement under the New York Convention

Since the Seat is Seoul, an Award rendered under these Rules is a "Korean award" for purposes of the *New York Convention on the Recognition and Enforcement of Foreign Arbitral Awards*. Recognition and enforcement before foreign courts is governed by Article V of the Convention.

| Convention Ground | Trianum Rules Response |
|---|---|
| V(1)(a) — Invalid arbitration agreement | Article 3 model clause + Article 1(6) explicit consent |
| V(1)(b) — Notice or opportunity-to-be-heard failure | Article 6 (Response), Article 16 (Evidence Period) |
| V(1)(c) — Award beyond scope | Annex D Test pre-screening |
| V(1)(d) — Procedure or composition not in accord with party agreement or seat law | Article 7 (tribunal definition), Article 8 (appointment), Annex E §IV |
| V(1)(e) — Award not yet binding or set aside | Article 23 (signature triggers finality), Article 26 (single-instance) |
| V(2)(a) — Subject matter not arbitrable in enforcement state | Annex D Test |
| V(2)(b) — Public policy of enforcement state | Annex E §V |

The principal cross-border enforcement risk is V(1)(d): a foreign court's interpretation of "the procedure agreed by the parties." The Rules respond by making the procedure entirely the Parties' agreement — expressed in Article 3 — and by aligning that procedure with Korean Arbitration Act mandatory provisions, satisfying both prongs of V(1)(d).

---

## VII. Cooperation with KCAB

The Rules complement, rather than substitute for, the Korean Commercial Arbitration Board (KCAB):

- Trianum is a specialised forum for smart-contract-enforceable disputes (Annex D Test). Disputes outside the Test belong before KCAB or other competent fora.
- The Trianum Platform performs the administrative function — KCAB's institutional support is not invoked in current operations.
- Future cooperation pathways are open: cross-recognition of arbitrator panels, KCAB administrative endorsement of Trianum awards for foreign enforcement, and joint training programmes.

---

## VIII. Conclusion

The Trianum Hybrid Arbitration Rules conform to the mandatory provisions of the Korean Arbitration Act. The principal residual risks — procedural-agreement breach (§38(1)4) and public-policy concerns over the on-chain evidence presumption (§38(2)2) — are addressed through structural and procedural mitigations built into the Rules.

The Rules are designed to produce Awards that are enforceable under §35 of the Act, that survive set-aside review under §38, and that are recognised by foreign courts under the New York Convention.

---

*© 2026 Trinos | Trianum Protocol*
