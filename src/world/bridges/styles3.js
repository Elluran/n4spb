// bridges/styles3.js - what makes the bridges of the south-west recognisable, drawn on top of the generic arch / beam3 of arch.js (B = makeArch(...); everything in the site frame u / y / v), docs/research/sw-canals-bridges.md section 4 / 6:
//   beam3     the Kryukov three-span beams on two round granite drum piers: Torgovy + Matveev (`plainrods`, Kryukov column lamps on cushion pier heads), Pikalov (horizontal rods, obelisk lamps with oval lanterns, board 2.5),
//             Staro-Nikolsky (olive `fleur` railing, two tram tracks), Dekabristov (olive-grey `lyre` railing, no lamps)
//   rcarch    the grey concrete / frame bridges: Kharlamov + Novo-Nikolsky (`arches`), Kashin (`loops`), Fonarny (green, `moika`, swan-neck street lamps), Khrapovitsky (`moika`)
// The pieces are the same as in styles.js / styles2.js (pylon, parapet, board, tripod) so that the quarter reads as one city with the Mars Field reach and the west.
import * as THREE from 'three';
import { pylon } from './sculpt.js';
import { cushion, colLamp, obeliskLamp, swanLamp } from './sculpt3.js';
import { torchere, lampLeaf } from './sculpt2.js';
import { obelisk as graniteObelisk, lampBlack } from './sculpt.js';
import { tramTracks, cornerBlocks } from './styles2.js';
import { lampCross } from './sculpt4.js';

const frame = (B, P, fn) => { P.push(B.f.cx, 0, B.f.cz, -B.T); try { fn(); } finally { P.pop(); } };
const tint = (ctx, hex) => ctx.mat.toon(hex, { paint: 0.03, name: 'brg-t-' + hex });
/** a plate / board on the fascia of face sg at (u, y) */
function board(P, mat, B, sg, u, y, w, h) {
  const v = (sg < 0 ? B.site.v0 : B.site.v1) + sg * 0.06;
  P.quad(mat, [u - sg * w / 2, y, v], [u + sg * w / 2, y, v], [u + sg * w / 2, y + h, v], [u - sg * w / 2, y + h, v], [0, 0, sg], [[0, 0], [1, 0], [1, 1], [0, 1]]);
}
/** a blank white Mostotrest plate on the railing at mid-span (0.5 x 0.5 m, on two short posts) */
function plate(e, B, sg, hexMat) {
  const { P, M } = e, v = (sg < 0 ? B.site.v0 : B.site.v1) - sg * 0.2, u = B.uc, y = B.yDeck(u) + 0.35;
  P.box(M.white, u - 0.26, u + 0.26, y, y + 0.5, v - 0.02, v + 0.02, '', 1);
  void hexMat;
}
const ord = (a, b) => [Math.min(a, b), Math.max(a, b)];
/** granite end bollards at the bridge ends (0.6 x 0.6 x 0.9) */
function endPosts(e, B, sg, a, b) {
  const { P, M } = e, fi = B.faceInfo(sg), [v0, v1] = ord(fi.v, fi.v - sg * 0.6);
  for (const [u0, u1] of [[a - 0.75, a - 0.15], [b + 0.15, b + 0.75]]) { const y0 = B.yDeck((u0 + u1) / 2) - 0.05; pylon(P, M.pylon, M.coping, u0, u1, y0, y0 + 0.95, v0, v1, { cap: 0.04 }); }
}

const BEAM = {
  torgovy: { kind: 'plainrods', hex: '#3f5a46', lamps: 'col' },
  matveev: { kind: 'plainrods', hex: '#3f5a46', lamps: 'col' },
  pikalov: { kind: 'hrods', hex: '#4a5a4a', lamps: 'obelisk' },
  'staro-nikolsky': { kind: 'fleur', hex: '#5f7a60', lamps: null },
  dekabristov: { kind: 'lyre', hex: '#5f6b5a', lamps: null },
};
const beam3 = (e, B) => {
  const { P, M, ctx } = e, site = B.site, o = BEAM[site.id] || BEAM.torgovy, post = tint(ctx, o.hex);
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b;
      B.railLine(sg, a, b, o.kind, o.hex, { postMat: post, postW: 0.14, h: o.kind === 'hrods' ? 0.95 : undefined });
      endPosts(e, B, sg, a, b);
      B.faceCollider(sg, a - 0.9, b + 0.9, 0.25, 0.6);
      for (const pu of B.pierU()) {
        const vv = fi.v + sg * 0.45, y0 = B.yDeck(pu) - 0.04;                                    // on the round pier head that projects beyond the fascia
        B.faceCollider(sg, pu - 0.9, pu + 0.9, -0.9, 1.6);
        if (o.lamps === 'col') { cushion(P, M, pu, y0, vv, 0); colLamp(P, M, pu, y0 + 0.72, vv, Math.PI / 2, sg); }
        else if (o.lamps === 'obelisk') obeliskLamp(P, M, pu, y0, vv, Math.PI / 2, { oval: true, cone: true, h: 3.6, plinthH: 0.7 });
      }
      if (site.clear) board(P, M.clear(site.clear), B, sg, B.uc, B.beamBottom(B.uc) + 0.1, 0.42, 0.42);
      if (site.plate) plate(e, B, sg);
    }
    if (site.trams) tramTracks(e, B, site.trams);
  });
};

