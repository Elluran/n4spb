// Renders the baked OpenStreetMap data (src/world/data/city.js: the whole UNION of rectangles, old area + west) as annotated plans:
//   docs/images/plan.svg + plan.png              the whole data extent, 1 px = 1.4 m: buildings filled by height, roads, green, water, POI names, metro, the play / extent rectangles
//   docs/images/plan-west.png                    the western extension (x < -560), 1 px = 1.0 m
//   docs/images/plan-crops/<name>.png            700-800 m windows at 1 px = 0.5 m: Kazan, Gostiny Dvor, Palace Square, Admiralty / St Isaac's, the Neva bank, the seams of the rectangles
//   docs/reference/plan-overlay.png              docs/reference/yandex-center.png with the baked building outlines (magenta) and road centre lines (cyan) drawn on top (old area, needs the screenshot)
//   node tools/plan.mjs [plan] [west] [crops] [overlay]      (no argument: everything)
// Saint Petersburg centre (Moscow Railway Station / Vosstaniya Square / Nevsky + the way west to the Admiralty). Layers: railway tracks, platforms, the rivers / canals, bridges, metro lines (dashed, tunnels), entrances / stations, trolleybus lines.
// World -> pixel mapping of a plan: u = (x - view.x0) / scale, v = (z - view.z0) / scale (north up). The overlay uses the calibration of the Yandex screenshot (docs/reference/calibration.json): u = x / metresPerPixel + u0, v = z / metresPerPixel + v0.
// PNGs are rendered with headless Edge / Chrome (command line, no npm packages needed). Map data (c) OpenStreetMap contributors, ODbL.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const CAL = JSON.parse(fs.readFileSync(path.join(root, 'docs/reference/calibration.json'), 'utf8'));
let S = CAL.metresPerPixel, U0 = CAL.originPixel.u, V0 = CAL.originPixel.v;     // the mapping is switched by setView() (the Yandex overlay uses the calibration values)
const S_CAL = S, U_CAL = U0, V_CAL = V0, IMG_W = CAL.image.width, IMG_H = CAL.image.height;
const pu = (x) => (x / S + U0), pv = (z) => (z / S + V0);
const f1 = (v) => v.toFixed(1);
const pts = (a, dx = 0, dy = 0) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push(f1(pu(a[i]) + dx) + ',' + f1(pv(a[i + 1]) + dy)); return o.join(' '); };
const ring = (a, dx = 0, dy = 0) => 'M' + pts(a, dx, dy).replace(/ /g, 'L') + 'Z';
const polyPath = (p, dx = 0, dy = 0) => ring(p.o, dx, dy) + p.h.map((h) => ring(h, dx, dy)).join('');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// world -> pixel mapping of the current view (setView): u = (x - view.x0) / scale, v = (z - view.z0) / scale; the Yandex overlay uses the calibration mapping

function edge() {
  const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
  if (!exe) throw new Error('no Edge/Chrome found');
  return exe;
}
function render(svgFile, pngFile, w, h) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-'));
  try {
    execFileSync(edge(), ['--headless', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', `--user-data-dir=${tmp}`, `--screenshot=${pngFile}`, `--window-size=${w},${h}`, pathToFileURL(svgFile).href], { stdio: 'ignore', timeout: 120000 });
    console.log('wrote', path.relative(root, pngFile));
  } catch (e) { console.log('PNG skipped:', e.message); }
  fs.rmSync(tmp, { recursive: true, force: true });
}
let VIEW = null;                                                                   // culling window (local metres) of the plan being drawn; null = draw everything
const vx = (x, z) => !VIEW || (x >= VIEW.x0 - 40 && x <= VIEW.x1 + 40 && z >= VIEW.z0 - 40 && z <= VIEW.z1 + 40);
const vf = (a) => { if (!VIEW) return true; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < a.length; i += 2) { if (a[i] < x0) x0 = a[i]; if (a[i] > x1) x1 = a[i]; if (a[i + 1] < z0) z0 = a[i + 1]; if (a[i + 1] > z1) z1 = a[i + 1]; } return x1 >= VIEW.x0 - 40 && x0 <= VIEW.x1 + 40 && z1 >= VIEW.z0 - 40 && z0 <= VIEW.z1 + 40; };
const vp = (p) => vf(p.o);
const setView = (V, scale) => { VIEW = V; S = scale; U0 = -V.x0 / scale; V0 = -V.z0 / scale; };

