// landmarksI/palace.js - the Winter Palace (Rastrelli 1754-62), OSM relation r69424, docs/research/palace-square-hermitage.md section 7, photos 015 016 031 042 052 053.
// The walls are drawn edge by edge from the OSM footprint (axis aligned in the palace frame, frame.js): every long outer edge gets the Rastrelli grammar (granite plinth 1.4 m, ground floor with arched
// windows, two storeys united by a giant order of white columns with gold capitals, single columns between the window bays and pairs at the risalit corners, cornice, crown, roof balustrade),
// short edges and light wells get plain windowed walls.  The three arched gateways in the Palace Square front are real openings with vaulted passages (24 m) to the Great Courtyard, open iron leaves.
// Vertical grammar (from photo 016 at 25 px/m): plinth 0-1.4, ground floor windows 2.3-6.2, ground capitals 7.0-7.7, entablature 7.7-9.4, giant shafts 10.3-19.0, capitals 19.0-19.95, entablature 19.95-22.0,
// crown 22.0-22.8, balustrade to 24, roof statues to ~27, Great Church crown ~34.
import * as THREE from 'three';
import { ringEdges, band, localOnEdge, frameOf } from './kit.js';
import { toUV, toWorld, edgePoint, C, S } from './frame.js';
import { hipRoof } from './hip.js';

export const PL = 1.4, G0 = 2.3, GH = 3.9, S2 = 10.6, S2H = 3.9, S3 = 16.4, S3H = 2.5, EN1 = [7.7, 9.4], EN2 = [19.95, 22.0], CORN = 21.0, STR = 8.5, CROWN = [22.0, 22.8], HC = 22.8, ROOF = 22.9;
const COLR = 0.55, COLZ = 0.62;

export const chains = (list) => {
  const out = []; let cur = [];
  for (const e of list) {
    if (cur.length) { const p = cur[cur.length - 1]; if (Math.hypot(p.b[0] - e.a[0], p.b[1] - e.a[1]) > 0.06) { out.push(cur); cur = []; } }
    cur.push(e);
  }
  if (cur.length) out.push(cur);
  return out;
};

/** classify a wall edge: style S / N / W / E (full order), P (plain windows), C (courtyard), Q (light well) */
function classify(e) {
  const mx = (e.a[0] + e.b[0]) / 2, mz = (e.a[1] + e.b[1]) / 2, q = toUV(mx, mz);
  const nu = e.n[0] * C + e.n[1] * S, nv = -e.n[0] * S + e.n[1] * C;
  if (e.hole) return { style: e.courtyard ? 'C' : 'Q', q };
  const eastNotch = q.v > -112 && q.v < -68 && q.u < -150 && q.u > -240;
  if (e.len >= 5.5 && !eastNotch) {
    if (nu > 0.9 && q.u > -118 && q.u < -92) return { style: 'S', q };
    if (nu < -0.9 && q.u < -268) return { style: 'N', q };
    if (nv > 0.9 && q.v > 80) return { style: 'W', q };
    if (nv < -0.9 && q.v < -105) return { style: 'E', q };
  }
  return { style: 'P', q };
}