const RC = {
  kharlamov: { kind: 'arches', hex: '#202428', ends: 'tumba' },
  novonik: { kind: 'arches', hex: '#bcc0bc', ends: 'tumba' },
  kashin: { kind: 'loops', hex: '#202428', ends: 'parapet' },
  fonarny: { kind: 'moika', hex: '#2f4a3a', ends: 'parapet', swan: true },
  khrapov: { kind: 'moika', hex: '#2c3a34', ends: 'parapet' },
  // the Karpovka (sites-petro.js; docs/research/petro-bridges.md section 8, photos 68 69): cast arcade railings (Petropavlovsky, Geslerovsky, Aptekarsky), the green lattice with medallions of the
  // Silin Bridge, a plain welded railing (Karpovsky, Molodyozhny), a forged one between granite tumbas (Barochny)
  aptek: { kind: 'plainrods', hex: '#202428', ends: 'parapet' },
  petropav: { kind: 'scroll', hex: '#202428', ends: 'parapet' },
  silin: { kind: 'lattice', hex: '#3f8a5c', ends: 'parapet' },
  gesler: { kind: 'arches', hex: '#202428', ends: 'parapet' },
  karpov: { kind: 'arches', hex: '#202428', ends: 'parapet' },
  baroch: { kind: 'scroll', hex: '#2c4a38', ends: 'tumba' },
  molod: { kind: 'plainrods', hex: '#202428', ends: 'parapet', cross: true },
};
const rcarch = (e, B) => {
  const { P, M, ctx } = e, site = B.site, o = RC[site.look] || RC.kharlamov, post = tint(ctx, o.hex);
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b;
      B.railLine(sg, a, b, o.kind, o.hex, { postMat: o.kind === 'loops' ? M.iron : post, postW: 0.2 });
      if (o.ends === 'parapet') { for (const [u0, u1] of [[a - 4.2, a - 0.05], [b + 0.05, b + 4.2]]) B.parapet(sg, u0, u1, 1.05, 0.5, M.parapetPink); B.faceCollider(sg, a - 4.4, b + 4.4, 0.25, 0.6); }
      else { endPosts(e, B, sg, a, b); B.faceCollider(sg, a - 0.9, b + 0.9, 0.25, 0.6); for (const [u0, u1] of [[a - 3.2, a - 0.8], [b + 0.8, b + 3.2]]) B.parapet(sg, u0, u1, 1.0, 0.5, M.parapetPink); B.faceCollider(sg, a - 3.4, b + 3.4, 0.25, 0.6); }
      if (site.plate) plate(e, B, sg);
      if (o.swan) for (const [u, ts] of [[a - 1.0, -1], [b + 1.0, 1]]) swanLamp(P, M, u, B.yDeck(u) - 0.05, fi.v - sg * 0.5, sg > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    if (site.trams) tramTracks(e, B, site.trams);
    if (site.clear && RC[site.look] && site.ww === 'karpovka') for (const sg of [-1, 1]) board(P, M.clear(site.clear), B, sg, B.uc, B.yDeck(B.uc) - 0.95, 0.42, 0.42);      // the clearance board at mid-span (Karpovka photos)
    if (o.cross) for (const sg of [-1, 1]) { const fi = B.faceInfo(sg); for (const u of [fi.a - 2.0, fi.b + 2.0]) lampCross(P, M, u, B.yDeck(u) + 0.95, fi.v - sg * 0.3, 0, { h: 7.2, n: 2, mat: M.iron }); }   // Molodyozhny: black standards with two cylinder lanterns on the end blocks
  });
};

