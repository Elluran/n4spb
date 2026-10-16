// bridges - the bridges of the west of the Petersburg scene (docs/research/west-canals-bridges.md, palace-square-hermitage.md section 10, kazan-cathedral.md section 7, admiralty-stisaac.md):
//   Kazansky (Nevsky over the Griboyedov Canal: low granite arch, solid parapets), Green (Nevsky over the Moika: green cast-iron arch, four pylons with gilded lamp standards),
//   Pevchesky (palmette railing, dark green, 72 m wide), Red (red arch, four obelisks), Blue (97 m wide, ultramarine), Novo-Konyushenny, Hermitage + 1st / 2nd Winter bridges (granite),
//   the footbridges Bankovsky (four winged lions), Mucny, Italyansky, and the Palace Bridge (steel trusses on granite piers, scenery beyond the first spans).
//   The Mars Field / Summer Garden reach (docs/research/mars-bridges-canals.md, docs/MARS-BRIEF.md): Upper + Lower Swan (swan-upper / swan-lower), Laundry (arch3: three spans), Panteleymonovsky (gilded, eagle standards),
//   1st Engineer, 1st + 2nd Sadovy, Bolshoy Konyushenny, the Triple Bridge (Teatralny + Malo-Konyushenny: pedestrian sett decks) = bridges/styles2.js + rails2.js (railing patterns) + sculpt2.js (standards, eagle,
//   candelabra) and the Troitsky Bridge (troitsky.js: first six spans to the scenery bank, tram tracks, bascule leaf, obelisks).  Requests for environment/*: docs/research/mars-bridges-requests.md.
//   The Petrograd side / the Spit (docs/research/petro-bridges.md, docs/PETRO-BRIEF.md): the big Neva bridges work bank to bank: the Troitsky Bridge COMPLETE (troitsky.js: 554 m, ten spans, the
//   granite viaduct of the right bank, 16 candelabra, tram tracks), the Palace Bridge to the Spit (palace.js: tower piers, booths), and bridges/long.js (data LONG + one generic builder): Birzhevoy
//   (five flat green arches, trident railing), Tuchkov (three spans, grey haunched girders, tower piers with pavilions), Sampsonievsky (seven openings, ring lamps), and over the Zhdanovka the
//   Zhdanovsky (pedestrian) and Krasnogo Kursanta bridges; sculpt4.js = their lamp standards.  A long bridge is no SITE (streets/decks.js does not know it): its OSM ways are claimed in groups.js, so
//   streets leaves the surface to this module while the lanes stay in the lane graph.  The Ioannovsky / Kronverksky bridges belong to landmarksFortress.
//   Vasilievsky Island (docs/research/vo-bridges-wave1.md, docs/VO-BRIEF.md): the BLAGOVESHCHENSKY BRIDGE complete, bank to bank (bridges/blag.js, spec + pure-data `blagDeckY` in sites-vo.js, 334.7 m scheme laid on the
//   real banks, sage haunched girders with an X lattice on pink granite piers, hippocamp railing, 22 historic standards, two bascule piers with balconies and pavilions, bascule shown closed; its quay opening comes from the
//   `BLAG_ZONE` record of SITES) and the Smolenka bridges URALSKY and SMOLENSKY (generic arch.js sites + styles4.js: obelisks with gilded ships / art-cast torcheres).  Requests: docs/research/vo-requests-bridges.md.
//   Second pass (docs/research/vo-bridges-wave2.md): NALICHNY + KORABLESTROITELEY (arch.js + styles5.js: granite faces, hexagon-lattice railing, obelisks / pedestal lamps, tram slab + contact wires over the deck), the four
//   mouth bridges (pale sheet fascia, granite parapets), the NOVO-ANDREEVSKY footbridge (foot3.js), the WHSD far scenery (whsd.js viaduct + Korabelny pylons + portals, whsd-ground.js the at-grade stretch), gaps.js (hedge gaps on
//   the approaches, lamp colliders of streets in the WHSD footprint), the Tuchkov tram wires (long.js), and deckY answering 0 over the opening of every unclaimed polygon deck (the red car crosses the environment's fallback decks).
//   Third pass (docs/research/vo-bridges-wave3.md): the wide corner STAIRS of Nalichny, Korablestroiteley and the 3rd / 4th Smolensky bridges (bridges/pits.js pure data -> groups.js WATER_RINGS / KEEP_OUT /
//   PAVED_RINGS for environment/owners.js; stairs.js + sculpt6.js stairPit draw the flights and add the colliders; services.bridges.pits), the grass embankments of the open cutting of the at-grade WHSD
//   (cutting.js pure data + whsd-ground.js), and deckY / list entries for the Shkipersky deck of landmarksGavan (EXT below).
//   Files: bridges/sites.js (pure data: frames, widths, deck zones: other modules may import it) · groups.js (claims) · kit.js (geometry collector) · mats.js · rails.js (railing patterns,
//   instanced panels) · arch.js (the generic arch road bridge) · styles.js (per-bridge extras: pylons, lamps, obelisks, boards) · foot.js (footbridges) · sculpt.js (griffins, lamps) · palace.js.
//   Owns every sub-group of layout.GROUPS.bridges.  Publishes ctx.services.bridges = { list (+ extra entries along a long deck: traffic prefilters by 190 m), deckY(x, z), masts, spans } and wraps ctx.services.landmarksC.bridge.deckY so that traffic / people / drive
//   (which read the Anichkov deck height) also ride the decks of these bridges.  NO flags / flagpoles, no alarm sounds (user rules).
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { Parts } from './bridges/kit.js';
import { makeMats } from './bridges/mats.js';
import { addVoMats } from './bridges/mats-vo.js';
import { makeRailBatch } from './bridges/rails.js';
import { SITES, WATER_Y } from './bridges/sites.js';
import { FOOT, VO2_SITES } from './bridges/sites-vo2.js';
import { openHedgeGaps, openWhsdLamps } from './bridges/gaps.js';
import { ownedGroups, isOwned } from './lib/claims.js';
import { inIsland } from './lib/vo-island.js';

