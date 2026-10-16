// signs.js - canvas-text signs packed into ONE atlas (a few 2048 px pages) so that all shop signs of the city are a handful of draw calls, plus the
// material that makes them glow at night (emissive from the texture x ctx.shared.uNight).
//
//   const atlas = new SignAtlas(ctx);
//   const t = atlas.add({ text: 'Алгыстаах Ас', sub: 'СТОЛОВАЯ', bg: '#1d1f25', fg: '#f2f2f0', w: 5.2, h: 0.86 });   // w x h = the sign size in metres
//   -> { page, u0, v0, u1, v1 } ; build quads with those uv, one SignBuilder per page: atlas.builder(page)
//   atlas.finish(root)  -> creates the page textures + one mesh per page (call once, at the end)
//
// The text is plain wordmarks (no logos). Fonts: Rubik / Noto Sans (loaded before the build, Cyrillic + Latin). Pixel density: 96 px per metre of height
// at most, capped at a 1024 px wide strip.
import * as THREE from 'three';
import { cellOf } from './meshes.js';

const PAGE = 2048, PXH = 64;

export class SignAtlas {
  constructor(ctx) {
    this.ctx = ctx; this.pages = []; this.cache = new Map(); this.cx = 0; this.cy = 0; this.rowH = 0; this.count = 0;
  }
  _newPage() {
    const c = document.createElement('canvas'); c.width = PAGE; c.height = PAGE;
    const g = c.getContext('2d'); g.fillStyle = '#1d1f25'; g.fillRect(0, 0, PAGE, PAGE);
    this.pages.push({ canvas: c, g, builders: new Map() });
    this.cx = 0; this.cy = 0; this.rowH = 0;
  }
  /** Draw a sign and return its atlas rectangle. Identical signs (same text / colours / size class) share the rectangle. */
  add(o) {
    const aspect = Math.max(1.5, Math.min(14, o.w / o.h));
    const pxH = o.pxH || PXH, pxW = Math.min(o.maxW || 1024, Math.round(aspect * pxH / 4) * 4);
    const key = [o.text, o.sub || '', o.top || '', o.bg, o.fg, pxW, pxH, o.font || '', o.icon || ''].join('|');
    let r = this.cache.get(key); if (r) return r;
    if (!this.pages.length) this._newPage();
    const PAD = 2;
    if (this.cx + pxW + PAD > PAGE) { this.cx = 0; this.cy += this.rowH + PAD; this.rowH = 0; }
    if (this.cy + pxH + PAD > PAGE) this._newPage();
    const pg = this.pages[this.pages.length - 1], g = pg.g, x = this.cx, y = this.cy;
    this._draw(g, x, y, pxW, pxH, o);
    r = { page: this.pages.length - 1, u0: x / PAGE, u1: (x + pxW) / PAGE, v0: 1 - (y + pxH) / PAGE, v1: 1 - y / PAGE, pxW, pxH };
    this.cx += pxW + PAD; this.rowH = Math.max(this.rowH, pxH); this.count++;
    this.cache.set(key, r);
    return r;
  }
  _draw(g, x, y, w, h, o) {
    const F = this.ctx.tex.FONTS;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = o.bg || '#1d1f25'; g.fillRect(x, y, w, h);
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, w - 6, h - 6); }
    g.fillStyle = o.fg || '#f2f2f0'; g.textBaseline = 'middle'; g.textAlign = 'center';
    const font = o.font || F.round, weight = o.weight || 600;
    const text = o.text || '', sub = o.sub || '';
    const hasSub = !!sub, top = o.top || '';
    const padX = w * 0.04;
    // main line: shrink to fit
    let size = Math.round(h * (top ? 0.52 : hasSub ? 0.46 : 0.58)); const maxW = w - 2 * padX - (o.icon ? h * 0.9 : 0);
    g.font = `${weight} ${size}px ${font}`;
    while (size > 9 && g.measureText(text).width > maxW) { size -= 1; g.font = `${weight} ${size}px ${font}`; }
    const cx = x + w / 2 + (o.icon ? h * 0.45 : 0), cy = y + h * (top ? 0.64 : hasSub ? 0.40 : 0.53);
    if (o.spaced) { g.letterSpacing = Math.round(size * 0.08) + 'px'; }
    g.fillText(text, cx, cy);
    if (o.spaced) g.letterSpacing = '0px';
    if (top) {
      let s2 = Math.round(h * 0.24); g.font = `600 ${s2}px ${F.sans}`;
      while (s2 > 7 && g.measureText(top).width > maxW) { s2 -= 1; g.font = `600 ${s2}px ${F.sans}`; }
      g.fillText(top, cx, y + h * 0.22);
    }
    if (hasSub) {
      let s2 = Math.round(h * 0.2); g.font = `500 ${s2}px ${F.sans}`;
      while (s2 > 7 && g.measureText(sub).width > maxW) { s2 -= 1; g.font = `500 ${s2}px ${F.sans}`; }
      g.globalAlpha = 0.85; g.fillText(sub, cx, y + h * 0.79); g.globalAlpha = 1;
    }
    if (o.icon) this._icon(g, o.icon, x + h * 0.55, y + h * 0.5, h * 0.62, o.fg || '#f2f2f0');
    g.restore();
  }
  /** generic pictograms (no logos): cup, scissors, cross, bag, key, pill */
  _icon(g, kind, cx, cy, s, col) {
    g.save(); g.translate(cx, cy); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(2, s * 0.1); g.lineJoin = 'round'; g.lineCap = 'round';
    const k = s / 2;
    if (kind === 'cup') { g.beginPath(); g.moveTo(-k * 0.7, -k * 0.5); g.lineTo(k * 0.5, -k * 0.5); g.lineTo(k * 0.4, k * 0.6); g.lineTo(-k * 0.6, k * 0.6); g.closePath(); g.stroke(); g.beginPath(); g.arc(k * 0.6, 0, k * 0.28, -1.2, 1.2); g.stroke(); }
    else if (kind === 'cross') { const a = k * 0.28; g.fillRect(-a, -k * 0.8, 2 * a, k * 1.6); g.fillRect(-k * 0.8, -a, k * 1.6, 2 * a); }
    else if (kind === 'scissors') { g.beginPath(); g.moveTo(-k * 0.7, -k * 0.6); g.lineTo(k * 0.7, k * 0.6); g.moveTo(-k * 0.7, k * 0.6); g.lineTo(k * 0.7, -k * 0.6); g.stroke(); g.beginPath(); g.arc(-k * 0.6, -k * 0.55, k * 0.22, 0, 6.3); g.arc(-k * 0.6, k * 0.55, k * 0.22, 0, 6.3); g.stroke(); }
    else if (kind === 'bag') { g.strokeRect(-k * 0.6, -k * 0.3, k * 1.2, k * 0.95); g.beginPath(); g.arc(0, -k * 0.3, k * 0.3, Math.PI, 0); g.stroke(); }
    else if (kind === 'gem') { g.beginPath(); g.moveTo(-k * 0.7, -k * 0.2); g.lineTo(-k * 0.35, -k * 0.7); g.lineTo(k * 0.35, -k * 0.7); g.lineTo(k * 0.7, -k * 0.2); g.lineTo(0, k * 0.75); g.closePath(); g.stroke(); }
    g.restore();
  }
  /** one geometry builder per page and 160 m cell (pos / normal / uv only) */
  builder(page, key = '') {
    const p = this.pages[page];
    let b = p.builders.get(key); if (!b) p.builders.set(key, (b = { pos: [], nrm: [], uv: [], idx: [], n: 0 }));
    return b;
  }
  /** quad centred at (cx, cy, cz) of size w x h facing the outward direction (nx, nz); r = atlas rect */
  quad(r, cx, cy, cz, nx, nz, w, h, flip = false) {
    const B = this.builder(r.page, cellOf(cx, cz));
    const tx = nz, tz = -nx;                                   // tangent (to the right when looking at the wall from outside)
    const x0 = cx - tx * w / 2, z0 = cz - tz * w / 2, x1 = cx + tx * w / 2, z1 = cz + tz * w / 2;
    const i = B.n;
    // looking at the wall from outside, left -> right runs along +tangent: left-bottom, right-bottom, right-top, left-top (counter-clockwise)
    B.pos.push(x0, cy - h / 2, z0, x1, cy - h / 2, z1, x1, cy + h / 2, z1, x0, cy + h / 2, z0);
    for (let k = 0; k < 4; k++) B.nrm.push(nx, 0, nz);
    B.uv.push(r.u0, r.v0, r.u1, r.v0, r.u1, r.v1, r.u0, r.v1);
    B.idx.push(i, i + 1, i + 2, i, i + 2, i + 3); B.n += 4;
  }
  /** create the page textures and the meshes (call once): one mesh per page and cell, noBatch (the core batcher would re-split them in 48 m cells) */
  finish(root) {
    const out = [];
    this.pages.forEach((p, i) => {
      const tex = new THREE.CanvasTexture(p.canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.needsUpdate = true;
      const mat = signMaterial(this.ctx, tex, 'city-signs-' + i);
      for (const [, B] of p.builders) {
        if (!B.n) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
        g.setIndex(B.n > 65535 ? new THREE.Uint32BufferAttribute(B.idx, 1) : new THREE.Uint16BufferAttribute(B.idx, 1));
        g.computeBoundingSphere(); g.computeBoundingBox();
        const m = new THREE.Mesh(g, mat);
        m.castShadow = false; m.receiveShadow = true; m.name = 'city-signs'; this.ctx.noBatch(m); root.add(m); out.push(m);
      }
    });
    return out;
  }
}

/** toon-lit sign material: the texture is the diffuse colour; at night the texture also glows (backlit boards) - modest, the bloom threshold is above it. */
export function signMaterial(ctx, tex, name = 'city-sign') {
  const m = new THREE.MeshToonMaterial({ color: 0xffffff, map: tex, gradientMap: ctx.mat.gradientMap, name, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = ctx.shared.uNight;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 sg = texture2D(map, vMapUv).rgb; totalEmissiveRadiance += sg * (0.10 + 0.95 * uNight); }`);
  };
  m.customProgramCacheKey = () => 'citysign';
  return m;
}