/** moulded cornice lines along the fascia face sg at heights below the deck edge (Demidov: y -0.35 and -0.9) */
function fasciaLines(e, B, sg, a, b, drops, mat) {
  const { P } = e, v = (sg < 0 ? B.site.v0 : B.site.v1) + sg * 0.03, n = 12;
  for (const d of drops) for (let i = 0; i < n; i++) { const u0 = a + (b - a) * i / n, u1 = a + (b - a) * (i + 1) / n; P.quad(mat, [u0, B.yDeck(u0) - d - 0.03, v], [u1, B.yDeck(u1) - d - 0.03, v], [u1, B.yDeck(u1) - d + 0.03, v], [u0, B.yDeck(u0) - d + 0.03, v], [0, 0, sg]); }
}

const kamenny = (e, B) => {                                                  // humpback granite arch, `loops` railing between pink posts, tumbas 1.3 x 0.8 x 1.2 at the four corners
  const { P, M } = e;
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b, [v0, v1] = ord(fi.v, fi.v - sg * 0.8);
      B.railLine(sg, a, b, 'loops', '#202428', { postMat: M.pylon, postW: 0.32, h: 1.0 });
      for (const [u0, u1] of [[a - 1.3, a], [b, b + 1.3]]) { const y0 = B.yDeck((u0 + u1) / 2) - 0.05; pylon(P, M.pylon, M.coping, u0, u1, y0, y0 + 1.2, v0, v1, { cap: 0.04 }); }
      B.faceCollider(sg, a - 1.5, b + 1.5, 0.25, 0.7);
    }
  });
};

const demidov = (e, B) => {                                                  // green iron arch, palmette lace, lamp standards on pink tumbas at the corners, blank plate at mid-span
  const { P, M, ctx } = e, post = tint(ctx, '#2b4437');
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b;
      B.railLine(sg, a, b, 'palmettes', '#2f4a3a', { postMat: post, postW: 0.2 });
      fasciaLines(e, B, sg, a, b, [0.35, 0.9], M.copingDark);
      if (B.site.plate) plate(e, B, sg);
      B.faceCollider(sg, a - 1.5, b + 1.5, 0.25, 0.6);
    }
    cornerBlocks(e, B, 0.8, 0.8, 1.1, (u, top, v, sg) => lampLeaf(P, M, u, top, v, 0));
  });
};

const kokushkin = (e, B) => {                                                // pale grey-olive girder with a cast panel band, rosette railing, iron bollards at the ends
  const { P, M, ctx } = e, post = tint(ctx, '#8a9482');
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b, [v0, v1] = ord(fi.v, fi.v - sg * 0.5);
      B.railLine(sg, a, b, 'rosettes', '#8a9482', { postMat: post, postW: 0.16 });
      for (const [u0, u1] of [[a - 0.5, a - 0.1], [b + 0.1, b + 0.5]]) { const y0 = B.yDeck((u0 + u1) / 2) - 0.05; P.box(M.iron, u0, u1, y0, y0 + 1.0, v0, v1, 'b', 1); P.cyl(M.iron, [(u0 + u1) / 2, y0 + 1.0, (v0 + v1) / 2], [(u0 + u1) / 2, y0 + 1.14, (v0 + v1) / 2], 0.2, 0.08, 8, true); }
      for (const [u0, u1] of [[a - 4.5, a - 0.6], [b + 0.6, b + 4.5]]) B.parapet(sg, u0, u1, 1.0, 0.5, M.parapetPink);
      if (B.site.plate) plate(e, B, sg);
      B.faceCollider(sg, a - 4.7, b + 4.7, 0.25, 0.6);
    }
  });
};

const vozn = (e, B) => {                                                     // olive frame bridge, acacia / medallion railing, four spear-bundle torchères on granite end blocks
  const { P, M, ctx } = e, post = tint(ctx, '#4d6e4b');
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b;
      B.railLine(sg, a, b, 'acacia', '#4d6e4b', { postMat: post, postW: 0.18 });
      for (const [u0, u1] of [[a - 1.2 - 4, a - 1.2], [b + 1.2, b + 1.2 + 4]]) B.parapet(sg, u0, u1, 1.05, 0.5, M.parapetPink);
      if (B.site.plate) plate(e, B, sg);
      B.faceCollider(sg, a - 5.4, b + 5.4, 0.25, 0.6);
    }
    cornerBlocks(e, B, 1.2, 1.2, 1.2, (u, top, v, sg) => torchere(P, M, u, top, v, Math.PI / 2, { h: 3.2, shield: true, wreath: true, arm: sg }));
  });
};

