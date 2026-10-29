/* Diritto Proprio IVE — app */
(() => {
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const view = $('#view');
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const store = {
  get(k, d) { try { const v = localStorage.getItem('ive-it.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ive-it.' + k, JSON.stringify(v)); } catch (e) {} }
};

const HUES = { fund: '#8E1B2B', vida: '#2F5D7C', form: '#3D6B48', apos: '#9A6B1F', otros: '#6B5B73' };
const ICON = {
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  mark: '<svg viewBox="0 0 24 24"><path d="M7 4h10v16l-5-3.5L7 20z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  search: '<svg class="s-ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  orn: '<svg viewBox="0 0 24 24"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/></svg>'
};

let LIB = null;
const DOCS = new Map();     // id -> loaded doc
const META = new Map();     // id -> library entry (+group, hue)
const settings = Object.assign({ theme: 'auto', size: 19, font: 'serif' }, store.get('settings', {}));
let marks = store.get('marks', []);
let pendingHL = null;
const scrollMemo = new Map();

/* ------------------------------------------------------------ boot */
async function boot() {
  applySettings();
  try {
    LIB = await fetch('data/library.json').then(r => r.json());
  } catch (e) {
    view.innerHTML = '<div class="empty"><div class="big">Impossibile caricare la biblioteca</div>Controlla la connessione e riprova.</div>';
    return;
  }
  for (const g of LIB.groups) for (const id of g.docs) {
    const d = LIB.docs.find(x => x.id === id);
    if (d) META.set(id, Object.assign(d, { group: g.title, gid: g.id, hue: HUES[g.id] || HUES.otros }));
  }
  LIB.order = LIB.groups.flatMap(g => g.docs);
  window.addEventListener('hashchange', route);
  route();
  setupChrome();
  setupSW();
  // warm up the search index when idle
  setTimeout(() => searchWorker(), 2500);
}

/* ------------------------------------------------------------ router */
let currentKey = '';
function route() {
  const prevKey = currentKey;
  if (prevKey) scrollMemo.set(prevKey, window.scrollY);
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(qs || '');
  closeAll();
  document.body.classList.remove('in-doc', 'title-visible');
  if (parts[0] === 'd' && parts[1]) { currentKey = 'd/' + parts[1]; return showDoc(parts[1], parts[2]); }
  if (parts[0] === 'cerca') { currentKey = 'cerca'; return showSearch(params); }
  if (parts[0] === 'segnalibri') { currentKey = 'segnalibri'; return showMarks(); }
  currentKey = 'home';
  showHome();
}
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
function restoreScroll(key) { const y = scrollMemo.get(key); window.scrollTo(0, y || 0); }

/* ------------------------------------------------------------ home */
function showHome() {
  view.dataset.doc = '';
  document.title = LIB.title;
  const last = store.get('last');
  const lm = last && META.get(last.d);
  const totalArts = LIB.docs.reduce((a, d) => a + d.articles, 0);
  const totalNotes = LIB.docs.reduce((a, d) => a + d.notes, 0);
  view.innerHTML = `
  <div class="home">
    <section class="hero">
      <div class="overline">Istituto del Verbo Incarnato</div>
      <h1>Diritto Proprio</h1>
      <p>Le Costituzioni e i Direttori dell’Istituto, da leggere, cercare e citare — anche offline.</p>
      <div class="ornament">${ICON.orn}</div>
      <form class="searchbox" id="home-search" role="search">
        ${ICON.search}
        <input type="search" id="home-q" placeholder="Cerca in ${LIB.docs.length} documenti…" autocomplete="off" enterkeyhint="search" aria-label="Cerca">
        <kbd>/</kbd>
      </form>
      <div class="hint">Prova <code>obbedienza</code>, <code>"vita fraterna"</code> o <code>Const 254</code></div>
      ${lm ? `<a class="continue" href="#/d/${lm.id}/${last.a || ''}">
        <span class="c-ico">${ICON.play}</span>
        <span><span class="c-s">Continua a leggere</span><br><span class="c-t">${esc(lm.title)}</span>${last.n ? ` <span class="c-s">· n. ${last.n}</span>` : ''}</span>
      </a>` : ''}
    </section>
    ${LIB.groups.map(g => `
      <section class="group">
        <div class="group-head"><h2>${esc(g.title)}</h2><span>${g.docs.length} ${g.docs.length === 1 ? 'documento' : 'documenti'}</span></div>
        <div class="cards">${g.docs.map(id => card(META.get(id), g.id === 'fund')).join('')}</div>
      </section>`).join('')}
    <div class="foot">
      ${LIB.docs.length} documenti · ${totalArts.toLocaleString('it')} numeri · ${totalNotes.toLocaleString('it')} note<br>
      Edizione italiana · versione ${esc(LIB.version)} · ${esc(LIB.built)}<br>
    </div>
  </div>`;
  const inp = $('#home-q');
  inp.addEventListener('input', () => { if (inp.value.trim()) go('#/cerca?q=' + encodeURIComponent(inp.value)); });
  $('#home-search').addEventListener('submit', e => { e.preventDefault(); if (inp.value.trim()) go('#/cerca?q=' + encodeURIComponent(inp.value)); });
  restoreScroll('home');
}

function card(d, feature) {
  if (!d) return '';
  const kicker = /^Direttorio/i.test(d.title) ? 'Direttorio' : d.group;
  const name = d.title.replace(/^Direttorio (?:di|degli|delle)\s+/i, '');
  const nm = name.charAt(0).toUpperCase() + name.slice(1);
  return `<a class="card${feature ? ' feature' : ''}" href="#/d/${d.id}" style="--hue:${d.hue}">
    <span class="k">${esc(kicker)}</span>
    <span class="t">${esc(nm)}</span>
    <span class="m">${d.articles ? `<span><b>${d.articles}</b> numeri</span>` : ''}<span><b>${d.notes}</b> note</span><span>${Math.max(1, Math.round(d.words / 230))} min</span></span>
  </a>`;
}

/* ------------------------------------------------------------ document */
async function loadDoc(id) {
  if (DOCS.has(id)) return DOCS.get(id);
  const d = await fetch('data/docs/' + id + '.json').then(r => { if (!r.ok) throw 0; return r.json(); });
  DOCS.set(id, d);
  return d;
}

async function showDoc(id, anchor) {
  const meta = META.get(id);
  if (!meta) return go('#/');
  document.body.classList.add('in-doc');
  $('#bar-doc-title').textContent = meta.title;
  document.title = meta.title + ' · ' + LIB.title;
  if (view.dataset.doc !== id) {
    view.dataset.doc = '';
    view.innerHTML = '<div class="loading"><span><span class="spinner"></span>Apertura…</span></div>';
    let d;
    try { d = await loadDoc(id); } catch (e) {
      view.innerHTML = '<div class="empty"><div class="big">Documento non disponibile</div>Offline e non ancora salvato.</div>'; return;
    }
    const idx = LIB.order.indexOf(id);
    const prev = META.get(LIB.order[idx - 1]), next = META.get(LIB.order[idx + 1]);
    view.innerHTML = `
    <div class="reader" style="--hue:${meta.hue}">
      <aside class="reader-side"><div class="overline" style="margin:4px 12px 4px">Indice</div><div class="side-title">${esc(meta.title)}</div><ol class="toc-list" id="side-toc">${tocHTML(d)}</ol></aside>
      <div class="reader-main">
        <article class="doc" id="doc">
          <header class="doc-head">
            <div class="overline">${esc(meta.group)}</div>
            <h1 id="doc-h1">${esc(meta.title)}</h1>
            <div class="meta">${meta.articles ? `<span>${meta.articles} numeri</span>` : ''}<span>${meta.notes} note</span><span>Ed. ${esc(meta.edition || '')}</span></div>
          </header>
          ${d.html}
          <div class="doc-end">${ICON.orn.replace('<svg', '<svg style="width:16px;height:16px;margin:0 auto;fill:currentColor"')}</div>
          <nav class="doc-nav">
            ${prev ? `<a class="prev" href="#/d/${prev.id}"><small>Precedente</small><span>${esc(prev.title)}</span></a>` : ''}
            ${next ? `<a class="next" href="#/d/${next.id}"><small>Successivo</small><span>${esc(next.title)}</span></a>` : ''}
          </nav>
        </article>
      </div>
    </div>`;
    view.dataset.doc = id;
    $('#toc-title').textContent = meta.title;
    $('#toc-list').innerHTML = tocHTML(d);
    $('#goto-form').hidden = !meta.articles;
    markSaved();
    observeDoc();
    if (!anchor) { const y = scrollMemo.get('d/' + id); window.scrollTo(0, y || 0); }
  }
  if (anchor) requestAnimationFrame(() => jumpTo(anchor));
  else if (pendingHL) pendingHL = null;
}

function tocHTML(d) {
  return d.toc.map(t => `<li class="l${Math.min(t.l, 3)}" style="--lv:${Math.min(t.l, 3)}"><a href="#/d/${d.id}/${t.a}" data-a="${t.a}">${esc(t.t)}</a></li>`).join('');
}

function jumpTo(anchor) {
  const el = document.getElementById(anchor);
  if (!el) { toast('Numero non trovato in questo documento'); return; }
  el.scrollIntoView({ block: 'start' });
  let targets = [el];
  if (pendingHL && pendingHL.u != null) {
    targets = $$(`[data-u="${pendingHL.u}"]`, $('#doc'));
    highlight(targets, pendingHL.terms, pendingHL.phrases);
  }
  pendingHL = null;
  targets.forEach(t => { t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); });
}

function clearHighlights() {
  $$('#doc mark').forEach(m => { const p = m.parentNode; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize(); });
}

function highlight(els, terms, phrases) {
  clearHighlights();
  terms = (terms || []).filter(Boolean);
  phrases = phrases || [];
  if (!terms.length && !phrases.length) return;
  const parts = phrases.map(p => p.split(/\s+/).map(rx).join('[^\\p{L}\\p{N}]+'))
    .concat(terms.sort((a, b) => b.length - a.length).map(t => rx(t) + '[\\p{L}\\p{N}]*'));
  const re = new RegExp('(?<![\\p{L}\\p{N}])(?:' + parts.join('|') + ')', 'gu');
  for (const el of els) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentNode.closest('.num,sup') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = []; let n; while ((n = walker.nextNode())) nodes.push(n);
    for (const node of nodes) {
      const text = node.nodeValue, f = foldKeep(text);
      re.lastIndex = 0; let m, last = 0; const frag = document.createDocumentFragment(); let hit = false;
      while ((m = re.exec(f))) {
        hit = true;
        frag.append(text.slice(last, m.index));
        const mk = document.createElement('mark'); mk.textContent = text.slice(m.index, m.index + m[0].length); frag.append(mk);
        last = m.index + m[0].length;
      }
      if (hit) { frag.append(text.slice(last)); node.parentNode.replaceChild(frag, node); }
    }
  }
}
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function foldKeep(s) { let o = ''; for (const ch of s) { const f = fold(ch); o += f.length === 1 ? f : (f[0] || ch); } return o; }

