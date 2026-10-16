// metro/train.js — the rolling stock (docs/research/metro.md section E, photos 120-133): three liveries on the same 19.2 m x 2.7 m car body.
//   baltiets  line 1, 8 cars: light grey body, red skirt and roof band, black door frames, light-grey interior with red-pink seats (81-725.1)
//   neva      line 3, 6 cars: white-blue body with a navy skirt, cream interior with navy bucket seats (81-556)
//   717       line 4, 7 cars: blue-teal body with a cream band and V-shaped door stripes, cream interior with brown seats (81-717 / 714)
// A CAR is merged into ~13 meshes (a vertex-coloured solid mesh, window glass, emissive lamps, red / white lamp sets, four door-leaf meshes + four door-glass meshes that slide, one strip mesh, two LED markers);
// two car prototypes per stock (cab car and middle car) are built once, trains are clones (shared geometry and materials). Every car is its own Object3D so that a train can follow a curved tunnel car by car.
// Car frame: origin = the middle of the car at floor level, +z = the direction of travel (the cab, if any, is at +z), x lateral (doors on both sides), y up (floor 0, rail head -0.92).
//
// IN-CAR LINE STRIPS (docs/research/metro-west.md section 7): above the window band of every side wall hangs a 3.6 m x 0.42 m route strip, two per side (z -3.8 / +3.8), one merged mesh per car.
// The picture is a 2048 x 256 canvas per LINE and per DIRECTION (cache key `strip-<line>-<dir>`, drawn on the first setLine, never in the frame loop), in the style of the line's stock:
//   81-717 (lines 2, 4, 5)  white panel, line-colour band "M2 ЛИНИЯ 2 (LINE 2)", dots on a bar, names alternating above / below, transfer stations as pie discs in the colours of the lines
//   NeVa (lines 3, 6)       Bronze Horseman block + green line digit, green names on a 60 degree diagonal, "3 2" transfer badges, a black LED progress bar below
//   Baltiets (line 1)       dark LCD panel; the LEFT 640 px (STRIP_LCD_RECT) are left blank for the live "next station" text, the route is drawn with names standing upright on the right
// The stations run in the ORDER OF TRAVEL left to right (dir +1 = toward the higher station index, -1 = the other way); an arrow points to the last station. A runtime LED marker (0.05 m emissive box,
// two meshes per car, one per wall) is moved to the dot of a station by train.setStop(idx); stripX(line, idx, dir) is the pure layout function behind it.
import * as THREE from 'three';
import { LINES } from '../data/metro.js';
import { lineStations, BY_ID, lineName } from './net.js';

export const STOCK = {
  baltiets: { id: 'baltiets', cars: 8, len: 19.2, name: '81-725.1 «Балтиец»', body: '#c9cdd0', band: '#e4232b', stripe: '#9a9ea3', roof: '#e4e6e8', frame: '#1c1d22', glass: '#262b33', seat: '#b3615c', wall: '#d9dde0', floor: '#6c7078', door: '#c9cdd0', doorStripe: null, lineColor: '#d6083b' },
  neva: { id: 'neva', cars: 6, len: 19.2, name: '81-556.2 «НеВа»', body: '#12795a', band: '#e7e5d8', stripe: '#e7e5d8', roof: '#dfe5ec', frame: '#2b3446', glass: '#242a36', seat: '#233680', wall: '#e8e0c8', floor: '#8c8e8f', door: '#12795a', doorStripe: '#e7e5d8', lineColor: '#009a49' },   // line 3 since 2018-19: deep green with cream door zones
  '717-l2': { id: '717-l2', cars: 6, len: 19.2, name: '81-717 (линия 2)', body: '#3c3b72', band: '#e8dba8', stripe: '#e8dba8', roof: '#8d99a4', frame: '#4a525c', glass: '#222831', seat: '#5b4a3e', wall: '#e8e2cc', floor: '#6e5a48', door: '#3c3b72', doorStripe: '#e8dba8', lineColor: '#0078c9' },
  '717-l5': { id: '717-l5', cars: 7, len: 19.2, name: '81-717 (линия 5)', body: '#4a6a93', band: '#e8e0c4', stripe: '#e8e0c4', roof: '#9aa6b2', frame: '#4a525c', glass: '#222831', seat: '#5b4a3e', wall: '#e8e2cc', floor: '#6e5a48', door: '#4a6a93', doorStripe: '#f2f0e6', lineColor: '#702785' },
  '717': { id: '717', cars: 7, len: 19.2, name: '81-717 / 714', body: '#3d7ba0', band: '#e6d6a8', stripe: '#e6d6a8', roof: '#8d99a4', frame: '#4a525c', glass: '#222831', seat: '#5b4a3e', wall: '#e8e2cc', floor: '#6e5a48', door: '#3d7ba0', doorStripe: '#f2f0e6', lineColor: '#ea7125' },
};
export const GAP = 0.45, CAR_PITCH = 19.2 + GAP;
export const trainLength = (st) => st.cars * st.len + (st.cars - 1) * GAP;
export const carOffset = (st, i) => (i - (st.cars - 1) / 2) * CAR_PITCH;           // centre of car i along the train (car 0 is the REAR car, the last car leads)

