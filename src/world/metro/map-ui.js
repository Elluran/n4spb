// metro/map-ui.js — NO LONGER a player-facing panel (2026-10-15: rides run in real time to the end of the line, nothing is chosen on a map). What is still used: mapSVG() draws the network SVG
// (six strips, lines 1-6) that signs.js rasterises into the texture of the wall network maps; openDestinationPanel() is dead code kept for tooling and may be deleted.
// Built stations (a real hall exists) have a bold label; every other station is served by the shared generic hall.
import { LINES } from '../data/metro.js';
import { ALL, lineStations, ahead, realMinutes, lineName } from './net.js';

// six horizontal strips (no crossings of a line with itself, long names read at 48 degrees); transfer nodes of neighbouring lines are drawn as double lines. The strips are placed so that most
// transfer pairs sit close to each other: line 3 above line 2 above line 1 (the hub), lines 5, 4 and 6 below it.
const W = 1180, H = 1060;
const LAYOUT = { '3': { y: 170, pivot: 'mayakovskaya', px: 466, dx: 62, up: true }, '2': { y: 330, pivot: 'nevsky', px: 404, dx: -44, up: true }, '1': { y: 500, x0: 34, dx: 48 },
  '5': { y: 690, x0: 60, dx: 62 }, '4': { y: 850, pivot: 'dostoevskaya', px: 520, dx: 72 }, '6': { y: 960, x0: 60, dx: 96 } };
const XY = {};
for (const line of Object.keys(LAYOUT)) {
  const L = lineStations(line), cfg = LAYOUT[line], pivot = cfg.pivot ? L.findIndex((s) => s.id === cfg.pivot) : 0;
  L.forEach((s, i) => { XY[s.id] = [cfg.pivot ? cfg.px + (i - pivot) * cfg.dx : cfg.x0 + i * cfg.dx, cfg.y]; });
}
const NS = 'http://www.w3.org/2000/svg';

export const MAP_XY = XY;
export function mapSVG(from, dir, onPick) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.cssText = `width:${W}px;height:${H}px;background:#f6f4ee;border-radius:10px;display:block`;
  const el = (name, attrs, parent = svg, text) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; parent.appendChild(e); return e; };
  const reach = new Set(ahead(from, dir).map((s) => s.id));
  // line strokes
  for (const line of Object.keys(LINES)) {
    const L = lineStations(line), pts = L.map((s) => XY[s.id].join(',')).join(' ');
    el('polyline', { points: pts, fill: 'none', stroke: LINES[line].color, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: line === from.line ? 1 : 0.55 });
  }
  // transfers
  const seen = new Set();
  for (const s of ALL) for (const tid of s.transfer || []) {
    const key = [s.id, tid].sort().join('|'); if (seen.has(key) || !XY[tid] || s.line === '6' || ALL.find((q) => q.id === tid)?.line === '6') continue; seen.add(key);
    const a = XY[s.id], b = XY[tid]; el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#2b2b30', 'stroke-width': 5, 'stroke-linecap': 'round' }); el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#ffffff', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
  }
  // stations
  for (const s of ALL) {
    const [x, y] = XY[s.id], on = reach.has(s.id), cur = s.id === from.id, g = el('g', { style: 'cursor:' + (on ? 'pointer' : 'default'), opacity: on || cur ? 1 : s.closed ? 0.3 : s.line === from.line ? 0.42 : 0.5 });
    if (cur) { const r = el('circle', { cx: x, cy: y, r: 15, fill: 'none', stroke: '#111', 'stroke-width': 3 }, g); const an = el('animate', { attributeName: 'r', values: '12;19;12', dur: '1.6s', repeatCount: 'indefinite' }, r); void an; }
    el('circle', { cx: x, cy: y, r: s.built ? 8 : 6, fill: cur ? '#111' : '#fff', stroke: LINES[s.line].color, 'stroke-width': on ? 5 : 3.5 }, g);
    if (s.built) { el('circle', { cx: x + 9, cy: y - 9, r: 5.5, fill: '#1f9d55', stroke: '#fff', 'stroke-width': 1.5 }, g); el('text', { x: x + 9, y: y - 6.2, 'font-size': 8, 'font-weight': 800, fill: '#fff', 'text-anchor': 'middle' }, g, '↑'); }
    const up = !!LAYOUT[s.line].up, ang = up ? -48 : 48, fw = s.built || cur ? 800 : 500;
    el('text', { x: 0, y: 0, transform: `translate(${x + (up ? 4 : 5)},${y + (up ? -13 : 20)}) rotate(${ang})`, 'font-size': 14, 'font-family': 'Rubik,Noto Sans,sans-serif', 'font-weight': fw, fill: '#1c1c22', stroke: '#f6f4ee', 'stroke-width': 3.2, 'paint-order': 'stroke', 'text-anchor': 'start' }, g, s.name + (s.closed ? ' (закрыта)' : ''));
    if (on) { g.addEventListener('click', () => onPick(s)); g.addEventListener('mouseenter', () => { g.style.filter = 'drop-shadow(0 0 4px #1d4e9b)'; }); g.addEventListener('mouseleave', () => { g.style.filter = ''; }); }
  }
  // legend
  let ly = 800; for (const line of Object.keys(LINES)) { el('rect', { x: 860, y: ly - 11, width: 16, height: 16, rx: 4, fill: LINES[line].color }, svg); el('text', { x: 882, y: ly + 2, 'font-size': 13, 'font-family': 'Rubik,Noto Sans,sans-serif', fill: '#222' }, svg, line + ' · ' + LINES[line].name.replace(' линия', '')); ly += 22; }
  el('circle', { cx: 868, cy: ly + 4, r: 6, fill: '#1f9d55' }, svg); el('text', { x: 882, y: ly + 8, 'font-size': 12, 'font-family': 'Rubik,Noto Sans,sans-serif', fill: '#333' }, svg, 'выход в город открыт (жирным)');
  el('text', { x: 860, y: ly + 28, 'font-size': 12, 'font-family': 'Rubik,Noto Sans,sans-serif', fill: '#666' }, svg, 'остальные: выход закрыт, пока');
  return svg;
}