/* scroll-linked behaviour in the reader */
let io = null;
function observeDoc() {
  if (io) io.disconnect();
  const h1 = $('#doc-h1');
  io = new IntersectionObserver(es => { for (const e of es) document.body.classList.toggle('title-visible', e.isIntersecting); }, { rootMargin: '-60px 0px 0px 0px' });
  if (h1) io.observe(h1);
}
let ticking = false, saveT = null;
function onScroll() {
  $('#topbar').classList.toggle('scrolled', window.scrollY > 4);
  if (!document.body.classList.contains('in-doc') || ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    $('#progress').style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%';
    const cur = currentBlock();
    if (cur) {
      // active toc entry = last heading above the current block
      const heads = $$('#doc h2[id],#doc h3[id],#doc h4[id],#doc h5[id]');
      let act = null;
      for (const h of heads) { if (h.compareDocumentPosition(cur) & Node.DOCUMENT_POSITION_FOLLOWING || h === cur) act = h; else break; }
      $$('.toc-list a.active').forEach(a => a.classList.remove('active'));
      if (act) $$(`.toc-list a[data-a="${act.id}"]`).forEach(a => { a.classList.add('active'); });
      const sideA = act && $(`#side-toc a[data-a="${act.id}"]`);
      if (sideA) { const s = $('.reader-side'); const r = sideA.getBoundingClientRect(), sr = s.getBoundingClientRect(); if (r.top < sr.top + 40 || r.bottom > sr.bottom - 40) s.scrollTop += r.top - sr.top - sr.height / 3; }
      clearTimeout(saveT);
      saveT = setTimeout(() => {
        const art = cur.classList.contains('art') ? cur : findPrevArt(cur);
        store.set('last', { d: view.dataset.doc, a: cur.id, n: art ? art.id.slice(1) : null, at: Date.now() });
      }, 500);
    }
  });
}
function currentBlock() {
  const doc = $('#doc'); if (!doc) return null;
  const x = doc.getBoundingClientRect().left + 40;
  let el = document.elementFromPoint(Math.max(x, 10), 60 + 40);
  while (el && el !== doc && !(el.id && el.parentNode === doc)) el = el.parentNode;
  return el && el !== doc ? el : null;
}
function findPrevArt(el) { while (el && !(el.classList && el.classList.contains('art'))) el = el.previousElementSibling; return el; }