const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };

// ---------------------------------------------------------------- in-car line strips
const FONT = '"Rubik","Noto Sans",sans-serif';                                          // = mats.js FONT
export const STRIP_W = 3.1, STRIP_H = 0.42, STRIP_Y = 1.93, STRIP_X = 1.205, STRIP_Z = 3.8, STRIP_PX_W = 2048, STRIP_PX_H = 256;
/** official line colours (the user's research 2026; data/metro.js LINES carries #702785 for line 5 and #9c5b2a for line 6) */
export const LINE_COLOR = { '1': '#D6083B', '2': '#0078C9', '3': '#009A49', '4': '#EA7125', '5': '#6E0A78', '6': '#8C5646' };
/** the blank screen of the Baltiets strip (px of the 2048 x 256 picture) reserved for the live "next station / door side / exit direction" text */
export const STRIP_LCD_RECT = { x: 16, y: 44, w: 640, h: 196 };
const STYLE_PARAMS = {                                                                   // x0 / x1 = first / last station dot (px), maxStep caps the dot spacing of short lines, dotY = the row of the dots (px from the top)
  '717': { x0: 250, x1: 1798, maxStep: 130, dotY: 150 },
  neva: { x0: 350, x1: 1890, maxStep: 150, dotY: 224 },
  lcd: { x0: 730, x1: 1990, maxStep: 90, dotY: 226 },
};
const styleOf = (line) => { const s = LINES[line] && LINES[line].stock; return s === 'baltiets' ? 'lcd' : s === 'neva' ? 'neva' : '717'; };
const layouts = new Map();
/** pure layout of a line's strip: { L (stations in index order), n, style, step, dotY, xAt(slot) -> px } */
export function stripLayout(line) {
  line = String(line);
  let ly = layouts.get(line); if (ly) return ly;
  const L = lineStations(line), n = L.length, style = styleOf(line), P = STYLE_PARAMS[style];
  const span = P.x1 - P.x0, step = n > 1 ? Math.min(span / (n - 1), P.maxStep) : 0, left = P.x0 + (span - step * (n - 1)) / 2;
  ly = { L, n, style, step, dotY: P.dotY, left, xAt: (slot) => left + slot * step };
  layouts.set(line, ly); return ly;
}
/** horizontal position (0..1 of the picture width) of station `idx` of `line` on the strip drawn for direction `dir` */
export function stripX(line, idx, dir = 1) {
  const ly = stripLayout(line), slot = dir >= 0 ? idx : ly.n - 1 - idx;
  return ly.xAt(slot) / STRIP_PX_W;
}
/** vertical position of the station dots as an offset from the strip centre, in metres (up positive) */
export function stripDotDy(line) { return (STRIP_PX_H / 2 - stripLayout(line).dotY) / STRIP_PX_H * STRIP_H; }

/** the strip texture of a line + direction (cached by key `strip-<line>-<dir>`; 524 288 px each) */
export function stripTexture(ctx, line, dir) {
  const d = dir >= 0 ? 1 : -1, ln = String(line);
  return ctx.tex.draw(STRIP_PX_W, STRIP_PX_H, (g, w, h) => paintStrip(g, w, h, ln, d), { key: `strip-${ln}-${d}`, anisotropy: 8 });
}

