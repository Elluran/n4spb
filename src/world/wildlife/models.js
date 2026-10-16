// wildlife/models.js - stylised low-poly bird models of Saint Petersburg: hooded crow, feral pigeon, house sparrow, swift, black-headed gull, mallard drake and hen.
// Every species = body (back + belly + chest + tail + patches), head (skull + bill, pivots at the neck so it can bob / peck / look), ONE right-wing blade (the
// left wing is the mirrored instance) and the shared leg stick (tinted per instance). Feet at y = 0, body centre at spec.y, +Z forward. 100-250 triangles a bird.
// Colours: docs/research/people.md section O10 (hooded crow = grey body, black head / wings / tail; feral pigeon grey with green neck sheen and dark wing bars; house sparrow
// brown with black bib; swift dark; black-headed gull: white, pale grey back, black wing tips, chocolate hood, red bill and legs; mallard: green head with a white ring, chestnut
// breast, grey flanks, black tail curl, yellow bill, blue speculum; the hen brown). Albedo >= ~#2b2f3d.  Adapted from the Yakutsk sibling (raven / magpie / wagtail / kite dropped).
import { Parts, merge } from './geom.js';

/** plan polygon of a right wing: span S along +x, leading edge forward (+z), tip at z = tipZ, `fingers` serrations along the trailing edge */
function wingPoly({ S, lead, trail, tipZ = -0.04, fingers = 4 }) {
  const pts = [[0, lead], [S * 0.4, lead * 1.0], [S * 0.75, lead * 0.45 + tipZ * 0.3], [S, tipZ]];
  const n = Math.max(1, fingers), notch = S * 0.07;
  for (let i = 1; i <= n; i++) {                         // trailing edge from the tip back to the body: finger tips with notches between them
    const u = i / n, x = S * (1 - 0.94 * u), z = tipZ + (-trail - tipZ) * Math.pow(u, 0.85);
    const um = u - 0.5 / n, xm = S * (1 - 0.94 * um), zm = tipZ + (-trail - tipZ) * Math.pow(um, 0.85);
    pts.push([xm, zm + notch]);
    pts.push([x, z]);
  }
  pts.push([0, -trail * 0.9]);
  return pts;
}

/** the parts of one species. Returns { body, head, wing, sp } */
function songbird(sp) {
  const B = new Parts(), H = new Parts(), W = new Parts();
  const { y: by, bs, pitch, c } = sp;
  sp.neck = [bs[2] * 0.78, by + bs[1] * 0.6 - Math.sin(pitch) * bs[2] * 0.78 + (sp.neckLift || 0)];   // neck pivot [z, y]: front-top of the chest (+ a raised neck: gull / duck)
  // ---- body: back, belly, chest, tail
  B.sph(bs[0], bs[1], bs[2], c.back, { y: by, rx: pitch }, 8, 6);
  B.sph(bs[0] * 0.92, bs[1] * 0.75, bs[2] * 0.92, c.belly, { y: by - bs[1] * 0.38, z: bs[2] * 0.06, rx: pitch }, 8, 5);
  B.sph(bs[0] * 0.86, bs[1] * 0.95, bs[2] * 0.55, c.breast || c.belly, { y: by + bs[1] * 0.1, z: bs[2] * 0.6, rx: pitch * 0.6 }, 7, 5);
  const tl = sp.tail;
  const tz = -bs[2] * 0.82, ty = by + Math.sin(pitch) * bs[2] * 0.7 - bs[1] * 0.05;
  const tpoly = tl.poly || [[-tl.w * 0.5, 0.01], [tl.w * 0.5, 0.01], [tl.w * 0.7, -tl.len], [-tl.w * 0.7, -tl.len]];
  B.blade(tpoly, 0.012, c.tail, { x: 0, y: ty, z: tz, rx: tl.tilt });
  if (tl.under) B.blade(tpoly.map((p) => [p[0] * 0.85, p[1] * 0.9]), 0.01, tl.under, { x: 0, y: ty - 0.013, z: tz, rx: tl.tilt });
  if (sp.neckLift) B.cone(bs[1] * 0.42, bs[1] * 0.62, sp.neckLift + bs[1] * 0.5, c.neck || c.head || c.back, { y: sp.neck[1] - (sp.neckLift + bs[1] * 0.5) / 2 + 0.005, z: sp.neck[0] - 0.005 }, 6);
  if (sp.bodyExtra) sp.bodyExtra(B, sp);
  // ---- head (origin at the neck pivot: front-top of the chest): neck stub, skull, bill, eyes
  const hr = sp.head.r, hs = sp.head.s || [1, 1, 1.05], bl = sp.head.bill, bc = c.bill;
  const sz = hr * 0.9, sy = hr * 0.35;                                         // skull centre
  H.sph(hr * 0.75, hr * 0.8, hr * 0.8, c.head || c.back, { y: 0, z: 0 }, 6, 4);
  H.sph(hr * hs[0], hr * hs[1], hr * hs[2], c.head || c.back, { y: sy, z: sz }, 8, 6);
  const bz = sz + hr * hs[2] * 0.82;
  H.cone(bl.tip ?? 0.004, bl.r, bl.l, bc, { y: sy - hr * 0.1, z: bz + bl.l * 0.5, rx: Math.PI / 2 }, 5);
  if (bl.hook) H.box(bl.r * 0.9, bl.r * 0.9, bl.l * 0.25, bc, { y: sy - hr * 0.1 - bl.r * 0.7, z: bz + bl.l * 0.92 });
  for (const sx of [-1, 1]) H.box(hr * 0.2, hr * 0.2, hr * 0.14, c.eye || '#14161b', { x: sx * hr * hs[0] * 0.85, y: sy + hr * 0.2, z: sz + hr * 0.35 });
  if (sp.headExtra) sp.headExtra(H, sp, sy, sz);
  // ---- right wing: base blade, darker primaries, an optional patch
  const ws = sp.wing;
  W.blade(wingPoly(ws), 0.008, c.wing, {});
  if (c.wingTip) W.blade([[ws.S * 0.55, ws.lead * 0.7], [ws.S * 1.0, ws.tipZ], [ws.S * 0.62, -ws.trail * 0.95]], 0.008, c.wingTip, { y: 0.0015 });
  if (ws.patch) W.blade(ws.patch.poly, 0.008, ws.patch.c, { y: 0.0025 });
  return { body: B.build(), head: H.build(), wing: W.build(), sp };
}

