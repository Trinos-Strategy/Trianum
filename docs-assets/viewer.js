/* =================================================================
   Trianum Documentation Viewer
   - Loads /docs/_toc.json for sidebar
   - Fetches /docs/<slug>.md and renders via marked + DOMPurify
   - Persists theme + lang in localStorage
   - URL hash deep-linking for headings
   ================================================================= */

(function () {
  'use strict';

  // ───────────── Helpers ─────────────

  const html = document.documentElement;
  const params = new URLSearchParams(location.search);
  const requestedDoc = params.get('doc') || 'rules';

  function slugify(text) {
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(/[^\w\s가-힣-]/g, '')
      .replace(/\s+/g, '-');
  }

  function setActive(slug) {
    document.querySelectorAll('.docs-toc a').forEach(a => {
      const isActive = a.dataset.slug === slug;
      a.classList.toggle('active', isActive);
      if (isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  // ───────────── Theme / Lang persistence ─────────────

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('tri-theme'); } catch (_) {}
    html.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');

    const btn = document.querySelector('[data-toggle-theme]');
    if (btn) {
      btn.addEventListener('click', () => {
        const cur = html.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const next = cur === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        try { localStorage.setItem('tri-theme', next); } catch (_) {}
        const icon = btn.querySelector('span');
        if (icon) icon.textContent = next === 'dark' ? '🌙' : '☀';
      });
    }
  }

  function initLang() {
    let saved = null;
    try { saved = localStorage.getItem('tri-lang'); } catch (_) {}
    const initial = saved === 'en' ? 'en' : 'ko';
    html.setAttribute('data-lang', initial);

    const btns = document.querySelectorAll('[data-set-lang]');
    function syncBtns(lang) {
      btns.forEach(b => {
        b.setAttribute('aria-selected', b.dataset.setLang === lang ? 'true' : 'false');
      });
    }
    syncBtns(initial);
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.setLang;
        html.setAttribute('data-lang', lang);
        syncBtns(lang);
        try { localStorage.setItem('tri-lang', lang); } catch (_) {}
        renderTOC(); // re-render sidebar with new language
      });
    });
  }

  // ───────────── TOC sidebar ─────────────

  let _tocData = null;

  async function loadTOC() {
    if (_tocData) return _tocData;
    try {
      const r = await fetch('/docs-assets/_toc.json');
      if (!r.ok) throw new Error('TOC fetch failed: ' + r.status);
      _tocData = await r.json();
      return _tocData;
    } catch (err) {
      console.error('[docs] TOC error:', err);
      return [];
    }
  }

  async function renderTOC() {
    const toc = await loadTOC();
    const lang = html.getAttribute('data-lang') || 'ko';
    const wrap = document.getElementById('docs-toc');
    if (!wrap) return;

    const out = [];
    for (const group of toc) {
      const catLabel = lang === 'ko' ? (group.category_ko || group.category) : group.category;
      out.push(`<div class="docs-cat">${catLabel}</div>`);
      out.push('<div class="docs-toc">');
      for (const item of group.items) {
        const t = lang === 'ko' ? (item.title_ko || item.title) : item.title;
        out.push(
          `<a href="?doc=${item.slug}" data-slug="${item.slug}">` +
          `<span class="icon">${item.icon || '·'}</span><span>${t}</span></a>`
        );
      }
      out.push('</div>');
    }
    wrap.innerHTML = out.join('');
    setActive(requestedDoc);
  }

  // ───────────── Markdown render ─────────────

  function configureMarked() {
    if (typeof marked === 'undefined') return;
    marked.setOptions({
      gfm: true,
      breaks: false,
      headerIds: true,
      smartLists: true,
      smartypants: false,
      mangle: false,
    });

    const renderer = new marked.Renderer();
    // Make external links open in new tab
    const origLink = renderer.link.bind(renderer);
    renderer.link = function (href, title, text) {
      const out = origLink(href, title, text);
      if (href && /^https?:\/\//.test(href)) {
        return out.replace('<a ', '<a target="_blank" rel="noopener" ');
      }
      return out;
    };
    // Add anchor IDs to h2/h3 for deep-linking
    const origH = renderer.heading.bind(renderer);
    renderer.heading = function (text, level, raw) {
      if (level === 2 || level === 3) {
        const id = slugify(raw);
        return `<h${level} id="${id}">${text}</h${level}>`;
      }
      return origH(text, level, raw);
    };
    marked.use({ renderer });
  }

  async function loadDoc(slug) {
    const article = document.getElementById('docs-article');
    if (!article) return;

    article.innerHTML = '<div class="docs-status">Loading…</div>';

    try {
      const r = await fetch(`/docs/${slug}.md`);
      if (!r.ok) throw new Error('Status ' + r.status);
      const md = await r.text();

      const rendered = marked.parse(md);
      const safe = (typeof DOMPurify !== 'undefined')
        ? DOMPurify.sanitize(rendered, { ADD_ATTR: ['target'] })
        : rendered;

      article.innerHTML = safe;
      document.title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) +
        ' · Trianum Docs';

      // After render, scroll to hash if present
      if (location.hash) {
        const target = document.querySelector(location.hash);
        if (target) target.scrollIntoView();
      } else {
        window.scrollTo(0, 0);
      }
    } catch (err) {
      console.error('[docs] Load error:', err);
      article.innerHTML =
        `<div class="docs-error">` +
        `<strong>문서를 찾을 수 없습니다.</strong><br>` +
        `Document not found: <code>/docs/${slug}.md</code>` +
        `<br><br>` +
        `<a href="?doc=rules">← Rules로 돌아가기</a>` +
        `</div>`;
    }
  }

  // ───────────── Init ─────────────

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLang();
    configureMarked();
    renderTOC();
    loadDoc(requestedDoc);
  });
})();
