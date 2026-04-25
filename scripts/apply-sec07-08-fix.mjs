#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'index.html';
let html = readFileSync(FILE, 'utf8');

// ── helper: find matching </section> ──
function findSectionEnd(h, start) {
  let depth = 0, i = start;
  while (i < h.length) {
    if (h.startsWith('<section', i)) { depth++; i++; }
    else if (h.startsWith('</section>', i)) {
      depth--;
      if (depth === 0) return i + '</section>'.length;
      i++;
    } else i++;
  }
  return -1;
}

// ── 1. 117 → 114 ──
html = html.replaceAll('117건 통과', '114건 통과');
html = html.replaceAll('117 tests passing', '114 tests passing');
html = html.replaceAll('117 TESTS PASSING', '114 TESTS PASSING');
console.log('[1] 117 → 114 done');

// ── 2. Remove Brand Architecture card from sec06 (team) ──
const baStart = html.indexOf('<article class="team-card reveal-ready">\n          <div class="team-meta" data-i18n="tm.role3">');
if (baStart === -1) {
  // try alternate match
  const baAlt = html.indexOf('data-i18n="tm.role3">Brand Architecture</div>');
  if (baAlt !== -1) {
    const artStart = html.lastIndexOf('<article', baAlt);
    const artEnd = html.indexOf('</article>', baAlt) + '</article>'.length;
    html = html.slice(0, artStart) + html.slice(artEnd);
    console.log('[2] Brand Architecture card removed (alt match)');
  } else {
    console.log('[2] WARN: Brand Architecture card not found');
  }
} else {
  const baEnd = html.indexOf('</article>', baStart) + '</article>'.length;
  html = html.slice(0, baStart) + html.slice(baEnd);
  console.log('[2] Brand Architecture card removed');
}

// ── 3. Locate old sec07 (videos) and sec08 (trn-meaning) ──
const sec08Start = html.indexOf('<section id="trn-meaning"');
const sec08End = sec08Start !== -1 ? findSectionEnd(html, sec08Start) : -1;
const sec07Start = html.indexOf('<section id="videos"');
const sec07End = sec07Start !== -1 ? findSectionEnd(html, sec07Start) : -1;
console.log(`[3] sec07: ${sec07Start}..${sec07End}, sec08: ${sec08Start}..${sec08End}`);

// ── 4. Remove old sections (remove later one first to preserve indices) ──
const cuts = [[sec07Start, sec07End], [sec08Start, sec08End]]
  .filter(([s, e]) => s !== -1 && e !== -1)
  .sort((a, b) => b[0] - a[0]);
for (const [s, e] of cuts) html = html.slice(0, s) + html.slice(e);
console.log(`[4] Removed ${cuts.length} old sections`);

