// Adds the named street network to intro-data.json: chains of main streets (motorway .. tertiary) and named canals / rivers, label anchors (long straight stretches),
// and for every area the streets that carry its border (with the neighbour on the other side). Run after build-intro.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { here, raw, geomOf, dp, toM, rpt, r5, chainWays, inRings, bboxOf } from './lib.mjs';

const file = path.join(here, 'intro-data.json');
const D = JSON.parse(fs.readFileSync(file, 'utf8'));
const KXm = toM([1, 0])[0], KYm = toM([0, 1])[1];
const LON0 = 30.30, LAT0 = 59.95;
const M = (p) => [(p[0] - LON0) * KXm, (p[1] - LAT0) * KYm];           // metres, y north
const rawOpt = (n) => { try { return raw(n); } catch (e) { console.log('missing', n); return { elements: [] }; } };

// ------------------------------------------------------------ ways
const CLS = { motorway: 0, trunk: 1, primary: 2, secondary: 3, tertiary: 4 };
const ways = new Map();
const add = (e, cls) => {
  if (!e.geometry || e.geometry.length < 2) return;
  const t = e.tags || {};
  const name = (t.name || '').trim();
  const c = cls ?? CLS[t.highway];
  if (c === undefined) return;
  if (!name && c !== 0) return;
  const prev = ways.get(e.id);
  if (prev && prev.c <= c) return;
  ways.set(e.id, { id: e.id, name: name || 'КАД', en: t['name:en'] || '', c, nodes: e.nodes || [], pts: geomOf(e.geometry) });
};
for (const e of rawOpt('main_roads').elements) add(e);
for (const e of rawOpt('roads').elements) add(e);
for (const e of rawOpt('c_streets').elements) add(e);
// the source project's raw OSM (the extended centre, ~210 km2 box, every named street incl. secondary / tertiary): used where present
const SRC_ROADS = 'D:/git2/agi-fun-tests/102_3d_piter/data/osm-raw/roads.json';
if (fs.existsSync(SRC_ROADS)) { const d = JSON.parse(fs.readFileSync(SRC_ROADS, 'utf8')); let n = 0; for (const e of d.elements) if (/^(motorway|trunk|primary|secondary|tertiary)$/.test((e.tags || {}).highway || '')) { add(e); n++; } console.log('source roads', n); }
for (const e of rawOpt('secondary').elements) add(e);
for (const e of rawOpt('tertiary').elements) add(e);
for (const nm of ['rivers', 'c_rivers']) for (const e of rawOpt(nm).elements) {
  const t = e.tags || {}; if (!t.name || !e.geometry) continue;
  if (!/^(river|canal)$/.test(t.waterway || '')) continue;
  const prev = ways.get(e.id); if (prev) continue;
  ways.set(e.id, { id: e.id, name: t.name.trim(), en: t['name:en'] || '', c: 5, nodes: e.nodes || [], pts: geomOf(e.geometry) });
}
console.log('ways', ways.size);

// ------------------------------------------------------------ chains by name
const byName = new Map();
for (const w of ways.values()) { const k = w.name + '|' + (w.c === 5 ? 'w' : 'r'); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(w); }
const streets = [];
let nameId = 0; const names = [];
for (const [key, list] of byName) {
  const name = list[0].name, isW = list[0].c === 5;
  const segs = list.filter((w) => w.nodes.length === w.pts.length).map((w) => ({ ids: w.nodes, pts: w.pts, c: w.c }));
  const odd = list.filter((w) => w.nodes.length !== w.pts.length).map((w) => ({ ids: w.pts.map((_, i) => 'x' + w.id + '_' + i), pts: w.pts, c: w.c }));
  const chains = chainWays(segs.concat(odd), false);
  const cls = Math.min(...list.map((w) => w.c));
  const en = list.find((w) => w.en)?.en || '';
  const nid = nameId++; names.push({ ru: name, en, c: cls });
  for (const ch of chains) {
    const pts = dp(ch.pts, 11); if (pts.length < 2) continue;
    let len = 0; for (let i = 1; i < pts.length; i++) { const a = M(pts[i - 1]), b = M(pts[i]); len += Math.hypot(a[0] - b[0], a[1] - b[1]); }
    if (len < 120) continue;
    streets.push({ s: nid, c: cls, len: Math.round(len), pts });
  }
}
console.log('names', names.length, 'chains', streets.length);