/* ------------------------------------------------------------ notes & article actions */
function setupDocClicks() {
  view.addEventListener('click', e => {
    const fn = e.target.closest('sup.fn a');
    if (fn) {
      e.preventDefault();
      const d = DOCS.get(view.dataset.doc); const note = d && d.notes[+fn.dataset.fn];
      if (note != null) openPop(fn, `<div class="p-k">Nota ${esc(fn.textContent)}</div><div class="footnote-content">${note}</div>`);
      return;
    }
    const img = e.target.closest('.doc img');
    if (img) { window.open(img.src, '_blank'); return; }
    const num = e.target.closest('.doc .num');
    if (num) { e.preventDefault(); articleMenu(num.parentNode); return; }
  });
  $('#pop').addEventListener('click', e => {
    if (e.target.closest('a.xref')) closePop();
  });
}

function citeOf(p) {
  const meta = META.get(view.dataset.doc);
  const n = p.id.slice(1);
  return { label: `${meta.title}, ${n}`, n, meta };
}
function articleText(p) {
  const out = [];
  const u = p.dataset.u;
  for (const el of $$(`[data-u="${u}"]`, $('#doc'))) {
    const c = el.cloneNode(true); $$('.num,sup', c).forEach(x => x.remove());
    out.push(c.textContent.trim());
  }
  return out.join('\n');
}
function articleMenu(p) {
  const { label, n, meta } = citeOf(p);
  const saved = marks.some(m => m.d === meta.id && m.a === p.id);
  const link = location.href.split('#')[0] + `#/d/${meta.id}/${p.id}`;
  openPop(p.querySelector('.num'), `<div class="p-k">${esc(label)}</div>
    <div class="pop-actions">
      <button data-act="cite">${ICON.copy}Copia testo con citazione</button>
      <button data-act="link">${ICON.link}Copia link</button>
      ${navigator.share ? `<button data-act="share">${ICON.share}Condividi…</button>` : ''}
      <button data-act="mark">${ICON.mark}${saved ? 'Rimuovi dai segnalibri' : 'Salva nei segnalibri'}</button>
    </div>`);
  $('#pop-in').onclick = async e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'cite') { await copy(`${articleText(p)}\n— ${label}`); toast('Testo copiato'); }
    if (act === 'link') { await copy(link); toast('Link copiato'); }
    if (act === 'share') { try { await navigator.share({ title: label, text: `${articleText(p)}\n— ${label}`, url: link }); } catch (e) {} }
    if (act === 'mark') toggleMark(meta, p);
    closePop();
  };
}
async function copy(t) {
  try { await navigator.clipboard.writeText(t); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
}

function openPop(anchor, html) {
  const pop = $('#pop');
  $('#pop-in').innerHTML = html;
  pop.style.left = pop.style.top = '';
  pop.classList.add('open'); pop.setAttribute('aria-hidden', 'false');
  const r = anchor.getBoundingClientRect(), pr = pop.getBoundingClientRect();
  let left = Math.min(Math.max(12, r.left + r.width / 2 - pr.width / 2), innerWidth - pr.width - 12);
  let top = r.bottom + 10;
  if (top + pr.height > innerHeight - 12) top = Math.max(12, r.top - pr.height - 10);
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
}
function closePop() { const p = $('#pop'); p.classList.remove('open'); p.setAttribute('aria-hidden', 'true'); }

/* ------------------------------------------------------------ bookmarks */
function toggleMark(meta, p) {
  const i = marks.findIndex(m => m.d === meta.id && m.a === p.id);
  if (i >= 0) { marks.splice(i, 1); toast('Segnalibro eliminato'); }
  else {
    const t = articleText(p);
    marks.unshift({ d: meta.id, a: p.id, n: p.id.slice(1), t: t.length > 240 ? t.slice(0, 240) + '…' : t, at: Date.now() });
    toast('Salvato nei segnalibri');
  }
  store.set('marks', marks);
  markSaved();
}
function markSaved() {
  const id = view.dataset.doc; if (!id) return;
  $$('#doc p.saved').forEach(p => p.classList.remove('saved'));
  for (const m of marks) if (m.d === id) { const el = document.getElementById(m.a); if (el) el.classList.add('saved'); }
}
function showMarks() {
  view.dataset.doc = '';
  document.title = 'Segnalibri · ' + LIB.title;
  view.innerHTML = `<div class="page">
    <div class="page-head"><h1>Segnalibri</h1><span class="muted">${marks.length || ''}</span></div>
    ${marks.length ? `<ul class="results">${marks.map((m, i) => { const d = META.get(m.d); if (!d) return ''; return `
      <li class="mark-item"><a class="result" style="--hue:${d.hue}" href="#/d/${m.d}/${m.a}">
        <div class="r-top"><span class="r-doc">${esc(d.title)}</span>${m.n ? `<span class="r-n">${esc(m.n)}</span>` : ''}</div>
        <div class="snip">${esc(m.t)}</div></a>
        <button class="icon-btn rm" data-i="${i}" aria-label="Rimuovi"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></li>`; }).join('')}</ul>`
    : `<div class="empty"><div class="big">Nessun segnalibro</div>Tocca il numero di un paragrafo e scegli «Salva nei segnalibri».</div>`}
  </div>`;
  view.onclick = null;
  $$('.rm', view).forEach(b => b.addEventListener('click', e => { e.preventDefault(); marks.splice(+b.dataset.i, 1); store.set('marks', marks); showMarks(); }));
  window.scrollTo(0, 0);
}

/* ------------------------------------------------------------ search */
let worker = null, reqId = 0, workerReady = false;
const pending = new Map();
function searchWorker() {
  if (worker) return worker;
  worker = new Worker('search-worker.js');
  worker.onmessage = e => {
    const m = e.data;
    if (m.type === 'ready') { workerReady = true; const s = $('#res-status'); if (s && s.dataset.wait) runSearch(); }
    if (m.type === 'results' && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  worker.postMessage({ type: 'init', url: 'data/search.json' });
  return worker;
}
function querySearch(q, docs, notes, limit) {
  return new Promise(res => {
    const id = ++reqId; pending.set(id, res);
    searchWorker().postMessage({ type: 'search', id, q, docs, notes, limit, url: 'data/search.json' });
  });
}

const S = { q: '', filter: 'all', notes: true, limit: 60 };
function showSearch(params) {
  view.dataset.doc = '';
  document.title = 'Cerca · ' + LIB.title;
  if (params.has('q')) S.q = params.get('q');
  if (params.has('d')) S.filter = params.get('d') || 'all';
  const opts = LIB.order.map(id => `<option value="${id}"${S.filter === id ? ' selected' : ''}>${esc(META.get(id).title)}</option>`).join('');
  view.innerHTML = `<div class="search">
    <form class="searchbox" id="s-form" role="search">
      ${ICON.search}
      <input type="search" id="s-q" placeholder="Parole, «frase esatta» o numero (Const 254)" autocomplete="off" enterkeyhint="search" aria-label="Cerca" value="${esc(S.q)}">
      <button type="button" class="clear" id="s-clear" aria-label="Cancella"${S.q ? '' : ' hidden'}><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </form>
    <div class="filters" id="s-filters">
      <button class="chip" data-f="all">Tutti</button>
      ${LIB.groups.map(g => `<button class="chip" data-f="g:${g.id}">${esc(g.title)}</button>`).join('')}
      <select id="s-doc" aria-label="Documento"><option value="">Un documento…</option>${opts}</select>
    </div>
    <div class="res-meta"><span id="res-status"></span><label><input type="checkbox" id="s-notes"${S.notes ? ' checked' : ''}> Includi note</label></div>
    <div id="s-results"></div>
  </div>`;
  const inp = $('#s-q');
  syncChips();
  let t = null;
  $('#s-clear').onclick = () => { inp.value = ''; S.q = ''; $('#s-clear').hidden = true; syncURL(); runSearch(); inp.focus(); };
  inp.addEventListener('input', () => { $('#s-clear').hidden = !inp.value; clearTimeout(t); t = setTimeout(() => { S.q = inp.value; S.limit = 60; syncURL(); runSearch(); }, 160); });
  $('#s-form').addEventListener('submit', e => { e.preventDefault(); inp.blur(); });
  $('#s-filters').addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; S.filter = c.dataset.f; $('#s-doc').value = ''; S.limit = 60; syncChips(); syncURL(); runSearch(); });
  $('#s-doc').addEventListener('change', e => { S.filter = e.target.value || 'all'; S.limit = 60; syncChips(); syncURL(); runSearch(); });
  $('#s-notes').addEventListener('change', e => { S.notes = e.target.checked; runSearch(); });
  const y = scrollMemo.get('cerca');
  runSearch().then(() => { if (y) window.scrollTo(0, y); });
  if (!y) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}
function syncChips() {
  $$('#s-filters .chip').forEach(c => c.classList.toggle('on', c.dataset.f === S.filter));
  const sel = $('#s-doc'); if (sel) { sel.value = META.has(S.filter) ? S.filter : ''; sel.classList.toggle('chip', false); }
}
function syncURL() {
  const p = new URLSearchParams(); if (S.q) p.set('q', S.q); if (S.filter !== 'all') p.set('d', S.filter);
  history.replaceState(null, '', '#/cerca' + (p.toString() ? '?' + p : ''));
}
function filterDocs() {
  if (S.filter === 'all') return null;
  if (S.filter.startsWith('g:')) { const g = LIB.groups.find(g => 'g:' + g.id === S.filter); return g ? g.docs : null; }
  return [S.filter];
}

const ALIASES = { c: 'costituzioni', const: 'costituzioni', cost: 'costituzioni', cons: 'costituzioni', costituzioni: 'costituzioni', de: 'spiritualita', desp: 'spiritualita', 'dir esp': 'spiritualita', spiritualita: 'spiritualita' };
function detectJump(q) {
  const m = q.trim().match(/^(.*?)[\s,]*(?:n\.?\s*º?|nº|n°|no\.|#)?\s*\[?(\d{1,3})\]?\s*$/i);
  if (!m) return null;
  const name = fold(m[1]).replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
  const n = m[2];
  let id = null;
  if (!name) { const fd = filterDocs(); if (fd && fd.length === 1) id = fd[0]; else return null; }
  else if (ALIASES[name]) id = ALIASES[name];
  else {
    const nm = name.replace(/^(direttorio|dir)( di| degli| delle)?\s*/, '');
    if (nm.length < 2) return null;
    id = LIB.order.find(i => fold(META.get(i).title.replace(/^Direttorio (?:di|degli|delle)\s+/i, '')).startsWith(nm)) ||
         LIB.order.find(i => fold(META.get(i).title).includes(nm));
  }
  const d = id && META.get(id);
  if (!d || !d.articles || +n > d.articles + 20) return null;
  return { id, n, d };
}

async function runSearch() {
  const box = $('#s-results'), st = $('#res-status');
  if (!box) return;
  const q = S.q.trim();
  if (!q) {
    st.textContent = '';
    box.innerHTML = `<div class="empty"><div class="big">Cerca in tutto il Diritto Proprio</div>
      Scrivi una o più parole. Accenti e maiuscole non influiscono sulla ricerca.
      <div class="tips">
        <div class="tip"><code>povertà voto</code><br>tutte le parole, in qualsiasi ordine</div>
        <div class="tip"><code>"vita fraterna"</code><br>frase esatta tra virgolette</div>
        <div class="tip"><code>Const 254</code> · <code>Vocazioni 12</code><br>vai direttamente a un numero</div>
        <div class="tip"><code>LG 31</code> · <code>Giovanni Paolo</code><br>cerca anche nelle note</div>
      </div></div>`;
    return;
  }
  if (!workerReady) { st.innerHTML = '<span class="spinner"></span>Preparazione dell’indice di ricerca…'; st.dataset.wait = '1'; }
  const r = await querySearch(q, filterDocs(), S.notes, S.limit);
  delete st.dataset.wait;
  if (S.q.trim() !== q || !$('#s-results')) return;
  const jump = detectJump(q);
  st.textContent = r.total ? `${r.total.toLocaleString('it')} risultat${r.total === 1 ? 'o' : 'i'}` : '';
  let html = '';
  if (jump) html += `<a class="jump" href="#/d/${jump.id}/n${jump.n}">${ICON.arrow}<span>Vai a <b>${esc(jump.d.title)}, n. ${jump.n}</b></span></a>`;
  if (!r.total && !jump) html += `<div class="empty"><div class="big">Nessun risultato</div>Prova con meno parole, una parola diversa o «Tutti» i documenti.</div>`;
  html += `<ul class="results">${r.results.map((x, i) => {
    const d = META.get(x.d);
    return `<li><a class="result" style="--hue:${d.hue}" href="#/d/${x.d}/${x.a}" data-i="${i}">
      <div class="r-top"><span class="r-doc">${esc(d.title)}</span>${x.n ? `<span class="r-n">${x.n}</span>` : ''}${x.h ? `<span class="r-h">${esc(x.h)}</span>` : ''}</div>
      <div class="snip">${x.s}${x.fs ? `<span class="fnote">Nota: ${x.fs}</span>` : ''}</div></a></li>`;
  }).join('')}</ul>`;
  if (r.total > r.results.length) html += `<button class="btn more" id="s-more">Mostra altri (${(r.total - r.results.length).toLocaleString('it')})</button>`;
  box.innerHTML = html;
  box.onclick = e => {
    const a = e.target.closest('a.result'); if (!a) return;
    const x = r.results[+a.dataset.i];
    pendingHL = x.u < 0 ? null : { u: x.u, terms: r.terms, phrases: r.phrases };
  };
  const more = $('#s-more'); if (more) more.onclick = () => { S.limit += 100; runSearch(); };
}

/* ------------------------------------------------------------ chrome: drawer, settings, keys */
function setupChrome() {
  addEventListener('scroll', onScroll, { passive: true });
  setupDocClicks();
  $('#btn-back').onclick = () => go('#/');
  $('#btn-toc').onclick = () => openDrawer();
  $('#btn-search').onclick = () => {
    const id = view.dataset.doc;
    if (id) { S.filter = id; go('#/cerca?d=' + id + (S.q ? '&q=' + encodeURIComponent(S.q) : '')); }
    else go('#/cerca' + (S.q ? '?q=' + encodeURIComponent(S.q) : ''));
  };
  $('#btn-marks').onclick = () => go('#/segnalibri');
  $('#btn-settings').onclick = openSettings;
  $('#scrim').onclick = closeAll;
  $$('[data-close]').forEach(b => b.onclick = closeAll);
  $('#settings').addEventListener('click', e => { if (e.target.id === 'settings') closeAll(); });
  $('#toc-list').addEventListener('click', e => { if (e.target.closest('a')) closeAll(); });
  $('#goto-form').addEventListener('submit', e => {
    e.preventDefault();
    const n = $('#goto-n').value.trim(); if (!n) return;
    closeAll(); $('#goto-n').value = '';
    go(`#/d/${view.dataset.doc}/n${parseInt(n, 10)}`);
  });
  document.addEventListener('click', e => { if (!e.target.closest('#pop') && !e.target.closest('sup.fn') && !e.target.closest('.num')) closePop(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeAll(); return; }
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault();
      const i = $('#home-q') || $('#s-q'); if (i) i.focus(); else $('#btn-search').click();
    }
  });
  // settings controls
  $('#seg-theme').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; settings.theme = b.dataset.v; saveSettings(); });
  $('#seg-font').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; settings.font = b.dataset.v; saveSettings(); });
  $('#size').addEventListener('input', e => { settings.size = +e.target.value; saveSettings(); });
}
function openDrawer() { $('#toc').classList.add('open'); $('#toc').setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('on');
  const a = $('#toc-list a.active'); if (a) a.scrollIntoView({ block: 'center' }); }