/** open the destination panel. cb(stationOrNull) */
export function openDestinationPanel(ctx, from, dir, cb) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:14px;max-width:min(1240px,95vw);align-items:flex-start;font-family:Rubik,Noto Sans,sans-serif;color:#1c1c22';
  const left = document.createElement('div'); left.style.cssText = 'flex:1 1 640px;min-width:300px';
  const head = document.createElement('div'); head.style.cssText = 'margin-bottom:8px;font-size:15px;line-height:1.35';
  const toEnd = lineName(from.line, dir, true), toEndEn = lineName(from.line, dir, false);
  head.innerHTML = `<b>Станция «${from.name}»</b> · линия ${from.line}. Поезд идёт до станции «${toEnd}».<br><span style="opacity:.75">Choose your destination: this train goes toward ${toEndEn}.</span>`;
  left.appendChild(head);
  let done = false;
  const pick = (s) => { if (done) return; done = true; h.close(); cb(s); };
  const scroller = document.createElement('div'); scroller.style.cssText = 'overflow:auto;max-height:64vh;max-width:100%;border-radius:10px;background:#f6f4ee'; scroller.appendChild(mapSVG(from, dir, pick)); left.appendChild(scroller);
  setTimeout(() => { try { const [fx, fy] = XY[from.id]; scroller.scrollTo({ left: Math.max(0, fx - scroller.clientWidth / 2), top: Math.max(0, fy - scroller.clientHeight / 2) }); } catch (e) { /* headless */ } }, 60);
  const right = document.createElement('div'); right.style.cssText = 'flex:0 0 240px;max-height:64vh;overflow:auto;border-left:1px solid #0002;padding-left:12px';
  const t = document.createElement('div'); t.style.cssText = 'font-weight:700;margin-bottom:6px'; t.textContent = 'Станции по ходу поезда · Stations ahead'; right.appendChild(t);
  for (const s of ahead(from, dir)) {
    const b = document.createElement('button'); b.type = 'button';
    b.style.cssText = `display:flex;justify-content:space-between;gap:8px;width:100%;margin:2px 0;padding:6px 9px;border:0;border-left:6px solid ${LINES[from.line].color};border-radius:4px;background:#f1efe8;cursor:pointer;font:inherit;text-align:left;${s.built ? 'font-weight:700;' : ''}`;
    b.innerHTML = `<span>${s.built ? '<span style="color:#1f9d55">↑</span> ' : ''}${s.name}${s.built ? '' : ' <small style="opacity:.6">· выход закрыт</small>'}</span><span style="opacity:.65;white-space:nowrap">≈ ${realMinutes(from.line, from.idx, s.idx)} мин</span>`;
    b.addEventListener('click', () => pick(s)); right.appendChild(b);
  }
  wrap.appendChild(left); wrap.appendChild(right);
  const h = ctx.ui.panel(wrap, { title: 'Схема метро · Metro map', closeLabel: 'Закрыть · Close', onClose: () => { if (!done) { done = true; cb(null); } } });
  return h;
}
