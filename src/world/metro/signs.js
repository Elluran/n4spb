// metro/signs.js — the Petersburg wayfinding kit of the metro (research: docs/research/metro-wayfinding.md, 2026-10-15).
//   const sg = makeSigns(ctx, M);            // one kit per M (memoised); every canvas goes through ctx.tex.draw with a deterministic key
//   sg.hangBoard(S, { x, y, z, rotY, sections: [...] })      internally lit hanging box on two rods, several coloured sections, rounded ends
//   sg.lineScheme(S, { x, y, z, rotY, line, currentId, dir }) linear scheme panel (cream, framed) for track walls / pylon faces
//   sg.trackBand(S, { x, y, z0, z1, rotY, line, name, nameEn }) coloured band under the cornice with small bilingual names
//   sg.networkMap(S, { x, y, z, rotY, w })                    framed network map (white, official colours, joined transfer circles)
//   sg.noBoardingPlaque(S, [x, y, z], rotY)                   "Посадки нет / No boarding" + red STOP octagon
//   sg.badge(line) / sg.exitPictogram()                       textures;  sg.draw.*  canvas painters;  sg.sec.*  section builders from station data
// S_or_group: a Space (has .k and .group) or a plain THREE.Group. Positions are in the LOCAL frame of that Space / group (as hall builders do with S.k.plane).
// Board convention: a board/plane faces local +z when rotY = 0 and its text runs along local +x; rotY turns it like every other metro object (local +z -> (sin rotY, cos rotY)).
// No flags anywhere; the metro "M" is a plain letter in a rounded box (no logo).
import * as THREE from 'three';
import { LINES } from '../data/metro.js';
import { lineStations, BY_ID } from './net.js';
import { indexExact } from './lib.js';

/** official line colours of the signage (the LINES table of data/metro.js has 5 and 6 slightly off) */
export const SIGN_COLORS = { 1: '#D6083B', 2: '#0078C9', 3: '#009A49', 4: '#EA7125', 5: '#6E0A78', 6: '#8C5646' };
export const lineColor = (line) => SIGN_COLORS[String(line)] || (LINES[String(line)] && LINES[String(line)].color) || '#444444';

const BLUE = '#22309A', CREAM = '#efe9da', GRAPHITE = '#3a3f46', SILVER = '#aeb4ba', WHITE = '#ffffff', INK = '#14161a';
const FONT_DEFAULT = '"Rubik","Noto Sans",sans-serif';
const CH_RU = 0.56, CH_EN = 0.5;                       // average glyph width in em: bold Cyrillic / regular Latin (used to size the sections without a canvas)
const MAX_BOARD_LEN = 7.0, MIN_SECTION = 1.1, MAX_SECTION = 4.4;
const BOARD_MAX_W = 1024, BOARD_PPM = 109 / 0.62;           // hanging board face canvas: at most 1024 px wide and 109 px per 0.62 m of height (176 px/m; the module canvas budget)
const ARROW_ANGLE = { r: 0, d: Math.PI / 2, l: Math.PI, u: -Math.PI / 2, ur: -Math.PI / 4, ul: -3 * Math.PI / 4, dr: Math.PI / 4, dl: 3 * Math.PI / 4 };
const FLIP_ARROW = { l: 'r', r: 'l', ul: 'ur', ur: 'ul', dl: 'dr', dr: 'dl', u: 'u', d: 'd' };
const rot2 = (r, bx, bz) => [bx * Math.cos(r) + bz * Math.sin(r), -bx * Math.sin(r) + bz * Math.cos(r)];

