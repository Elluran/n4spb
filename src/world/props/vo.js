// props/vo.js - the street props of VASILIEVSKY ISLAND (regions V3..V12 of docs/VO-BRIEF.md; docs/research/vo-roster-architecture.md section 7, photos vora 08 / 11 / 12 / 43, streets-vo 13 / 15).
// The generic generators (osm.js, walks.js, west.js, ads.js, stands.js) already furnish the island from the baked OSM data: benches, bins, bike racks, post boxes, clocks, advertising pillars. This phase
// runs LAST (after every other props phase, with its own random stream: nothing in an older district changes) and adds what is specific and real there; everything only inside inVO(x, z) = the new
// rectangles V3..V12 (props/petro.js VO_RECTS), the outline of the island (lib/vo-island.js) and not the reviewed Spit / University rectangles V1 / V2:
//   * RESTYLE (the generic instances are taken out of their instanced lists and redrawn as shared static meshes: no new draw calls, the batcher merges them into the cells of the 'pr-vc' material):
//     Bolshoy pr. boulevards: benches on pale concrete blocks with timber seat and back + big stone vase planters (photo 08); the land fill west of x -8050: light-timber promenade benches on
//     galvanised legs; benches within 16 m of a mapped playground (PITCHES): the bright painted playground benches;
//   * glazed newspaper kiosks at the zebra crossings of Sredny (the tram avenue: photo 11), Bolshoy and Maly pr.;
//   * 1970s one-storey shop pavilions (plain wordmarks: ПРОДУКТЫ, ОВОЩИ ФРУКТЫ ...) at the tram / bus loops of Gavan, Detskaya and Nakhimova (photo 43);
//   * street banners (растяжки: a plain horizontal strip on cables between two facade brackets, 7.2 m up, above the trolleybus wires; never flag-shaped) across Maly pr.;
//   * city-light boxes at the stops and crossings of the island main streets; the 54 + 2 roadside billboards on one pole and the 9 shop totems of the OSM (props/vo-data.js); the 121 wall cameras;
//   * memorial plaques with the REAL inscription of the OSM nodes (the sights draw their own: skipped), wall ATMs (the whole-map cap of osm.js had been used up before the island);
// NOT drawn: flagpoles (49 mapped), vending machines (inside buildings), the street-name / number plates and the tram-stop shelters (streets owns them), the lattice railing of the land fill (environment).
// RULES (docs/AGENT-BRIEF.md): every standing footprint is tested on its FINAL position against streets.net.cover (< -0.5: carriageways, pockets, fillets, tram beds), the tram tracks (net.trackDist >= 1.9),
// door boxes, crossings, stops, metro portals and the solids already built; wall things reserve ctx.services.labels first; no flags, no sounds, no brands (plain wordmarks).
import * as THREE from 'three';
import * as L from '../layout.js';
import { MONUMENTS, FURNITURE, PITCHES, ROADS } from '../data/city.js';
import { inIsland } from '../lib/vo-island.js';
import { Geo, hash01, ringHas } from './kit.js';
import { PAVED_RINGS as ANDREW_RINGS } from '../landmarksAndrew/groups.js';
import { faceRot, nearestWall, nearestWalk } from './sites.js';
import { inPetro, inVORect } from './petro.js';
import { attractSum } from './ads.js';
import { streetTrackDist } from '../streets/net.js';
import * as K from './vo-kit.js';
import * as FUR from './furniture.js';
import { BILLBOARDS, TOTEMS, CCTV } from './vo-data.js';

/** (x, z) is new island ground: a V3..V12 rectangle (not V1 / V2, reviewed in the Petrograd round), no older play rectangle (inPetro), inside the outline of the island */
export const inVO = (x, z) => inVORect(x, z) && inPetro(x, z) && inIsland(x, z);

const BOLSHOY = 'Большой проспект В.О.', SREDNY = 'Средний проспект В.О.', MALY = 'Малый проспект В.О.';
const MAIN_RE = /Большой проспект В\.О\.|Средний проспект В\.О\.|Малый проспект В\.О\.|Наличная|Кораблестроителей|Кадетская линия|Крузенштерна|набережная Макарова|Мичманская|улица Нахимова|Железноводская|Гаванская/;
const BENCH_TYPES = ['benchPark', 'benchParkL', 'benchParkD', 'benchWhite', 'benchWhiteL'];
const WOODS = ['#8b4b33', '#9a5a3a', '#7a4430'];
const PLAY_COLS = ['#2f8f5b', '#2f64b5', '#d8a21e', '#c8453c'];