// ---------------------------------------------------------------- one plan of a window V = { x0, x1, z0, z1 } (local metres) at `scale` metres per pixel -> { svg, W, H }
function drawPlan(V, scale, opt = {}) {
  setView(V, scale);
  const W = Math.ceil((V.x1 - V.x0) / scale), H = Math.ceil((V.z1 - V.z0) / scale);

  const out = [];
    const X0 = 0, Y0 = 0, X1 = W, Y1 = H;
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${f1(X0)} ${f1(Y0)} ${W} ${H}" font-family="Segoe UI, Arial, sans-serif">`);
  out.push(`<rect x="${f1(X0)}" y="${f1(Y0)}" width="${W}" height="${H}" fill="#f4f1ea"/>`);
  const LANDUSE_COL = { residential: '#efe9df', commercial: '#eee4e0', retail: '#f1e3df', industrial: '#e6e3e8', construction: '#e8dcc8', education: '#ece8f2', garages: '#e4e2df', brownfield: '#e9e2cf', religious: '#efe3ee', military: '#e4e6de' };
  for (const g of D.LANDUSE) for (const p of g.polys) if (vp(p)) out.push(`<path d="${polyPath(p)}" fill="${LANDUSE_COL[g.kind] || '#eee9e0'}" fill-rule="evenodd"/>`);
  for (const g of D.GREEN) for (const p of g.polys) if (vp(p)) out.push(`<path d="${polyPath(p)}" fill="${['pitch', 'playground', 'track', 'stadium'].includes(g.kind) ? '#bfe0a4' : '#cfe6b8'}" fill-rule="evenodd"/>`);
  for (const a of D.AREAS) for (const p of a.polys) if (vp(p)) out.push(`<path d="${polyPath(p)}" fill="#ece3d6" stroke="#cbbfae" stroke-width="0.8" fill-rule="evenodd"/>`);
  for (const p of D.PARKING) for (const q of p.polys) if (vp(q)) out.push(`<path d="${polyPath(q)}" fill="#dedee6" stroke="#b9b9c8" stroke-width="0.6" fill-rule="evenodd"/>`);
  for (const w of D.WATER) for (const p of w.polys) if (vp(p)) out.push(`<path d="${polyPath(p)}" fill="${w.kind === 'river' ? '#9ed2f0' : '#7fc0e8'}" stroke="#5fa3cf" stroke-width="0.8" fill-rule="evenodd"/>`);
  for (const s of D.STREAMS) if (vf(s.pts)) out.push(`<polyline points="${pts(s.pts)}" fill="none" stroke="#7fc0e8" stroke-width="2.4" stroke-dasharray="${s.tunnel ? '5 4' : 'none'}"/>`);
  for (const b of D.BRIDGES) for (const p of b.polys) if (vp(p)) out.push(`<path d="${polyPath(p)}" fill="#efe8c6" stroke="#a09060" stroke-width="0.6" opacity="0.85"/>`);
  const ROADCOL = { primary: '#8f8fa0', secondary: '#9a9aaa', tertiary: '#a9a9b7', residential: '#b9b9c6', unclassified: '#b9b9c6', living_street: '#c4c4cf', service: '#cdcdd6', pedestrian: '#e6d9c4', footway: '#e8b9b0', path: '#e8b9b0', steps: '#d98f8f', cycleway: '#b9d8c4', track: '#d8ccb0' };
  const order = ['service', 'footway', 'path', 'steps', 'cycleway', 'track', 'pedestrian', 'living_street', 'unclassified', 'residential', 'tertiary', 'secondary', 'primary'];
  for (const hw of order) for (const r of D.ROADS) {
    if (r.hw !== hw || r.tunnel || !vf(r.pts)) continue;
    const wpx = Math.max(0.9, r.w / S * (hw === 'footway' || hw === 'path' || hw === 'steps' ? 0.9 : 0.88));
    out.push(`<polyline points="${pts(r.pts)}" fill="none" stroke="${ROADCOL[hw] || '#bbb'}" stroke-width="${wpx.toFixed(1)}" stroke-linecap="butt" stroke-linejoin="round"${hw === 'steps' ? ' stroke-dasharray="1.5 1.5"' : ''}/>`);
  }
  for (const c of D.CROSSINGS) if (vf(c.pts)) out.push(`<polyline points="${pts(c.pts)}" fill="none" stroke="#fff" stroke-width="${(3 / S).toFixed(1)}" stroke-dasharray="2 2" opacity="0.9"/>`);
  const SUBCOL = { '1': '#d6232a', '2': '#0a6fc2', '3': '#0b9a3c', '4': '#f08a00', '5': '#7a3fa0' };
  for (const r of D.SUBWAY) if (vf(r.pts)) out.push(`<polyline points="${pts(r.pts)}" fill="none" stroke="${SUBCOL[r.line] || '#7a3fa0'}" stroke-width="2.6" stroke-dasharray="7 4" opacity="0.8"/>`);
  for (const r of D.TRAMWAYS) if (vf(r.pts)) out.push(`<polyline points="${pts(r.pts)}" fill="none" stroke="#6b4a2a" stroke-width="1.6"/>`);
  for (const r of D.RAILS) { if (!vf(r.pts)) continue; out.push(`<polyline points="${pts(r.pts)}" fill="none" stroke="#3a3a3a" stroke-width="2.4"/>`); out.push(`<polyline points="${pts(r.pts)}" fill="none" stroke="#f0f0f0" stroke-width="1.2" stroke-dasharray="4 4"/>`); }
  for (const p of D.PLATFORMS) { if (p.kind === 'subway') continue; for (const q of p.polys) out.push(`<path d="${polyPath(q)}" fill="#b9d8e6" stroke="#2a6a8a" stroke-width="0.8" fill-opacity="0.85"/>`); if (p.pts && p.pts.length) out.push(`<polyline points="${pts(p.pts)}" fill="none" stroke="#2a6a8a" stroke-width="2"/>`); }
  for (const b of D.BRIDGES) if (b.pts.length && vf(b.pts)) out.push(`<polyline points="${pts(b.pts)}" fill="none" stroke="#a09060" stroke-width="${Math.max(2, (b.w || 4) / S * 0.9).toFixed(1)}" opacity="0.55"/>`);
  for (const b of D.BARRIERS) if (vf(b.pts)) out.push(`<polyline points="${pts(b.closed ? [...b.pts, b.pts[0], b.pts[1]] : b.pts)}" fill="none" stroke="#7a6a5a" stroke-width="0.6" opacity="0.7"/>`);
  for (const w of D.WALLS) if (vf(w.pts)) out.push(`<polyline points="${pts(w.pts)}" fill="none" stroke="#554" stroke-width="1.4"/>`);
  for (const r of D.TREE_ROWS) if (vf(r)) out.push(`<polyline points="${pts(r)}" fill="none" stroke="#79b356" stroke-width="2.4" stroke-dasharray="2 4" stroke-linecap="round"/>`);
  // buildings: fill by height (mapped height, else levels*3.3; unknown = neutral grey)
  const hCol = (h) => { if (h == null) return '#d9d4cc'; const t = Math.min(1, Math.max(0, (h - 3) / 40)); const c = (a, b) => Math.round(a + (b - a) * t); return `rgb(${c(250, 88)},${c(226, 78)},${c(170, 150)})`; };
  for (const b of [...D.BUILDINGS].filter((b) => !b.skip).sort((a, b) => (a.h || 0) - (b.h || 0))) for (const p of b.polys) if (vp(p)) out.push(`<path d="${polyPath(p)}" fill="${hCol(b.h)}" stroke="#5c6470" stroke-width="0.5" fill-opacity="0.94" fill-rule="evenodd"/>`);
  for (const t of [0]) { const tr = D.TREES; let s = ''; for (let i = 0; i < tr.length; i += 2) if (vx(tr[i], tr[i + 1])) s += `<circle cx="${f1(pu(tr[i]))}" cy="${f1(pv(tr[i + 1]))}" r="2.6" fill="#5fae45" fill-opacity="0.75"/>`; out.push(s); }
  for (const l of D.LAMPS) if (vx(l.x, l.z)) out.push(`<circle cx="${f1(pu(l.x))}" cy="${f1(pv(l.z))}" r="1.4" fill="#f0b400"/>`);
  for (const s of D.SIGNALS) if (vx(s.x, s.z)) out.push(`<rect x="${f1(pu(s.x) - 3.5)}" y="${f1(pv(s.z) - 3.5)}" width="7" height="7" fill="#d33" stroke="#fff" stroke-width="0.8"/>`);
  for (const s of D.BUS_STOPS) if (s.kind !== 'stop_position' && vx(s.x, s.z)) out.push(`<rect x="${f1(pu(s.x) - 3.5)}" y="${f1(pv(s.z) - 3.5)}" width="7" height="7" rx="2" fill="#2b7bd6" stroke="#fff" stroke-width="0.8"/>`);
  for (const m of D.MONUMENTS) if (vx(m.x, m.z)) out.push(`<path d="M${f1(pu(m.x))},${f1(pv(m.z) - 6)}L${f1(pu(m.x) + 2)},${f1(pv(m.z) - 2)}L${f1(pu(m.x) + 6)},${f1(pv(m.z) - 2)}L${f1(pu(m.x) + 3)},${f1(pv(m.z) + 1.5)}L${f1(pu(m.x) + 4)},${f1(pv(m.z) + 6)}L${f1(pu(m.x))},${f1(pv(m.z) + 3)}L${f1(pu(m.x) - 4)},${f1(pv(m.z) + 6)}L${f1(pu(m.x) - 3)},${f1(pv(m.z) + 1.5)}L${f1(pu(m.x) - 6)},${f1(pv(m.z) - 2)}L${f1(pu(m.x) - 2)},${f1(pv(m.z) - 2)}Z" fill="#c2185b" stroke="#fff" stroke-width="0.6"/>`);
  // labels: named buildings (big ones), POIs
  for (const e of D.ENTRANCES) if (vx(e.x, e.z)) out.push(`<g><circle cx="${f1(pu(e.x))}" cy="${f1(pv(e.z))}" r="5.5" fill="${SUBCOL[{ red: '1', blue: '2', green: '3', orange: '4', purple: '5' }[e.colour]] || '#7a3fa0'}" stroke="#fff" stroke-width="1.2"/><text x="${f1(pu(e.x))}" y="${f1(pv(e.z) + 3)}" font-size="8" font-weight="bold" text-anchor="middle" fill="#fff">M</text></g>`);
  for (const st of D.STATIONS) if (vx(st.x, st.z)) out.push(`<rect x="${f1(pu(st.x) - 5)}" y="${f1(pv(st.z) - 5)}" width="10" height="10" fill="${st.kind === 'subway' ? '#fff' : '#222'}" stroke="${st.kind === 'subway' ? '#d6232a' : '#fff'}" stroke-width="2"/>`);
  const lab = (x, z, s, sz, col, dy = 0) => `<text x="${f1(pu(x))}" y="${f1(pv(z) + dy)}" font-size="${sz}" text-anchor="middle" fill="${col}" stroke="#f4f1ea" stroke-width="2.6" paint-order="stroke">${esc(s)}</text>`;
  const done = new Set();
  for (const b of D.BUILDINGS) { if (!b.name || b.part || b.area < (opt.minLabelArea ?? 250) || done.has(b.id) || !vx(b.cx, b.cz)) continue; done.add(b.id); out.push(lab(b.cx, b.cz, b.name, 10, '#14202e') + (b.h != null ? lab(b.cx, b.cz, Math.round(b.h) + ' m', 8.5, '#3b4b5e', 10) : '')); }
  for (const st of D.STATIONS) if (st.name && vx(st.x, st.z)) out.push(lab(st.x, st.z, st.name, 10, '#7a1010', -9));
  for (const p of D.POIS) { if (!p.name || (p.area && p.bldg === p.id) || !vx(p.x, p.z) || opt.noPoi) continue; out.push(lab(p.x, p.z, p.name, 8, '#a03a00', 0)); }
  for (const r of D.ROADS) { if (!r.name || r.w < 6 || r.pts.length < 4 || !vf(r.pts)) continue; const i = Math.floor(r.pts.length / 4) * 2; const a = pu(r.pts[i]), b = pv(r.pts[i + 1]); out.push(`<text x="${f1(a)}" y="${f1(b)}" font-size="11" text-anchor="middle" fill="#2a3a8a" stroke="#f4f1ea" stroke-width="2.6" paint-order="stroke" font-style="italic">${esc(r.name.replace('улица', 'ул.').replace('проспект', 'пр.'))}</text>`); }

  // play area = the UNION of D.PLAY_RECTS (red dashes), data extent = the union of D.EXTENT_RECTS (grey dots), the Yandex screenshot ground (blue dots), grid (local metres)
  const rect = (r, st) => `<rect x="${f1(pu(r.x0))}" y="${f1(pv(r.z0))}" width="${f1(pu(r.x1) - pu(r.x0))}" height="${f1(pv(r.z1) - pv(r.z0))}" fill="none" ${st}/>`;
  for (const r of D.EXTENT_RECTS) out.push(rect(r, 'stroke="#808890" stroke-width="1.2" stroke-dasharray="2 5"'));
  D.PLAY_RECTS.forEach((r, i) => { out.push(rect(r, 'stroke="#e0202a" stroke-width="2" stroke-dasharray="9 6"')); out.push(`<text x="${f1(pu(r.x0) + 6)}" y="${f1(pv(r.z0) + 16)}" font-size="13" font-weight="bold" fill="#e0202a" stroke="#fff" stroke-width="3" paint-order="stroke">${D.RECT_NAMES ? D.RECT_NAMES[i] : i}</text>`); });
  out.push(rect(CAL.groundCovered, 'stroke="#1565c0" stroke-width="1.2" stroke-dasharray="3 5"'));
  for (let x = Math.ceil(V.x0 / 100) * 100; x <= V.x1; x += 100) out.push(`<line x1="${f1(pu(x))}" y1="${f1(Y0)}" x2="${f1(pu(x))}" y2="${f1(Y1)}" stroke="#000" stroke-opacity="0.13"/><text x="${f1(pu(x) + 3)}" y="${f1(Y0 + 12)}" font-size="11" fill="#444">x ${x}</text>`);
  for (let z = Math.ceil(V.z0 / 100) * 100; z <= V.z1; z += 100) out.push(`<line x1="${f1(X0)}" y1="${f1(pv(z))}" x2="${f1(X1)}" y2="${f1(pv(z))}" stroke="#000" stroke-opacity="0.13"/><text x="${f1(X0 + 3)}" y="${f1(pv(z) - 3)}" font-size="11" fill="#444">z ${z}</text>`);
  const lx = X0 + 14, ly = Y1 - 92;
  out.push(`<rect x="${f1(lx - 8)}" y="${f1(ly - 14)}" width="430" height="100" fill="#fff" fill-opacity="0.85" stroke="#999"/>`);
  [[0, 'unknown height'], [6, '6 m'], [13, '13 m'], [26, '26 m'], [43, '43+ m']].forEach(([h, s], i) => out.push(`<rect x="${f1(lx + i * 82)}" y="${f1(ly)}" width="14" height="14" fill="${hCol(h || null)}" stroke="#5c6470" stroke-width="0.5"/><text x="${f1(lx + i * 82 + 18)}" y="${f1(ly + 11)}" font-size="10" fill="#222">${s}</text>`));
  out.push(`<text x="${f1(lx)}" y="${f1(ly + 34)}" font-size="10" fill="#222">red square = traffic signals · blue = bus stop · yellow dot = lamp · green dot = tree · black ladders = railway · violet dashes = metro tunnel · red M = metro entrance · pink star = monument</text>`);
  out.push(`<text x="${f1(lx)}" y="${f1(ly + 50)}" font-size="10" fill="#222">red dashes = play rectangles · grey dots = data extent rectangles · blue dots = Yandex screenshot ground · grid = 100 m local metres, north is up</text>`);
  out.push(`<text x="${f1(lx)}" y="${f1(ly + 66)}" font-size="10" fill="#222">${esc(opt.note || 'Saint Petersburg centre')} · plan from baked data · 1 px = ${S} m · © OpenStreetMap contributors (ODbL)</text>`);
  out.push('</svg>');
  return { svg: out.join('\n'), W, H };
}

