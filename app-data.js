/* Shared validation for paragraph references and personal bookmark backups. */
(() => {
'use strict';
function parseParagraphReference(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim().toLowerCase().replace(/^n(?:[.°º])?\s*/, '').replace(/\s+/g, '');
  const m = s.match(/^\[?([1-9]\d{0,3})([a-z]?)\]?$/);
  if (!m || s.startsWith('[') !== s.endsWith(']')) return null;
  return m[1] + m[2];
}
function parseBookmarkBackup(data) {
  if (!data || typeof data !== 'object' || data.format !== 'ive-it-bookmarks' || data.version !== 1 || !Array.isArray(data.bookmarks) || data.bookmarks.length > 10000) {
    throw new Error('Formato del backup non valido.');
  }
  return data.bookmarks;
}
function mergeBookmarks(existing, incoming, isValid) {
  const known = new Set(existing.map(m => m.d + '/' + m.a));
  const added = []; let duplicates = 0, skipped = 0;
  for (const m of incoming) {
    if (!m || typeof m !== 'object' || typeof m.d !== 'string' || typeof m.a !== 'string' || !/^n[1-9]\d{0,3}[a-z]$|^n[1-9]\d{0,3}$/.test(m.a) || !isValid(m)) { skipped++; continue; }
    const key = m.d + '/' + m.a;
    if (known.has(key)) { duplicates++; continue; }
    known.add(key);
    added.push({ d: m.d, a: m.a, n: m.a.slice(1), t: typeof m.t === 'string' ? m.t.slice(0, 241) : '', at: Number.isFinite(m.at) && m.at >= 0 ? m.at : Date.now() });
  }
  return { bookmarks: [...added, ...existing], added: added.length, duplicates, skipped };
}
globalThis.IVEData = Object.freeze({ parseParagraphReference, parseBookmarkBackup, mergeBookmarks });
})();