// ------------------------------------------------------------ label anchors: long straight stretches
for (const st of streets) {
  const m = st.pts.map(M), cum = [0];
  for (let i = 1; i < m.length; i++) cum.push(cum[i - 1] + Math.hypot(m[i][0] - m[i - 1][0], m[i][1] - m[i - 1][1]));
  const anchors = [];
  let i = 0;
  while (i < m.length - 1) {
    let j = i + 1, best = j;
    while (j < m.length) {
      const a = m[i], b = m[j], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      let dev = 0; for (let q = i + 1; q < j; q++) dev = Math.max(dev, Math.abs((m[q][0] - a[0]) * dy - (m[q][1] - a[1]) * dx) / L);
      if (dev > 9 || cum[j] - cum[i] > 1400) break;
      best = j; j++;
    }
    const L = cum[best] - cum[i];
    if (L >= 160) {
      const a = m[i], b = m[best];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      anchors.push({ p: [r5(LON0 + mid[0] / KXm), r5(LAT0 + mid[1] / KYm)], a: Math.round(Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180 / Math.PI * 10) / 10, L: Math.round(L) });
    }
    i = best > i ? best : i + 1;
  }
  st.an = anchors;
}

// ------------------------------------------------------------ border streets of every area
// spatial index of the street segments (metres, 120 m cells)
const CELLM = 120, grid = new Map();
const segs = [];
streets.forEach((st, si) => { const m = st.pts.map(M); for (let i = 1; i < m.length; i++) { const id = segs.length; segs.push([m[i - 1][0], m[i - 1][1], m[i][0], m[i][1], si]); const x0 = Math.floor(Math.min(m[i - 1][0], m[i][0]) / CELLM), x1 = Math.floor(Math.max(m[i - 1][0], m[i][0]) / CELLM), y0 = Math.floor(Math.min(m[i - 1][1], m[i][1]) / CELLM), y1 = Math.floor(Math.max(m[i - 1][1], m[i][1]) / CELLM); for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x * 100003 + y; let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(id); } } });
function nearest(px, py, R = 48) {
  const x0 = Math.floor((px - R) / CELLM), x1 = Math.floor((px + R) / CELLM), y0 = Math.floor((py - R) / CELLM), y1 = Math.floor((py + R) / CELLM);
  const cand = new Map();
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const l = grid.get(x * 100003 + y); if (!l) continue; for (const id of l) {
    const s = segs[id], dx = s[2] - s[0], dy = s[3] - s[1], L2 = dx * dx + dy * dy; let t = L2 ? ((px - s[0]) * dx + (py - s[1]) * dy) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(px - (s[0] + t * dx), py - (s[1] + t * dy)); if (d > R) continue;
    const prev = cand.get(s[4]); if (prev === undefined || d < prev) cand.set(s[4], d); } }
  let best = -1, bd = 1e9;
  for (const [si, d] of cand) { const score = d + streets[si].c * 4 - (streets[si].c === 5 ? 6 : 0); if (score < bd) { bd = score; best = si; } }
  return best;
}
const areas = D.areas;
const abbox = areas.map((a) => bboxOf(a.outer.flat()));
const which = (p, skip) => { for (let k = 0; k < areas.length; k++) { if (k === skip) continue; const b = abbox[k]; if (p[0] < b[0] || p[0] > b[2] || p[1] < b[1] || p[1] > b[3]) continue; if (inRings(p, areas[k].outer) && !inRings(p, areas[k].inner)) return k; } return -1; };
const streetAreas = new Map();                                    // street chain -> Map(area -> len)
for (const a of areas) {
  const agg = new Map();
  for (const ring of a.outer.concat(a.inner)) {
    const m = ring.map(M);
    for (let i = 0; i < m.length; i++) {
      const p0 = m[i], p1 = m[(i + 1) % m.length], dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy); if (L < 1) continue;
      const n = Math.max(1, Math.round(L / 35)), nx = -dy / L, ny = dx / L;
      for (let q = 0; q < n; q++) {
        const t = (q + 0.5) / n, px = p0[0] + dx * t, py = p0[1] + dy * t;
        const si = nearest(px, py);
        const pl = [LON0 + (px - nx * 70) / KXm, LAT0 + (py - ny * 70) / KYm], pr = [LON0 + (px + nx * 70) / KXm, LAT0 + (py + ny * 70) / KYm];
        let nb = which(pl, a.k); if (nb < 0) nb = which(pr, a.k);
        const key = si + '|' + nb, seg = L / n;
        agg.set(key, (agg.get(key) || 0) + seg);
        if (si >= 0) { let m2 = streetAreas.get(si); if (!m2) streetAreas.set(si, m2 = new Map()); m2.set(a.k, (m2.get(a.k) || 0) + seg); }
      }
    }
  }
  // street name level aggregation
  const byStreet = new Map();
  for (const [key, len] of agg) { const [si, nb] = key.split('|').map(Number); const nid = si >= 0 ? streets[si].s : -1; const k2 = nid + '|' + nb; byStreet.set(k2, (byStreet.get(k2) || 0) + len); }
  a.bs = [...byStreet].map(([k, len]) => { const [nid, nb] = k.split('|').map(Number); return { s: nid, n: nb, len: Math.round(len) }; }).filter((x) => x.len >= 150).sort((p, q) => q.len - p.len).slice(0, 16);
}
// which chains carry a border
for (const [si, m2] of streetAreas) { const tot = [...m2.values()].reduce((x, y) => x + y, 0); streets[si].b = Math.round(tot); }