// ── 5. New sections HTML ──
const NEW_SEC07_08 = `
<!-- 07 Videos -->
<section id="videos" class="section section-alt">
  <div class="container">
    <div class="section-head reveal-ready">
      <p class="section-label display-en" data-i18n-html="sec07.label">07&nbsp;&nbsp;&nbsp;Videos</p>
      <h2 class="section-title" data-i18n="sec07.title">Watch Trianum in action.</h2>
      <p class="section-body" data-i18n="sec07.lede">Trianum 프로토콜의 상세 구조와 코드 데모를 영상으로 확인하세요.</p>
    </div>
    <div class="proof-grid">
      <a class="proof-card reveal-ready" href="https://youtu.be/tFePfDK-uCY" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">
        <div class="proof-top"><h3 data-i18n="vid1.title">대표 간단 소개</h3><span class="badge badge-burgundy">1:58 &middot; EN</span></div>
        <div class="proof-copy"><p data-i18n="vid1.desc">Trianum이 무엇인지 2분 안에 &mdash; TL;DR, first-touch viewer용.</p>
        <span class="button-link">&blacktriangleright; Watch on YouTube &nearr;</span></div>
      </a>
      <a class="proof-card reveal-ready" href="https://youtu.be/a0DT_gRv4v8" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">
        <div class="proof-top"><h3 data-i18n="vid2.title">라이브 코드 데모</h3><span class="badge badge-emerald">0:51 &middot; TERMINAL</span></div>
        <div class="proof-copy"><p data-i18n="vid2.desc">12-Phase 분쟁 라이프사이클 &mdash; 터미널 화면 녹화.</p>
        <span class="button-link">&blacktriangleright; Watch on YouTube &nearr;</span></div>
      </a>
      <a class="proof-card reveal-ready video-ko-only" href="https://youtu.be/cjRywj8qdWY" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">
        <div class="proof-top"><h3 data-i18n="vid3.title">완전 해설</h3><span class="badge badge-burgundy">5:38 &middot; KO</span></div>
        <div class="proof-copy"><p data-i18n="vid3.desc">조리·법리·자치 삼중성, 단심제 절차, 7개 관할 비증권 분석까지 종합 설명.</p>
        <span class="button-link">&blacktriangleright; Watch on YouTube &nearr;</span></div>
      </a>
      <a class="proof-card reveal-ready video-en-only" href="https://youtu.be/D7FGOLxhfB0" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">
        <div class="proof-top"><h3 data-i18n="vid4.title">Full Walkthrough</h3><span class="badge badge-emerald">5:51 &middot; EN</span></div>
        <div class="proof-copy"><p data-i18n="vid4.desc">Three-fold structure, single-instance procedure, 7-jurisdiction non-security analysis.</p>
        <span class="button-link">&blacktriangleright; Watch on YouTube &nearr;</span></div>
      </a>
    </div>
  </div>
</section>

<!-- 08 TRN Token -->
<section id="trn-meaning" class="section">
  <div class="container">
    <div class="section-head reveal-ready">
      <p class="section-label display-en" data-i18n-html="sec08.label">08&nbsp;&nbsp;&nbsp;TRN&nbsp;Token</p>
      <h2 class="section-title" data-i18n="sec08.title">TRN &mdash; 세 글자, 세 가지 의미.</h2>
      <p class="section-body" data-i18n="sec08.sub">Trianum의 어근 Tri(셋)의 첫 세 글자가 곳 프로토콜의 DNA입니다.</p>
      <p class="section-body display-en"><em>Three jurors &middot; three chain layers &middot; three pillars of trust &mdash; converging into one verdict.</em></p>
    </div>
    <div class="proof-grid">
      <article class="proof-card reveal-ready trn-card trn-card--t">
        <div class="proof-top"><div class="trn-letter">T</div><h3>Trust</h3></div>
        <div class="proof-copy"><p data-i18n="trn.t.desc">신뢰 담보 &mdash; 배심원이 스테이킹으로 분쟁 판정의 무결성을 예치합니다. 잘못된 판단에는 <strong>10% 슬래싱</strong>.</p>
        <p class="display-en"><em>Juror stake &middot; slashing protection</em></p></div>
      </article>
      <article class="proof-card reveal-ready trn-card trn-card--r">
        <div class="proof-top"><div class="trn-letter">R</div><h3>Render</h3></div>
        <div class="proof-copy"><p data-i18n="trn.r.desc">판결 집행 &mdash; Commit-Reveal 투표와 Dual Award로 결론을 온체인에 <strong>렌더링</strong>하는 연산 권한.</p>
        <p class="display-en"><em>Commit-Reveal &middot; Dual Award rendering</em></p></div>
      </article>
      <article class="proof-card reveal-ready trn-card trn-card--n">
        <div class="proof-top"><div class="trn-letter">N</div><h3>Network</h3></div>
        <div class="proof-copy"><p data-i18n="trn.n.desc">거버넌스 네트워크 &mdash; ERC20Votes 위임과 Conviction Voting을 통한 DAO 의사결정 지분.</p>
        <p class="display-en"><em>Delegation &middot; Conviction Voting</em></p></div>
      </article>
    </div>
    <p class="section-body reveal-ready" style="margin-top:3rem;text-align:center;font-style:italic;max-width:52rem;margin-inline:auto" data-i18n="trn.note">T&middot;R&middot;N 모두 능동적 참여를 요구합니다 &mdash; TRN은 Work Token이며, 수동 수익 상품이 아닙니다.</p>
    <div class="brand-architecture-block reveal-ready" style="margin-top:var(--space-10);padding:var(--space-6);border:1px solid var(--color-border);border-top:2px solid var(--color-accent);border-radius:var(--radius-lg);background:var(--color-surface);box-shadow:var(--shadow-sm)">
      <span class="section-label display-en" data-i18n="tm.role3">Brand Architecture</span>
      <div class="brand-architecture" style="margin-top:var(--space-3);padding:var(--space-4);border-radius:var(--radius-md);border:1px solid var(--color-border);background:color-mix(in oklch,var(--color-surface-2) 100%,transparent);font-size:var(--text-sm);font-family:var(--font-mono);line-height:1.75;white-space:pre-wrap;color:var(--color-text-muted)">Trianum Protocol\nTrianum Core\nTrianum Sortition\nTrianum Court\nTRN Token</div>
    </div>
  </div>
</section>
`;

// ── 6. Insert new sections before </main> ──
const mainEnd = html.lastIndexOf('</main>');
if (mainEnd === -1) { console.error('FATAL: </main> not found'); process.exit(1); }
html = html.slice(0, mainEnd) + NEW_SEC07_08 + '\n' + html.slice(mainEnd);
console.log('[6] Inserted sec07+08 before </main>');