export function placeVO(S) {
  const cnt = { restyled: { block: 0, vase: 0, promenade: 0, play: 0 }, news: 0, pavilions: 0, banners: 0, cityLights: 0, billboards: 0, totems: 0, cameras: 0, plaques: 0, atms: 0, missed: [], failed: [], skipped: {} };
  S.stats.vo = cnt;
  if (!inVO(-4300, -1000) && !inVO(-5300, -300)) { cnt.skip = 'the island is not in this map'; return; }
  if ((typeof location !== 'undefined' && /[?&]novo=1/.test(location.search || '')) || (typeof process !== 'undefined' && process.env && process.env.PROPS_NOVO)) { cnt.skip = '?novo=1 / PROPS_NOVO (A/B of the draw calls and of the older districts: the island phase is off)'; return; }
  const { W, F } = S, ctx = S.ctx, T = S.sign, SV = ctx.services, net = S.st && S.st.net, labels = SV.labels;
  const rnd = ctx.rng('spb-props-vo');
  S.stats.voClaimed = (S._claimedAt || []).filter((q) => inVO(q[0], q[1]));          // OSM benches / bins left to the sights (their claimed paving): for tools/props-vo.mjs
  for (const k of ['billboards', 'totems', 'cameras', 'plaques', 'banners']) S.svc[k] = S.svc[k] || [];
  const cover = (x, z) => (net ? net.cover(x, z, {}) : -9);
  const track = (x, z) => (net ? streetTrackDist(x, z) : 99);                                  // distance to the nearest tram track axis of the streets (99 = none): the tram avenues of the island (Sredny, Kosaya, Nalichnaya ...)
  const solidAt = (x, z, r) => { const p = { x, z }; ctx.physics.resolve(p, r, 0, 1.7); return Math.hypot(p.x - x, p.z - z) > 0.02; };
  const corners = (x, z, w, d, rot, m = 0) => { const c = Math.cos(rot), s = Math.sin(rot), out = [[x, z]]; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) { const lx = a * (w / 2 + m), lz = b * (d / 2 + m); out.push([x + lx * c + lz * s, z - lx * s + lz * c]); } return out; };
  /** the road rule on the final footprint: every corner 0.5 m clear of the asphalt, 1.9 m off a tram track axis, not on water */
  const offRoad = (x, z, w, d, rot) => corners(x, z, w, d, rot).every(([px, pz]) => { if (cover(px, pz) > -0.5 || L.inRiver(px, pz)) return false; const t = track(px, pz); return !(t !== null && t !== undefined && t < 1.9); });
  const doorHit = (x, z, w, d, rot) => corners(x, z, w, d, rot, 0.2).some(([px, pz]) => S.inDoorBox(px, pz, 0));
  const mk = (geo, x, y, z, rot, name) => { const m = new THREE.Mesh(geo, S.vc); m.position.set(x, y, z); m.rotation.y = rot; m.castShadow = true; m.receiveShadow = true; m.name = name; ctx.addStatic(m); S.tris += geo.index.count / 3; return m; };
  const geoOf = (g) => g.build();
  const roadNear = (x, z, re, r = 45) => { const rs = L.roadsNear(x, z, r, { drivable: true }); return re ? rs.find((q) => re.test(q.road.name || '')) || null : rs[0] || null; };
  const roadName = (x, z, name, maxD) => { const q = L.roadsNear(x, z, maxD + 10, { name, drivable: true })[0]; return q && q.dist <= maxD ? q : null; };

  /** the free spot nearest to o.at (expanding rings): o { at, R, r0, rd (a RegExp of the road name), face ('away' | 'road'), look: [x, z], pav, allow, hard } for a w x d footprint */
  const findSpot = (o, w, d) => {
    const allow = (o.pav ? F.PAVED : 0) | F.DOOR | (o.allow || 0);
    for (let r = o.r0 || 0; r <= o.R; r += 1.0) {
      const n = r === 0 ? 1 : Math.max(8, Math.round(r * 1.6)), a0 = hash01(o.at[0], o.at[1], r) * 6.2832;
      for (let k = 0; k < n; k++) {
        const a = a0 + (k / n) * 6.2832, x = o.at[0] + Math.cos(a) * r, z = o.at[1] + Math.sin(a) * r;
        if (!W.inPlay(x, z, 2) || !inVO(x, z)) continue;
        const rd = roadNear(x, z, o.rd); if (!rd && !o.look) continue;
        let rot;
        if (o.look) { if (Math.hypot(o.look[0] - x, o.look[1] - z) < 1.5) continue; rot = faceRot(o.look[0] - x, o.look[1] - z); } else rot = o.face === 'road' ? faceRot(rd.x - x, rd.z - z) : faceRot(x - rd.x, z - rd.z);
        if (!W.fits(x, z, w + 1.0, d + 1.0, rot, { margin: 0.1, allow })) continue;
        if (!offRoad(x, z, w, d, rot) || doorHit(x, z, w, d, rot)) continue;
        if (o.hard !== false && (W.at(x, z) & F.LAWN || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([p, q]) => W.at(x + p * 1.2, z + q * 1.2) & (F.LAWN | F.BED)))) continue;
        const m = Math.max(w, d) / 2;
        if (S.placed.near(x, z, m + 0.7) || S.placed.near(x, z, m + 1.5, 'cross') || S.placed.near(x, z, m + 1.0, 'metro') || S.placed.near(x, z, m + 1.0, 'stop')) continue;
        if (solidAt(x, z, m + 0.25)) continue;
        return { x, z, rot };
      }
    }
    return null;
  };
  const wallOf = (x, z, maxD) => { const w = nearestWall(x, z, maxD); if (!w) return null; const b = L.buildingAt(w.x - w.nx * 0.4, w.z - w.nz * 0.4); return { ...w, b }; };
  const reserve = (b, x, y, z, w, h, nx, nz, kind) => !labels || labels.reserve(b ? b.id : 0, x, y, z, w, h, nx, nz, kind);
  /** the first few positions of each kind (x, z, yaw of the front): for tools/props-vo.mjs --samples, to aim a camera */
  const sample = (k, x, z, rot) => { const a = ((cnt.samples ||= {})[k] ||= []); if (a.length < 10) a.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10, Math.round(rot * 100) / 100]); };
  const part = (name, fn) => { const t0 = performance.now(); try { fn(); } catch (e) { console.error(`[props] vo ${name} failed:`, e); cnt.failed.push(`${name}: ${e && e.message}`); } (cnt.ms ||= {})[name] = Math.round(performance.now() - t0); };

  // ============================================================================================================================================ SEED + CLEAN-UP
  // The generic phases drew the island exactly as before this round (so the shared random stream, and with it every older district, did not move). Now the island sights are registered (what they
  // publish stays free), and what they draw themselves or what must stay clear is taken away together with its collider: the OSM benches a sight redrew (within 0.8 m of a published bench), the
  // benches / bins on claimed paving where a sight draws benches itself, everything on the stair pits of the island bridges and on the paved pocket of the Korchmin monument.
  part('seed', () => {
    S.seedVO();
    const kind = (n) => (/^bench|^benches$/.test(n) ? 'bench' : /^bin|^bins$/.test(n) ? 'bin' : 'other');
    const dup = (x, z) => S.voBench.some((b) => Math.abs(b[0] - x) < 0.8 && Math.abs(b[1] - z) < 0.8);
    const why = { pit: 0, pocket: 0, dup: 0, claimed: 0, track: 0 };
    cnt.removed = S.removeWhere((x, z, name) => {
      if (!inVO(x, z)) return false;
      if (S.inPit(x, z)) { why.pit++; return true; }
      if (S.inPocket(x, z)) { why.pocket++; return true; }
      { const t = track(x, z); if (t !== null && t !== undefined && t < 1.5 && /^(bench|bin|rack|planter|urn|postBox|clockPole|pillar|cabinet)/.test(name)) { why.track++; return true; } }      // vo-requests-streets.md request 5: props on a tram track (the depot yard fan, the Detskaya loop)
      const k = kind(name);
      if (k === 'bench' && dup(x, z)) { why.dup++; return true; }
      if ((k === 'bench' || k === 'bin') && S.claimedVO(x, z)) { why.claimed++; return true; }
      return false;
    });
    cnt.removedWhy = why;
  });

  // ============================================================================================================================================ RESTYLE
  part('restyle', () => {
    const play = PITCHES.filter((p) => p.kind === 'playground' && inVO(p.x, p.z)).map((p) => ({ x: p.x, z: p.z, r: Math.sqrt((p.area || 100) / Math.PI) + 16 }));
    const nearPlay = (x, z) => play.some((p) => Math.hypot(p.x - x, p.z - z) < p.r);
    const andrew = [ANDREW_RINGS[2], ANDREW_RINGS[3]].filter(Array.isArray).map((r) => r.flat());       // the Andreevsky boulevard (pedestrian zone) and the pavilion square keep the sight's own look
    const bolshoy = (x, z) => !!roadName(x, z, BOLSHOY, 43.5) && !andrew.some((r) => ringHas(r, x, z));
    const taken = (names, pick) => {
      const out = [];
      for (const n of names) {
        const list = S.inst.get(n); if (!list) continue;
        const keep = [];
        for (const m of list) { const e = m.elements, x = e[12], z = e[14], st = inVO(x, z) ? pick(x, z, n) : null; if (st) out.push({ n, st, x, y: e[13], z, rot: Math.atan2(e[8], e[10]) }); else keep.push(m); }
        S.inst.set(n, keep);
      }
      return out;
    };
    const benchGeos = {}, bg = (key, mkf) => benchGeos[key] || (benchGeos[key] = geoOf(mkf()));
    for (const b of taken(BENCH_TYPES, (x, z) => (bolshoy(x, z) ? 'block' : x < -8050 ? 'promenade' : x < -5250 && nearPlay(x, z) ? 'play' : null))) {
      const h = Math.floor(hash01(Math.round(b.x), Math.round(b.z), 'bw') * 3);
      const geo = b.st === 'block' ? bg('block' + h, () => K.benchBlock(1.8, WOODS[h])) : b.st === 'promenade' ? bg('prom', () => K.benchPromenade(2.2)) : bg('play' + h, () => FUR.benchPark(1.8, PLAY_COLS[h % PLAY_COLS.length]));
      mk(geo, b.x, b.y, b.z, b.rot, 'pr-bench-' + b.st); cnt.restyled[b.st]++; sample(b.st, b.x, b.z, b.rot);
      if (b.st === 'block') (cnt.benchesBlock ||= []).push(b);
    }
    const vaseGeos = [geoOf(K.planterVase(ctx.rng('vo-vase0'))), geoOf(K.planterVase(ctx.rng('vo-vase1')))];
    // photo 08: a big stone vase stands on the boulevard path beside the benches: one beside every fifth block bench, on its axis (1.7 m), where the ground is free
    let bi = 0;
    for (const b of cnt.benchesBlock || []) {
      if (bi++ % 5) continue;
      for (const [sg, dd] of [[1, 1.8], [-1, 1.8], [1, 2.3], [-1, 2.3]]) {
        const x = b.x + Math.cos(b.rot) * dd * sg, z = b.z - Math.sin(b.rot) * dd * sg;
        const why = !W.fits(x, z, 1.1, 1.1, 0, { margin: 0.05 }) ? 'fits' : !offRoad(x, z, 1.1, 1.1, 0) ? 'road' : S.placed.near(x, z, 0.9) ? 'placed' : S.inDoorBox(x, z, 0.6) ? 'door' : solidAt(x, z, 0.6) ? 'solid' : '';
        if (why) { cnt.skipped['vase_' + why] = (cnt.skipped['vase_' + why] || 0) + 1; continue; }
        mk(vaseGeos[bi % 2], x, S.levelAt(x, z), z, hash01(x, z) * 6.28, 'pr-vase'); sample('vase', x, z, 0); S.solidCyl(x, z, 0.6, 0.9); S.occupy(x, z, 0.9, 'tub'); S.svc.planters.push({ x, z }); cnt.restyled.vase++;
        break;
      }
    }
    delete cnt.benchesBlock;
    for (const p of taken(['planterR0', 'planterR1'], (x, z) => (bolshoy(x, z) ? 'vase' : null))) { mk(vaseGeos[Math.floor(hash01(Math.round(p.x), Math.round(p.z), 'pv') * 2)], p.x, p.y, p.z, hash01(p.x, p.z) * 6.28, 'pr-vase'); cnt.restyled.vase++; }
  });

  // ============================================================================================================================================ NEWSPAPER KIOSKS
  part('news', () => {
    const anchors = (name) => {
      const out = [];
      for (const c of (S.st && S.st.crosswalks) || []) for (const p of c.pts) if (inVO(p[0], p[1]) && roadName(p[0], p[1], name, 16)) out.push(p);
      return out.sort((a, b) => hash01(a[0], a[1], 'nk') - hash01(b[0], b[1], 'nk'));
    };
    const geo = geoOf(K.kioskGlazed(ctx.rng('vo-kiosk'))), W_ = 2.3, D_ = 1.5, done = [];
    const TEXT = [['ПЕЧАТЬ', 'журналы · газеты · билеты'], ['ЖУРНАЛЫ', 'газеты · открытки'], ['ПРЕССА', 'журналы · газеты']];
    for (const [name, cap, gap] of [[SREDNY, 8, 110], [BOLSHOY, 4, 200], [MALY, 3, 200]]) {
      let n = 0;
      for (const at of anchors(name)) {
        if (n >= cap) break;
        if (done.some((q) => Math.hypot(q[0] - at[0], q[1] - at[1]) < gap)) continue;
        const sp = findSpot({ at, R: 18, r0: 4, rd: new RegExp(name.replace(/\./g, '\\.')), face: 'away', pav: false }, W_ + 0.3, D_ + 0.3);
        if (!sp) { cnt.missed.push(`news@${Math.round(at[0])},${Math.round(at[1])}`); continue; }
        const y = S.levelAt(sp.x, sp.z), nn = [Math.sin(sp.rot), Math.cos(sp.rot)], tx = TEXT[n % TEXT.length];
        mk(geo, sp.x, y, sp.z, sp.rot, 'pr-news-kiosk');
        S.box(sp.x, sp.z, W_ - 0.1, D_ - 0.1, sp.rot, 2.5, { r: 1.2, tag: 'kiosk' });
        S.panels.panel(T.fascia(tx[0], '#2d3a46', '#f3eedf', tx[1]), sp.x + nn[0] * (D_ / 2 + 0.036), y + 2.17, sp.z + nn[1] * (D_ / 2 + 0.036), nn[0], nn[1], 2.0, 0.4, { lit: true });
        S.svc.kiosks.push({ x: sp.x, z: sp.z, rotY: sp.rot, kind: 'news' }); done.push(at); n++; cnt.news++; sample('news', sp.x, sp.z, sp.rot);
      }
    }
  });

  // ============================================================================================================================================ 1970s SHOP PAVILIONS AT THE LOOPS
  part('pavilions', () => {
    const SITES = [[-5380, 668, 'Detskaya loop'], [-6172, 58, 'Gavanskaya terminus'], [-6700, -1092, 'Nakhimova terminus'], [-6272, -198, 'Shkipersky protok']];
    const WORDS = [['ПРОДУКТЫ', '#2f6b3a', 'свежий хлеб · молоко'], ['ОВОЩИ · ФРУКТЫ', '#6a8a2a', 'каждый день'], ['ХЛЕБ', '#8a5a2a', 'выпечка'], ['ЦВЕТЫ', '#8b3a8f', 'букеты'], ['ПРОДУКТЫ', '#2b4f7a', '24 часа']];
    SITES.forEach(([x, z, tag], i) => {
      for (const [L_, D_] of [[9.0, 5.2], [7.5, 4.6], [6.0, 4.0]]) {
        const sp = findSpot({ at: [x, z], R: 46, r0: 8, look: [x, z], hard: true }, L_ + 1.0, D_ + 1.6);
        if (!sp) continue;
        const geo = geoOf(K.shopPavilion(L_, D_)), y = S.levelAt(sp.x, sp.z), c = Math.cos(sp.rot), s = Math.sin(sp.rot), wd = WORDS[i % WORDS.length];
        mk(geo, sp.x, y, sp.z, sp.rot, 'pr-pavilion');
        S.box(sp.x, sp.z, L_, D_, sp.rot, 3.7, { r: Math.hypot(L_, D_) / 2, tag: 'kiosk' });
        const lz = D_ / 2 + 0.04, lx = -0.45;
        S.panels.panel(T.fascia(wd[0], wd[1], '#f6eedc', wd[2]), sp.x + lx * c + lz * s, y + 2.78, sp.z - lx * s + lz * c, Math.sin(sp.rot), Math.cos(sp.rot), Math.min(5.2, L_ - 2.6), 0.7, { lit: true });
        S.svc.kiosks.push({ x: sp.x, z: sp.z, rotY: sp.rot, kind: 'pavilion' }); cnt.pavilions++; sample('pavilion', sp.x, sp.z, sp.rot);
        return;
      }
      cnt.missed.push('pavilion ' + tag);
    });
  });

  // ============================================================================================================================================ CITY-LIGHT BOXES
  part('cityLights', () => {
    const sts = (S.stations || []).filter((st) => inVO(st.x, st.z) && MAIN_RE.test(st.rn || ''));
    const attractors = [...((S.st && S.st.busStops) || []).filter((b) => !b.tram).map((b) => [b.x, b.z]), ...((S.st && S.st.crosswalks) || []).map((c) => [c.x, c.z])];
    const att = attractSum(attractors, 20), placed = [];
    const scored = sts.map((st) => ({ st, a: att(st.x, st.z) + rnd() * 0.4 })).sort((x, y) => y.a - x.a);
    for (const { st, a } of scored) {
      if (cnt.cityLights >= 22 || a < 0.45) break;
      if (placed.some((p) => Math.hypot(p.x - st.x, p.z - st.z) < 60)) continue;
      const off = Math.min(st.ek, 8) - 1.05;
      if (off < 0.5 || st.eb < 1.0) continue;
      const px = st.x + st.nx * off, pz = st.z + st.nz * off, rot = faceRot(st.nx, st.nz);
      if (!W.fits(px, pz, 1.5, 0.6, rot, { margin: 0.05, allow: F.LAWN }) || S.placed.near(px, pz, 1.6) || S.inDoorBox(px, pz, 1.0) || !offRoad(px, pz, 1.4, 0.5, rot)) continue;
      if (W.span(px - st.nx * 0.5, pz - st.nz * 0.5, -st.nx, -st.nz, 8, F.BLD | F.TREE) < 2.5) continue;
      S.add('cityLight', px, pz, rot);
      const n = [Math.sin(rot), Math.cos(rot)], y = S.levelAt(px, pz), i = cnt.cityLights;
      S.panels.panel(T.cityLight(i), px + n[0] * 0.08, y + 1.52, pz + n[1] * 0.08, n[0], n[1], 1.2, 1.8, { lit: true });
      S.panels.panel(T.cityLight(i + 3), px - n[0] * 0.08, y + 1.52, pz - n[1] * 0.08, -n[0], -n[1], 1.2, 1.8, { lit: true });
      S.box(px, pz, 1.3, 0.45, rot, 2.5, { r: 0.9, tag: 'citylight' });
      placed.push({ x: st.x, z: st.z }); S.svc.boxes.push({ x: px, z: pz, rotY: rot }); cnt.cityLights++; sample('citylight', px, pz, rot);
    }
  });

  // ============================================================================================================================================ BILLBOARDS and TOTEMS (OSM advertising=billboard / totem)
  part('ads', () => {
    const bgeo = geoOf(K.billboardGeo()), tgeo = geoOf(K.totemGeo());
    /** slide a standing footprint (w x d) away from the carriageway (the direction away from the nearest road) until it is clear: { x, z } or null */
    const clearSpot = (x, z, w, d, rot, allow = F.LAWN) => {
      const rd = roadNear(x, z, null, 40); let ux = 0, uz = 0;
      if (rd) { ux = x - rd.x; uz = z - rd.z; const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l; }
      for (const s of [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]) {
        const px = x + ux * s, pz = z + uz * s;
        if (W.fits(px, pz, w, d, rot, { margin: 0.05, allow }) && offRoad(px, pz, w, d, rot) && !S.placed.near(px, pz, 1.4) && !S.placed.near(px, pz, 2.4, 'metro') && !S.inDoorBox(px, pz, 0.8) && !solidAt(px, pz, Math.max(w, d) / 2 + 0.1)) return { x: px, z: pz, rd };
      }
      return null;
    };
    const sheet = [];                                                            // the billboards placed (>= 14 m apart)
    BILLBOARDS.forEach(([bx, bz, sup], i) => {
      if (!inVO(bx, bz) || sheet.some((q) => Math.hypot(q[0] - bx, q[1] - bz) < 14)) return;
      const sp0 = clearSpot(bx, bz, 0.6, 0.6, 0); if (!sp0) { cnt.skipped.billboardSpot = (cnt.skipped.billboardSpot || 0) + 1; return; }
      const rd = sp0.rd, tx = rd ? rd.tx : 1, tz = rd ? rd.tz : 0, ox = sp0.x - (rd ? rd.x : sp0.x - 1), oz = sp0.z - (rd ? rd.z : sp0.z), ol = Math.hypot(ox, oz) || 1, nx0 = ox / ol, nz0 = oz / ol;
      // the faces look along the road, angled 25 degrees to it (towards the oncoming traffic), else along the road, else parallel to it
      const cands = []; for (const a of [25, -25, 0, 90]) { const r = a * Math.PI / 180, fx = Math.cos(r) * tx + Math.sin(r) * nx0, fz = Math.cos(r) * tz + Math.sin(r) * nz0; cands.push([fx, fz]); }
      for (const [fx, fz] of cands) {
        const l = Math.hypot(fx, fz) || 1, nx = fx / l, nz = fz / l, ex = -nz, ez = nx;            // face normal (nx, nz); the frame runs along (ex, ez)
        let ok = true;
        for (const s of [-3.2, -2.1, -1.0, 0, 1.0, 2.1, 3.2]) { const qx = sp0.x + ex * s, qz = sp0.z + ez * s; if (W.insideBld(qx, qz) || (W.at(qx, qz) & F.WATER) || cover(qx, qz) > -0.5) { ok = false; break; } }      // review 2026-10-10: the frame (lower edge 3.0 m) must not hang over a carriageway (8 of 55 did; a bus is 3.2 m, a trolleybus 3.4 m): the 90 degree candidate runs the frame along the road
        if (!ok) continue;
        const y = S.levelAt(sp0.x, sp0.z), rot = faceRot(nx, nz);
        mk(bgeo, sp0.x, y, sp0.z, rot, 'pr-billboard');
        const tex = T.board(i);
        S.panels.panel(tex, sp0.x + nx * 0.075, y + 4.7, sp0.z + nz * 0.075, nx, nz, 5.8, 2.9, { lit: true });
        S.panels.panel(tex, sp0.x - nx * 0.075, y + 4.7, sp0.z - nz * 0.075, -nx, -nz, 5.8, 2.9, { lit: true });
        S.solidCyl(sp0.x, sp0.z, 0.2, 6.3); S.occupy(sp0.x, sp0.z, 1.0, 'sign');
        S.svc.billboards.push({ x: sp0.x, z: sp0.z, rotY: rot, w: 6, h: 3 }); sheet.push([sp0.x, sp0.z]); cnt.billboards++; sample('billboard', sp0.x, sp0.z, rot);
        return;
      }
      cnt.skipped.billboardFrame = (cnt.skipped.billboardFrame || 0) + 1;
    });
    const WORDS = [['ПРОДУКТЫ', '#2f7a45', '24 часа'], ['АПТЕКА', '#2c8a5f', 'рядом с вами'], ['АВТОМОЙКА', '#2a5fa8', 'самообслуживание'], ['ШИНОМОНТАЖ', '#a8282f', 'быстро · недорого'], ['СТОМАТОЛОГИЯ', '#2b7fb0', 'приём без выходных'], ['КОФЕ', '#6a3a28', 'с собой'], ['ЦВЕТЫ', '#8b3a8f', 'букеты'], ['РЕМОНТ', '#444b53', 'техники и обуви'], ['ТОПЛИВО', '#c8921e', 'круглосуточно']];
    TOTEMS.forEach(([tx0, tz0], i) => {
      if (!inVO(tx0, tz0)) return;
      const sp = clearSpot(tx0, tz0, 0.5, 0.5, 0); if (!sp) { cnt.skipped.totem = (cnt.skipped.totem || 0) + 1; return; }
      const rd = sp.rd, tx = rd ? rd.tx : 1, tz = rd ? rd.tz : 0, nx = tx, nz = tz, rot = faceRot(nx, nz);
      if (W.insideBld(sp.x + tz * 0.6, sp.z - tx * 0.6) || W.insideBld(sp.x - tz * 0.6, sp.z + tx * 0.6)) { cnt.skipped.totem = (cnt.skipped.totem || 0) + 1; return; }
      const y = S.levelAt(sp.x, sp.z), wd = WORDS[(i * 5 + Math.floor(hash01(Math.round(tx0), Math.round(tz0)) * 9)) % WORDS.length];
      mk(tgeo, sp.x, y, sp.z, rot, 'pr-totem');
      const tex = T.totem(wd[0], wd[1], '#ffffff', wd[2]);
      S.panels.panel(tex, sp.x + nx * 0.135, y + 3.25, sp.z + nz * 0.135, nx, nz, 1.0, 2.3, { lit: true });
      S.panels.panel(tex, sp.x - nx * 0.135, y + 3.25, sp.z - nz * 0.135, -nx, -nz, 1.0, 2.3, { lit: true });
      S.solidCyl(sp.x, sp.z, 0.22, 4.5); S.occupy(sp.x, sp.z, 0.9, 'sign');
      S.svc.totems.push({ x: sp.x, z: sp.z, rotY: rot }); cnt.totems++; sample('totem', sp.x, sp.z, rot);
    });
  });

  // ============================================================================================================================================ WALL CAMERAS
  part('cameras', () => {
    const geo = geoOf(K.cctvGeo());
    for (const [x, z, , mount] of CCTV) {
      if (!inVO(x, z) || mount === 2) continue;
      const w = wallOf(x, z, 3.4); if (!w || w.d > 3.4 || !w.b || L.claimedBy(w.b.id)) continue;
      const y = S.levelAt(w.x, w.z) + 3.0 + hash01(Math.round(x), Math.round(z), 'cy') * 1.3, px = w.x + w.nx * 0.03, pz = w.z + w.nz * 0.03;
      if (S.inDoorBox(px, pz, 0.2) || !reserve(w.b, px + w.nx * 0.15, y, pz + w.nz * 0.15, 0.3, 0.25, w.nx, w.nz, 'camera')) continue;
      mk(geo, px, y, pz, faceRot(w.nx, w.nz), 'pr-camera'); S.svc.cameras.push({ x: px, z: pz, y }); cnt.cameras++; sample('camera', px, pz, faceRot(w.nx, w.nz));
    }
  });

  // ============================================================================================================================================ MEMORIAL PLAQUES (the real inscriptions of the OSM nodes)
  part('plaques', () => {
    const own = [];                                                              // what the sights draw themselves (NavalCorps, Mining ...): not drawn twice
    for (const name of Object.keys(SV)) if (/^landmarks[A-Z]/.test(name) && SV[name] && Array.isArray(SV[name].plaques)) for (const q of SV[name].plaques) if (q && typeof q.x === 'number') own.push([q.x, q.z]);
    const list = MONUMENTS.filter((m) => m.kind === 'memorial' && m.sub === 'plaque' && (m.inscription || m.name) && inVO(m.x, m.z)).sort((a, b) => (a.id < b.id ? -1 : 1));
    for (const m of list) {
      if (own.some((q) => Math.hypot(q[0] - m.x, q[1] - m.z) < 5)) { cnt.skipped.plaqueOwn = (cnt.skipped.plaqueOwn || 0) + 1; continue; }
      const w = wallOf(m.x, m.z, 4.5); if (!w || !w.b) { cnt.skipped.plaqueWall = (cnt.skipped.plaqueWall || 0) + 1; continue; }
      if (L.claimedBy(w.b.id)) { cnt.skipped.plaqueSight = (cnt.skipped.plaqueSight || 0) + 1; continue; }
      const text = String(m.inscription || m.name).replace(/\s+/g, ' ').trim(), n = text.length;
      const tier = n < 70 ? [0.42, 0.32, 144, 108] : n < 170 ? [0.56, 0.42, 192, 144] : [0.76, 0.56, 256, 189];
      const y = S.levelAt(w.x, w.z) + 1.75 + (hash01(m.id, 'py') - 0.5) * 0.5;
      const px = w.x + w.nx * 0.025, pz = w.z + w.nz * 0.025;
      if (S.inDoorBox(px, pz, 0.15)) { cnt.skipped.plaquePlace = (cnt.skipped.plaquePlace || 0) + 1; continue; }
      if (!reserve(w.b, px + w.nx * 0.01, y, pz + w.nz * 0.01, tier[0] + 0.04, tier[1] + 0.04, w.nx, w.nz, 'plaque')) { cnt.skipped.plaqueLabel = (cnt.skipped.plaqueLabel || 0) + 1; continue; }
      const tex = T.plaque(text, m.material, tier[2], tier[3], m.id);
      S.panels.panel(tex, px, y, pz, w.nx, w.nz, tier[0], tier[1], {});
      S.svc.plaques.push({ x: px, z: pz, y, text: text.slice(0, 80) }); cnt.plaques++; S.tris += 2; sample('plaque', px, pz, faceRot(w.nx, w.nz));
    }
  });

  // ============================================================================================================================================ ATMs (the whole-map cap of osm.js was spent before the island)
  part('atms', () => {
    // the ATM hangs on the wall pier BESIDE the nearest door of the node (2.4 m to either side of the door centre, on the same wall), never over a shop window (the ground floor of the city module is glazed)
    const done = [], eg = new Map();                                               // the entrances of the city in a 16 m hash grid (the list has tens of thousands of entries)
    for (const q of (S.city && S.city.entrances) || []) { const k = Math.floor(q.x / 16) + ',' + Math.floor(q.z / 16); let a = eg.get(k); if (!a) eg.set(k, (a = [])); a.push(q); }
    const nearDoor = (x, z, r) => { let e = null, ed = r; for (let i = Math.floor((x - r) / 16); i <= Math.floor((x + r) / 16); i++) for (let j = Math.floor((z - r) / 16); j <= Math.floor((z + r) / 16); j++) for (const q of eg.get(i + ',' + j) || []) { const d = Math.hypot(q.x - x, q.z - z); if (d < ed) { ed = d; e = q; } } return e; };
    for (const f of FURNITURE) {
      if (f.kind !== 'atm' || !inVO(f.x, f.z)) continue;
      if (cnt.atms >= 12 || done.some((q) => Math.hypot(q[0] - f.x, q[1] - f.z) < 70)) continue;
      const e = nearDoor(f.x, f.z, 12);
      if (!e) continue;
      const nx0 = Math.sin(e.rotY), nz0 = Math.cos(e.rotY), tx0 = nz0, tz0 = -nx0;
      let hitW = null;
      for (const sg of [1, -1]) {
        const qx = e.x + tx0 * 2.4 * sg, qz = e.z + tz0 * 2.4 * sg, w = wallOf(qx, qz, 0.8);
        if (!w || w.d > 0.6 || !w.b || L.claimedBy(w.b.id) || w.nx * nx0 + w.nz * nz0 < 0.95) continue;
        if (S.inDoorBox(w.x, w.z, 0.5) || !nearestWalk(S, w.x, w.z, 5) || W.span(w.x + w.nx * 0.3, w.z + w.nz * 0.3, w.nx, w.nz, 6, F.ROAD) < 2.2) continue;
        hitW = w; break;
      }
      if (!hitW) continue;
      const w = hitW, x = w.x, z = w.z, rot = faceRot(w.nx, w.nz);
      const y = S.levelAt(x, z) + 1.35;
      if (!reserve(w.b, x + w.nx * 0.1, y, z + w.nz * 0.1, 0.72, 1.0, w.nx, w.nz, 'atm')) continue;
      S.panels.panel(T.atm(), x + w.nx * 0.1, y, z + w.nz * 0.1, w.nx, w.nz, 0.58, 0.87, { lit: true });
      const g = new Geo().box(0.7, 1.0, 0.07, [0, 0, 0], '#2b4a7a');
      S.addStaticGeo(new Geo().put(g, x + w.nx * 0.05, y, z + w.nz * 0.05, rot), 'pr-atm-frame');
      done.push([f.x, f.z]); cnt.atms++; sample('atm', x, z, rot);
    }
  });

  // ============================================================================================================================================ STREET BANNERS across Maly pr.
  part('banners', () => {
    const TEXTS = [['БЕЛЫЕ НОЧИ НА ВАСИЛЬЕВСКОМ', '#1d3a6e', 'праздник · концерты · ярмарки'], ['ЛЕТНЯЯ ЯРМАРКА', '#2f6b45', 'Малый проспект · по выходным'], ['ДЕНЬ ГОРОДА', '#7a2a3a', 'программа праздника на сайте района'], ['ФЕСТИВАЛЬ УЛИЧНОЙ МУЗЫКИ', '#5a2f7a', 'вход свободный'], ['ВАСИЛЕОСТРОВСКАЯ КНИЖНАЯ ЯРМАРКА', '#2b5a7a', 'издатели · авторы · встречи'], ['ДНИ ОТКРЫТЫХ ДВЕРЕЙ', '#3d5a3a', 'музеи и университеты острова']];
    const cable = [];
    const geo = new Geo(), rods = [];
    let n = 0, lastX = null;
    const no = (k) => { cnt.skipped['banner_' + k] = (cnt.skipped['banner_' + k] || 0) + 1; };
    const maly = ROADS.filter((r) => r.name === MALY && (r.hw === 'secondary' || r.hw === 'tertiary') && !r.tunnel && !r.bridge && r.pts.length >= 4).sort((a, b) => a.pts[0] - b.pts[0]);
    for (const r of maly) {
      const p = r.pts; let acc = 40 + hash01(r.id, 'bn') * 120;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const ax = p[i], az = p[i + 1], dx = p[i + 2] - ax, dz = p[i + 3] - az, l = Math.hypot(dx, dz); if (l < 1) continue;
        const tx = dx / l, tz = dz / l;
        let s = acc;
        while (s < l) {
          const x = ax + tx * s, z = az + tz * s; s += 130;
          if (n >= 12 || !inVO(x, z) || (lastX && lastX.some((q) => Math.hypot(q[0] - x, q[1] - z) < 170))) continue;
          if (S.placed.near(x, z, 14, 'cross') || S.placed.near(x, z, 12, 'stop')) { no('junction'); continue; }
          const nx = -tz, nz = tx;                                                // left of the travel direction
          const reach = (sg) => { for (let t = 3; t <= 46; t += 0.5) { const qx = x + nx * sg * t, qz = z + nz * sg * t; if (W.insideBld(qx, qz)) return t; if (L.inRiver(qx, qz)) return -1; } return -1; };
          const a = reach(1), b = reach(-1); if (a < 7 || b < 7 || a > 45 || b > 45 || a + b > 52) { no('frontage'); continue; }
          const A = wallOf(x + nx * a, z + nz * a, 2.2), B = wallOf(x - nx * b, z - nz * b, 2.2);
          if (!A || !B || !A.b || !B.b || A.d > 2.0 || B.d > 2.0 || L.claimedBy(A.b.id) || L.claimedBy(B.b.id)) { no('wall'); continue; }
          if ((L.heightOf(A.b) || 0) < 11 || (L.heightOf(B.b) || 0) < 11 || Math.abs(A.nx * nx + A.nz * nz) < 0.8 || Math.abs(B.nx * nx + B.nz * nz) < 0.8) { no('storeys'); continue; }
          const hy = S.levelAt(x, z) + 8.6;
          if (!reserve(A.b, A.x + A.nx * 0.2, hy - 0.4, A.z + A.nz * 0.2, 0.5, 1.7, A.nx, A.nz, 'banner') || !reserve(B.b, B.x + B.nx * 0.2, hy - 0.4, B.z + B.nz * 0.2, 0.5, 1.7, B.nx, B.nz, 'banner')) { no('label'); continue; }
          // the banner hangs over the middle of the street, its faces along the road
          const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2, span = Math.hypot(A.x - B.x, A.z - B.z), bw = Math.min(8.4, span - 3.2), yc = S.levelAt(x, z) + 7.35;
          const ex = (B.x - A.x) / span, ez = (B.z - A.z) / span, fx = -ez, fz = ex, fs = (fx * tx + fz * tz) < 0 ? -1 : 1, gx = fx * fs, gz = fz * fs;      // (gx, gz): the face normal that looks along the road
          const t = TEXTS[n % TEXTS.length], tex = T.banner(t[0], t[1], '#ffffff', t[2]);
          S.panels.panel(tex, mx + gx * 0.02, yc, mz + gz * 0.02, gx, gz, bw, bw / 7.1111, {});                         // (each face reads from its own side: a second panel looks the other way)
          S.panels.panel(tex, mx - gx * 0.02, yc, mz - gz * 0.02, -gx, -gz, bw, bw / 7.1111, {});
          const aTop = [A.x + A.nx * 0.42, hy, A.z + A.nz * 0.42], bTop = [B.x + B.nx * 0.42, hy, B.z + B.nz * 0.42];
          rods.push([[A.x + A.nx * 0.02, hy, A.z + A.nz * 0.02], aTop], [[B.x + B.nx * 0.02, hy, B.z + B.nz * 0.02], bTop]);
          const hw = bw / 2, cy = bw / 7.1111 / 2;
          const cAt = (sg, yy) => [mx + ex * sg * hw, yc + yy, mz + ez * sg * hw];
          cable.push([aTop, cAt(-1, cy)], [aTop, cAt(-1, -cy)], [bTop, cAt(1, cy)], [bTop, cAt(1, -cy)]);
          { const g = new Geo(); for (const [a, b] of rods) g.tube(a, b, 0.03, '#2c2f33', 4); for (const [a, b] of cable) g.tube(a, b, 0.012, '#3a3d42', 3); S.addStaticGeo(g, 'pr-banner-cables'); rods.length = 0; cable.length = 0; }      // one small mesh per banner: the batcher merges it into the cells it touches
          S.svc.banners.push({ x: mx, z: mz, y: yc, w: bw, text: t[0] }); (lastX ||= []).push([x, z]); n++; cnt.banners++; sample('banner', mx, mz, faceRot(gx, gz));
        }
        acc = s - l;
      }
    }
    for (const [a, b] of rods) geo.tube(a, b, 0.03, '#2c2f33', 4);
    for (const [a, b] of cable) geo.tube(a, b, 0.012, '#3a3d42', 3);
    if (!geo.empty) S.addStaticGeo(geo, 'pr-banner-cables');
  });
}
