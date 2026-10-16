// metro/net.js — the network as DATA: the stations of lines 1-6 with their positions (SUBWAY_ROUTES), indexes, directions, real hop distances / run times (HOPS, docs/research/metro-ops.md),
// dwell times and transfers. Pure functions, no three.js. A station is { id, name, nameEn, line, idx, depth, type, built, transfer: [ids], x, z (street coordinates of the OSM stop) }.
// Rides run in REAL time: hopSeconds() is the research run time of the hop where the table has one, else the model 40 s + distance / 18 m/s (the official 39 km/h average with stops).
import { SUBWAY_ROUTES } from '../data/city.js';
import { LINES, STATIONS, HOPS, TRANSFERS } from '../data/metro.js';

const ROUTE_OF = { '1': 'r2446059', '2': 'r2446051', '3': 'r2446060', '4': 'r2446061', '5': 'r2446058' };       // line 6 (2 stations, opened 2025-12) has no relation: its stations carry `pos`

export const ALL = [];               // flat list in line order
export const BY_ID = {};
for (const line of Object.keys(LINES)) {
  const route = SUBWAY_ROUTES.find((r) => r.id === ROUTE_OF[line]);
  STATIONS[line].forEach((s, idx) => {
    const stop = s.pos ? { x: s.pos[0], z: s.pos[1] } : route && (route.stops.find((p) => p.name === s.name || (s.name.startsWith(p.name) && p.name.length > 6)) || route.stops[idx - (STATIONS[line].slice(0, idx).filter((q) => q.closed).length)]);
    const st = { ...s, line, idx, x: stop ? stop.x : 0, z: stop ? stop.z : 0, n: STATIONS[line].length };
    ALL.push(st); BY_ID[s.id] = st;
  });
}
export const lineStations = (line) => ALL.filter((s) => s.line === line);

/** distance (m) of the straight chain between consecutive stops (x 1.06 for the real track), from index a to b */
export function chainDistance(line, a, b) {
  const L = lineStations(line); let d = 0; const lo = Math.min(a, b), hi = Math.max(a, b);
  for (let i = lo; i < hi; i++) d += Math.hypot(L[i + 1].x - L[i].x, L[i + 1].z - L[i].z);
  return d * 1.06;
}
/** the hop record of the adjacent pair (i, i + 1) of a line: { m, s } from HOPS (either id order), else the distance model */
export function hop(line, i) {
  const L = lineStations(line), a = L[i], b = L[i + 1]; if (!a || !b) return null;
  const h = HOPS[a.id + '>' + b.id] || HOPS[b.id + '>' + a.id];
  const m = h && h.m ? h.m : chainDistance(line, i, i + 1);
  return { m, s: h && h.s ? h.s : Math.round(40 + m / 18), model: !(h && h.s) };
}
/** real running time (s) between stations a and b of a line (sum of the hops; closed stations are passed without a stop) */
export function hopSeconds(line, a, b) {
  const lo = Math.min(a, b), hi = Math.max(a, b); let s = 0;
  for (let i = lo; i < hi; i++) s += hop(line, i).s;
  return s;
}
/** real running time incl. the intermediate dwells (map / services) */
export function realSeconds(line, a, b) {
  const lo = Math.min(a, b), hi = Math.max(a, b), L = lineStations(line); let s = hopSeconds(line, a, b);
  for (let i = lo + 1; i < hi; i++) s += dwellSeconds(L[i]);
  return s;
}
export const realMinutes = (line, a, b) => Math.max(1, Math.round(realSeconds(line, a, b) / 60));
/** the dwell at a stop: 35 s at interchanges and railway stations, 25 s elsewhere */
export const dwellSeconds = (st) => ((st.transfer && st.transfer.length) || (st.note && /вокзал/i.test(st.note)) ? 35 : 25);
/** kept for services that still ask for a "game" time: rides are real time now */
export const gameRideSeconds = (line, a, b) => realSeconds(line, a, b);
/** destinations reachable from station `from` going in direction dir (+1 = toward the higher index), closed stations skipped */
export function ahead(from, dir) {
  const L = lineStations(from.line); return (dir > 0 ? L.slice(from.idx + 1) : L.slice(0, from.idx).reverse()).filter((q) => !q.closed);
}
/** which direction a destination lies in: +1 / -1 along the line of `from`, 0 = other line */
export function directionTo(from, to) { if (from.line !== to.line) return 0; return Math.sign(to.idx - from.idx); }
export const lineName = (line, dir, ru = true) => { const t = ru ? LINES[line].to : LINES[line].toEn; return dir > 0 ? t[1] : t[0]; };
/** the interchange group of a station (TRANSFERS) or null: { ids, kind, walk } */
export function transfersOf(id) { return TRANSFERS.find((g) => g.ids.includes(id)) || null; }
/** the partner stations one can change to at `id` */
export const partnersOf = (id) => { const g = transfersOf(id); return g ? g.ids.filter((q) => q !== id).map((q) => BY_ID[q]).filter(Boolean) : []; };

/** a route planner for tests / services (never shown to the player): the legs [{ line, from, to, dir }] with transfers, by breadth-first search over hops + TRANSFERS */
export function route(aId, bId) {
  if (aId === bId) return [];
  const prev = new Map([[aId, null]]), queue = [aId];
  while (queue.length) {
    const cur = queue.shift(); if (cur === bId) break;
    const st = BY_ID[cur]; if (!st) continue;
    const L = lineStations(st.line), nb = [L[st.idx - 1], L[st.idx + 1]].filter(Boolean).filter((q) => !q.closed).map((q) => ({ id: q.id, via: 'ride' }));
    for (const p of partnersOf(cur)) nb.push({ id: p.id, via: 'walk' });
    for (const n of nb) if (!prev.has(n.id)) { prev.set(n.id, { id: cur, via: n.via }); queue.push(n.id); }
  }
  if (!prev.has(bId)) return null;
  const path = []; for (let c = bId; c !== aId; c = prev.get(c).id) path.unshift({ to: c, via: prev.get(c).via, from: prev.get(c).id });
  // merge consecutive rides on one line into legs
  const legs = [];
  for (const p of path) {
    const last = legs[legs.length - 1];
    if (p.via === 'walk') legs.push({ kind: 'walk', from: p.from, to: p.to });
    else if (last && last.kind === 'ride' && BY_ID[last.from].line === BY_ID[p.to].line) last.to = p.to;
    else legs.push({ kind: 'ride', line: BY_ID[p.to].line, from: p.from, to: p.to, dir: Math.sign(BY_ID[p.to].idx - BY_ID[p.from].idx) });
  }
  return legs;
}