const SPECIES = {
  crow: {                                                      // hooded crow (серая ворона): grey body, black head / throat / breast, wings and tail
    name: 'crow', y: 0.2, bs: [0.075, 0.08, 0.165], pitch: -0.22, neck: [0.125, 0.19],
    c: { back: '#9a9ca6', belly: '#8d909b', breast: '#272a33', tail: '#2a2d37', head: '#262932', bill: '#2f3036', wing: '#2b2e39', wingTip: '#23252d', eye: '#101216' },
    tail: { len: 0.2, w: 0.1, tilt: -0.28 },
    head: { r: 0.05, s: [0.95, 0.95, 1.1], bill: { l: 0.095, r: 0.024, tip: 0.006, hook: true } },
    wing: { S: 0.36, lead: 0.075, trail: 0.12, tipZ: -0.04, fingers: 5, shoulder: [0.062, 0.245, 0.06] },
    legs: { len: 0.14, r: 0.013, hip: [0.032, 0.14, 0.01], col: '#23252c' },
  },
  pigeon: {
    name: 'pigeon', y: 0.14, bs: [0.075, 0.075, 0.125], pitch: -0.18, neck: [0.1, 0.1],
    c: { back: '#9aa0ac', belly: '#8f95a1', breast: '#7d8c92', tail: '#6b707c', head: '#8a909c', bill: '#d7d2c8', wing: '#9aa0ac', wingTip: '#575b67', eye: '#c35a2e' },
    tail: { len: 0.13, w: 0.1, tilt: -0.2, under: '#e6e6e4' },
    head: { r: 0.034, s: [0.95, 0.95, 1.0], bill: { l: 0.028, r: 0.01, tip: 0.005 } },
    wing: { S: 0.25, lead: 0.07, trail: 0.115, tipZ: -0.04, fingers: 4, shoulder: [0.062, 0.17, 0.045], patch: { poly: [[0.05, 0.02], [0.15, 0.03], [0.15, 0.005], [0.05, 0.0]], c: '#4f535f' } },
    legs: { len: 0.075, r: 0.008, hip: [0.028, 0.075, 0.0], col: '#ffffff' },
    bodyExtra(B, sp) { B.sph(0.058, 0.05, 0.05, '#5e8f86', { x: 0, y: sp.y + 0.05, z: 0.08, rx: -0.4 }, 6, 4); B.box(0.07, 0.012, 0.05, '#ecece8', { y: sp.y + 0.04, z: -0.125, rx: -0.2 }); },
  },
  sparrow: {
    name: 'sparrow', y: 0.052, bs: [0.03, 0.033, 0.058], pitch: -0.4, neck: [0.04, 0.045],
    c: { back: '#8a7260', belly: '#d2c9ba', breast: '#bdb3a2', tail: '#6f5a4a', head: '#8d8f8e', bill: '#5b5148', wing: '#7b5a44', wingTip: '#5d4636', eye: '#14120f' },
    tail: { len: 0.06, w: 0.035, tilt: -0.3 },
    head: { r: 0.022, s: [1, 1, 1.0], bill: { l: 0.014, r: 0.007, tip: 0.002 } },
    wing: { S: 0.115, lead: 0.03, trail: 0.05, tipZ: -0.015, fingers: 3, shoulder: [0.026, 0.07, 0.02] },
    legs: { len: 0.045, r: 0.0045, hip: [0.012, 0.045, 0.0], col: '#b48c78' },
    headExtra(H, sp, sy, sz) { H.sph(0.016, 0.012, 0.014, '#2d2926', { y: sy - 0.012, z: sz + 0.014 }, 5, 3); H.sph(0.014, 0.01, 0.02, '#8b5a3a', { y: sy + 0.004, z: sz - 0.006 }, 5, 3); },
  },
  swift: {
    name: 'swift', y: 0.0, bs: [0.028, 0.026, 0.085], pitch: 0, neck: [0.07, 0.0], mergeHead: true,
    c: { back: '#2e3039', belly: '#33363f', breast: '#33363f', tail: '#2e3039', head: '#2e3039', bill: '#1d1e22', wing: '#2a2c34', eye: '#101114' },
    tail: { len: 0.07, w: 0.04, tilt: 0, poly: [[-0.012, 0.01], [0.012, 0.01], [0.03, -0.075], [0.0, -0.045], [-0.03, -0.075]] },
    head: { r: 0.024, s: [1.1, 0.9, 1.1], bill: { l: 0.012, r: 0.01, tip: 0.003 } },
    wing: { S: 0.21, lead: 0.03, trail: 0.04, tipZ: -0.14, fingers: 1, shoulder: [0.02, 0.006, 0.03] },
    legs: null,
  },
  gull: {                                                      // black-headed gull (озёрная чайка), summer: chocolate hood, red bill and legs, pale grey back, black primaries
    name: 'gull', y: 0.15, bs: [0.065, 0.07, 0.165], pitch: -0.2, neck: [0.12, 0.17], neckLift: 0.015,
    c: { back: '#bcc4cd', belly: '#f6f6f4', breast: '#f6f6f4', tail: '#f3f3f1', head: '#5a423b', neck: '#f4f4f2', bill: '#c4372f', wing: '#d3d9e0', wingTip: '#272a31', eye: '#15161a' },
    tail: { len: 0.13, w: 0.09, tilt: -0.2 },
    head: { r: 0.042, s: [0.95, 0.95, 1.1], bill: { l: 0.052, r: 0.015, tip: 0.004, hook: false } },
    wing: { S: 0.46, lead: 0.07, trail: 0.085, tipZ: -0.115, fingers: 2, shoulder: [0.055, 0.2, 0.04], patch: { poly: [[0.02, 0.07], [0.3, 0.06], [0.3, 0.045], [0.02, 0.05]], c: '#fbfbfa' } },
    legs: { len: 0.1, r: 0.01, hip: [0.03, 0.1, 0.0], col: '#c4372f' },
  },
  drake: {                                                     // mallard drake (кряква, селезень): green head, white neck ring, chestnut breast, grey flanks, black tail curl
    name: 'drake', y: 0.075, bs: [0.1, 0.075, 0.2], pitch: 0.05, neck: [0.16, 0.12], neckLift: 0.05,
    c: { back: '#8c877e', belly: '#c9c5ba', breast: '#6b3f35', tail: '#25272c', head: '#1d6a4c', neck: '#1d6a4c', bill: '#d8c43c', wing: '#8a7f70', wingTip: '#5b5348', eye: '#101114' },
    tail: { len: 0.1, w: 0.07, tilt: 0.25, under: '#f1f0ec' },
    head: { r: 0.048, s: [0.95, 0.95, 1.1], bill: { l: 0.06, r: 0.021, tip: 0.012 } },
    wing: { S: 0.3, lead: 0.07, trail: 0.1, tipZ: -0.06, fingers: 3, shoulder: [0.078, 0.1, 0.03], patch: { poly: [[0.1, 0.0], [0.22, -0.01], [0.22, -0.04], [0.1, -0.04]], c: '#3d62b0' } },
    legs: null,
    bodyExtra(B, sp) { B.sph(0.07, 0.05, 0.035, '#f4f4f1', { y: sp.neck[1] - 0.045, z: sp.neck[0] - 0.05 }, 6, 4); B.sph(0.04, 0.035, 0.05, '#25272c', { y: sp.y + 0.065, z: -0.2, rx: -0.5 }, 5, 3); },
  },
  hen: {                                                       // mallard hen: mottled brown, orange bill with a dark saddle
    name: 'hen', y: 0.072, bs: [0.095, 0.072, 0.19], pitch: 0.05, neck: [0.15, 0.11], neckLift: 0.04,
    c: { back: '#8a6c4d', belly: '#a58563', breast: '#9a7956', tail: '#6e5438', head: '#826646', neck: '#826646', bill: '#c9833a', wing: '#7e6446', wingTip: '#5b4630', eye: '#15110d' },
    tail: { len: 0.09, w: 0.07, tilt: 0.2, under: '#d8c9ae' },
    head: { r: 0.045, s: [0.95, 0.95, 1.1], bill: { l: 0.055, r: 0.02, tip: 0.011 } },
    wing: { S: 0.28, lead: 0.065, trail: 0.095, tipZ: -0.055, fingers: 3, shoulder: [0.074, 0.1, 0.03], patch: { poly: [[0.1, 0.0], [0.2, -0.01], [0.2, -0.035], [0.1, -0.035]], c: '#4a62a0' } },
    legs: null,
  },
};

