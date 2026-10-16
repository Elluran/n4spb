// landmarksPetroMonuments/plates.js - the name plates and inscriptions of the monuments: ONE canvas atlas (pages of 4 x 8 cells of 256 x 128 px) drawn once, one decal quad per plate (adapted from
// landmarksVOStatues/plates.js).  A TEXT entry { k, ar, lines: [[text, size]..], bg?, ink? } says what is printed: k 'gold' (gilt letters on polished dark granite), 'carve' (pale letters cut into
// granite), 'brass' (a small bronze-brass plate), 'steel' (stainless plate), 'black' (white letters on black granite).  `ar` = the aspect w / h of the quad the plate is drawn on (default 2:
// the cell is pre-compensated so that glyphs are not stretched on a tall or a long plate).  Texts are the REAL ones of the dossiers (docs/research/petro-monuments-2026*.md): where an inscription is
// not known the plate carries the name of the object only.  A freestanding plate reserves its rectangle in ctx.services.labels (kind 'plate', pseudo building id 'petromon').
import { TEXT } from './platetext.js';

export const CELL = { w: 256, h: 128, cols: 4, rows: 8 };
export const PER_PAGE = CELL.cols * CELL.rows;
const KEYS = Object.keys(TEXT);
export const plateIndex = (key) => KEYS.indexOf(key);
/** { page, u0, v0, u1, v1 } of a plate key (null when unknown) */
export function plateCell(key) {
  const i = plateIndex(key); if (i < 0) return null;
  const page = Math.floor(i / PER_PAGE), c = i % PER_PAGE, cx = c % CELL.cols, cy = Math.floor(c / CELL.cols);
  return { page, u0: (cx * CELL.w + 2) / (CELL.w * CELL.cols), u1: ((cx + 1) * CELL.w - 2) / (CELL.w * CELL.cols), v1: 1 - (cy * CELL.h + 2) / (CELL.h * CELL.rows), v0: 1 - ((cy + 1) * CELL.h - 2) / (CELL.h * CELL.rows) };
}

const SKIN = {
  brass: { bg: '#7d6630', rim: '#c9a85a', ink: '#1e1608', font: 'serif' },
  steel: { bg: '#a9b0b6', rim: '#dfe3e6', ink: '#242a2f', font: 'sans' },
  carve: { bg: '#2a2b2e', rim: null, ink: '#d6d3c8', font: 'serif' },
  gold: { bg: '#1c1d1f', rim: null, ink: '#d4b04e', font: 'serif' },
  black: { bg: '#18191b', rim: null, ink: '#e8e6e0', font: 'sans' },
  bronze: { bg: '#3b3129', rim: '#6a5a3c', ink: '#c9a24a', font: 'serif' },
};

/** the atlas pages as materials (ctx.mat.toon with a canvas map, decal offset) */
export function makePlates(ctx) {
  const tex = ctx.tex, pages = [], nPages = Math.max(1, Math.ceil(KEYS.length / PER_PAGE));
  for (let p = 0; p < nPages; p++) {
    const map = tex.draw(CELL.w * CELL.cols, CELL.h * CELL.rows, (g, W, H) => {
      g.fillStyle = '#20262c'; g.fillRect(0, 0, W, H);
      for (let c = 0; c < PER_PAGE; c++) {
        const key = KEYS[p * PER_PAGE + c]; if (!key) break;
        const T = TEXT[key], S = SKIN[T.k || 'brass'], x0 = (c % CELL.cols) * CELL.w, y0 = Math.floor(c / CELL.cols) * CELL.h;
        g.fillStyle = T.bg || S.bg; g.fillRect(x0 + 2, y0 + 2, CELL.w - 4, CELL.h - 4);
        g.save();
        g.beginPath(); g.rect(x0 + 2, y0 + 2, CELL.w - 4, CELL.h - 4); g.clip();
        const ar = T.ar || 2, wv = 128 * ar;                                  // virtual width: glyphs drawn here are stretched back to square pixels
        g.translate(x0 + CELL.w / 2, y0 + CELL.h / 2); g.scale(CELL.w / wv, 1); g.translate(-wv / 2, -CELL.h / 2);
        if (S.rim) { g.strokeStyle = S.rim; g.lineWidth = 3; g.strokeRect(7, 7, wv - 14, CELL.h - 14); }
        g.fillStyle = T.ink || S.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
        const lines = T.lines, tot = lines.reduce((s, l) => s + l[1] * 1.18, 0);
        let y = (CELL.h - tot) / 2;
        const fam = S.font === 'sans' ? tex.FONTS.sans : tex.FONTS.serif;
        for (const [txt, sz] of lines) { y += sz * 0.59; tex.fitText(g, txt, wv / 2, y, wv - 22, sz, fam, 700); y += sz * 0.59; }
        g.restore();
      }
    }, { key: 'lmpm-plates-' + p });
    pages.push(ctx.mat.toon('#ffffff', { map, name: 'lmpm-plates-' + p, paint: 0, polygonOffset: -2 }));
  }
  return pages;
}