// ── 7. CSS additions (before last </style>) ──
const NEW_CSS = `
/* sec07/08 lang filter */
[data-lang="ko"] .video-en-only { display: none; }
[data-lang="en"] .video-ko-only { display: none; }
/* TRN letter gradient */
.trn-letter { font-family:var(--font-display); font-size:clamp(2.5rem,2rem + 1.5vw,4rem); font-weight:600; line-height:1; margin-bottom:0.25rem; }
.trn-card--t .trn-letter { background:linear-gradient(135deg,oklch(0.65 0.14 162),oklch(0.72 0.13 198)); background-clip:text; -webkit-background-clip:text; color:transparent; -webkit-text-fill-color:transparent; }
.trn-card--r .trn-letter { background:linear-gradient(135deg,oklch(0.65 0.18 355),oklch(0.62 0.19 315)); background-clip:text; -webkit-background-clip:text; color:transparent; -webkit-text-fill-color:transparent; }
.trn-card--n .trn-letter { background:linear-gradient(135deg,oklch(0.72 0.14 83),oklch(0.58 0.16 300)); background-clip:text; -webkit-background-clip:text; color:transparent; -webkit-text-fill-color:transparent; }
.trn-card--t { background:linear-gradient(160deg,oklch(0.65 0.14 162/0.12) 0%,transparent 60%),var(--color-surface)!important; border-color:oklch(0.65 0.14 162/0.35)!important; }
.trn-card--r { background:linear-gradient(160deg,oklch(0.65 0.18 355/0.12) 0%,transparent 60%),var(--color-surface)!important; border-color:oklch(0.65 0.18 355/0.35)!important; }
.trn-card--n { background:linear-gradient(160deg,oklch(0.72 0.14 83/0.14) 0%,transparent 60%),var(--color-surface)!important; border-color:oklch(0.72 0.14 83/0.40)!important; }
[data-theme="dark"] .trn-card--t { background:linear-gradient(160deg,oklch(0.65 0.14 162/0.20) 0%,transparent 60%),var(--color-surface)!important; }
[data-theme="dark"] .trn-card--r { background:linear-gradient(160deg,oklch(0.65 0.18 355/0.20) 0%,transparent 60%),var(--color-surface)!important; }
[data-theme="dark"] .trn-card--n { background:linear-gradient(160deg,oklch(0.72 0.14 83/0.22) 0%,transparent 60%),var(--color-surface)!important; }
#videos .proof-card { cursor:pointer; }
`;
const styleEnd = html.lastIndexOf('</style>');
html = html.slice(0, styleEnd) + NEW_CSS + html.slice(styleEnd);
console.log('[7] CSS injected');

// ── 8. i18n keys ──
const KO_MARKER = '"sec06.title": "\ubc95\uc801 \uc804\ubb38\uc131\uacfc \uc554\ud638\ud559\uc801 \uc5c4\ubc00\uc131.",';
const EN_MARKER = '"sec06.title": "Legal expertise meets cryptographic rigor.",';