function closeAll() {
  $('#toc').classList.remove('open'); $('#toc').setAttribute('aria-hidden', 'true'); $('#scrim').classList.remove('on');
  $('#settings').classList.remove('open'); $('#settings').setAttribute('aria-hidden', 'true');
  closePop();
}
function applySettings() {
  const r = document.documentElement;
  if (settings.theme === 'auto') delete r.dataset.theme; else r.dataset.theme = settings.theme;
  if (settings.font === 'sans') r.dataset.font = 'sans'; else delete r.dataset.font;
  r.style.setProperty('--read-size', settings.size + 'px');
  $$('#seg-theme button').forEach(b => b.classList.toggle('on', b.dataset.v === settings.theme));
  $$('#seg-font button').forEach(b => b.classList.toggle('on', b.dataset.v === settings.font));
  $('#size').value = settings.size; $('#size-val').textContent = settings.size + ' px';
  const dark = r.dataset.theme === 'dark' || (settings.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', dark ? '#15120F' : (settings.theme === 'sepia' ? '#F4EAD8' : '#FAF7F2')));
}
function saveSettings() {
  // keep the reading position stable while the text size changes
  const cur = document.body.classList.contains('in-doc') && currentBlock();
  const off = cur ? cur.getBoundingClientRect().top : 0;
  applySettings(); store.set('settings', settings);
  if (cur) window.scrollBy(0, cur.getBoundingClientRect().top - off);
}
async function openSettings() {
  applySettings();
  $('#settings').classList.add('open'); $('#settings').setAttribute('aria-hidden', 'false');
  $('#about-line').textContent = `${LIB.docs.length} documenti · versione ${LIB.version} (${LIB.built})`;
  let off = 'Modalità offline non disponibile in questo browser.';
  if ('caches' in window) {
    const keys = (await caches.keys()).filter(k => k.startsWith('ive-it-'));
    off = keys.length ? '✓ Tutti i contenuti sono salvati per la lettura offline.' : 'Salvataggio dei contenuti per la lettura offline…';
  }
  $('#offline-line').textContent = off;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  $('#ios-hint').hidden = standalone || !/iphone|ipad|ipod/i.test(navigator.userAgent);
}

/* ------------------------------------------------------------ toast */
let toastT = null;
function toast(msg, action, fn, sticky) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { t.classList.remove('show'); fn(); };
  t.classList.add('show');
  clearTimeout(toastT);
  if (!sticky) toastT = setTimeout(() => t.classList.remove('show'), action ? 8000 : 2200);
}