/** a plate (decal quad facing +z of the current frame) centred at (x, y, z), w x h metres; reserves the label rectangle (world frame from K) and returns false when occupied or unknown */
export function plateOn(P, M, K, key, w, h, x, y, z, rotY = 0) {
  const c = plateCell(key); if (!c || !M.plates || !M.plates[c.page]) return false;
  if (K && K.labels) {
    const cs = Math.cos(K.yaw), sn = Math.sin(K.yaw), tot = K.yaw + rotY;
    const wx = K.x + x * cs + z * sn, wz = K.z - x * sn + z * cs;
    if (!K.labels.reserve('petromon', wx, y, wz, w, h, Math.sin(tot), Math.cos(tot), 'plate')) { if (K.svc) (K.svc.plateRefused ||= []).push(key); return false; }
  }
  const mat = M.plates[c.page];
  P.push(x, y, z, rotY);
  P.quad(mat, [-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0], [0, 0, 1], [[c.u0, c.v0], [c.u1, c.v0], [c.u1, c.v1], [c.u0, c.v1]]);
  P.pop();
  return true;
}

/** the first x of `cands` (metres along the wall, local frame) where a w x h rectangle at height y, depth z is free in the label registry (a downpipe, a shop sign or an address plate of the city may hold the spot:
 *  the wall pieces are built after the city and must not cross them); returns null when none is free.  Without a registry every candidate is free. */
export function freeAlongWall(K, w, h, y, z, cands) {
  if (!K || !K.labels || !K.labels.isFree) return cands[0];
  const cs = Math.cos(K.yaw), sn = Math.sin(K.yaw), nx = Math.sin(K.yaw), nz = Math.cos(K.yaw);
  for (const x of cands) if (K.labels.isFree(K.x + x * cs + z * sn, y, K.z - x * sn + z * cs, w, h, nx, nz)) return x;
  return null;
}
/** reserves the rectangle of a wall piece itself (the panel) so that nothing of the city is drawn across it later */
export function reserveRect(K, w, h, x, y, z) {
  if (!K || !K.labels) return true;
  const cs = Math.cos(K.yaw), sn = Math.sin(K.yaw);
  return K.labels.reserve('petromon', K.x + x * cs + z * sn, y, K.z - x * sn + z * cs, w, h, Math.sin(K.yaw), Math.cos(K.yaw), 'plate');
}

/** a plate on an arbitrary quad (corners bottom-left, bottom-right, top-right, top-left in the current frame), e.g. a slanted slab; no label reservation (the caller owns the surface) */
export function plateQuad(P, M, key, bl, br, tr, tl) {
  const c = plateCell(key); if (!c || !M.plates || !M.plates[c.page]) return false;
  const u = [br[0] - bl[0], br[1] - bl[1], br[2] - bl[2]], v = [tl[0] - bl[0], tl[1] - bl[1], tl[2] - bl[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  P.quad(M.plates[c.page], bl, br, tr, tl, n, [[c.u0, c.v0], [c.u1, c.v0], [c.u1, c.v1], [c.u0, c.v1]]);
  return true;
}