const KO_KEYS = `
    "sec07.label": "07&nbsp;&nbsp;&nbsp;\uc601\uc0c1",
    "sec07.title": "\uc601\uc0c1\uc73c\ub85c \ud655\uc778\ud558\ub294 Trianum.",
    "sec07.lede": "Trianum \ud504\ub85c\ud1a0\ucf5c\uc758 \uc0c1\uc138 \uad6c\uc870\uc640 \ucf54\ub4dc \ub370\ubaa8\ub97c \uc601\uc0c1\uc73c\ub85c \ud655\uc778\ud558\uc138\uc694.",
    "sec08.label": "08&nbsp;&nbsp;&nbsp;TRN \ud1a0\ud070",
    "sec08.title": "TRN \u2014 \uc138 \uae00\uc790, \uc138 \uac00\uc9c0 \uc758\ubbf8.",
    "sec08.sub": "Trianum\uc758 \uc5b4\uadfc Tri(\uc14b)\uc758 \uccab \uc138 \uae00\uc790\uac00 \uacf3 \ud504\ub85c\ud1a0\ucf5c\uc758 DNA\uc785\ub2c8\ub2e4.",
    "vid1.title": "\ub300\ud45c \uac04\ub2e8 \uc18c\uac1c",
    "vid1.desc": "Trianum\uc774 \ubb34\uc5c7\uc778\uc9c0 2\ubd84 \uc548\uc5d0 \u2014 TL;DR, first-touch viewer\uc6a9.",
    "vid2.title": "\ub77c\uc774\ube0c \ucf54\ub4dc \ub370\ubaa8",
    "vid2.desc": "12-Phase \ubd84\uc7c1 \ub77c\uc774\ud504\uc0ac\uc774\ud074 \u2014 \ud130\ubbf8\ub110 \ud654\uba74 \ub179\ud654.",
    "vid3.title": "\uc644\uc804 \ud574\uc124",
    "vid3.desc": "\uc870\ub9ac\u00b7\ubc95\ub9ac\u00b7\uc790\uce58 \uc0bc\uc911\uc131, \ub2e8\uc2ec\uc81c \uc808\ucc28, 7\uac1c \uad00\ud560 \ube44\uc99d\uad8c \ubd84\uc11d\uae4c\uc9c0 \uc885\ud569 \uc124\uba85.",
    "trn.t.desc": "\uc2e0\ub8b0 \ub2f4\ubcf4 \u2014 \ubc30\uc2ec\uc6d0\uc774 \uc2a4\ud14c\uc774\ud0b9\uc73c\ub85c \ubd84\uc7c1 \ud310\uc815\uc758 \ubb34\uacb0\uc131\uc744 \uc608\uce58\ud569\ub2c8\ub2e4. 10% \uc2ac\ub798\uc2f1.",
    "trn.r.desc": "\ud310\uacb0 \uc9d1\ud589 \u2014 Commit-Reveal \ud22c\ud45c\uc640 Dual Award\ub85c \uacb0\ub860\uc744 \uc628\uccb4\uc778\uc5d0 \ub80c\ub354\ub9c1\ud558\ub294 \uc5f0\uc0b0 \uad8c\ud55c.",
    "trn.n.desc": "\uac70\ubc84\ub10c\uc2a4 \ub124\ud2b8\uc6cc\ud06c \u2014 ERC20Votes \uc704\uc784\uacfc Conviction Voting\uc744 \ud1b5\ud55c DAO \uc758\uc0ac\uacb0\uc815 \uc9c0\ubd84.",
    "trn.note": "T\u00b7R\u00b7N \ubaa8\ub450 \ub2a5\ub3d9\uc801 \ucc38\uc5ec\ub97c \uc694\uad6c\ud569\ub2c8\ub2e4 \u2014 TRN\uc740 Work Token\uc774\uba70, \uc218\ub3d9 \uc218\uc775 \uc0c1\ud488\uc774 \uc544\ub2d9\ub2c8\ub2e4.",`;

const EN_KEYS = `
    "sec07.label": "07&nbsp;&nbsp;&nbsp;Videos",
    "sec07.title": "Watch Trianum in action.",
    "sec07.lede": "Explore Trianum's protocol architecture and code demos in video form.",
    "sec08.label": "08&nbsp;&nbsp;&nbsp;TRN&nbsp;Token",
    "sec08.title": "TRN \u2014 three letters, three meanings.",
    "sec08.sub": "The first three letters of Trianum's root Tri- encode the protocol's DNA.",
    "vid1.title": "Quick Intro",
    "vid1.desc": "What Trianum is in under 2 minutes \u2014 TL;DR for first-touch viewers.",
    "vid2.title": "Live Code Demo",
    "vid2.desc": "12-Phase dispute lifecycle \u2014 terminal screen recording.",
    "vid4.title": "Full Walkthrough",
    "vid4.desc": "Three-fold structure, single-instance procedure, 7-jurisdiction non-security analysis.",
    "trn.t.desc": "Trust collateral \u2014 jurors stake TRN to guarantee verdict integrity. Incorrect votes incur 10% slashing.",
    "trn.r.desc": "Rendering rights \u2014 the computational authority to finalize conclusions on-chain via Commit-Reveal voting and Dual Award.",
    "trn.n.desc": "Network governance \u2014 DAO decision-making stake via ERC20Votes delegation and Conviction Voting.",
    "trn.note": "T, R, and N each demand active participation \u2014 TRN is a Work Token, not a passive yield instrument.",`;

let p = html.indexOf(KO_MARKER);
if (p !== -1) { html = html.slice(0, p + KO_MARKER.length) + KO_KEYS + html.slice(p + KO_MARKER.length); console.log('[8a] KO i18n keys added'); }
else console.log('[8a] WARN: KO marker not found');

p = html.indexOf(EN_MARKER);
if (p !== -1) { html = html.slice(0, p + EN_MARKER.length) + EN_KEYS + html.slice(p + EN_MARKER.length); console.log('[8b] EN i18n keys added'); }
else console.log('[8b] WARN: EN marker not found');

// ── 9. Write ──
writeFileSync(FILE, html, 'utf8');
console.log(`[DONE] ${FILE} written: ${html.length} bytes`);