// ---------------------------------------------------------------- plan.svg / plan.png (whole data extent), plan-west.png (the western extension), plan-crops/*.png (details + the rectangle seams)
const dir = path.join(root, 'docs', 'images'); fs.mkdirSync(dir, { recursive: true });
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-svg-'));
const E = D.EXTENT;
const jobs = [];
const arg = process.argv.slice(2);
const only = arg.filter((a) => !a.startsWith('--'));
const want = (n) => !only.length || only.includes(n);
// 1) the whole extent: 1 px = 1.4 m (the union of rectangles: the notches are blank paper)
if (want('plan')) jobs.push({ name: 'plan', view: E, scale: 1.4, out: path.join(dir, 'plan'), keepSvg: true });
// 2) the western extension (everything west of the old area), 1 px = 1.0 m
if (want('west')) jobs.push({ name: 'plan-west', view: { x0: E.x0, x1: -560, z0: E.z0, z1: 330 }, scale: 1.0, out: path.join(dir, 'plan-west') });
// 3) detail crops (700 x 500 m windows, 1 px = 0.5 m), labelled: the sights and the rectangle seams of the union (x = -595, x = -1750, the W2 staircase)
const CROPS = {
  'kazan-nevsky': { cx: -1500, cz: -260, w: 800, h: 560, note: 'Kazan Cathedral, Griboedov Canal, Singer House, Nevsky metro' },
  'gostiny-seam': { cx: -1000, cz: -230, w: 800, h: 560, note: 'Gostiny Dvor, Nevsky Prospekt metro (x = -1279), Ostrovsky square, the seam x = -595 at the right edge' },
  'palace-square': { cx: -2030, cz: -800, w: 800, h: 600, note: 'Palace Square, Winter Palace, General Staff, Alexander Garden, the Winter Canal and the Neva embankment' },
  'admiralty-isaac': { cx: -2480, cz: -420, w: 800, h: 640, note: 'Admiralty, St Isaac\'s Square and Cathedral, Senate Square, Bronze Horseman, the Neva bank' },
  'seam-w1-w2': { cx: -1750, cz: -450, w: 500, h: 700, note: 'the seam x = -1750 between W1 and W2a: no doubled or missing buildings / roads / water' },
  'saviour-mikhailovsky': { cx: -1150, cz: -830, w: 800, h: 560, note: 'Church of the Saviour on Blood, Mikhailovsky garden, the Moika and the Griboedov Canal' },
  'fontanka-north': { cx: -560, cz: -650, w: 520, h: 640, note: 'the Fontanka west bank north of the old area (N1) and the seam z = -405' },
  'hermitage-neva': { cx: -1900, cz: -1130, w: 700, h: 500, note: 'Hermitage Theatre, the mouth of the Winter Canal, the Neva south bank' },
};
if (want('crops')) for (const [name, c] of Object.entries(CROPS)) jobs.push({ name, view: { x0: c.cx - c.w / 2, x1: c.cx + c.w / 2, z0: c.cz - c.h / 2, z1: c.cz + c.h / 2 }, scale: 0.5, out: path.join(dir, 'plan-crops', name), note: c.note });
for (const j of jobs) {
  const { svg, W, H } = drawPlan(j.view, j.scale, { note: j.note });
  const svgFile = j.keepSvg ? j.out + '.svg' : path.join(tmpDir, j.name + '.svg');
  fs.mkdirSync(path.dirname(j.out), { recursive: true });
  fs.writeFileSync(svgFile, svg);
  console.log('plan', j.name, `${W}x${H}px (1 px = ${j.scale} m)`);
  render(svgFile, j.out + '.png', W, H);
}
fs.rmSync(tmpDir, { recursive: true, force: true });