export function buildPalace(K, PM, svc) {
  const L = K.L, P = K.P, M = K.mats;
  const rec = L.buildingById('r69424');
  if (!rec) throw new Error('r69424 missing');
  const poly = rec.polys[0];
  const all = ringEdges(poly, 0.3);
  const outer = all.filter((e) => !e.hole);
  const holeChains = chains(all.filter((e) => e.hole));
  const court = holeChains.reduce((a, b) => (b.length > (a ? a.length : 0) ? b : a), null);
  for (const ch of holeChains) for (const e of ch) e.courtyard = ch === court;
  for (const e of outer) e.cls = classify(e);
  for (const e of all.filter((x) => x.hole)) e.cls = classify(e);
  const spots = svc.statueSpots;
  const gateVs = [0.55 - 8.4, 0.55, 0.55 + 8.4], gateW = [3.8, 5.8, 3.8], gateTop = [7.3, 7.55, 7.3];

  // ------------------------------------------------------------------------------------------------ facades
  for (const e of all) {
    const st = e.cls.style;
    const f = frameOf(e);
    const gates = []; e.gates = gates;
    if ((st === 'S' && e.len > 70 && e.len < 85) || (st === 'C' && e.len > 70 && Math.abs(toUV(f.x, f.z).u + 125) < 3)) {
      gateVs.forEach((v, i) => { const u = st === 'S' ? e.cls.q.u : e.cls.q.u; const w = toWorld(u, v); gates.push({ x: localOnEdge(e, w[0], w[1]).u, w: gateW[i], top: gateTop[i] }); });
    }
    K.onEdgeFn(e, (len) => {
      if (st === 'S' || st === 'N' || st === 'W' || st === 'E') orderFacade(K, PM, len, st, f, e, gates, spots);
      else if (st === 'C') { if (e.len > 12) orderFacade(K, PM, len, 'C', f, e, gates, spots, { court: true, porch: e.len > 18 && e.len < 22 && e.cls.q.u < -230 && e.n[0] * C + e.n[1] * S > 0.9 }); else courtFacade(K, PM, len, gates); }
      else plainFacade(K, PM, len, st === 'Q');
      if (gates.length && st === 'S') for (const g of gates) tunnel(K, PM, g, 24.2);
    });
  }

  // ------------------------------------------------------------------------------------------------ mitred bands around the rings
  const whiteM = { front: M.trim && PM.white, top: PM.white, under: PM.whiteShade };
  const drawStyle = (set) => (e) => set.includes(e.cls.style);
  band(P, outer, STR, EN1[1], 0.45, whiteM, { draw: drawStyle(['S', 'N', 'W', 'E']) });
  band(P, outer, CORN, EN2[1], 0.62, whiteM, { draw: drawStyle(['S', 'N', 'W', 'E', 'P']) });
  band(P, outer, CROWN[0], CROWN[1], 1.3, whiteM, { draw: drawStyle(['S', 'N', 'W', 'E', 'P']) });
  band(P, outer, 1.4, 1.62, 0.16, { front: PM.graniteFlat, top: PM.graniteTop }, { draw: (e) => drawStyle(['S', 'N', 'W', 'E', 'P'])(e) && !(e.gates && e.gates.length) });
  if (court) {
    band(P, court, STR, EN1[1], 0.45, whiteM, { draw: (e) => e.len > 12 }); band(P, court, CORN, EN2[1], 0.5, whiteM, {}); band(P, court, CROWN[0], CROWN[1], 1.0, whiteM, {});
    band(P, court, 1.4, 1.62, 0.16, { front: PM.graniteFlat, top: PM.graniteTop }, { draw: (e) => e.len > 12 && !(e.gates && e.gates.length) });
  }
  for (const ch of holeChains) if (ch !== court) band(P, ch, 21.7, 22.5, 0.7, whiteM, {});

  // ------------------------------------------------------------------------------------------------ roof, balustrade, courtyard floor
  const ring = (o) => { const r = []; for (let i = 0; i < o.length; i += 2) r.push([o[i], o[i + 1]]); return r; };
  const isChurch = (h) => { const r = ring(h); const cx = r.reduce((s, p) => s + p[0], 0) / r.length, cz = r.reduce((s, p) => s + p[1], 0) / r.length; const q = toUV(cx, cz); return Math.abs(q.u + 133.5) < 8 && Math.abs(q.v + 87.5) < 8; };
  const roofH = hipRoof(P, PM.roof, ring(poly.o), poly.h.filter((h) => !isChurch(h)).map(ring), ROOF, { slope: 0.32, R: 3.2 });
  svc.roofH = roofH;
  const nearChurch = (e) => { const q = toUV((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2); return e.hole && Math.abs(q.u + 133.5) < 13 && Math.abs(q.v + 87.5) < 13; };
  const balEdges = all.filter((e) => e.len > 2.5 && !nearChurch(e));
  for (const e of balEdges) K.onEdgeFn(e, (len) => {
    const h = 1.15, z = e.hole ? 0.55 : 0.75, n = Math.max(1, Math.round(len / 2.8));
    P.quad(PM.balust, [0, HC, z], [len, HC, z], [len, HC + h, z], [0, HC + h, z], [0, 0, 1], [[0, 0], [n, 0], [n, 1], [0, 1]]);
  });
  // courtyard paving (granite setts) over the hole, just above the ground
  if (court) {
    const pts = court.map((e) => e.a);
    P.cap(PM.court, pts, 0.05, true, 4);
  }
  svc.palace = { court: court ? court.map((e) => e.a) : null, outer: outer.map((e) => e.a) };
  K.svc.courtyard = svc.palace.court;
  svc.edges = all.map((e) => ({ e, f: frameOf(e), cls: e.cls }));
  palaceColliders(K, svc);
  svc.roofRing = (ring) => ring;
}

// ------------------------------------------------------------------------------------------------ the supports / bays plan of one run
function plan(len, pairEvery) {
  const single = 1.1, pair = 2.5;
  let nb = Math.max(1, Math.round((len - 2 * pair) / 4.1));
  const widths = (n) => { let s = 0; for (let i = 0; i <= n; i++) s += (i === 0 || i === n || (i % pairEvery === 0 && i >= 2 && i <= n - 2)) ? pair : single; return s; };
  for (let k = 0; k < 6; k++) {
    const bw = (len - widths(nb)) / nb;
    if (bw < 2.75 && nb > 1) nb--; else if (bw > 3.5) nb++; else break;
  }
  const sup = [], bays = []; let x = 0; const bw = (len - widths(nb)) / nb;
  for (let i = 0; i <= nb; i++) {
    const pr = (i === 0 || i === nb || (i % pairEvery === 0 && i >= 2 && i <= nb - 2));
    const w = pr ? pair : single; sup.push({ x: x + w / 2, pair: pr, end: i === 0 || i === nb, i }); x += w;
    if (i < nb) { bays.push({ x: x + bw / 2, w: bw, i }); x += bw; }
  }
  return { sup, bays, bw, nb };
}

const hashv = (a, b, c = 0) => { let h = 2166136261 ^ Math.floor(a * 7 + b * 131 + c * 17); h = Math.imul(h, 16777619); h ^= h >>> 15; return ((h >>> 0) % 1000) / 1000; };

// ------------------------------------------------------------------------------------------------ one column (white shaft, gold capital)
function column(K, PM, x, z, y0, y1, o = {}) {
  const P = K.P, r = o.r ?? COLR, capH = o.capH ?? 0.95;
  P.cyl(PM.white, [x, y0, z], [x, y1 - capH, z], r, r * 0.9, 10, false);
  P.cyl(PM.white, [x, y0, z], [x, y0 + 0.28, z], r * 1.22, r * 1.1, 10, true);                      // base
  P.cyl(PM.gold, [x, y1 - capH, z], [x, y1 - 0.12, z], r * 0.95, r * 1.38, 8, false);               // gold capital (corinthian bell)
  P.box(PM.gold, x - r * 1.5, x + r * 1.5, y1 - 0.12, y1, z - r * 1.5, z + r * 1.5, 'b');           // abacus
  if (o.ring) P.cyl(PM.gold, [x, o.ring, z], [x, o.ring + 0.22, z], r * 1.06, r * 1.06, 10, false); // gold collar at the foot of the giant shaft
}

// ------------------------------------------------------------------------------------------------ the full-order facade (S, N, W, E)
function orderFacade(K, PM, len, st, f, e, gates, spots, opts = {}) {
  const P = K.P, M = K.mats;
  const nGate = gates.length;
  const q = e.cls.q;
  // wall: granite plinth + mint wall (with the gate holes)
  if (nGate) {
    const holes = gates.map((g) => ({ x: g.x, y0: PL, w: g.w, h: g.top - PL, head: 'arch' }));
    K.wallWithHoles(PM.wall, 0, len, PL, EN2[1] + 0.02, holes, 4, 4);
    const xs = gates.map((g) => [g.x - g.w / 2, g.x + g.w / 2]).sort((a, b) => a[0] - b[0]); let c = 0;
    for (const [a, b] of xs) { if (a > c) { K.wallQuad(PM.granite, c, a, 0, PL, 2.4, 0, 1.2); P.box(PM.graniteFlat, c, a, PL - 0.22, PL + 0.22, 0, 0.16, 'kb'); } c = b; }
    if (c < len) P.box(PM.graniteFlat, c, len, PL - 0.22, PL + 0.22, 0, 0.16, 'kb');
    if (c < len) K.wallQuad(PM.granite, c, len, 0, PL, 2.4, 0, 1.2);
  } else {
    K.wallQuad(PM.granite, 0, len, 0, PL, 2.4, 0, 1.2);
    K.wallQuad(PM.wall, 0, len, PL, EN2[1] + 0.02, 4);
  }
  const pl = plan(len, 4);
  const open = (x) => gates.some((g) => Math.abs(x - gates[1].x) < 10.6);   // inside the gateway zone
  const isPorch = opts.porch || (st === 'N' && len > 20 && len < 25);
  const zoneOpen = nGate ? [gates[1].x - 10.8, gates[1].x + 10.8] : (isPorch ? [len / 2 - 8.3, len / 2 + 8.3] : null);
  const inZone = (x, pad = 0) => zoneOpen && x > zoneOpen[0] - pad && x < zoneOpen[1] + pad;
  void open;
  // -------- supports: pilaster strip, ground column(s), giant column(s), entablature blocks
  for (const s of pl.sup) {
    const cols = s.pair ? [s.x - 0.7, s.x + 0.7] : [s.x];
    const ws = s.pair ? 2.9 : 1.5;
    const inz = inZone(s.x);
    if (!inz) {
      P.box(PM.white, s.x - ws / 2, s.x + ws / 2, PL, EN2[0], 0, 0.13, 'kb');
      P.box(PM.white, s.x - ws / 2 - 0.05, s.x + ws / 2 + 0.05, EN1[0], EN1[1] - 0.3, 0, 0.8, 'kb');
      for (const cx of cols) column(K, PM, cx, COLZ, PL, EN1[0]);
    }
    P.box(PM.white, s.x - ws / 2 - 0.1, s.x + ws / 2 + 0.1, EN2[0], EN2[1], 0, 1.15, 'kb');
    P.box(PM.white, s.x - ws / 2 + 0.05, s.x + ws / 2 - 0.05, EN1[1], 10.3, 0, 0.75, "kb");
    if (inz) P.box(PM.white, s.x - ws / 2, s.x + ws / 2, PL, EN2[0], 0, 0.13, 'kb');
    if (inz) { P.box(PM.white, s.x - ws / 2 - 0.05, s.x + ws / 2 + 0.05, EN1[0], EN1[1] - 0.3, 0, 0.8, 'kb'); }
    for (const cx of cols) column(K, PM, cx, COLZ, 10.3, EN2[0], { ring: 10.3 });
    // roof statues over the supports
    if (s.pair || s.i % 2 === 0) spots.push({ at: edgePoint(f, s.x, opts.court ? 0.55 : 0.75), rot: f.rot, kind: (s.pair || s.end) ? 'statue' : 'vase', y: HC });
  }
  // extra pairs between the gates (ground floor only)
  if (nGate) {
    for (const mid of [(gates[0].x + gates[0].w / 2 + gates[1].x - gates[1].w / 2) / 2, (gates[1].x + gates[1].w / 2 + gates[2].x - gates[2].w / 2) / 2]) {
      const sgn = Math.sign(mid - gates[1].x);
      void sgn;
      P.box(PM.white, mid - 1.5, mid + 1.5, PL, EN1[0], 0, 0.13, 'kb');
      for (const cx of [mid - 0.7, mid + 0.7]) column(K, PM, cx, COLZ, PL, EN1[0]);
    }
    // outer pair on each side of the zone
    for (const g of gates) K.gate(g.x, 0, g.w, g.top, { open: true, sw: 0.4, d: 0.2, ringMat: PM.white });
    // iron balcony over the gates at the sill of the second floor
    K.balcony(zoneOpen[0] + 3.5, zoneOpen[1] - 3.5, 10.1, 0.9, { slabMat: PM.white, brackets: false });
  }
  // the Jordan porch of the Neva front (photo 052): arched door with a fanlight, two free columns, two clusters of three, iron balcony above
  if (isPorch) {
    const cx = len / 2;
    K.gate(cx, 0.35, 3.6, 6.2, { sw: 0.35, d: 0.2, ringMat: PM.white, doorMat: PM.iron });
    for (const d of [-9.0, -7.8, -6.6, 6.6, 7.8, 9.0, -3.0, 3.0]) column(K, PM, cx + d, 1.5, PL, EN1[0], { r: 0.6 });
    P.box(PM.white, cx - 10.2, cx - 5.9, PL, EN1[0], 0, 0.13, 'kb'); P.box(PM.white, cx + 5.9, cx + 10.2, PL, EN1[0], 0, 0.13, 'kb');
    P.box(PM.white, cx - 10.3, cx + 10.3, EN1[0], EN1[1] - 0.2, 0, 2.2, 'k');
    K.balcony(cx - 10.2, cx + 10.2, EN1[1], 2.0, { slabMat: PM.white, brackets: false });
    for (const sx of [-1, 1]) { P.cyl(PM.iron, [cx + sx * 2.4, 5.4, 0.2], [cx + sx * 2.4, 5.4, 0.7], 0.04, 0.04, 4, false); P.box(PM.ironLace, cx + sx * 2.4 - 0.18, cx + sx * 2.4 + 0.18, 4.6, 5.5, 0.6, 1.0); }
  }
  // -------- bays
  for (const b of pl.bays) {
    const xc = b.x, ww = Math.min(1.95, b.w - 0.85), vi = Math.floor(b.i / 5);
    const hd = (st === 'W') ? 'flat3' : 'arch3';
    // ground floor
    if (!inZone(xc, 0.6)) {
      K.window({ x: xc, y: G0, w: ww, h: GH, head: 'arch', sw: 0.3, d: 0.14, sill: false, frame: 'white', surMat: PM.white, v: Math.floor(hashv(b.i, 1, len) * 4) });
      K.plane(PM.shell, xc - 0.85, xc + 0.85, 6.5, 7.25, 0.05);
      // basement window in the plinth
      K.glass(M.winBrown, xc, 0.28, 1.0, 0.8, 'arch', 1, 0.04);
      if (st === 'W') K.balcony(xc - ww / 2 - 0.1, xc + ww / 2 + 0.1, G0 + 0.2, 0.42, { slabMat: PM.white, brackets: false, rh: 0.75 });
    }
    // second floor: arched with a gilded cartouche in the central groups, rectangular with triangular pediments in the side groups
    const arch2 = (st === 'S' || st === 'N') ? (vi % 2 === 0) : (st === 'W' ? true : vi % 2 === 1);
    if (arch2) {
      K.window({ x: xc, y: S2, w: ww, h: S2H, head: 'arch', sw: 0.32, d: 0.14, sill: false, frame: 'white', surMat: PM.white, v: Math.floor(hashv(b.i, 2, len) * 4) });
      K.plane(PM.cart, xc - 0.95, xc + 0.95, 14.95, 15.9, 0.05);
    } else {
      K.window({ x: xc, y: S2, w: ww, h: S2H, head: 'flat', sw: 0.3, d: 0.14, sill: true, frame: 'white', surMat: PM.white, hood: 'tri', hoodH: 0.55, v: Math.floor(hashv(b.i, 2, len) * 4) });
      K.plane(PM.cart, xc - 0.8, xc + 0.8, 15.3, 16.1, 0.05);
    }
    // third floor
    K.window({ x: xc, y: S3, w: ww, h: S3H, head: hd === 'arch3' ? 'arch' : 'flat', sw: 0.28, d: 0.12, sill: hd !== 'arch3', frame: 'white', surMat: PM.white, v: Math.floor(hashv(b.i, 3, len) * 4) });
    K.plane(PM.mask, xc - 0.6, xc + 0.6, 19.25, 19.85, 0.05);
  }
  // central features by front
  if (st === 'S' && nGate) { /* clock pediment + dome are added by roof.js */ }
  void q;
}

// ------------------------------------------------------------------------------------------------ plain windowed wall (notch walls, short edges) and light wells
function plainFacade(K, PM, len, well) {
  const P = K.P, M = K.mats;
  K.wallQuad(PM.granite, 0, len, 0, PL, 2.4, 0, 1.2);
  K.wallQuad(PM.wall, 0, len, PL, EN2[1] + 0.02, 4);
  const n = Math.max(0, Math.floor((len - 1.0) / 3.9));
  if (!n) return;
  const p = len / n;
  for (let i = 0; i < n; i++) {
    const xc = p * (i + 0.5), ww = Math.min(1.7, p - 1.2);
    K.window({ x: xc, y: G0, w: ww, h: GH, head: 'arch', sw: 0.22, d: 0.1, sill: false, frame: 'white', surMat: PM.white, v: Math.floor(hashv(i, 4, len) * 4) });
    K.window({ x: xc, y: S2, w: ww, h: S2H, head: 'flat', sw: 0.22, d: 0.1, sill: true, frame: 'white', surMat: PM.white, v: Math.floor(hashv(i, 5, len) * 4) });
    K.window({ x: xc, y: S3, w: ww, h: S3H, head: 'flat', sw: 0.2, d: 0.1, sill: false, frame: 'white', surMat: PM.white, v: Math.floor(hashv(i, 6, len) * 4) });
  }
  void P; void M; void well;
}

// ------------------------------------------------------------------------------------------------ the Great Courtyard walls (flat pilasters, white frames)
function courtFacade(K, PM, len, gates) {
  const P = K.P;
  if (gates.length) {
    const holes = gates.map((g) => ({ x: g.x, y0: 0, w: g.w, h: g.top, head: 'arch' }));
    K.wallWithHoles(PM.wall, 0, len, 0, EN2[1] + 0.02, holes, 4, 4);
    for (const g of gates) K.gate(g.x, 0, g.w, g.top, { open: true, sw: 0.4, d: 0.2, ringMat: PM.white });
  } else K.wallQuad(PM.wall, 0, len, 0, EN2[1] + 0.02, 4);
  const n = Math.max(1, Math.round(len / 4.4)), p = len / n;
  const zo = gates.length ? [gates[0].x - gates[0].w / 2 - 0.8, gates[2].x + gates[2].w / 2 + 0.8] : null;
  for (let i = 0; i <= n; i++) {
    const x = p * i, w = (i === 0 || i === n) ? 0.5 : 1.0;
    const x0 = Math.max(0, x - w / 2), x1 = Math.min(len, x + w / 2);
    P.box(PM.white, x0, x1, 0, EN2[0], 0, 0.14, 'kb');
  }
  for (let i = 0; i < n; i++) {
    const xc = p * (i + 0.5), ww = Math.min(1.9, p - 1.5);
    const skipG = zo && xc > zo[0] && xc < zo[1];
    if (!skipG) K.window({ x: xc, y: 1.4, w: ww, h: 4.6, head: 'arch', sw: 0.26, d: 0.1, sill: false, frame: 'white', surMat: PM.white, v: Math.floor(hashv(i, 7, len) * 4) });
    K.window({ x: xc, y: 8.6, w: ww, h: 4.6, head: 'arch', sw: 0.26, d: 0.1, sill: false, frame: 'white', surMat: PM.white, v: Math.floor(hashv(i, 8, len) * 4) });
    K.window({ x: xc, y: 15.0, w: ww, h: 3.6, head: 'flat', sw: 0.24, d: 0.1, sill: true, frame: 'white', surMat: PM.white, v: Math.floor(hashv(i, 9, len) * 4) });
  }
}

// ------------------------------------------------------------------------------------------------ the vaulted passage behind a gateway (frame of the S edge: z < 0 is inside), open iron leaves
function tunnel(K, PM, g, D) {
  const P = K.P, r = g.w / 2, hs = g.top - r, x = g.x, N = 10;
  const inn = PM.interior;
  P.quad(inn, [x - r, 0, -D], [x - r, 0, 0], [x - r, hs, 0], [x - r, hs, -D], [1, 0, 0]);
  P.quad(inn, [x + r, 0, 0], [x + r, 0, -D], [x + r, hs, -D], [x + r, hs, 0], [-1, 0, 0]);
  for (let i = 0; i < N; i++) {
    const a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N, am = (a0 + a1) / 2;
    const p0 = [x + Math.cos(a0) * r, hs + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, hs + Math.sin(a1) * r];
    P.quad(inn, [p0[0], p0[1], 0], [p0[0], p0[1], -D], [p1[0], p1[1], -D], [p1[0], p1[1], 0], [-Math.cos(am), -Math.sin(am), 0]);
  }
  P.quad(PM.cobble, [x - r, 0.06, 0.4], [x + r, 0.06, 0.4], [x + r, 0.06, -D], [x - r, 0.06, -D], [0, 1, 0], [[0, 0], [g.w / 2, 0], [g.w / 2, (D + 0.4) / 2], [0, (D + 0.4) / 2]]);
  // free columns along the passage walls (photo 029): white shafts with gold capitals, a few clusters deep
  const zs = g.w > 5 ? [-3.4, -6.8, -10.2, -13.6] : [-3.4, -6.8];
  for (const z of zs) for (const sx of [-1, 1]) column(K, PM, x + sx * (r - 0.62), z, 0.05, hs - 0.5, { r: g.w > 5 ? 0.46 : 0.36, capH: 0.8 });
  // the two iron leaves, opened against the passage walls (a lattice with the gilded eagle in the middle of the pair)
  const lw = Math.min(r, 3.0), h = Math.min(hs + 0.6, 6.4), zl0 = -0.6;
  // leaves swung ~38 deg off the passage axis (so that the lattice and the gilded eagle halves are seen from the square and from inside)
  const ang = 38 * Math.PI / 180, dx = lw * Math.sin(ang), dz = lw * Math.cos(ang);
  const hl = x - r + 0.08, hr = x + r - 0.08;
  // the gilded crowned double-headed eagle on the gate finial, above the leaves in the middle of the arch
  for (const ry of [0, Math.PI / 2]) { P.push(x, 0, zl0 - 0.2, ry); K.plane(PM.eagle, -0.85, 0.85, Math.max(h - 0.4, hs - 0.2), Math.max(h - 0.4, hs - 0.2) + 1.7, 0); P.pop(); }
  P.quad(PM.gate, [hl, 0.05, zl0], [hl + dx, 0.05, zl0 - dz], [hl + dx, h, zl0 - dz], [hl, h, zl0], [0, 0, 1], [[0, 0], [0.5, 0], [0.5, 1], [0, 1]]);
  P.quad(PM.gate, [hr - dx, 0.05, zl0 - dz], [hr, 0.05, zl0], [hr, h, zl0], [hr - dx, h, zl0 - dz], [0, 0, 1], [[0.5, 0], [1, 0], [1, 1], [0.5, 1]]);
}

// ------------------------------------------------------------------------------------------------ colliders: thin wall boxes along every wall, split around the gateways; the passages get side walls
export function palaceColliders(K, svc) {
  const ctx = K.ctx; let n = 0;
  for (const { e, f } of svc.edges) {
    if (e.len < 0.6) continue;
    const fwd = Math.abs(f.x - e.a[0]) < 1e-6 && Math.abs(f.z - e.a[1]) < 1e-6;
    const gaps = (e.gates || []).map((g) => { const x0 = g.x - g.w / 2 - 0.3, x1 = g.x + g.w / 2 + 0.3; return fwd ? [x0, x1] : [e.len - x1, e.len - x0]; }).sort((a, b) => a[0] - b[0]);
    const ux = (e.b[0] - e.a[0]) / e.len, uz = (e.b[1] - e.a[1]) / e.len;
    const pieces = []; let s0 = 0;
    for (const g of gaps) { if (g[0] > s0 + 0.05) pieces.push([s0, g[0]]); s0 = Math.max(s0, g[1]); }
    if (s0 < e.len - 0.05) pieces.push([s0, e.len]);
    for (const [t0, t1] of pieces) {
      if (t1 - t0 < 0.4) continue;
      const tm = (t0 + t1) / 2, cx = e.a[0] + ux * tm + e.n[0] * 0.45, cz = e.a[1] + uz * tm + e.n[1] * 0.45;
      ctx.physics.addBox(cx, cz, t1 - t0 + 0.3, 0.9, Math.atan2(-uz, ux), 0, 24); n++;
    }
    if (e.cls.style === 'S' && e.gates.length) for (const g of e.gates) for (const sx of [-1, 1]) {
      const wx = g.x + sx * (g.w / 2 + 0.2), p0 = edgePoint(f, wx, -0.2), p1 = edgePoint(f, wx, -24.0);
      ctx.physics.addBox((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 23.8, 0.4, Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0]), 0, 24); n++;
    }
  }
  svc.palaceColliders = n;
}