SPECIES.swan = {                                               // mute swan (лебедь-шипун) of the Yelagin / Petrovsky ponds: white, orange bill with a black knob, a long S-curved neck (cygnets: the same model grey-tinted at 0.4)
  name: 'swan', y: 0.2, bs: [0.17, 0.15, 0.4], pitch: 0.12, neck: [0.31, 0.82],
  c: { back: '#f4f2ec', belly: '#ecebe4', breast: '#f1f0ea', tail: '#ecebe4', head: '#f4f2ec', neck: '#f4f2ec', bill: '#e4782e', wing: '#f2f0ea', wingTip: '#e3e0d6', eye: '#14161a' },
  tail: { len: 0.22, w: 0.1, tilt: 0.3 },
  head: { r: 0.045, s: [0.95, 0.95, 1.1], bill: { l: 0.085, r: 0.022, tip: 0.012 } },
  wing: { S: 0.52, lead: 0.1, trail: 0.17, tipZ: -0.08, fingers: 3, shoulder: [0.13, 0.22, 0.05] },
  legs: null,
  bodyExtra(B, sp) {                                           // the neck: eight spheres along an S curve (forward at the base, back above), the head pivots at its top (sp.neck = [z, y])
    const n = 8, zy = (u) => [0.27 + 0.11 * Math.sin(Math.PI * u) + 0.04 * u, 0.27 + 0.55 * u];
    for (let i = 0; i <= n; i++) { const u = i / n, [z, y] = zy(u), r = 0.058 - 0.022 * u; B.sph(r, r, r * 1.25, '#f4f2ec', { y, z }, 6, 4); }
    const top = zy(1); sp.neck = [top[0], top[1]];
    B.sph(0.09, 0.07, 0.07, '#f6f4ee', { y: sp.y + 0.1, z: -0.2, rx: -0.4 }, 6, 4);
  },
  headExtra(H, sp, sy, sz) { H.sph(0.016, 0.016, 0.022, '#16171b', { y: sy + 0.016, z: sz + sp.head.r * 1.05 }, 5, 3); },
};