// ---------------------------------------------------------------- plan-overlay.png : the screenshot + baked outlines / centre lines (the old area only; calibration mapping)
S = S_CAL; U0 = U_CAL; V0 = V_CAL; VIEW = null;
if (want('overlay')) {
  const ov = [];
  const shot = pathToFileURL(path.join(root, 'docs/reference/yandex-center.png')).href;
  ov.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${IMG_W}" height="${IMG_H}" viewBox="0 0 ${IMG_W} ${IMG_H}"><image href="${shot}" x="0" y="0" width="${IMG_W}" height="${IMG_H}" opacity="0.8"/>`);
  for (const b of D.BUILDINGS) { if (b.skip) continue; for (const p of b.polys) if (vf(p.o)) ov.push(`<path d="${polyPath(p)}" fill="none" stroke="${b.part ? '#ff9800' : '#e010ff'}" stroke-width="1.4" fill-rule="evenodd"/>`); }
  for (const r of D.ROADS) { if (['footway', 'path', 'steps', 'cycleway', 'service', 'track'].includes(r.hw) || !vf(r.pts)) continue; ov.push(`<polyline points="${pts(r.pts)}" fill="none" stroke="#00b4c8" stroke-width="1.8"/>`); }
  for (const s of D.SIGNALS) ov.push(`<circle cx="${f1(pu(s.x))}" cy="${f1(pv(s.z))}" r="6" fill="none" stroke="#f00" stroke-width="2"/>`);
  for (const r of D.RAILS) ov.push(`<polyline points="${pts(r.pts)}" fill="none" stroke="#000" stroke-width="1.6"/>`);
  for (const p of D.PLATFORMS) for (const q of p.polys) ov.push(`<path d="${polyPath(q)}" fill="none" stroke="#0050ff" stroke-width="1.6"/>`);
  for (const w of D.WATER) if (w.kind === 'river') for (const q of w.polys) ov.push(`<path d="${polyPath(q)}" fill="none" stroke="#0090ff" stroke-width="1.6" fill-rule="evenodd"/>`);
  for (const r of D.SUBWAY) ov.push(`<polyline points="${pts(r.pts)}" fill="none" stroke="#a000c0" stroke-width="1.6" stroke-dasharray="6 4"/>`);
  for (const e of D.ENTRANCES) ov.push(`<circle cx="${f1(pu(e.x))}" cy="${f1(pv(e.z))}" r="5" fill="none" stroke="#a000c0" stroke-width="2"/>`);
  ov.push(`<circle cx="${f1(pu(0))}" cy="${f1(pv(0))}" r="7" fill="#f00" stroke="#fff" stroke-width="2"/><text x="${f1(pu(0) + 10)}" y="${f1(pv(0) + 4)}" font-size="14" fill="#c00" stroke="#fff" stroke-width="3" paint-order="stroke">ORIGIN (0,0)</text>`);
  ov.push(`<text x="10" y="${IMG_H - 10}" font-size="13" fill="#000" stroke="#fff" stroke-width="3" paint-order="stroke">magenta = building outlines · orange = building parts · cyan = road centre lines · red ring = traffic signals · black = rails · blue = platforms / river · violet = metro</text>`);
  ov.push('</svg>');
  if (fs.existsSync(path.join(root, 'docs/reference/yandex-center.png'))) {
    const ovSvg = path.join(dir, 'plan-overlay.svg'); fs.writeFileSync(ovSvg, ov.join('\n'));
    render(ovSvg, path.join(root, 'docs', 'reference', 'plan-overlay.png'), IMG_W, IMG_H);
    fs.rmSync(ovSvg, { force: true });
  } else console.log('skipped plan-overlay.png: docs/reference/yandex-center.png (third-party Yandex screenshot, git-ignored on purpose) is not present; docs/images/plan.png is complete without it');
}