const podyach = (e, B) => {                                                  // flat pale-olive deck, green stadium-loop railing, four granite obelisks with gilded balls and lanterns
  const { P, M, ctx } = e, post = tint(ctx, '#4a6a4a');
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b;
      B.railLine(sg, a, b, 'loops', '#4a6a4a', { postMat: post, postW: 0.2 });
      for (const [u0, u1] of [[a - 1.4 - 3.5, a - 1.4], [b + 1.4, b + 1.4 + 3.5]]) B.parapet(sg, u0, u1, 1.05, 0.5, M.parapetPink);
      if (B.site.plate) plate(e, B, sg);
      B.faceCollider(sg, a - 5.1, b + 5.1, 0.25, 0.6);
    }
    for (const sg of [-1, 1]) { const fi = B.faceInfo(sg); for (const u of [fi.a - 0.7, fi.b + 0.7]) obeliskLamp(P, M, u, B.yDeck(u) - 0.05, fi.v - sg * 0.7, sg > 0 ? Math.PI / 2 : -Math.PI / 2, { h: 3.6, plinthH: 0.7 }); }
  });
};

const potseluev = (e, B) => {                                                // green-grey riveted arch, Moika railing, four plain granite obelisks with balls (no lamps since 2011), board 2.8
  const { P, M, ctx } = e, post = tint(ctx, '#2c3a34');
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b;
      B.railLine(sg, a, b, 'moika', '#2c3a34', { postMat: post, postW: 0.22 });
      for (const ts of [-1, 1]) { const ou = ts < 0 ? a - 1.3 : b + 1.3, ov = fi.v - sg * 0.8, y0 = B.yDeck(ou) - 0.05; graniteObelisk(P, M, ou, y0, ov, Math.atan2(B.uc - ou, -ov), 4.0, false); }
      for (const [u0, u1] of [[a - 2.6 - 4.5, a - 2.6], [b + 2.6, b + 2.6 + 4.5]]) B.parapet(sg, u0, u1, 1.1, 0.52, M.parapetPink);
      board(P, M.clear(B.site.clear), B, sg, B.uc, B.yDeck(B.uc) - 0.9, 0.42, 0.42);
      B.faceCollider(sg, a - 7.2, b + 7.2, 0.25, 0.6);
    }
  });
};

const mogilev = (e, B) => {                                               // pink granite arch, Moika railing on the parapet line, four dark empire standards with hexagonal lanterns
  const { P, M, ctx } = e, post = tint(ctx, '#2c3a34');
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b;
      B.railLine(sg, a, b, 'moika', '#2c3a34', { postMat: post, postW: 0.22 });
      for (const [u0, u1] of [[a - 3.2 - 4.5, a - 3.2], [b + 3.2, b + 3.2 + 4.5]]) B.parapet(sg, u0, u1, 1.05, 0.52, M.parapetPink);
      B.faceCollider(sg, a - 7.9, b + 7.9, 0.25, 0.6);
      for (const u of [a - 1.2, b + 1.2]) lampBlack(P, M, u, B.yDeck(u) - 0.05, fi.v - sg * 0.6, 3.6);
    }
  });
};

const slab = (e, B) => {                                                 // short granite-clad slab bridges: solid parapets at the abutments, Moika / Fontanka-type railing between
  const { P, M, ctx } = e, id = B.site.id, kind = id === 'krushtein1' ? 'lattice' : 'moika', post = id === 'admiralteysky' ? M.pylon : tint(ctx, id === 'krushtein1' ? '#3c4640' : '#2c3a34');
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b;
      B.railLine(sg, a, b, kind, '#202428', { postMat: post, postW: id === 'admiralteysky' ? 0.34 : 0.22, bay: id === 'admiralteysky' ? 2.0 : undefined });
      for (const [u0, u1] of [[a - 3.5, a - 0.05], [b + 0.05, b + 3.5]]) B.parapet(sg, u0, u1, 1.0, 0.5, M.parapetPink);
      B.faceCollider(sg, a - 3.7, b + 3.7, 0.25, 0.6);
    }
  });
};

export const STYLES3 = { mogilev, slab, beam3, rcarch, kamenny, demidov, kokushkin, vozn, podyach, potseluev };
void lampBlack;
void THREE;