const cacheM = new Map();
/** { body, head, wing, sp } for 'crow' | 'pigeon' | 'sparrow' | 'swift' | 'gull' | 'drake' | 'hen' | 'swan' (geometries are shared, never mutate them) */
export function birdModel(name) {
  if (cacheM.has(name)) return cacheM.get(name);
  const sp = SPECIES[name];
  const m = songbird(sp);
  if (sp.mergeHead) {                                  // swift / kite: the head is fixed to the body (one mesh less)
    const H = new Parts(), hr = sp.head.r, bl = sp.head.bill, c = sp.c;
    H.sph(hr * sp.head.s[0], hr * sp.head.s[1], hr * sp.head.s[2], c.head, { y: sp.y, z: sp.bs[2] * 0.95 }, 7, 5);
    H.cone(bl.tip, bl.r, bl.l, c.bill, { y: sp.y - 0.003, z: sp.bs[2] * 0.95 + hr + bl.l * 0.35, rx: Math.PI / 2 }, 5);
    m.body = merge([m.body, H.build()]);
    m.head = null;
  }
  cacheM.set(name, m);
  return m;
}
export const BIRD_SPECIES = SPECIES;

/** the shared leg stick: origin at the hip, pointing down -Y, length 1, radius 1 (the instance scale sets the size, the instance colour the colour) */
export function legGeometry() {
  const P = new Parts();
  P.cyl(0.5, 1, '#ffffff', { y: -0.5 }, 4);
  P.box(1.5, 0.12, 3.0, '#ffffff', { y: -0.97, z: 0.9 });
  return P.build();
}

/** flat dark disc (unit diameter): the contact shadow under every ground animal */
export function shadowGeometry() {
  const P = new Parts();
  P.cyl(0.5, 0.01, '#ffffff', {}, 8);
  return P.build();
}