/* ------------------------------------------------------------ service worker: offline + updates */
let deferredInstall = null;
function setupSW() {
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; $('#btn-install').hidden = false; });
  $('#btn-install').onclick = async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('#btn-install').hidden = true; };
  if (!('serviceWorker' in navigator)) { $('#btn-update').onclick = () => location.reload(); return; }
  const firstInstall = !navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const offer = w => toast('È disponibile una nuova versione dei contenuti.', 'Aggiorna', () => w.postMessage('skipWaiting'), true);
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed') {
          if (navigator.serviceWorker.controller) offer(nw);
          else if (firstInstall) toast('Pronto: disponibile offline');
        }
      });
    });
    $('#btn-update').onclick = async () => {
      const b = $('#btn-update'); b.disabled = true; b.textContent = 'Verifica…';
      try { await reg.update(); } catch (e) {}
      setTimeout(() => {
        b.disabled = false; b.textContent = 'Cerca aggiornamenti';
        if (reg.waiting) { closeAll(); offer(reg.waiting); }
        else if (reg.installing) { closeAll(); toast('Download della nuova versione…'); }
        else toast(navigator.onLine ? 'Hai già la versione più recente' : 'Offline: riprova più tardi');
      }, 1200);
    };
    // check periodically and when the app comes back to the foreground
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => { $('#btn-update').onclick = () => location.reload(); });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!firstInstall && !reloading) { reloading = true; location.reload(); } });
}

boot();
})();
