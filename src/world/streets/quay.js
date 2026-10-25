// streets/quay.js - stone and iron posts of the embankments and gateways (docs/research/streets.md section 2 "Guard stones", photos P30 P31; west-life-furniture.md 4.2 B2 / G):
//   * GUARD STONES of the Fontanka embankment: rough pink-grey granite posts 0.6 m high with a domed top standing 0.55 m behind the kerb on the river side of the embankment roads
//     every ~9 m. The quay railing itself belongs to the environment module (environment/quay.js).
//   * the mapped guard stones of the gateways (OSM MANMADE kind guard_stone: 10 in the west, at the courtyard gates of Isaac's Square / Malaya Morskaya, the Sadovaya passage): stone
//     (domed granite) or metal (short black post), exactly where the data has them.
//   * GRANITE CHAIN BOLLARDS (B2) along the Neva kerb of the Admiralty embankment next to the Senate pier: rough-polished grey stone cylinders 0.9 m x 0.38 m with a domed top every ~3.4 m,
//     joined by a black chain (photos P40 P61 P104).
// Instanced; colliders on the posts; none at crossings, bridge approaches, bus stops or gateways.
import * as THREE from 'three';
import { VB } from './vb.js';
import { knockInstances } from '../lib/knock-inst.js';
import { instances, alongKerbs, hash2, nodeNear, poleClear, clearNear } from './furn.js';
import { nearCrossing } from './net.js';
import { WALK_Y, KERB_W } from './surface.js';
import { deckAt } from './decks.js';
import { MANMADE } from '../data/city.js';
import * as L from '../layout.js';

const NEVA_BOLLARDS = new Set(['Адмиралтейская набережная']);

const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
/** the stone / iron posts of the embankments as KNOCK records (docs/AREAS.md 13.7: a post that keeps people from the water breaks like a bollard): one instance per post (y scaled by sy), a cylinder collider each, and the optional
 *  chain that ends at the post (c = { x, y, z, rotY, sz }: the instance origin is the span start, 1 m along +z scaled by sz) goes down with it */
function knockPosts(ctx, name, geo, mat, list, { r, h, mass, anchored, hitK, chainGeo = null }) {
  if (!list.length) return;
  const items = list.map((q) => ctx.physics.addCylinder(q.x, q.z, r, 0, h));
  const parts = [{ geo, mat, name: 'post', far: 260, place: (q) => new THREE.Matrix4().compose(_p.set(q.x, q.y || 0, q.z), _q.setFromEuler(_e.set(0, q.rotY || 0, 0)), _s.set(1, q.sy ?? 1, 1)) }];
  if (chainGeo) parts.push({ geo: chainGeo, mat, name: 'chain', shadow: false, far: 200, when: (q) => !!q.c, place: (q) => new THREE.Matrix4().compose(_p.set(q.c.x, q.c.y, q.c.z), _q.setFromEuler(_e.set(0, q.c.rotY, 0)), _s.set(1, 1, q.c.sz)) });
  knockInstances(ctx, { name, parts, spots: list, items: (i) => items[i], far: 260, rec: { kind: 'stone', mass, h, r, anchored, hitK, metal: false, minDv: 0 } });
}