// ------------------------------------------------------------ English names
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const translit = (s) => s.replace(/[А-Яа-яЁё]/g, (ch) => { const l = ch.toLowerCase(), t = TR[l] ?? ch; return ch !== l ? t.charAt(0).toUpperCase() + t.slice(1) : t; });
const TYPE = [[/\s+проспект$/i, ' Prospekt'], [/^проспект\s+/i, 'Prospekt '], [/\s+улица$/i, ' St'], [/^улица\s+/i, ''], [/\s+набережная$/i, ' Emb.'], [/^набережная\s+/i, 'Emb. '], [/\s+шоссе$/i, ' Highway'], [/\s+площадь$/i, ' Sq.'], [/^площадь\s+/i, 'Sq. '], [/\s+переулок$/i, ' Lane'], [/\s+бульвар$/i, ' Blvd'], [/\s+мост$/i, ' Bridge'], [/\s+канал$/i, ' Canal'], [/\s+река$/i, ' River'], [/\s+дорога$/i, ' Road'], [/\s+магистраль$/i, ' Highway'], [/\s+аллея$/i, ' Alley'], [/\s+линия$/i, ' Line']];
for (const n of names) {
  if (n.en) continue;
  let r = n.ru, suffix = '';
  for (const [re, rep] of TYPE) if (re.test(r)) { r = r.replace(re, ''); suffix = rep; break; }
  n.en = translit(r).trim() + suffix;
}

// ------------------------------------------------------------ output
D.streetNames = names.map((n) => ({ ru: n.ru, en: n.en === n.ru ? '' : n.en, c: n.c }));
D.streets = streets.map((st) => ({ s: st.s, c: st.c, len: st.len, b: st.b || 0, an: st.an, p: st.pts.map(rpt) }));
delete D.layers.roads;
fs.writeFileSync(file, JSON.stringify(D));
const kb = (o) => (Buffer.byteLength(JSON.stringify(o)) / 1024) | 0;
console.log('streets KB', kb(D.streets), 'names', D.streetNames.length, 'total KB', (fs.statSync(file).size / 1024) | 0);
const sample = areas.find((a) => a.ru === 'Дворцовый–Литейный') || areas[0];
console.log(sample.ru + ' borders:', sample.bs.map((b) => `${D.streetNames[b.s]?.ru || '?'} ${b.len}m -> ${areas[b.n]?.ru || '(water/outside)'}`).join('; '));
const sm = areas.find((a) => a.ru === 'Смольнинское') || areas[1];
console.log('Смольнинское borders:', sm.bs.map((b) => `${D.streetNames[b.s]?.ru || '?'} ${b.len}m -> ${areas[b.n]?.ru || '(water/outside)'}`).join('; '));