// ------------------------------------------------------------------ canvas painters (pure: g, numbers, strings)
/** block arrow pointing along `dir` ('l' 'r' 'u' 'd' 'ul' 'ur' 'dl' 'dr'), overall size s px, centred at cx, cy */
function paintArrow(g, cx, cy, s, dir, color) {
  g.save(); g.translate(cx, cy); g.rotate(ARROW_ANGLE[dir] ?? 0); g.fillStyle = color;
  const t = s * 0.15;
  g.beginPath(); g.moveTo(-s / 2, -t); g.lineTo(s * 0.08, -t); g.lineTo(s * 0.08, -s * 0.34); g.lineTo(s / 2, 0); g.lineTo(s * 0.08, s * 0.34); g.lineTo(s * 0.08, t); g.lineTo(-s / 2, t); g.closePath(); g.fill();
  g.restore();
}
/** exit pictogram: a square open on the right with an arrow leaving it; occupies about 1.1 s x s */
function paintExit(g, cx, cy, s, color) {
  g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = s * 0.1; g.lineJoin = 'miter'; g.lineCap = 'butt';
  const x0 = cx - s * 0.55, x1 = cx + s * 0.3, y0 = cy - s / 2, y1 = cy + s / 2, gap = s * 0.27;
  g.beginPath(); g.moveTo(x1, cy - gap); g.lineTo(x1, y0); g.lineTo(x0, y0); g.lineTo(x0, y1); g.lineTo(x1, y1); g.lineTo(x1, cy + gap); g.stroke();
  const ay = cy, a0 = x0 + s * 0.2, tip = x1 + s * 0.28, hb = x1 + s * 0.02, t = s * 0.08;
  g.beginPath(); g.moveTo(a0, ay - t); g.lineTo(hb, ay - t); g.lineTo(hb, ay - s * 0.24); g.lineTo(tip, ay); g.lineTo(hb, ay + s * 0.24); g.lineTo(hb, ay + t); g.lineTo(a0, ay + t); g.closePath(); g.fill();
  g.restore();
}
/** escalator pictogram: stairs rising to the right with a standing person */
function paintEsc(g, cx, cy, s, color) {
  g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = s * 0.1; g.lineJoin = 'miter'; g.lineCap = 'butt';
  const x0 = cx - s / 2, y0 = cy + s / 2, n = 4, st = s / n;
  g.beginPath(); g.moveTo(x0, y0); for (let i = 0; i < n; i++) { g.lineTo(x0 + i * st, y0 - (i + 1) * st * 0.62); g.lineTo(x0 + (i + 1) * st, y0 - (i + 1) * st * 0.62); } g.stroke();
  const px = cx + s * 0.02, py = cy - s * 0.12;
  g.beginPath(); g.arc(px, py - s * 0.22, s * 0.1, 0, Math.PI * 2); g.fill();
  g.lineCap = 'round'; g.lineWidth = s * 0.12; g.beginPath(); g.moveTo(px, py - s * 0.08); g.lineTo(px, py + s * 0.2); g.stroke();
  g.restore();
}
/** line badge: rounded rectangle in the line colour with a white outline, white "М" + number; hpx = height, width = 1.25 hpx */
function paintBadge(g, cx, cy, hpx, line, FONT = FONT_DEFAULT) {
  const w = hpx * 1.25, r = hpx * 0.22;
  g.save();
  g.beginPath();
  g.moveTo(cx - w / 2 + r, cy - hpx / 2); g.arcTo(cx + w / 2, cy - hpx / 2, cx + w / 2, cy + hpx / 2, r); g.arcTo(cx + w / 2, cy + hpx / 2, cx - w / 2, cy + hpx / 2, r);
  g.arcTo(cx - w / 2, cy + hpx / 2, cx - w / 2, cy - hpx / 2, r); g.arcTo(cx - w / 2, cy - hpx / 2, cx + w / 2, cy - hpx / 2, r); g.closePath();
  g.fillStyle = lineColor(line); g.fill(); g.lineWidth = Math.max(1.5, hpx * 0.07); g.strokeStyle = WHITE; g.stroke();
  g.fillStyle = WHITE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${Math.round(hpx * 0.56)}px ${FONT}`; g.fillText('М' + line, cx, cy + hpx * 0.03);
  g.restore();
}
/** stadium path (rounded ends), x y w h */
function stadiumPath(g, x, y, w, h) {
  const r = Math.min(h / 2, w / 2);
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arc(x + w - r, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2); g.lineTo(x + r, y + h); g.arc(x + r, y + h / 2, h / 2, Math.PI / 2, Math.PI * 1.5); g.closePath();
}
const octagon = (g, cx, cy, r) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g[i ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a), cy + r * Math.sin(a)); } g.closePath(); };

// ------------------------------------------------------------------ text helpers
/** split a Russian / English pair into lines: explicit "\n", else at the comma nearest the middle (long lists), else at a space for very long texts */
function splitLines(s) {
  if (!s) return [];
  if (s.includes('\n')) return s.split('\n');
  if (s.length <= 18) return [s];
  const parts = s.split(', ');
  if (parts.length > 1) {
    let best = 1, bd = 1e9;
    for (let i = 1; i < parts.length; i++) { const d = Math.abs(parts.slice(0, i).join(', ').length - parts.slice(i).join(', ').length); if (d < bd) { bd = d; best = i; } }
    return [parts.slice(0, best).join(', ') + ',', parts.slice(best).join(', ')];
  }
  if (s.length > 26) { const mid = s.length / 2; let at = -1; for (let i = 0; i < s.length; i++) if (s[i] === ' ' && (at < 0 || Math.abs(i - mid) < Math.abs(at - mid))) at = i; if (at > 0) return [s.slice(0, at), s.slice(at + 1)]; }
  return [s];
}
/** "streets" [[ru, en], ...] -> { text, sub } as the exit list of a board */
export function streetText(streets) {
  const list = streets || [];
  return { text: list.map((p) => p[0]).join(', '), sub: list.map((p) => p[1]).join(', ') };
}

// ------------------------------------------------------------------ section model of a hanging board
const U = { arrow: 0.5, exit: 0.7, esc: 0.62, badge: 0.78 };             // item widths in units of the board height
function normSection(s) {
  const kind = s.kind || 'exit';
  const line = s.line == null ? '' : String(s.line), bl = String(s.badgeLine ?? s.line ?? '');
  let text = s.text, sub = s.sub, white = false;
  if (kind === 'transfer' && !text) { text = 'Линия'; sub = 'Line'; white = true; }
  if (kind === 'rules') { white = true; text = text ?? 'Держитесь правой стороны!'; sub = sub ?? 'Keep to the right!'; }
  if (kind === 'exit' && !text) { text = 'Выход в город'; sub = 'Way out'; }
  let bg = kind === 'exit' ? BLUE : kind === 'trains' ? lineColor(line) : kind === 'transfer' ? (white || !line ? WHITE : lineColor(line)) : WHITE;
  if (kind === 'transfer' && !line) bg = WHITE;
  const arrow = s.arrow && ARROW_ANGLE[s.arrow] !== undefined ? s.arrow : '';
  const ru = splitLines(text || ''), en = splitLines(sub || '');
  const double = ru.length > 1 || en.length > 1;
  const ruFrac = double ? 0.2 : (en.length ? 0.3 : 0.36), enFrac = double ? 0.12 : 0.17;
  return { kind, text: text || '', sub: sub || '', line, badge: bl, arrow, esc: !!s.esc, bg, white: bg === WHITE, ru, en, double, ruFrac, enFrac, width: s.width };
}
/** ordered items of a section: [{ t, w (units of the board height) }] */
function sectionItems(sec, flip) {
  const ar = sec.arrow ? (flip ? FLIP_ARROW[sec.arrow] : sec.arrow) : '';
  const left = !!ar && ar.includes('l'), A = ar ? { t: 'arrow', w: U.arrow, dir: ar } : null;
  const it = [];
  if (A && left) it.push(A);
  if (sec.kind === 'exit') { it.push({ t: 'exit', w: U.exit }); if (sec.esc) it.push({ t: 'esc', w: U.esc }); it.push({ t: 'text', w: 0 }); }
  else if (sec.kind === 'trains') { if (sec.badge) it.push({ t: 'badge', w: U.badge }); it.push({ t: 'text', w: 0 }); }
  else if (sec.kind === 'transfer') { it.push({ t: 'text', w: 0 }); if (sec.badge) it.push({ t: 'badge', w: U.badge }); if (sec.esc && !sec.white) it.push({ t: 'esc', w: U.esc }); }
  else it.push({ t: 'text', w: 0 });
  if (A && !left) it.push(A);
  return it;
}
function textUnits(sec) {
  let w = 0;
  for (const l of sec.ru) w = Math.max(w, [...l].length * CH_RU * sec.ruFrac);
  for (const l of sec.en) w = Math.max(w, [...l].length * CH_EN * sec.enFrac);
  return w;
}
/** widths in metres of every section and of the whole board */
function boardLayout(sections, h) {
  const secs = sections.map(normSection), n = secs.length, GAP = 0.2;
  let widths = secs.map((s, i) => {
    if (s.width) return s.width;
    const items = sectionItems(s, false), fixed = items.reduce((a, b) => a + b.w, 0), gaps = (items.length - 1) * GAP;
    const padL = i === 0 ? 0.6 : 0.3, padR = i === n - 1 ? 0.6 : 0.3;
    return Math.min(MAX_SECTION, Math.max(MIN_SECTION, (padL + padR + fixed + gaps + textUnits(s)) * h));
  });
  let L = widths.reduce((a, b) => a + b, 0);
  if (L > MAX_BOARD_LEN) { const f = MAX_BOARD_LEN / L; widths = widths.map((w) => w * f); L = MAX_BOARD_LEN; }
  const xs = []; let acc = 0; for (const w of widths) { xs.push([acc, acc + w]); acc += w; }
  return { secs, widths, xs, L, h };
}
const boardKey = (lay, flip) => 'sg-hb|' + lay.h.toFixed(3) + '|' + lay.L.toFixed(2) + '|' + (flip ? 'f' : 'n') + '|' + lay.secs.map((s) => [s.kind, s.text, s.sub, s.line, s.badge, s.arrow, s.esc ? 1 : 0, s.width || ''].join('~')).join('#');

function paintBoard(g, W, H, lay, flip, P) {
  g.clearRect(0, 0, W, H);
  stadiumPath(g, 0, 0, W, H); g.fillStyle = GRAPHITE; g.fill();                      // casing seen from the front: graphite rim
  g.save(); stadiumPath(g, 0.5, 0.5, W - 1, H - 1); g.lineWidth = Math.max(1.5, H * 0.02); g.strokeStyle = SILVER; g.stroke(); g.restore();
  const rim = Math.max(2, H * 0.045);
  g.save(); stadiumPath(g, rim, rim, W - 2 * rim, H - 2 * rim); g.clip();
  const ppm = W / lay.L, n = lay.secs.length;
  lay.secs.forEach((s, i) => {
    const x0 = Math.round(lay.xs[i][0] * ppm), x1 = Math.round(lay.xs[i][1] * ppm), wpx = x1 - x0;
    g.fillStyle = s.bg; g.fillRect(x0 - 1, 0, wpx + 2, H);
    if (i > 0) { g.fillStyle = GRAPHITE; const sep = Math.max(2, H * 0.03); g.fillRect(x0 - sep / 2, 0, sep, H); }
    paintSection(g, s, x0, wpx, H, i === 0, i === n - 1, flip, P);
  });
  g.restore();
}
function paintSection(g, s, x0, wpx, H, first, last, flip, P) {
  const FONT = P.FONT;
  const u = H, fg = s.white ? INK : WHITE, items = sectionItems(s, flip), gap = 0.2 * u;
  const padL = (first ? 0.6 : 0.3) * u, padR = (last ? 0.6 : 0.3) * u;
  const fixed = items.reduce((a, b) => a + b.w * u, 0), gaps = (items.length - 1) * gap;
  const textPx = Math.max(10, Math.min(textUnits(s) * u, wpx - padL - padR - fixed - gaps));
  const contentW = fixed + gaps + textPx;
  let x = x0 + padL + Math.max(0, (wpx - padL - padR - contentW) / 2);
  const cy = H / 2;
  items.forEach((it, i) => {
    const wpxI = it.t === 'text' ? textPx : it.w * u;
    if (it.t === 'arrow') paintArrow(g, x + wpxI / 2, cy, U.arrow * u * 0.95, it.dir, fg);
    else if (it.t === 'exit') paintExit(g, x + wpxI / 2, cy, U.exit * u * 0.88, fg);
    else if (it.t === 'esc') paintEsc(g, x + wpxI / 2, cy, U.esc * u * 0.9, fg);
    else if (it.t === 'badge') paintBadge(g, x + wpxI / 2, cy, U.badge * u / 1.25, s.badge, FONT);
    else paintText(g, s, x, wpxI, H, fg, P);
    x += wpxI + (i < items.length - 1 ? gap : 0);
  });
}
function paintText(g, s, x, w, H, fg, P) {
  const FONT = P.FONT, fit = P.fit;
  g.fillStyle = fg; g.textAlign = 'left'; g.textBaseline = 'middle';
  const nRu = s.ru.length, nEn = s.en.length, ruS = s.ruFrac * H, enS = s.enFrac * H;
  if (!nEn) { const pitch = ruS * 1.12, y0 = H / 2 - (nRu - 1) * pitch / 2; s.ru.forEach((l, i) => fit(g, l, x, y0 + i * pitch, w, ruS, FONT, 700)); return; }
  if (!s.double) { fit(g, s.ru[0], x, H * 0.40, w, ruS, FONT, 700); g.save(); g.globalAlpha = 0.92; fit(g, s.en[0], x, H * 0.74, w, enS, FONT, 400); g.restore(); return; }
  const pr = 0.22 * H, pe = 0.135 * H, block = nRu * pr + nEn * pe + 0.03 * H;
  let y = (H - block) / 2 + pr / 2;
  for (const l of s.ru) { fit(g, l, x, y, w, ruS, FONT, 700); y += pr; }
  y += 0.03 * H - pr / 2 + pe / 2;
  g.save(); g.globalAlpha = 0.92; for (const l of s.en) { fit(g, l, x, y, w, enS, FONT, 400); y += pe; } g.restore();
}

// ------------------------------------------------------------------ linear scheme
const ABBR = [[/ПРОСПЕКТ/g, 'ПР.'], [/ПЛОЩАДЬ/g, 'ПЛ.'], [/ИНСТИТУТ/g, 'ИН-Т'], [/ТЕХНОЛОГИЧЕСКИЙ/g, 'ТЕХНОЛОГ.'], [/АЛЕКСАНДРА НЕВСКОГО/g, 'А. НЕВСКОГО']];
const GREY = '#a7a398', GREY_TXT = '#9a968c';
const SCHEME_MAX_W = 1280, SCHEME_PPH = 512;                // line scheme canvas: width cap (px) and the old height basis (px of a res = 1 panel; callers' res multiplies it)
function measuredSize(g, text, maxW, size, weight, font) {
  g.font = `${weight} ${size}px ${font}`; const w = g.measureText(text).width;
  return w > maxW && w > 0 ? Math.max(5, size * maxW / w) : size;
}
function schemeParams(line, currentId, dir) {
  const L = lineStations(String(line)), order = dir < 0 ? L.slice().reverse() : L.slice();
  return { order, cur: order.findIndex((s) => s.id === currentId) };
}
const schemeKey = (o, sw, sh) => 'sg-ls|' + o.line + '|' + (o.currentId || '-') + '|' + (o.dir < 0 ? '-' : '+') + (o.ahead === 'left' ? 'L' : 'R') + '|' + o.w.toFixed(2) + 'x' + o.h.toFixed(2) + '|' + sw + 'x' + sh;
function paintScheme(g, W, H, o, FONT) {
  const { wm, line, order, cur } = o, u = W / wm, col = lineColor(line), n = order.length;
  g.fillStyle = CREAM; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#8e8a80'; g.lineWidth = Math.max(2, 0.012 * u); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, W - g.lineWidth, H - g.lineWidth);
  const barY = H * 0.57, xA = 0.66 * u, xB = W - 0.66 * u, pitch = (xB - xA) / Math.max(1, n - 1), pm = pitch / u;
  const left = o.ahead === 'left', dA = left ? 'l' : 'r';                    // the way ahead is drawn to the right (default) or to the left of the panel
  const xs = order.map((_, i) => left ? xB - i * pitch : xA + i * pitch);
  // bar: passed part grey, the way ahead in the line colour
  g.lineCap = 'butt'; g.lineWidth = 0.05 * u;
  const xc = cur >= 0 ? xs[cur] : xs[0];
  if (cur > 0) { g.strokeStyle = GREY; g.beginPath(); g.moveTo(xs[0], barY); g.lineTo(xc, barY); g.stroke(); }
  g.strokeStyle = col; g.beginPath(); g.moveTo(xc, barY); g.lineTo(xs[n - 1], barY); g.stroke();
  // end arrows (the way the trains go) and the terminal badges
  paintArrow(g, left ? xB + 0.2 * u : xA - 0.2 * u, barY, 0.13 * u, dA, cur > 0 ? GREY : col); paintArrow(g, left ? xA - 0.18 * u : xB + 0.18 * u, barY, 0.13 * u, dA, col);
  paintBadge(g, 0.27 * u, barY, 0.19 * u, line, FONT); paintBadge(g, W - 0.27 * u, barY, 0.19 * u, line, FONT);
  const ruFs = Math.min(0.072, 0.56 * pm) * u, enFs = Math.min(0.04, 0.46 * pm) * u;
  order.forEach((st, i) => {
    const x = xs[i], passed = cur >= 0 && i < cur, here = i === cur, closed = !!st.closed, c = passed || closed ? GREY : col;
    // transfer badges above the circle
    const tl = [...new Set((st.transfer || []).map((id) => BY_ID[id] && BY_ID[id].line).filter((l) => l && l !== String(line)))];
    const bh = 0.085 * u, bw = bh * 1.25, tw = tl.length * bw + (tl.length - 1) * 0.015 * u;
    tl.forEach((l, k) => paintBadge(g, x - tw / 2 + bw / 2 + k * (bw + 0.015 * u), barY - 0.11 * u, bh, l, FONT));
    const lift = tl.length ? 0.1 * u : 0;
    // circle
    const r = (here ? 0.07 : 0.052) * u;
    if (here) { g.beginPath(); g.arc(x, barY, r + 0.022 * u, 0, 7); g.fillStyle = '#111'; g.fill(); }
    g.beginPath(); g.arc(x, barY, r, 0, 7); g.fillStyle = closed ? CREAM : (here ? col : WHITE); g.fill(); g.lineWidth = 0.016 * u; g.strokeStyle = c; g.stroke();
    // Russian name above at 45 degrees (bold capitals), English below (small capitals)
    const maxUp = (barY - 0.1 * u - lift - 0.04 * u) / 0.7071, maxDn = (H - barY - 0.1 * u - 0.04 * u) / 0.7071;
    let ru = st.name.toUpperCase(), fs = ruFs * (here ? 1.08 : 1), wt = here ? 800 : 700;
    let size = measuredSize(g, ru, maxUp, fs, wt, FONT);
    if (size < fs * 0.62) { for (const [re, to] of ABBR) ru = ru.replace(re, to); size = measuredSize(g, ru, maxUp, fs, wt, FONT); }
    g.save(); g.translate(x + 0.012 * u, barY - 0.09 * u - lift); g.rotate(-Math.PI / 4); g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = passed || closed ? GREY_TXT : (here ? col : INK); g.font = `${wt} ${Math.floor(size)}px ${FONT}`; g.fillText(ru, 0, 0); g.restore();
    const en = st.nameEn.toUpperCase(), es = measuredSize(g, en, maxDn, enFs, 500, FONT);
    g.save(); g.translate(x + 0.012 * u, barY + 0.09 * u); g.rotate(Math.PI / 4); g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = passed || closed ? GREY_TXT : '#3b3d44'; g.font = `500 ${Math.floor(es)}px ${FONT}`; g.fillText(en, 0, 0); g.restore();
  });
}

// ------------------------------------------------------------------ network map
const MAP_W = 2048, MAP_H = 1536, SX = 1.55, MAP_OX = 10;
const MAP_ROWS = { 3: { y: 300, up: true, room: 350, pivot: 'mayakovskaya', px: 466, dx: 62 }, 2: { y: 560, up: true, room: 310, pivot: 'nevsky', px: 404, dx: -44 }, 1: { y: 800, up: false, room: 310, x0: 34, dx: 48 },
  5: { y: 1060, up: false, room: 282, x0: 60, dx: 62 }, 4: { y: 1300, up: false, room: 277, pivot: 'dostoevskaya', px: 520, dx: 72 }, 6: { y: 1450, up: true, room: 160, x0: 60, dx: 96 } };
/** [x, y] of every station on the 2048 x 1536 network map canvas (strip layout of map-ui.js, stretched to the canvas) */
export function networkMapXY() {
  const xy = {};
  for (const line of Object.keys(MAP_ROWS)) {
    const L = lineStations(line), c = MAP_ROWS[line], p = c.pivot ? L.findIndex((s) => s.id === c.pivot) : 0;
    L.forEach((s, i) => { xy[s.id] = [MAP_OX + (c.pivot ? c.px + (i - p) * c.dx : c.x0 + i * c.dx) * SX, c.y]; });
  }
  return xy;
}
function paintMap(g, W, P, xy) {
  const FONT = P.FONT, k = W / MAP_W;
  g.save(); g.scale(k, k);
  g.fillStyle = WHITE; g.fillRect(0, 0, MAP_W, MAP_H);
  g.strokeStyle = '#8e8a80'; g.lineWidth = 5; g.strokeRect(3, 3, MAP_W - 6, MAP_H - 6);
  // lines
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const line of Object.keys(MAP_ROWS)) {
    const L = lineStations(line); g.strokeStyle = lineColor(line); g.lineWidth = 15; g.beginPath(); L.forEach((s, i) => { const [x, y] = xy[s.id]; g[i ? 'lineTo' : 'moveTo'](x, y); }); g.stroke();
  }
  // transfers: joined circles (black capsule with a white core)
  const seen = new Set(), all = Object.keys(MAP_ROWS).flatMap((l) => lineStations(l));
  for (const s of all) for (const tid of s.transfer || []) {
    const key = [s.id, tid].sort().join('|'); if (seen.has(key) || !xy[tid]) continue; seen.add(key);
    const a = xy[s.id], b = xy[tid];
    g.strokeStyle = '#2b2b30'; g.lineWidth = 24; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.strokeStyle = WHITE; g.lineWidth = 10; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  // stations + labels
  for (const s of all) {
    const [x, y] = xy[s.id], c = MAP_ROWS[s.line], col = lineColor(s.line);
    g.beginPath(); g.arc(x, y, 12, 0, 7); g.fillStyle = s.closed ? '#e9e6dc' : WHITE; g.fill(); g.lineWidth = 7; g.strokeStyle = s.closed ? GREY : col; g.stroke();
    const up = c.up, a = up ? -48 : 48, maxLen = c.room;
    g.save(); g.translate(x + (up ? 6 : 8), y + (up ? -18 : 20)); g.rotate(a * Math.PI / 180); g.textAlign = 'left'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = WHITE;
    const ru = s.name, rs = Math.floor(measuredSize(g, ru, maxLen, 22, 700, FONT));
    g.font = `700 ${rs}px ${FONT}`; g.strokeText(ru, 0, 0); g.fillStyle = s.closed ? GREY_TXT : INK; g.fillText(ru, 0, 0);
    const en = s.nameEn, es = Math.floor(measuredSize(g, en, maxLen, 15, 400, FONT));
    g.font = `400 ${es}px ${FONT}`; g.strokeText(en, 0, 19); g.fillStyle = s.closed ? GREY_TXT : '#43454d'; g.fillText(en, 0, 19);
    g.restore();
  }
  // title + legend (right column)
  const lx = 1730; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = INK;
  P.fit(g, 'Схема линий', lx, 70, 290, 34, FONT, 800); g.fillStyle = '#43454d'; P.fit(g, 'Metro lines map', lx, 106, 290, 24, FONT, 400);
  P.fit(g, 'Санкт-Петербург · Saint Petersburg', lx, 140, 290, 20, FONT, 400);
  Object.keys(MAP_ROWS).sort().forEach((line, i) => {
    const yy = 230 + i * 78, def = LINES[line];
    paintBadge(g, lx + 34, yy, 42, line, FONT);
    g.fillStyle = INK; g.textAlign = 'left'; P.fit(g, def.name.replace(' линия', ''), lx + 82, yy - 11, 216, 21, FONT, 700);
    g.fillStyle = '#43454d'; P.fit(g, def.nameEn.replace(' line', ''), lx + 82, yy + 12, 216, 16, FONT, 400);
  });
  const ly = 230 + 6 * 78 + 20;
  g.fillStyle = '#2b2b30'; tcap(g, lx + 8, ly, 56, 24, 12); g.fillStyle = WHITE; tcap(g, lx + 14, ly, 44, 12, 6);
  g.fillStyle = INK; P.fit(g, 'Пересадка', lx + 82, ly - 8, 216, 20, FONT, 700); g.fillStyle = '#43454d'; P.fit(g, 'Interchange', lx + 82, ly + 12, 216, 15, FONT, 400);
  g.restore();
}
function tcap(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y - h / 2); g.lineTo(x + w - r, y - h / 2); g.arc(x + w - r, y, h / 2, -Math.PI / 2, Math.PI / 2); g.lineTo(x + r, y + h / 2); g.arc(x + r, y, h / 2, Math.PI / 2, Math.PI * 1.5); g.closePath(); g.fill(); }

// ------------------------------------------------------------------ the kit
const memo = new WeakMap();
export function makeSigns(ctx, M) {
  if (M && typeof M === 'object' && memo.has(M)) return memo.get(M);
  const { mat, tex } = ctx, FONT = (M && M.FONT) || FONT_DEFAULT;
  const P = { FONT, fit: (g, text, x, y, maxW, size, font, weight) => tex.fitText(g, text, x, y, maxW, size, font, weight) };
  const kit = { pixels: 0, textures: {}, keys: new Set(), colors: SIGN_COLORS, lineColor };
  const cache = new Map(), geos = new Map();
  /** one canvas per deterministic key; identical content -> the same texture; pixels counted once */
  const paint = (key, w, h, fn) => {
    if (cache.has(key)) return cache.get(key);
    kit.pixels += w * h; kit.keys.add(key);
    const t = tex.draw(w, h, fn, { key }); cache.set(key, t); return t;
  };
  const steelDark = M.steelDark || mat.toon('#6b7480'), steelBlack = M.steelBlack || mat.toon('#2a2d31'), steel = M.steel || mat.toon('#b8bcc0');
  const toonMap = (map) => mat.toon('#ffffff', { map });
  const litMap = (map, alpha) => mat.emissive('#ffffff', 1.0, alpha ? { map, alphaTest: 0.5 } : { map });
  const T = (t) => { const k = t.k || ctx.kit(t); return { k, group: t.group || t }; };
  const nofx = (m) => { if (m) { m.castShadow = false; } return m; };

  // ---------------------------------------------------------------- textures
  kit.badge = (line) => paint('sg-badge|' + line, 128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); paintBadge(g, w / 2, h / 2, 88, String(line), FONT); });
  kit.exitPictogram = (bg = BLUE) => paint('sg-exit|' + bg, 256, 256, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); paintExit(g, w / 2 - 6, h / 2, 150, WHITE); });
  kit.escalatorPictogram = (bg = BLUE) => paint('sg-esc|' + bg, 256, 256, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); paintEsc(g, w / 2, h / 2, 150, WHITE); });
  /** { tex, length, layout } of a hanging board (also for the in-car / other users of the texture) */
  kit.textures.hangBoard = (sections, o = {}) => {
    const h = o.w ?? 0.62, lay = boardLayout(sections, h), ppm = Math.min(BOARD_PPM, Math.floor(BOARD_MAX_W / lay.L));
    const flip = !!o.flip && lay.secs.some((s) => s.arrow && FLIP_ARROW[s.arrow] !== s.arrow);       // the back face differs only when an arrow points sideways
    const W = Math.round(lay.L * ppm), H = Math.round(h * ppm);
    return { tex: paint(boardKey(lay, flip), W, H, (g, w, hh) => paintBoard(g, w, hh, lay, flip, P)), length: lay.L, layout: lay };
  };
  kit.textures.lineScheme = (o) => {
    const q = { line: String(o.line), currentId: o.currentId, dir: o.dir ?? 1, ahead: o.ahead === 'left' ? 'left' : 'right', w: o.w ?? 4.8, h: o.h ?? 1.3 }, res = o.res ?? 1;
    // texture budget (2026-10-15): the 4.8 m panel is 1536 px wide (320 px/m, 416 px high); res < 1 of the callers is a multiplier of the OLD 512 px/1.3 m base, so res-tuned panels keep their size
    let sw = Math.round(SCHEME_PPH * q.w / q.h * res), sh;
    sw = Math.max(256, Math.round(Math.min(SCHEME_MAX_W, sw) / 8) * 8); sh = Math.max(64, Math.round(sw * q.h / q.w / 8) * 8);
    const sp = schemeParams(q.line, q.currentId, q.dir);
    return paint(schemeKey(q, sw, sh), sw, sh, (g, w, hh) => paintScheme(g, w, hh, { wm: q.w, line: q.line, order: sp.order, cur: sp.cur, ahead: q.ahead }, FONT));
  };
  kit.textures.networkMap = (o = {}) => {
    const xy = networkMapXY();                       // ONE texture for every hall (o.res is ignored on purpose: a second size would be a second 3 MB canvas)
    return paint('sg-map', MAP_W, MAP_H, (g, ww) => paintMap(g, ww, P, xy));
  };
  kit.textures.bandName = (line, name, nameEn) => paint('sg-band|' + line + '|' + name + '|' + nameEn, 1024, 128, (g, w, h) => {
    g.fillStyle = lineColor(line); g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, h - 6, w, 6); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 0, w, 4);
    g.fillStyle = WHITE; g.textAlign = 'center'; g.textBaseline = 'middle';
    tex.fitText(g, name, w / 2, h * 0.40, w - 60, 58, FONT, 700); g.save(); g.globalAlpha = 0.92; tex.fitText(g, nameEn, w / 2, h * 0.77, w - 60, 34, FONT, 400); g.restore();
  });
  kit.textures.noBoarding = () => paint('sg-noboard', 768, 256, (g, w, h) => {
    g.fillStyle = WHITE; g.fillRect(0, 0, w, h); g.strokeStyle = GRAPHITE; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle';
    tex.fitText(g, 'Посадки нет', 36, h * 0.38, w - 300, 76, FONT, 700); g.save(); g.globalAlpha = 0.9; tex.fitText(g, 'No boarding', 36, h * 0.72, w - 300, 46, FONT, 400); g.restore();
    const cx = w - 108, cy = h / 2; octagon(g, cx, cy, 86); g.fillStyle = '#c8102e'; g.fill(); octagon(g, cx, cy, 86); g.lineWidth = 6; g.strokeStyle = WHITE; g.stroke();
    octagon(g, cx, cy, 76); g.lineWidth = 3; g.strokeStyle = '#c8102e'; g.stroke();
    g.fillStyle = WHITE; g.textAlign = 'center'; tex.fitText(g, 'СТОП', cx, cy + 2, 130, 52, FONT, 800);
  });

  // ---------------------------------------------------------------- hanging boards
  const stadiumGeo = (L, h, d) => {
    const key = L.toFixed(2) + '|' + h.toFixed(3) + '|' + d.toFixed(3);
    if (geos.has(key)) return geos.get(key);
    const r = h / 2, s = new THREE.Shape();
    s.moveTo(-L / 2 + r, -h / 2); s.lineTo(L / 2 - r, -h / 2); s.absarc(L / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-L / 2 + r, h / 2); s.absarc(-L / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
    const geo = indexExact(new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -d / 2));      // (shared corners: lib.js indexExact)
    geos.set(key, geo); return geo;
  };
  /** { x, y, z, rotY, sections, w = 0.62 (board height), both = true, rodLen = 1.6, flipBack = true }. y = the centre of the box. Returns { length, height, x0s, group-space centre } */
  kit.hangBoard = (target, o = {}) => {
    const { k } = T(target), h = o.w ?? 0.62, both = o.both !== false, rodLen = o.rodLen ?? 1.6, x = o.x || 0, y = o.y || 0, z = o.z || 0, r = o.rotY || 0, d = 0.12;
    const front = kit.textures.hangBoard(o.sections, { w: h, flip: false }), L = front.length;
    const at = (bx, by, bz) => { const [dx, dz] = rot2(r, bx, bz); return [x + dx, y + by, z + dz]; };
    nofx(k.mesh(stadiumGeo(L, h, d), steelDark, [x, y, z], [0, r, 0]));
    nofx(k.plane(L, h, litMap(front.tex, true), at(0, 0, d / 2 + 0.003), [0, r, 0]));
    if (both) { const back = kit.textures.hangBoard(o.sections, { w: h, flip: o.flipBack !== false }); nofx(k.plane(L, h, litMap(back.tex, true), at(0, 0, -d / 2 - 0.003), [0, r + Math.PI, 0])); }
    if (rodLen > 0) for (const sx of [-1, 1]) { const bx = sx * Math.min(L / 2 - 0.4, L * 0.32); nofx(k.cyl(0.012, 0.012, rodLen, steelBlack, at(bx, h / 2 + rodLen / 2, 0), null, 4)); }
    return { length: L, height: h, sections: front.layout.xs.map((p) => [p[0] - L / 2, p[1] - L / 2]), x, y, z, rotY: r };
  };

  // ---------------------------------------------------------------- linear scheme panel
  /** { x, y, z, rotY, line, currentId, dir (+1: the train goes toward the higher index), ahead = 'right' | 'left' (side of the panel the train is heading to), w = 4.8, h = 1.3, res = 1 }.
   (x, y, z) = the centre of the panel ON the wall; the panel protrudes 4 cm toward the facing direction of rotY. */
  kit.lineScheme = (target, o = {}) => {
    const { k } = T(target), w = o.w ?? 4.8, h = o.h ?? 1.3, x = o.x || 0, y = o.y || 0, z = o.z || 0, r = o.rotY || 0;
    const t = kit.textures.lineScheme({ line: o.line, currentId: o.currentId, dir: o.dir ?? 1, ahead: o.ahead, w, h, res: o.res });
    const at = (bx, by, bz) => { const [dx, dz] = rot2(r, bx, bz); return [x + dx, y + by, z + dz]; };
    nofx(k.box(w + 0.05, h + 0.05, 0.04, steel, at(0, 0, 0.02), [0, r, 0]));
    nofx(k.plane(w, h, toonMap(t), at(0, 0, 0.042), [0, r, 0]));
    return { width: w, height: h };
  };

  // ---------------------------------------------------------------- track wall band
  /** a band along z at x (the wall surface), z0..z1, y = centre (just under the cornice, 2.6-3 m above the track bed); rotY: -PI/2 faces -x, +PI/2 faces +x; names every `every` m */
  kit.trackBand = (target, o = {}) => {
    const { k } = T(target), x = o.x || 0, y = o.y || 0, z0 = o.z0 ?? 0, z1 = o.z1 ?? 0, r = o.rotY ?? -Math.PI / 2, every = o.every ?? 9, bh = o.h ?? 0.28;
    const nx = Math.sin(r) >= 0 ? 1 : -1, len = Math.abs(z1 - z0), zc = (z0 + z1) / 2, lo = Math.min(z0, z1);       // the wall runs along z; rotY is +-PI/2
    nofx(k.box(0.03, bh, len, mat.toon(lineColor(o.line)), [x + nx * 0.015, y, zc]));
    const t = kit.textures.bandName(o.line, o.name, o.nameEn), pm = toonMap(t), pw = Math.min(2.2, every * 0.5);
    for (let zz = lo + every / 2; zz < lo + len; zz += every) nofx(k.plane(pw, bh * 0.98, pm, [x + nx * 0.032, y, zz], [0, r, 0]));
    return { count: Math.floor(len / every) };
  };

  // ---------------------------------------------------------------- network map
  /** a framed map; h = w * 0.75. y = centre. lit: emissive light-box instead of a toon print */
  kit.networkMap = (target, o = {}) => {
    const { k } = T(target), w = o.w ?? 1.2, h = w * MAP_H / MAP_W, x = o.x || 0, y = o.y || 0, z = o.z || 0, r = o.rotY || 0;
    const t = kit.textures.networkMap({ res: o.res });
    const at = (bx, by, bz) => { const [dx, dz] = rot2(r, bx, bz); return [x + dx, y + by, z + dz]; };
    nofx(k.box(w + 0.07, h + 0.07, 0.04, steelDark, at(0, 0, 0.02), [0, r, 0]));
    nofx(k.plane(w, h, o.lit ? litMap(t, false) : toonMap(t), at(0, 0, 0.042), [0, r, 0]));
    return { width: w, height: h };
  };

  // ---------------------------------------------------------------- "No boarding" plaque
  /** wall plaque 1.5 x 0.5 m; pos = [x, y, z] (centre), rotY as for every other sign */
  kit.noBoardingPlaque = (target, pos, rotY = 0, o = {}) => {
    const { k } = T(target), w = o.w ?? 1.5, h = o.h ?? 0.5, r = rotY || 0, [x, y, z] = pos;
    const at = (bx, by, bz) => { const [dx, dz] = rot2(r, bx, bz); return [x + dx, y + by, z + dz]; };
    nofx(k.box(w + 0.04, h + 0.04, 0.04, steel, at(0, 0, 0.02), [0, r, 0]));
    nofx(k.plane(w, h, toonMap(kit.textures.noBoarding()), at(0, 0, 0.042), [0, r, 0]));
    return { width: w, height: h };
  };

  // ---------------------------------------------------------------- section builders from station data (data/metro-signs.js)
  const word = { right: ['правой', 'right'], left: ['левой', 'left'] };
  kit.sec = {
    /** exit with a street list: exit = { streets: [[ru, en], ...], esc } */
    exit: (e, arrow, esc) => { const s = streetText(e.streets); return { kind: 'exit', text: s.text, sub: s.sub, arrow, esc: esc ?? !!e.esc }; },
    /** 2024 style "Выход в город / Way out" */
    city: (arrow, esc) => ({ kind: 'exit', arrow, esc: !!esc }),
    /** to the trains: line + direction (+1 = toward the higher index) or an explicit terminus [ru, en] */
    trains: (line, dir, arrow, terminus) => { const def = LINES[String(line)], t = terminus || [def.to[dir > 0 ? 1 : 0], def.toEn[dir > 0 ? 1 : 0]]; return { kind: 'trains', line: String(line), text: t[0], sub: t[1], badgeLine: String(line), arrow }; },
    /** transfer: tr = { to (station id), line, plain, esc }; plain -> white "Линия / Line" + badge */
    transfer: (tr, arrow) => { const st = tr.to && BY_ID[tr.to], line = String(tr.line || (st && st.line)); return tr.plain ? { kind: 'transfer', line, badgeLine: line, arrow } : { kind: 'transfer', line, text: tr.text || st.name, sub: tr.sub || st.nameEn, badgeLine: line, esc: !!tr.esc, arrow }; },
    rules: (side = 'right') => { const wd = word[side] || word.right; return { kind: 'rules', text: 'Держитесь ' + wd[0] + ' стороны!', sub: 'Keep to the ' + wd[1] + '!' }; },
  };
  /** 'right' | 'left': the side of a panel that faces rotY toward which a train running along local z (travelZ = +1 / -1) is heading; pass it as `ahead` of lineScheme */
  kit.aheadOf = (rotY, travelZ) => (-Math.sin(rotY) * travelZ >= 0 ? 'right' : 'left');
  kit.draw = { paintArrow, paintExit, paintEsc, paintBadge, stadiumPath };
  kit.streetText = streetText;
  if (M && typeof M === 'object') memo.set(M, kit);
  return kit;
}