export function buildQuay(ctx, net, root, avoid = []) {
  const out = { stones: 0, gateStones: 0, bollards: 0 };
  const mVC = ctx.mat.toon('#ffffff', { vertexColors: true, paint: 0.05, name: 'pt-guard-stones' });
  // ---- river-side guard stones of the Fontanka embankment
  const V = new VB();
  V.cyl(0.24, 0.27, 0.46, '#a3938d', [0, 0.23, 0], null, 6, null, true);
  V.ball(0.26, '#ada09a', [0, 0.46, 0], [1, 0.6, 1]);
  const geo = V.build();
  const list = [];
  alongKerbs(net, 9, (k) => {
    const w = k.w;
    if (w.name !== 'набережная реки Фонтанки' || w.bridge || w.rank < 1) return;
    const x = k.x + k.nx * (KERB_W + 0.55), z = k.z + k.nz * (KERB_W + 0.55);
    // only the kerb that faces the river: the quay edge lies within 14 m along the outward normal
    let river = false; for (let d = 2; d <= 14; d += 2) if (L.inRiver(k.x + k.nx * d, k.z + k.nz * d)) { river = true; break; }
    if (!river || nearCrossing(net, x, z, 4) || net.cover(x, z, { skip: w }) > -0.6 || L.insideBuilding(x, z, 0.3)) return;
    for (const a of avoid) if (Math.hypot(a[0] - x, a[1] - z) < 5) return;
    if (nodeNear(net, x, z, 12)) return;
    list.push({ x, y: WALK_Y, z, rotY: hash2(x, z) * 6.28, sy: 0.85 + hash2(z, x) * 0.3 });
  });
  knockPosts(ctx, 'pt-guard-stones', geo, mVC, list, { r: 0.26, h: 0.6, mass: 260, anchored: 22, hitK: 0.35 });      // (granite guard stones 0.6 m: knock records, a car at 22 km/h breaks one off)
  out.stones = list.length;

  // ---- the mapped guard stones of the gateways (stone: domed granite 0.55 m; metal: a short black post)
  {
    const S = new VB(), M = new VB();
    S.cyl(0.23, 0.27, 0.42, '#9d8f89', [0, 0.21, 0], null, 6, null, true); S.ball(0.25, '#a89a94', [0, 0.42, 0], [1, 0.62, 1]);
    M.cyl(0.07, 0.09, 0.62, '#26292b', [0, 0.31, 0], null, 6, null, true); M.ball(0.08, '#33373a', [0, 0.64, 0], null, 'oct');
    const stone = [], metal = [];
    for (const m of MANMADE) {
      if (m.kind !== 'guard_stone' || deckAt(m.x, m.z, 0.5)) continue;
      const at = poleClear(net, m.x, m.z) ? [m.x, m.z] : clearNear(net, m.x, m.z, 4);     // road clearance rule: a mapped stone that stands on the asphalt moves to the nearest clear spot beside the gate
      if (at) (m.material === 'metal' ? metal : stone).push({ x: at[0], y: 0.03, z: at[1], rotY: hash2(m.x, m.z) * 6.28, sy: 0.9 + hash2(m.z, m.x) * 0.2 });
    }
    knockPosts(ctx, 'pt-gate-stones', S.build(), mVC, stone, { r: 0.25, h: 0.55, mass: 240, anchored: 22, hitK: 0.35 });
    knockPosts(ctx, 'pt-gate-posts', M.build(), mVC, metal, { r: 0.1, h: 0.62, mass: 30, anchored: 10, hitK: 0.12 });
    out.gateStones = stone.length + metal.length;
  }

  // ---- B2 granite chain bollards on the Neva kerb of the Admiralty embankment (and their chains)
  {
    const B = new VB();
    B.cyl(0.19, 0.22, 0.78, '#8e8984', [0, 0.39, 0], null, 8, null, true); B.ball(0.2, '#9a958f', [0, 0.78, 0], [1, 0.55, 1]);
    const C = new VB(), y0 = 0.62, sag = 0.2, at = (u) => [0, y0 - sag * 4 * u * (1 - u), u];
    for (let i = 0; i < 3; i++) C.rod(at(i / 3), at((i + 1) / 3), 0.016, '#1c1e1d', 3, true);
    const posts = [], chains = [];
    let prev = null, prevRun = -1;
    alongKerbs(net, 3.4, (k) => {
      const w = k.w;
      if (!NEVA_BOLLARDS.has(w.name) || w.bridge || w.rank < 1) return;
      let river = false; for (let d = 2; d <= 14; d += 2) if (L.inRiver(k.x + k.nx * d, k.z + k.nz * d)) { river = true; break; }
      const x = k.x + k.nx * (KERB_W + 0.4), z = k.z + k.nz * (KERB_W + 0.4);
      if (!river || nearCrossing(net, x, z, 4) || net.cover(x, z, { skip: w }) > -0.5 || L.insideBuilding(x, z, 0.3) || deckAt(x, z, 1) || nodeNear(net, x, z, 9)) { prev = null; return; }
      for (const a of avoid) if (Math.hypot(a[0] - x, a[1] - z) < 4) { prev = null; return; }
      posts.push({ x, y: WALK_Y, z, rotY: hash2(x, z) * 6.28 });
      const post = posts[posts.length - 1];
      if (prev && prevRun === k.run && Math.hypot(prev.x - x, prev.z - z) < 4.2) { const ch = { x: prev.x, y: WALK_Y, z: prev.z, rotY: Math.atan2(x - prev.x, z - prev.z), sz: Math.hypot(x - prev.x, z - prev.z) }; chains.push(ch); post.c = ch; }
      prev = { x, z }; prevRun = k.run;
    });
    knockPosts(ctx, 'pt-neva-bollards', B.build(), mVC, posts, { r: 0.2, h: 0.85, mass: 160, anchored: 26, hitK: 0.4, chainGeo: C.build() });      // (a chain goes down with the post it ends at)
    void chains;
    out.bollards = posts.length;
  }
  return out;
}