// ---- strip painters
const partnersOf = (s) => [...new Set((s.transfer || []).map((id) => BY_ID[id] && BY_ID[id].line).filter((l) => l && l !== s.line))];
function fitSize(g, text, size, weight, maxW, min = 8) {
  g.font = `${weight} ${size}px ${FONT}`;
  const w = g.measureText(text).width;
  return w <= maxW ? size : Math.max(min, Math.floor(size * maxW / w));
}
/** one or two lines (split at the most balanced space) when the text is wider than maxW */
function splitName(g, text, size, weight, maxW) {
  g.font = `${weight} ${size}px ${FONT}`;
  if (g.measureText(text).width <= maxW || !text.includes(' ')) return [text];
  let best = null, bw = 1e9;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== ' ') continue;
    const a = text.slice(0, i), b = text.slice(i + 1), w = Math.max(g.measureText(a).width, g.measureText(b).width);
    if (w < bw) { bw = w; best = [a, b]; }
  }
  return best || [text];
}
/** Russian (bold, up to 2 lines) over English (regular, up to 2 lines) as a list of text lines with sizes */
function nameBlock(g, s, o) {
  const lines = [];
  for (const t of splitName(g, s.name, o.ru, 700, o.maxW)) lines.push({ t, size: fitSize(g, t, o.ru, 700, o.maxW), weight: 700, color: o.ruColor });
  const en = s.nameEn || '';
  const enL = splitName(g, en, o.en, 400, o.maxW);
  for (const t of enL) lines.push({ t, size: fitSize(g, t, o.en, 400, o.maxW), weight: 400, color: o.enColor });
  let total = 0; for (const l of lines) { l.h = l.size * 1.18; total += l.h; }
  return { lines, total };
}
/** draws a block with its top at y; align 'center' | 'left' | 'right' about x */
function drawBlock(g, blk, x, y, align) {
  g.textAlign = align; g.textBaseline = 'middle';
  let yy = y;
  for (const l of blk.lines) { g.font = `${l.weight} ${l.size}px ${FONT}`; g.fillStyle = l.color; g.fillText(l.t, x, yy + l.h / 2); yy += l.h; }
}
/** pie disc of the own line + the partner lines with their digits */
function disc(g, x, y, r, cols, digits, fs) {
  const k = cols.length, a0 = -Math.PI / 2;
  for (let i = 0; i < k; i++) { g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, a0 + i * 2 * Math.PI / k, a0 + (i + 1) * 2 * Math.PI / k); g.closePath(); g.fillStyle = cols[i]; g.fill(); }
  g.lineWidth = Math.max(2, r * 0.14); g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.stroke();
  if (digits) {
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${Math.round(fs)}px ${FONT}`;
    for (let i = 0; i < k; i++) { const a = a0 + (i + 0.5) * 2 * Math.PI / k; g.fillText(digits[i], x + Math.cos(a) * r * 0.56, y + Math.sin(a) * r * 0.56 + 1); }
  }
}
const arrowHead = (g, x, y, s, color) => { g.fillStyle = color; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 1.5, y); g.lineTo(x, y + s); g.closePath(); g.fill(); };

function paintStrip(g, w, h, line, dir) {
  const ly = stripLayout(line), L = LINES[line], col = LINE_COLOR[line] || L.color;
  const ord = dir >= 0 ? ly.L : ly.L.slice().reverse();
  const toRu = lineName(line, dir, true), toEn = lineName(line, dir, false);
  if (ly.style === 'neva') paintNeva(g, w, h, ly, ord, line, col, L, toRu, toEn);
  else if (ly.style === 'lcd') paintLcd(g, w, h, ly, ord, line, col, L, toRu, toEn);
  else paint717(g, w, h, ly, ord, line, col, L, toRu, toEn);
}

function paint717(g, w, h, ly, ord, line, col, L, toRu, toEn) {
  const n = ord.length, by = ly.dotY, x0 = ly.xAt(0), x1 = ly.xAt(n - 1);
  g.fillStyle = '#f5f2e9'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#c9c4b6'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
  // header band: "M2 ЛИНИЯ 2 (LINE 2)", the line name, the direction
  g.fillStyle = col; g.fillRect(0, 0, w, 48);
  g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `700 32px ${FONT}`;
  const head = `M${line}   ЛИНИЯ ${line} (LINE ${line})`; g.fillText(head, 20, 26);
  const hx = 20 + g.measureText(head).width + 36;
  g.textAlign = 'right'; const dirTxt = `${toRu}  ·  ${toEn}`, dsz = fitSize(g, dirTxt, 28, 700, 560); g.font = `700 ${dsz}px ${FONT}`; g.fillText(dirTxt, w - 62, 26);
  const dw = g.measureText(dirTxt).width; g.beginPath(); g.moveTo(w - 54, 14); g.lineTo(w - 24, 25); g.lineTo(w - 54, 36); g.closePath(); g.fill();
  g.textAlign = 'left'; const mid = `${L.name}  ·  ${L.nameEn}`; g.font = `400 ${fitSize(g, mid, 22, 400, Math.max(200, w - 62 - dw - 30 - hx))}px ${FONT}`; g.globalAlpha = 0.92; g.fillText(mid, hx, 26); g.globalAlpha = 1;
  // bar
  g.fillStyle = col; g.fillRect(x0, by - 6, x1 - x0, 12); arrowHead(g, x1 + 10, by, 17, col);
  // terminus names, bold, at both ends
  const lw = x0 - 44 - 14, rw = w - (x1 + 56) - 14;
  const bl = nameBlock(g, ord[0], { ru: 32, en: 18, maxW: lw, ruColor: col, enColor: '#4b5560' }); drawBlock(g, bl, x0 - 44, by - bl.total / 2, 'right');
  const br = nameBlock(g, ord[n - 1], { ru: 32, en: 18, maxW: rw, ruColor: col, enColor: '#4b5560' }); drawBlock(g, br, x1 + 56, by - br.total / 2, 'left');
  // stations
  for (let i = 0; i < n; i++) {
    const s = ord[i], x = ly.xAt(i), P = partnersOf(s), grey = !!s.closed;
    if (P.length) disc(g, x, by, 23, [col, ...P.map((p) => LINE_COLOR[p])], [line, ...P], P.length > 1 ? 15 : 20);
    else { g.beginPath(); g.arc(x, by, 12, 0, 2 * Math.PI); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 5; g.strokeStyle = grey ? '#9aa0a6' : col; g.stroke(); }
    if (i === 0 || i === n - 1) continue;
    const up = i % 2 === 1, gap = P.length ? 33 : 24, blk = nameBlock(g, s, { ru: 21, en: 14, maxW: Math.min(260, 2 * ly.step - 10), ruColor: grey ? '#8a9096' : '#14202b', enColor: grey ? '#9aa0a6' : '#4b5560' });
    drawBlock(g, blk, x, up ? by - gap - blk.total : by + gap, 'center');
  }
}

function paintNeva(g, w, h, ly, ord, line, col, L, toRu, toEn) {
  const n = ord.length, by = ly.dotY, x0 = ly.xAt(0), x1 = ly.xAt(n - 1), S = Math.sin(Math.PI / 3);
  g.fillStyle = '#f3f1ea'; g.fillRect(0, 0, w, h);
  g.fillStyle = col; g.fillRect(0, 0, w, 8);
  // left block: Bronze Horseman silhouette (a rearing horse on the Thunder Stone) + the line digit
  g.fillStyle = col; g.beginPath(); g.roundRect ? g.roundRect(12, 14, 316, 228, 18) : g.rect(12, 14, 316, 228); g.fill();
  g.save(); g.translate(26, 28); g.scale(1.04, 1.04); horseman(g, '#f4f1e6'); g.restore();
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 112px ${FONT}`; g.fillText(line, 252, 92);
  g.font = `700 24px ${FONT}`; g.fillText(`ЛИНИЯ ${line}`, 252, 164); g.font = `400 20px ${FONT}`; g.fillText(`LINE ${line}`, 252, 192);
  // LED progress bar
  const bx0 = x0 - 36, bx1 = x1 + 36;
  g.fillStyle = '#0a0b0c'; g.beginPath(); g.roundRect ? g.roundRect(bx0, by - 22, bx1 - bx0 + 70, 44, 22) : g.rect(bx0, by - 22, bx1 - bx0 + 70, 44); g.fill();
  g.fillStyle = '#2a2e2c'; g.fillRect(x0, by - 2, x1 - x0, 4);
  arrowHead(g, bx1 + 12, by, 11, col);
  for (let i = 0; i < n; i++) {
    const x = ly.xAt(i), s = ord[i];
    g.beginPath(); g.arc(x, by, 8, 0, 2 * Math.PI); g.fillStyle = s.closed ? '#1a1c1b' : '#3b413e'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#555c58'; g.stroke();
  }
  // diagonal names, 60 degrees; transfer badges "3 2" sit between the LED dot and the name
  for (let i = 0; i < n; i++) {
    const s = ord[i], x = ly.xAt(i), P = partnersOf(s), end = i === 0 || i === n - 1, grey = !!s.closed;
    let y0 = by - 30;
    if (P.length) {
      const bw = 26, gx = x - ((1 + P.length) * bw + P.length * 3) / 2;
      [line, ...P].forEach((l, k) => { const bx = gx + k * (bw + 3); g.fillStyle = LINE_COLOR[l]; g.beginPath(); g.roundRect ? g.roundRect(bx, by - 62, bw, bw, 6) : g.rect(bx, by - 62, bw, bw); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 19px ${FONT}`; g.fillText(l, bx + bw / 2, by - 62 + bw / 2 + 1); });
      y0 = by - 74;
    }
    const maxW = Math.max(60, (y0 - 8) / S), blk = nameBlock(g, s, { ru: end ? 27 : 22, en: end ? 16 : 14, maxW, ruColor: grey ? '#8a9096' : end ? '#04512b' : '#0b7a40', enColor: grey ? '#9aa0a6' : '#4b5560' });
    g.save(); g.translate(x - 4, y0); g.rotate(-Math.PI / 3); drawBlock(g, blk, 0, -blk.total / 2, 'left'); g.restore();
  }
}

/** a stylised Bronze Horseman in a 150 x 190 box: Thunder Stone, rearing horse, rider with the outstretched arm */
function horseman(g, color) {
  g.fillStyle = color; g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(0, 190); g.lineTo(8, 152); g.lineTo(30, 124); g.lineTo(66, 104); g.lineTo(118, 110); g.lineTo(150, 142); g.lineTo(146, 190); g.closePath(); g.fill();   // the stone
  g.beginPath(); g.ellipse(80, 84, 35, 17, -0.62, 0, 2 * Math.PI); g.fill();                                          // body
  g.lineWidth = 9; g.beginPath(); g.moveTo(58, 100); g.lineTo(46, 128); g.moveTo(68, 103); g.lineTo(66, 128); g.stroke();   // hind legs
  g.lineWidth = 7; g.beginPath(); g.moveTo(102, 70); g.lineTo(126, 54); g.lineTo(138, 64); g.moveTo(98, 76); g.lineTo(118, 78); g.lineTo(128, 90); g.stroke();   // raised forelegs
  g.lineWidth = 13; g.beginPath(); g.moveTo(98, 66); g.lineTo(120, 32); g.stroke();                                     // neck
  g.beginPath(); g.ellipse(131, 27, 13, 7, 0.7, 0, 2 * Math.PI); g.fill();                                              // head
  g.lineWidth = 6; g.beginPath(); g.moveTo(50, 92); g.quadraticCurveTo(24, 102, 20, 126); g.stroke();                    // tail
  g.lineWidth = 11; g.beginPath(); g.moveTo(84, 62); g.lineTo(90, 30); g.stroke();                                       // rider's torso
  g.beginPath(); g.arc(91, 18, 7, 0, 2 * Math.PI); g.fill();                                                             // head
  g.lineWidth = 5; g.beginPath(); g.moveTo(92, 34); g.lineTo(130, 12); g.stroke();                                       // the arm over the Neva
}

function paintLcd(g, w, h, ly, ord, line, col, L, toRu, toEn) {
  const n = ord.length, by = ly.dotY, x0 = ly.xAt(0), x1 = ly.xAt(n - 1), R = STRIP_LCD_RECT;
  g.fillStyle = '#0a0d12'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.03)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
  g.fillStyle = col; g.fillRect(0, 0, w, 34);
  g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `700 24px ${FONT}`; g.fillText(`ЛИНИЯ ${line}  ·  LINE ${line}`, 18, 18);
  g.textAlign = 'right'; const dirTxt = `${toRu}  ·  ${toEn}`; g.font = `700 ${fitSize(g, dirTxt, 24, 700, 900)}px ${FONT}`; g.fillText(dirTxt, w - 56, 18);
  g.beginPath(); g.moveTo(w - 48, 8); g.lineTo(w - 22, 18); g.lineTo(w - 48, 28); g.closePath(); g.fill();
  // the blank screen of the live text (next station, door side, exit direction): only a frame and a caption
  g.fillStyle = '#04060a'; g.beginPath(); g.roundRect ? g.roundRect(R.x, R.y, R.w, R.h, 14) : g.rect(R.x, R.y, R.w, R.h); g.fill();
  g.lineWidth = 3; g.strokeStyle = '#2c3644'; g.stroke();
  g.fillStyle = '#6f7d8f'; g.textAlign = 'left'; g.font = `400 20px ${FONT}`; g.fillText('Следующая станция  ·  Next station', R.x + 22, R.y + 26);
  // the route: bar + dots, names standing upright (read from the bottom up), Russian bold, English regular
  g.fillStyle = col; g.fillRect(x0, by - 5, x1 - x0, 10); arrowHead(g, x1 + 10, by, 13, col);
  for (let i = 0; i < n; i++) {
    const s = ord[i], x = ly.xAt(i), P = partnersOf(s), end = i === 0 || i === n - 1, grey = !!s.closed;
    let top = by - 18;
    if (P.length) { disc(g, x, by, 14, [col, ...P.map((p) => LINE_COLOR[p])], [line, ...P], P.length > 1 ? 10 : 13); top = by - 22; }
    else { g.beginPath(); g.arc(x, by, end ? 11 : 9, 0, 2 * Math.PI); g.fillStyle = '#0a0d12'; g.fill(); g.lineWidth = 4; g.strokeStyle = grey ? '#59616b' : end ? '#ffffff' : col; g.stroke(); }
    const blk = nameBlock(g, s, { ru: end ? 21 : 17, en: end ? 14 : 12, maxW: top - 42, ruColor: grey ? '#6c7681' : '#eef2f7', enColor: grey ? '#59616b' : '#98a5b6' });
    g.save(); g.translate(x, top); g.rotate(-Math.PI / 2); drawBlock(g, blk, 0, -blk.total / 2, 'left'); g.restore();
  }
}

/** the two car prototypes of a stock: { cab, mid } (Object3D groups) + leaf lists */
export function buildCarProtos(ctx, M, stockId) {
  const st = STOCK[stockId], { mat } = ctx;
  const solidMat = mat.toon('#ffffff', { vertexColors: true }), lightMat = mat.emissive('#f4f8ff', 1.2), headMat = mat.emissive('#fffbe8', 2.0), tailMat = mat.emissive('#ff4a3a', 2.0), ledMat = mat.emissive('#ff3a2a', 1.4), lineMat = mat.emissive(st.lineColor, 0.9);
  const stripPh = mat.toon('#e9e3d2'), markMat = mat.emissive('#ff3a2a', 1.6);        // strip placeholder until train.setLine; the LED marker
  const MATS = { solid: solidMat, glass: M.glass, light: lightMat, head: headMat, tail: tailMat, led: ledMat, line: lineMat };
  const col = {}; const C = (k, hex) => (col[k] ||= new THREE.Color(hex));
  const c = {
    body: C('body', st.body), band: C('band', st.band), stripe: C('stripe', st.stripe), roof: C('roof', st.roof), frame: C('frame', st.frame), seat: C('seat', st.seat), seatBack: C('sb', shade(st.seat, 0.88)),
    wall: C('wall', st.wall), floor: C('floor', st.floor), door: C('door', st.door), under: C('under', '#2a2d33'), wheel: C('wheel', '#383b42'), bogie: C('bogie', '#4a4f58'), pole: C('pole', '#c4c9ce'),
    cab: C('cab', '#3a3f46'), ceil: C('ceil', '#eceae2'), dstripe: C('ds', st.doorStripe || '#f2f0e6'), white: C('white', '#ffffff'),
  };
  const L = st.len, HALF = L / 2, doorZ = [-6.6, -2.2, 2.2, 6.6], DW = 1.3;
  const segs = [[-HALF + 0.2, -6.6 - DW / 2], [-6.6 + DW / 2, -2.2 - DW / 2], [-2.2 + DW / 2, 2.2 - DW / 2], [2.2 + DW / 2, 6.6 - DW / 2], [6.6 + DW / 2, HALF - 0.2]];

  const make = (withCab) => {
    const lists = {};
    const put = (kind, g, color) => {
      if (color) { const n = g.attributes.position.count, arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; } g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); }
      g.deleteAttribute('uv'); (lists[kind] ||= []).push(g);
    };
    const b = (kind, color, w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); put(kind, g, kind === 'solid' || kind.startsWith('leaf') ? color : null); };
    const cyl = (color, r, h, x, y, z, axis) => { const g = new THREE.CylinderGeometry(r, r, h, 8); if (axis === 'x') g.rotateZ(Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2); g.translate(x, y, z); put('solid', g, color); };
    const stripG = [], markG = { 1: [], '-1': [] };
    // floor, underframe, bogies with wheels
    b('solid', c.floor, 2.6, 0.18, L - 0.3, 0, -0.09, 0);
    b('solid', c.under, 2.1, 0.5, L - 5.5, 0, -0.45, 0); b('solid', c.under, 2.62, 0.1, L - 0.3, 0, -0.23, 0);
    for (const z of [-6.4, 6.4]) { b('solid', c.bogie, 2.0, 0.3, 2.5, 0, -0.5, z); for (const dz of [-0.95, 0.95]) for (const sx of [-1, 1]) cyl(c.wheel, 0.42, 0.14, sx * 0.76, -0.5, z + dz, 'x'); for (const sx of [-1, 1]) b('solid', c.bogie, 0.2, 0.2, 2.5, sx * 0.76, -0.35, z); }
    // roof (stepped to read as curved), the coloured roof-edge band, vents
    b('solid', c.roof, 2.66, 0.14, L - 0.2, 0, 2.3, 0); b('solid', c.roof, 2.3, 0.1, L - 0.6, 0, 2.42, 0); b('solid', c.roof, 1.5, 0.08, L - 1.4, 0, 2.51, 0);
    b('solid', c.band, 2.68, 0.06, L - 0.2, 0, 2.22, 0);
    for (const z of [-5, 5]) b('solid', c.cab, 0.8, 0.14, 1.4, 0, 2.6, z);
    // ceiling, light strips, overhead grab rails
    b('solid', c.ceil, 2.36, 0.05, L - 0.5, 0, 2.18, 0);
    for (const sx of [-1, 1]) { b('light', null, 0.2, 0.04, L - 2.4, sx * 0.62, 2.14, 0); b('solid', c.pole, 0.04, 0.04, L - 1.5, sx * 0.4, 2.0, 0); }
    for (const sx of [-1, 1]) {
      const xo = sx * 1.285;                                                             // centre of the 0.13 thick wall (x 1.22 .. 1.35)
      for (const [a, e2] of segs) {
        const zc = (a + e2) / 2, len = e2 - a;
        b('solid', c.body, 0.13, 1.0, len, xo, 0.5, zc);                                  // lower panel
        b('solid', c.band, 0.02, 0.28, len, sx * 1.355, 0.42, zc); b('solid', c.stripe, 0.02, 0.07, len, sx * 1.355, 0.84, zc);
        b('solid', c.body, 0.13, 0.22, len, xo, 2.1, zc);                                 // upper strip
        const n = Math.max(1, Math.floor((len - 0.3) / 1.55)), ww = (len - (n + 1) * 0.3) / n;
        for (let i = 0; i <= n; i++) b('solid', c.body, 0.13, 1.0, 0.3, xo, 1.5, a + 0.15 + i * (ww + 0.3));                // window posts
        for (let i = 0; i < n; i++) b('glass', null, 0.03, 0.94, ww, sx * 1.30, 1.5, a + 0.3 + i * (ww + 0.3) + ww / 2);
        b('solid', c.wall, 0.02, 1.0, len, sx * 1.21, 0.5, zc);                           // inner wall skin below the windows
        const sl = len - 0.2, ns = Math.max(2, Math.round(sl / 0.55));
        for (let i = 0; i < ns; i++) { const zz = a + 0.1 + (i + 0.5) * sl / ns; b('solid', c.seat, 0.46, 0.1, sl / ns - 0.04, sx * 0.96, 0.46, zz); b('solid', c.seatBack, 0.1, 0.46, sl / ns - 0.04, sx * 1.13, 0.78, zz); b('solid', c.under, 0.4, 0.4, sl / ns - 0.04, sx * 0.99, 0.2, zz); }
      }
      for (const dz of doorZ) {
        b('solid', c.frame, 0.15, 2.0, 0.08, xo, 1.0, dz - DW / 2 - 0.04); b('solid', c.frame, 0.15, 2.0, 0.08, xo, 1.0, dz + DW / 2 + 0.04); b('solid', c.frame, 0.15, 0.2, DW + 0.2, xo, 2.1, dz);
        b('solid', c.floor, 0.15, 0.06, DW, xo, 0.03, dz);
        for (const e of [-1, 1]) {
          // a leaf slides as two meshes of one side / e: the solid panels (vertex colours) around a real window and the transparent pane in it (kinds leafSE / glassSE)
          const lz = dz + e * 0.32, ks = (sx > 0 ? 'P' : 'M') + (e > 0 ? 'P' : 'M'), kind = 'leaf' + ks, gk = 'glass' + ks, lx = sx * 1.29;
          b(kind, c.door, 0.04, 1.075, 0.62, lx, 0.5425, lz);                              // below the window (y 0.005 .. 1.08)
          b(kind, c.door, 0.04, 0.075, 0.62, lx, 1.9175, lz);                              // above the window (y 1.88 .. 1.955)
          for (const jz of [-1, 1]) b(kind, c.door, 0.04, 0.8, 0.13, lx, 1.48, lz + jz * 0.245);   // the two jambs beside the 0.36 m window
          b(gk, null, 0.03, 0.8, 0.36, sx * 1.30, 1.48, lz);
          if (st.doorStripe) b(kind, c.dstripe, 0.03, 0.06, 0.64, sx * 1.30, 0.9, lz);
        }
        if (st.doorStripe) { b('solid', c.dstripe, 0.02, 0.07, 0.5, sx * 1.355, 0.75, dz - 0.35); b('solid', c.dstripe, 0.02, 0.07, 0.5, sx * 1.355, 0.75, dz + 0.35); }
        for (const dd of [-0.78, 0.78]) cyl(c.pole, 0.025, 2.2, sx * 0.62, 1.1, dz + dd, 'y');
      }
      // the two route strips of this wall (u runs along the viewer's right: +z on the +x wall, -z on the -x wall) + the geometry of their LED markers
      for (const zs of [-STRIP_Z, STRIP_Z]) {
        const pg = new THREE.PlaneGeometry(STRIP_W, STRIP_H); pg.rotateY(sx > 0 ? -Math.PI / 2 : Math.PI / 2); pg.translate(sx * STRIP_X, STRIP_Y, zs); stripG.push(pg);
        const mg = new THREE.BoxGeometry(0.05, 0.05, 0.05); mg.translate(sx * (STRIP_X - 0.04), STRIP_Y, zs); markG[sx].push(mg);
      }
    }
    // end walls: intercar door in the middle; at the cab end a cab front
    for (const e of [-1, 1]) {
      const zend = e * (HALF - 0.1), cab = withCab && e > 0;
      if (cab) {
        // the cab front around a real window (x +-1.1, y 1.15 .. 1.95) with a transparent pane in it
        b('solid', c.body, 2.7, 1.15, 0.18, 0, 0.575, zend); b('solid', c.body, 2.7, 0.25, 0.18, 0, 2.075, zend);
        for (const sx of [-1, 1]) b('solid', c.body, 0.25, 0.8, 0.18, sx * 1.225, 1.55, zend);
        b('solid', c.band, 2.72, 0.5, 0.2, 0, 0.45, zend + 0.01);
        b('glass', null, 2.2, 0.8, 0.04, 0, 1.55, zend + 0.1); b('solid', c.frame, 0.1, 0.85, 0.05, 0, 1.55, zend + 0.11);
        for (const sx of [-1, 1]) { b('head', null, 0.28, 0.2, 0.04, sx * 0.95, 0.9, zend + 0.1); b('tail', null, 0.18, 0.12, 0.04, sx * 0.95, 0.6, zend + 0.1); }
        b('line', null, 0.5, 0.2, 0.04, 0, 2.0, zend + 0.1); b('solid', c.cab, 0.8, 0.12, 0.1, 0, 2.12, zend + 0.06);
        b('solid', c.wall, 2.2, 2.2, 0.05, 0, 1.1, zend - 0.2);
      } else {
        for (const sx of [-1, 1]) b('solid', c.wall, 0.75, 2.2, 0.12, sx * 0.97, 1.1, zend);
        b('solid', c.wall, 1.2, 0.35, 0.12, 0, 2.02, zend); b('solid', c.frame, 1.2, 0.04, 0.14, 0, 1.84, zend);
        b('led', null, 0.6, 0.1, 0.04, 0, 2.1, zend - e * 0.07);
      }
    }
    const g = new THREE.Group(); const leaves = [], strips = [], markers = [];
    for (const [kind, list] of Object.entries(lists)) {
      const moving = /^(leaf|glass)[PM][PM]$/.test(kind), pane = moving && kind[0] === 'g', o = pane ? 5 : 4;
      const mesh = new THREE.Mesh(ctx.geo.mergeGeometries(list, false), pane ? M.glass : kind.startsWith('leaf') ? solidMat : MATS[kind]); mesh.castShadow = false; mesh.receiveShadow = false;
      if (moving) { mesh.userData.leaf = { side: kind[o] === 'P' ? 1 : -1, e: kind[o + 1] === 'P' ? 1 : -1 }; leaves.push(mesh); }
      g.add(mesh);
    }
    const strip = new THREE.Mesh(ctx.geo.mergeGeometries(stripG, false), stripPh); strip.castShadow = false; strip.receiveShadow = false; strip.userData.strip = true; g.add(strip); strips.push(strip);
    for (const side of [1, -1]) {
      const mk = new THREE.Mesh(ctx.geo.mergeGeometries(markG[side], false), markMat); mk.castShadow = false; mk.receiveShadow = false; mk.visible = false; mk.userData.marker = { side }; g.add(mk); markers.push(mk);
    }
    return { group: g, leaves, strips, markers };
  };
  return { cab: make(true), mid: make(false), stock: st };
}

const boardMats = new WeakMap();                                                       // M -> Map(texture -> emissive board material)
const boardMat = (M, map) => { let m = boardMats.get(M); if (!m) boardMats.set(M, m = new Map()); let x = m.get(map); if (!x) m.set(map, x = M.board(map, 0.9)); return x; };

/** a train of `stock.cars` cars (clones of the prototypes); car 0 is the rear car (turned around so that its cab faces backward), the last car leads */
export function makeTrain(ctx, M, protos) {
  const st = protos.stock, root = new THREE.Group(); root.name = 'train-' + st.id;
  const cars = [];
  for (let i = 0; i < st.cars; i++) {
    const proto = (i === 0 || i === st.cars - 1) ? protos.cab : protos.mid, g = new THREE.Group(), leaves = [], strips = [], markers = [];
    for (const ch of proto.group.children) {
      const m = ch.clone();
      if (ch.userData.leaf) { m.userData.leaf = { ...ch.userData.leaf }; leaves.push(m); }
      if (ch.userData.strip) strips.push(m);
      if (ch.userData.marker) { m.userData.marker = { ...ch.userData.marker }; markers.push(m); }
      g.add(m);
    }
    const inner = new THREE.Group(); inner.add(g); if (i === 0) g.rotation.y = Math.PI;       // the rear car's cab faces backward
    root.add(inner); cars.push({ node: inner, leaves, strips, markers, flipped: i === 0 });
  }
  const t = { root, cars, stock: st, length: trainLength(st), half: trainLength(st) / 2, open: 0, platformSide: 1, line: null, dir: 1, stop: null };
  const placeholder = cars[0].strips[0].material;
  /** open 0..1 on the platform side (train-frame x sign `side`); doors of the other side stay shut unless both */
  t.setDoors = (open, side = 1, both = false) => {
    t.open = open;
    for (const c of t.cars) for (const l of c.leaves) { const ls = l.userData.leaf.side * (c.flipped ? -1 : 1), o = (ls === side || both) ? open : 0; l.position.z = l.userData.leaf.e * 0.66 * o; }
  };
  /** straight placement: the train centre at (x, y, z), heading yaw (0 = +z, PI = -z) */
  t.placeStraight = (x, y, z, yaw) => {
    const s = Math.sin(yaw), cs = Math.cos(yaw);
    for (let i = 0; i < t.cars.length; i++) { const o = carOffset(st, i), n = t.cars[i].node; n.position.set(x + s * o, y, z + cs * o); n.rotation.y = yaw; }
  };
  /** path placement: fn(sCar) -> { x, y, z, yaw } for the distance sCar of the car centre along the path (the lead car is the one with the largest s) */
  t.placePath = (fn, sCentre) => {
    for (let i = 0; i < t.cars.length; i++) { const p = fn(sCentre + carOffset(st, i)), n = t.cars[i].node; n.position.set(p.x, p.y, p.z); n.rotation.y = p.yaw; }
  };
  t.setVisible = (v) => { root.visible = v; };
  /** hang the route strip of `line` for direction `dir` (+1 = toward the higher station index) in every car; the LED markers show up (at the first station, or at `idx`). setLine(null) restores the blank strips.
   *  Call when a session / a track starts, not per frame: the first use of a line + direction draws one 2048 x 256 canvas (cached by key strip-<line>-<dir>). */
  t.setLine = (line, dir = 1, idx) => {
    const strips = [], markers = []; for (const c of t.cars) { strips.push(...c.strips); markers.push(...c.markers); }
    if (line == null) { t.line = null; t.stop = null; for (const s of strips) s.material = placeholder; for (const m of markers) m.visible = false; return; }
    const ln = String(line), d = dir >= 0 ? 1 : -1, bm = boardMat(M, stripTexture(ctx, ln, d));
    t.line = ln; t.dir = d; t.stop = null;
    for (const s of strips) s.material = bm;
    const ly = stripLayout(ln); t.setStop(idx != null ? idx : (d > 0 ? 0 : ly.n - 1));
  };
  /** move the LED marker to the dot of station `idx` of the current line (a station index of the line, as in net.js); idx null / out of range hides it. `phase` ('next' | 'at') is stored in t.phase for the caller. */
  t.setStop = (idx, phase = 'at') => {
    t.phase = phase;
    const ly = t.line && stripLayout(t.line), show = !!ly && idx != null && idx >= 0 && idx < ly.n;
    t.stop = show ? idx : null;
    const dz = show ? (stripX(t.line, idx, t.dir) - 0.5) * STRIP_W : 0, dy = show ? stripDotDy(t.line) : 0;
    for (const c of t.cars) for (const m of c.markers) { m.visible = show; if (show) m.position.set(0, dy, m.userData.marker.side * dz); }
  };
  return t;
}