const PARTS = [];

export async function build(ctx) {
  const M = makeMats(ctx), rails = makeRailBatch(ctx);
  addVoMats(ctx, M);
  const root = new THREE.Group(); root.name = 'bridges';
  const decals = M.decalMats, failed = [], list = [], stats = { tris: 0, rails: 0, colliders: 0 };
  const env = ctx.services && ctx.services.environment;
  const waterY = (ww) => { const e = env && env.waterways && env.waterways[ww]; return e && Number.isFinite(e.y) ? e.y : WATER_Y[ww]; };
  const mods = {};
  let ZONES = [];
  try { ZONES = (await import('./environment/waterways.js')).BRIDGE_ZONES || []; } catch (e) { /* the environment publishes no zones: nothing to close */ }
  let QZONES = [];                                                       // the quay openings as the environment computes them (river.js bridgeZones: test(x, z, grow)): a long bridge closes the quay beside its deck as far as the opening reaches
  try { QZONES = (await import('./environment/river.js')).bridgeZones() || []; } catch (e) { console.warn('[bridges] quay zones unavailable:', e && e.message); }
  const ZID = { novo: 'novo-konyushenny', zimny1: 'zimny-1', zimny2: 'zimny-2', 'bolsh-konyushenny': 'bolshoy-konyushenny' };
  const load = async (n, p) => { try { mods[n] = await p(); } catch (e) { console.error(`[bridges] module ${n} failed to load:`, e); failed.push(`${n}: ${e && e.stack || e}`); } };
  await load('belinsky', () => import('./bridges/belinsky.js'));
  await load('arch', () => import('./bridges/arch.js'));
  await load('styles', () => import('./bridges/styles.js'));
  await load('foot', () => import('./bridges/foot.js'));
  await load('styles2', () => import('./bridges/styles2.js'));
  await load('styles3', () => import('./bridges/styles3.js'));
  await load('palace', () => import('./bridges/palace.js'));
  await load('troitsky', () => import('./bridges/troitsky.js'));
  await load('long', () => import('./bridges/long.js'));
  await load('blag', () => import('./bridges/blag.js'));
  await load('styles4', () => import('./bridges/styles4.js'));
  await load('styles5', () => import('./bridges/styles5.js'));
  await load('foot3', () => import('./bridges/foot3.js'));
  await load('yelagin', () => import('./bridges/yelagin.js'));
  await load('yelaginMain', () => import('./bridges/yelaginMain.js'));
  await load('yelaginPonds', () => import('./bridges/yelaginPonds.js'));
  await load('krestAptek', () => import('./bridges/krestAptek.js'));
  await load('krestAptek2', () => import('./bridges/krestAptek2.js'));
  await load('whsd', () => import('./bridges/whsd.js'));
  await load('petrovsky', () => import('./bridges/petrovsky.js'));
  await load('kamenny', () => import('./bridges/kamenny.js'));

  const flush = (P, name) => {
    stats.tris += P.tris; (stats.per ||= {})[name] = P.tris;                  // triangles per bridge (services.bridges.stats.per)
    for (const k of P.b.values()) { const bad = k.pos.findIndex((v) => !Number.isFinite(v)); if (bad >= 0) console.warn(`[bridges] ${name}: NaN vertex in ${k.mat.name} at ${bad / 3 | 0}`); }
    const meshes = P.build(root, { name: 'brg-' + name });
    // Bridge services retain their drawing closures for inspection. The
    // uploaded meshes own copies; construction arrays must not live with them.
    P.b.clear();
    for (const m of meshes) if (decals.has(m.material)) ctx.noOutline(m);
    return meshes;
  };

  for (const site of SITES) {
    if (site.kind === 'zone') continue;                                  // a quay-zone record (sites-vo.js BLAG_ZONE): the bridge itself is drawn below by bridges/blag.js
    try {
      const P = new Parts();
      const e = { ctx, P, M, rails, waterY: waterY(site.ww), site, zones: QZONES };
      let B = null;
      if (site.kind === 'road') {
        B = site.id === 'belinsky' ? mods.belinsky.makeBelinsky(e, site) : mods.arch.makeArch(e, site); B.draw();
        const S = (mods.styles && mods.styles.STYLES[site.id]) || (mods.styles2 && mods.styles2.STYLES2[site.style]) || (mods.styles3 && mods.styles3.STYLES3[site.style]) || (mods.styles4 && mods.styles4.STYLES4[site.style]) || (mods.styles5 && mods.styles5.STYLES5[site.style]); if (S) S(e, B);
        B.closeQuay(ZONES.find((z) => z.id === (ZID[site.id] || site.id)));
      } else {
        B = mods.foot.makeFoot(e, site); B.draw();
      }
      if (B.colliders) B.colliders();
      flush(P, site.id);
      stats.rails += B.info.rails; stats.colliders += B.info.colliders;
      list.push({ id: site.id, name: site.name, nameEn: site.nameEn, x: site.cx, z: site.cz, at: site.at, site, B });
    } catch (err) { console.error(`[bridges] ${site.id} failed:`, err); failed.push(`${site.id}: ${err && err.stack || err}`); }
  }
  try {
    if (mods.palace) { const P = new Parts(); const info = mods.palace.buildPalace({ ctx, P, M, rails, waterY: waterY('neva') }); info.colliders(); flush(P, 'palace'); stats.colliders += info.info.colliders; list.push({ id: 'palace', name: 'Дворцовый мост', nameEn: 'Palace Bridge', x: info.x, z: info.z, at: info.at ? [info.at.x, info.at.z] : [info.x, info.z], B: info }); }
  } catch (err) { console.error('[bridges] palace failed:', err); failed.push('palace: ' + (err && err.stack || err)); }
  try {
    if (mods.troitsky) { const P = new Parts(); const info = mods.troitsky.buildTroitsky({ ctx, P, M, rails, waterY: waterY('neva') }); info.colliders(); flush(P, 'troitsky'); stats.colliders += info.info.colliders; list.push({ id: 'troitsky', name: 'Троицкий мост', nameEn: 'Trinity Bridge', x: info.x, z: info.z, at: info.at ? [info.at.x, info.at.z] : [info.x, info.z], B: info }); }
  } catch (err) { console.error('[bridges] troitsky failed:', err); failed.push('troitsky: ' + (err && err.stack || err)); }
  // the long bridges of the Petrograd side / the Spit (bridges/long.js: Birzhevoy, Tuchkov, Sampsonievsky): one generic builder, a spec each
  for (const sp of (mods.long && mods.long.LONG) || []) {
    try { const P = new Parts(); const info = mods.long.buildLong({ ctx, P, M, rails, waterY: waterY(sp.ww || 'neva') }, sp); info.colliders(); flush(P, sp.id); stats.colliders += info.info.colliders; list.push({ id: sp.id, name: sp.name, nameEn: sp.nameEn, x: info.x, z: info.z, at: info.at ? [info.at.x, info.at.z] : [info.x, info.z], B: info }); }
    catch (err) { console.error(`[bridges] ${sp.id} failed:`, err); failed.push(`${sp.id}: ${err && err.stack || err}`); }
  }
  // the Blagoveshchensky Bridge, bank to bank (bridges/blag.js, data sites-vo.js BLAG)
  try {
    if (mods.blag) { const P = new Parts(), info = mods.blag.buildBlag({ ctx, P, M, rails, waterY: waterY('neva'), zones: QZONES }); info.colliders(); flush(P, 'blagoveshchensky'); stats.colliders += info.info.colliders; list.push({ id: 'blagoveshchensky', name: 'Благовещенский мост', nameEn: 'Blagoveshchensky Bridge', x: info.x, z: info.z, at: [info.at.x, info.at.z], B: info }); }
  } catch (err) { console.error('[bridges] blagoveshchensky failed:', err); failed.push('blagoveshchensky: ' + (err && err.stack || err)); }
  // the Novo-Andreevsky footbridge (bridges/foot3.js, data sites-vo2.js FOOT): steel girders with a curved lower chord, a chain-of-loops railing, four torcheres
  try {
    if (mods.foot3) { const P = new Parts(), info = mods.foot3.buildFoot3({ ctx, P, M, rails, waterY: waterY('smolenka'), zones: QZONES }); info.colliders(); flush(P, FOOT.id); stats.colliders += info.info.colliders; list.push({ id: FOOT.id, name: FOOT.name, nameEn: FOOT.nameEn, x: info.x, z: info.z, at: info.at, B: info }); }
  } catch (err) { console.error('[bridges] novo-andreevsky failed:', err); failed.push('novo-andreevsky: ' + (err && err.stack || err)); }
  // the 2nd Yelagin Bridge (bridges/yelagin.js, docs/research/yelagin-bridge-2026.md): pedestrian lift bridge Krestovsky <-> Yelagin, 11 spans on timber tower piers, plank deck, bollards at both mouths
  try {
    if (mods.yelagin) { const P = new Parts(), info = mods.yelagin.buildYelagin({ ctx, P, M, rails, waterY: waterY('neva'), zones: QZONES }); info.colliders(); flush(P, 'yelagin2'); stats.colliders += info.info.colliders; list.push({ id: 'yelagin2', name: '2-й Елагин мост', nameEn: '2nd Yelagin Bridge', x: info.x, z: info.z, at: info.at, B: info }); }
  } catch (err) { console.error('[bridges] yelagin2 failed:', err); failed.push('yelagin2: ' + (err && err.stack || err)); }
  // the 1st (steel, lift span) and 3rd (mint-green, granite piers) Yelagin bridges (bridges/yelaginMain.js, docs/research/bridges-yelagin-main.md): road bridges, the red car crosses
  try {
    for (const sp of (mods.yelaginMain && mods.yelaginMain.SPECS) || []) { const P = new Parts(), info = mods.yelaginMain.buildYelaginMain({ ctx, P, M, rails, waterY: waterY(sp.ww || 'neva'), zones: QZONES }, sp); info.colliders(); flush(P, sp.id); stats.colliders += info.info.colliders; list.push({ id: sp.id, name: sp.name, nameEn: sp.nameEn, x: info.x, z: info.z, at: info.at, B: info }); }
  } catch (err) { console.error('[bridges] yelaginMain failed:', err); failed.push('yelaginMain: ' + (err && err.stack || err)); }
  // the 11 pond footbridges + 5 sluices of the Yelagin park (bridges/yelaginPonds.js, docs/research/yelagin-ponds-bridges.md): one mesh set per spatial cell, walk decks, bollards at the narrow ones
  try {
    if (mods.yelaginPonds) { const out = mods.yelaginPonds.buildYelaginPonds({ ctx, M, flush }); stats.colliders += out.colliders; for (const it of out.list) list.push(it); }
  } catch (err) { console.error('[bridges] yelaginPonds failed:', err); failed.push('yelaginPonds: ' + (err && err.stack || err)); }
  // Krestovsky / Kamenny / Aptekarsky (bridges/krestAptek.js, docs/research/bridges-krestovsky-aptekarsky.md): Maly Krestovsky, Bychy, Grebnoy, Kantemirovsky + the second group (decks, boardwalk, Yachtny): road bridges, the red car crosses
  for (const def of [...((mods.krestAptek && mods.krestAptek.KA_BRIDGES) || []), ...((mods.krestAptek2 && mods.krestAptek2.KA2_BRIDGES) || [])]) {
    try { const P = new Parts(), info = def.build({ ctx, P, M, rails, waterY: def.waterY !== undefined ? def.waterY : waterY(def.ww || 'neva'), zones: QZONES, Parts, flush }); info.colliders(); flush(P, def.id); if (def.multi) stats.per[def.id] = info.info.tris; stats.colliders += info.info.colliders; list.push({ id: def.id, name: def.name, nameEn: def.nameEn, x: info.x, z: info.z, at: info.at && info.at.x !== undefined ? [info.at.x, info.at.z] : (info.at || [info.x, info.z]), B: info }); }
    catch (err) { console.error(`[bridges] ${def.id} failed:`, err); failed.push(`${def.id}: ${err && err.stack || err}`); }
  }
  // the Petrovsky Island group (bridges/petrovsky.js, docs/research/petrovsky-bridges-2026.md): the Betancourt Bridge complete (replaces the viaduct head of long.js below), the Serny Bridge, the Bolshoy Petrovsky Bridge, the WHSD fairway pylons
  try {
    for (const it of (mods.petrovsky && mods.petrovsky.LIST) || []) {
      try { const P = new Parts(), info = it.build({ ctx, P, M, rails, waterY: waterY('neva'), zones: QZONES }); info.colliders(); flush(P, it.id); stats.colliders += info.info.colliders; list.push({ id: it.id, name: it.name, nameEn: it.nameEn, x: info.x, z: info.z, at: info.at, B: info }); }
      catch (err) { console.error(`[bridges] ${it.id} failed:`, err); failed.push(`${it.id}: ${err && err.stack || err}`); }
    }
  } catch (err) { console.error('[bridges] petrovsky failed:', err); failed.push('petrovsky: ' + (err && err.stack || err)); }
  // the Kamenny Island bridges (bridges/kamenny.js, docs/research/kamenny-bridges.md): the Kamennoostrovsky + Ushakovsky road bridges (bank to bank, the deck runs over the land stubs of the claimed ways) and the 13 small canal / pond bridges; the red car crosses the road ones
  try {
    for (const it of (mods.kamenny ? mods.kamenny.buildKamenny({ ctx, M, rails, Parts, waterY, zones: QZONES }) : [])) {
      try { const B = it.B; B.colliders(); flush(it.P, it.id); stats.colliders += B.info.colliders; list.push({ id: it.id, name: it.name, nameEn: it.nameEn, x: B.x, z: B.z, at: [B.at.x, B.at.z], B }); }
      catch (err) { console.error(`[bridges] ${it.id} failed:`, err); failed.push(`${it.id}: ${err && err.stack || err}`); }
    }
  } catch (err) { console.error('[bridges] kamenny failed:', err); failed.push('kamenny: ' + (err && err.stack || err)); }
  // the WHSD far scenery (bridges/whsd.js, data sites-vo2.js WHSD): the twin viaduct decks (drivable, not walkable), the Korabelny cable-stayed bridge pylons, the tunnel portals
  try {
    if (mods.whsd) { const P = new Parts(), info = mods.whsd.buildWhsd({ ctx, P, M, rails }); info.colliders(); flush(P, 'whsd'); stats.colliders += info.info.colliders; list.push({ id: 'whsd', name: 'Западный скоростной диаметр', nameEn: 'Western High-Speed Diameter (viaduct, cable-stayed bridge, portals)', x: info.x, z: info.z, at: info.at, B: info }); }
  } catch (err) { console.error('[bridges] whsd failed:', err); failed.push('whsd: ' + (err && err.stack || err)); }
  // the Betancourt Bridge head: a curved rising viaduct on Petrovsky Island (bridges/long.js buildViaduct)
  try {
    if (mods.long && mods.long.BETANCOURT && !mods.petrovsky) { const sp = mods.long.BETANCOURT, P = new Parts(), info = mods.long.buildViaduct({ ctx, P, M, rails, waterY: waterY('neva') }, sp); info.colliders(); flush(P, sp.id); stats.colliders += info.info.colliders; list.push({ id: sp.id, name: sp.name, nameEn: sp.nameEn, x: info.x, z: info.z, at: [info.at.x, info.at.z], B: info }); }
  } catch (err) { console.error('[bridges] betancourt failed:', err); failed.push('betancourt: ' + (err && err.stack || err)); }
  // The approaches of the second-pass bridges (docs/research/vo-bridges-wave2.md section 7): the environment's lawn hedges (thin 1.1 m collision boxes up to 180 m long) cross the foot paths that lead onto the
  // Novo-Andreevsky footbridge and the 2nd / 4th Smolensky bridges: cut a gap into every hedge box that crosses an approach corridor (colliders only); the street lamps that streets put into the deck footprint of the WHSD lose
  // their colliders (the red car hit one at 20 m/s)
  try {
    const cor = VO2_SITES.map((s) => ({ cx: s.cx, cz: s.cz, b: s.b, u0: s.bank[0] - 2 - 28, u1: s.bank[1] + 2 + 28, v0: s.v0 - 0.4, v1: s.v1 + 0.4 }));
    cor.push({ cx: FOOT.cx, cz: FOOT.cz, b: FOOT.b, u0: -FOOT.len / 2 - 28, u1: FOOT.len / 2 + 28, v0: -FOOT.hw - 1.2, v1: FOOT.hw + 1.2 });
    const g = openHedgeGaps(ctx, cor); stats.hedgeGaps = g;
    stats.whsdLampsOpened = openWhsdLamps(ctx);
  } catch (err) { console.warn('[bridges] approach gaps failed:', err); }
  // The environment lays an invisible fallback deck (a walk box at y 0 + two parapet boxes y -2 .. 1.3) into a BRIDGE_ZONES row it believes unbuilt (the `troitsky` row of the south landing): the
  // parapet boxes fence the pavements of the real deck. Remove a fallback whose walk box centre lies on one of the long decks (colliders only).
  try {
    const ph = ctx.physics, longs = list.filter((b) => b.B && b.B.span); let removed = 0;
    for (const it of ph.items.slice()) {
      if (it.type !== 'walk' || it.y0 !== -1.2 || it.top !== 0 || !longs.some((b) => b.B.deckAt(it.cx, it.cz) !== null)) continue;
      for (const bx of ph.items.slice()) if (bx.type === 'box' && bx.y0 === -2 && bx.y1 === 1.3 && Math.abs(bx.hd * 2 - 0.5) < 0.05 && Math.abs(Math.hypot(bx.cx - it.cx, bx.cz - it.cz) - it.hd) < 1.5) { ph.remove(bx); removed++; }
      ph.remove(it); removed++;
    }
    stats.fallbackDecksRemoved = removed;
  } catch (err) { console.warn('[bridges] fallback deck removal failed:', err); }
  // The Triple Bridge sits on the corner where the Griboyedov Canal quay meets the Moika quay: the environment leaves short curved quay-wall colliders (0.5 m thick, y -8 .. 1.25) at the
  // corner that poke into the NW corner of the Malo-Konyushenny deck and block its left walkway.  Remove the quay colliders whose centre lies inside a Triple Bridge deck (collider only).
  try {
    const ph = ctx.physics, tri = SITES.filter((q) => q.style === 'aegis'); let removed = 0;
    for (const it of ph.items.slice()) {
      // the environment's invisible fallback deck of a Triple Bridge zone (a walk box 15.6 m wide + two 0.5 m parapet boxes y -2 .. 1.3) duplicates my deck and fences its walkways
      const fallback = tri.some((q) => Math.hypot(it.cx - q.cx, it.cz - q.cz) < 32) && ((it.type === 'walk' && it.y0 === -1.2 && Math.abs(it.hd * 2 - 15.6) < 0.05) || (it.type === 'box' && it.y0 === -2 && it.y1 === 1.3 && Math.abs(it.hd * 2 - 0.5) < 0.05));
      if (fallback) { ph.remove(it); removed++; continue; }
      if (it.type !== 'box' || it.y0 > -7 || it.y1 !== 1.25 || it.hd * 2 > 0.6 || it.hw * 2 > 4) continue;
      if (tri.some((q) => { const d = list.find((b) => b.id === q.id); return d && d.B.deckAt && [[0, 0], [1.4, 0], [-1.4, 0], [0, 1.4], [0, -1.4], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dz]) => d.B.deckAt(it.cx + dx, it.cz + dz) !== null); })) { ph.remove(it); removed++; }
    }
    stats.quayCollidersOpened = removed;
  } catch (err) { console.warn('[bridges] quay collider opening failed:', err); }
  rails.flush(root); stats.rails = rails.count();
  ctx.addStatic(root);

  // ---------------------------------------------------------------- services
  const decks = list.filter((b) => b.B && b.B.deckAt);
  // B.bounds (world AABB round the deck, set by the builders) prefilters the ~10^6 start-up queries of nav / lamps / parking / props; a deck without bounds is always asked
  const dB = decks.map((d) => d.B.bounds || null), nD = decks.length;
  // The invisible FALLBACK decks of the environment (quay.js lays a walkable box at y 0 over every OSM deck polygon of the island that no built module claims: the Moika-mouth service road, the park footbridges,
  // the Mikhmanskaya overpass decks, the Shkipersky bridge until sight-gavan draws it): the red car refuses every water-bed cell unless deckY answers (drive/handling.js blocked()) and stopped 2 m before each of them.
  // A flat 0 over such a polygon (the opening of the quay: polygon + 1 m) lets it cross; a claimed deck is skipped, its owner answers.
  const FB = [];
  try {
    const owned = await ownedGroups(ctx);
    for (const z of QZONES) {
      if (!z.petro || !z.deck || !z.test || !inIsland(z.c[0], z.c[1]) || (z.ids || []).some((id) => isOwned(owned, id))) continue;     // (the island only: the reviewed districts keep their behaviour)
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < z.deck.length; i += 2) { x0 = Math.min(x0, z.deck[i]); x1 = Math.max(x1, z.deck[i]); z0 = Math.min(z0, z.deck[i + 1]); z1 = Math.max(z1, z.deck[i + 1]); }
      FB.push({ id: z.id, x0: x0 - 2, x1: x1 + 2, z0: z0 - 2, z1: z1 + 2, test: z.test });
    }
  } catch (err) { console.warn('[bridges] fallback deck list unavailable:', err && err.message); }
  const fallbackY = (x, z) => { for (let i = 0; i < FB.length; i++) { const f = FB[i]; if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && f.test(x, z, 0)) return 0; } return null; };
  // Decks of other modules that a vehicle rides (third pass): the Shkipersky bridge is landmarksGavan's (a claimed deck has no fallback); its own `bridge.deckY` is asked at call time (lazily: the module builds
  // after this one) so that the traffic simulation, which asks only services.bridges.deckY within 190 m of a list entry, lifts a vehicle onto the 0.12 m deck like the red car (landmarksC.bridge chain).
  const EXT = [{ id: 'shkipersky', name: 'Шкиперский мост', nameEn: 'Shkipersky Bridge (landmarksGavan)', x: -7009.5, z: -31.0, r: 24, svc: 'landmarksGavan' }];
  const extY = (x, z) => {
    for (let i = 0; i < EXT.length; i++) {
      const e = EXT[i]; if (Math.abs(x - e.x) > e.r || Math.abs(z - e.z) > e.r) continue;
      const s = ctx.services[e.svc], f = s && s.bridge && s.bridge.deckY; if (typeof f !== 'function') continue;
      const y = f(x, z); if (y !== null && y !== undefined) return y;
    }
    return null;
  };
  const deckY = (x, z) => {
    for (let i = 0; i < nD; i++) {
      const b = dB[i]; if (b && (x < b[0] || x > b[2] || z < b[1] || z > b[3])) continue;
      const y = decks[i].B.deckAt(x, z); if (y !== null) return y;
    }
    const ey = extY(x, z); if (ey !== null) return ey;
    return FB.length ? fallbackY(x, z) : null;
  };
  const lc = ctx.services.landmarksC && ctx.services.landmarksC.bridge;
  if (lc && typeof lc.deckY === 'function' && !lc.deckY.__bridges) {
    const orig = lc.deckY, wrapped = (x, z) => { const y = orig(x, z); return y !== null ? y : deckY(x, z); };
    wrapped.__bridges = true; lc.deckY = wrapped;
  }
  // traffic prefilters deckY by a 190 m radius round every list entry: a long bridge publishes extra entries (B.anchors) along its deck; masts = the lamp / contact-wire standards of the long
  // bridges ({ x, y, z, h, kind, id }), spans = their axes ({ id, a, b, hw })
  const pub = [];
  for (const b of list) { pub.push({ id: b.id, name: b.name, nameEn: b.nameEn, x: b.x, z: b.z }); for (const a of (b.B && b.B.anchors) || []) pub.push({ id: b.id, name: b.name, nameEn: b.nameEn, x: a.x, z: a.z, part: true }); }
  for (const e of EXT) pub.push({ id: e.id, name: e.name, nameEn: e.nameEn, x: e.x, z: e.z, external: e.svc });          // the 190 m prefilter of traffic / people must reach the decks of other modules too
  const masts = [], spans = [];
  for (const b of list) { for (const m of (b.B && b.B.masts) || []) masts.push({ id: b.id, ...m }); if (b.B && b.B.span) spans.push({ id: b.id, ...b.B.span }); }
  const pits = [];                                                       // the wide corner stairs (bridges/stairs.js): { id, x, z, landing: { x, z, y }, top: { y }, site } for people / photo spots
  for (const b of list) for (const q of (b.B && b.B.pits) || []) pits.push({ ...q, bridge: b.id });
  ctx.services.bridges = { list: pub, deckY, stats, failed, masts, spans, pits, fallbackDecks: FB.map((f) => f.id) };
  const S = (ctx.services.landmarks ||= {});
  S.photoSpots = (S.photoSpots || []).concat(list.map((b) => ({ x: b.at[0], z: b.at[1], yaw: 0, name: b.name })));
  if (failed.length) throw new Error('bridges parts failed:\n' + failed.join('\n'));
}
void PARTS;
