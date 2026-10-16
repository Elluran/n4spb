// landmarksMars/memorial.js - the Memorial to the Fighters of the Revolution (Мемориал «Борцам революции», L. Rudnev 1917-19) with the Eternal Flame (1957).
// Four L-shaped walls of rough pink-grey granite (18 + 18 m arms, 3.5 m thick, ~2.0 m high, stepped on the outer face) leave four 11.7 m openings; at every wall end stands a pink granite inscription
// slab (2.3 x 2.5 m) on a stepped plinth with Lunacharsky's eight texts (readable Russian, drawn on the slab faces); inside: lawn with twelve flush grave slabs, a rounded-square granite path, four
// paved approaches through the openings, a low dark platform 7 x 7 x 0.45 m with a stepped pit and a round burner with an animated flame, eight rounded granite posts, red geranium borders.
// Frame: field frame (frame.js, model x = v, model z = u, origin = memorial centre).  Dossier docs/research/mars-field.md section 4; photos mem_01 mem_06 mem_08 mem_17 flame_06.  No flags / flagpoles.
import * as THREE from 'three';
import { FF, C0 } from './frame.js';
import { ribbon } from './surfaces.js';
import { tbox } from './geo.js';

const TEXTS = [
  'Против богатства, власти и знанья для горсти вы войну повели и с честию пали за то, чтоб богатство, власть и познанье стали бы жребием общим.',
  'По воле тиранов друг друга терзали народы. Ты встал, трудовой Петербург, и первый начал войну всех угнетённых против всех угнетателей, чтоб тем убить самое семя войны.',
  '1917–1918 вписали в анналы России великую славу, скорбные светлые годы, посев ваш жатвой созреет для всех населяющих землю.',
  'Не зная имён всех героев борьбы за свободу, кто кровь свою отдал, род человеческий чтит безымянных. Всем им в память и честь этот камень на долгие годы поставлен.',
  'Бессмертен павший за великое дело, в народе жив вечно, кто для народа жизнь положил, трудился, боролся и умер за общее благо.',
  'Со дна угнетенья, нужды и невежества поднялся ты, пролетарий, себе добывая свободу и счастье. Всё человечество ты осчастливишь и вырвешь из рабства.',
  'Не жертвы – герои лежат под этой могилой. Не горе, а зависть рождает судьба ваша в сердцах всех благодарных потомков. В красные страшные дни славно вы жили и умирали прекрасно.',
  'К сонму великих ушедших от жизни во имя жизни расцвета героев восстаний разных времён, к толпам якобинцев, борцов 48, к толпам коммунаров ныне примкнули сыны Петербурга.',
];
const PLAQUE = 'Памятник Борцам революции. Сооружен в 1917–1919 гг. Архитектор Л. В. Руднев. Надписи на плитах А. В. Луначарского по рисунку художника В. М. Конашевича. Планировка Марсова поля архитектора И. А. Фомина. Памятник охраняется государством';

export function wrapLines(g, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

export function memorial(K) {
  const ctx = K.ctx, P = K.P, M = K.M, ph = ctx.physics;
  const T = ctx.mat.toon;
  const slabMats = TEXTS.map((txt, i) => T('#ffffff', { name: 'lmM-slabText' + i, paint: 0.0, polygonOffset: -3, map: ctx.tex.draw(512, 512, (g, w, h) => {
    g.fillStyle = '#b48a7e'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(900 + i);
    for (let k = 0; k < 700; k++) { const v = 150 + Math.floor(r() * 80); g.fillStyle = `rgba(${v},${v - 50},${v - 60},0.18)`; g.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 4); }
    g.fillStyle = 'rgba(70,40,34,0.25)'; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8); g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h);
    g.fillStyle = '#3a2c26'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 40, lines;
    for (; size >= 26; size -= 2) { g.font = `700 ${size}px ${ctx.tex.FONTS.serif}`; lines = wrapLines(g, txt, w - 70); if (lines.length * size * 1.22 < h - 90) break; }
    const lh = size * 1.22, y0 = h / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((l, k) => { g.fillStyle = 'rgba(255,225,205,0.35)'; g.fillText(l, w / 2 + 1.5, y0 + k * lh + 1.5); g.fillStyle = '#3a2c26'; g.fillText(l, w / 2, y0 + k * lh); });
  }, { key: 'lmM-slabtext-' + i, repeat: [1, 1] }) }));
  const plaqueMat = T('#ffffff', { name: 'lmM-plaqueText', paint: 0.0, polygonOffset: -3, map: ctx.tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#4a3a2c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a6e50'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#d8c8a8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 15px ${ctx.tex.FONTS.serif}`;
    const lines = wrapLines(g, PLAQUE, w - 36); const lh = 19, y0 = h / 2 - (lines.length - 1) * lh / 2; lines.forEach((l, k) => g.fillText(l, w / 2, y0 + k * lh));
  }, { key: 'lmM-plaquetext', repeat: [1, 1] }) });
  M.decals.add(plaqueMat); slabMats.forEach((m) => M.decals.add(m));

  P.push(C0.x, 0, C0.z, FF.rot);                                    // model x = v, model z = u
  const WO = 23.8, WI = 20.3, GAP = 5.8;                            // outer corner, inner face, half opening
  const slabs = [];
  // box in the arm frame: arm 1 runs along x (s = |x|), arm 2 along z (s = |z|); t = distance from the inner face outward; sign (sx, sz) = the quadrant
  const bxA = (arm, sx, sz, s0, s1, t0, t1, y0, y1, mat, skip = '', tu = 2.4, tv = 1.2) => {
    let x0, x1, z0, z1;
    if (arm === 1) { x0 = s0; x1 = s1; z0 = WI + t0; z1 = WI + t1; } else { x0 = WI + t0; x1 = WI + t1; z0 = s0; z1 = s1; }
    const ax = sx * x0, bx = sx * x1, az = sz * z0, bz = sz * z1;
    tbox(P, mat, Math.min(ax, bx), Math.max(ax, bx), y0, y1, Math.min(az, bz), Math.max(az, bz), tu, tv, skip);
    return [Math.min(ax, bx), Math.max(ax, bx), Math.min(az, bz), Math.max(az, bz)];
  };
  const TIER = [[0, 0.7, 0], [0.7, 1.35, 0.5], [1.35, 2.0, 1.0]];
  let slabIdx = 0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    // the corner block (square at the outer corner) belongs to arm 1; arm 2 stops at the inner face of arm 1
    for (const [y0, y1, d] of TIER) {
      bxA(1, sx, sz, GAP + 2.6, WO - d, 0, 3.5 - d, y0, y1, M.wall, y0 > 0 ? 'b' : 'b');
      bxA(2, sx, sz, GAP + 2.6, WI, 0, 3.5 - d, y0, y1, M.wall, 'b');
    }
  }
  void slabIdx;
  // pavement / ground pieces and slabs are added below; the wall colliders are registered with the field frame (rotated boxes)
  const colBox = (mx, mz, w, d, y1) => FF.box(ph, mx, mz, w, d, 0, 0, y1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    colBox(sx * (GAP + 2.6 + WO) / 2, sz * (WI + WO) / 2, WO - GAP - 2.6, 3.5, 2.0);       // arm 1
    colBox(sx * (WI + WO) / 2, sz * (GAP + 2.6 + WI) / 2, 3.5, WI - GAP - 2.6, 2.0);        // arm 2
  }
  // ---- eight end slabs on stepped plinths (one per wall end, facing the opening), the plinth replaces the first 2.6 m of the arm
  let ti = 0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const arm of [1, 2]) {
    // plinth: lower step full thickness, upper step inset; slab front faces the opening centre line
    bxA(arm, sx, sz, GAP, GAP + 2.6, 0, 3.5, 0, 0.8, M.wall, 'b', 2.4, 1.2);
    bxA(arm, sx, sz, GAP + 0.35, GAP + 2.6, 0.3, 3.2, 0.8, 1.6, M.slabPinkDark, 'b', 2.4, 1.2);
    const sb = bxA(arm, sx, sz, GAP + 0.75, GAP + 1.3, 0.6, 2.9, 1.6, 4.1, M.slabPink, 'b');          // the slab body 0.55 thick, 2.3 wide, 2.5 high
    // slab front face toward the opening centre: text quad 8 mm in front, bottom-left -> bottom-right runs along the viewer's right = (nz, -nx)
    const nrm = arm === 1 ? [-sx, 0, 0] : [0, 0, -sz], rt = [nrm[2], -nrm[0]];
    const fc = arm === 1 ? [sx * (GAP + 0.75) + nrm[0] * 0.008, sz * (WI + 1.75)] : [sx * (WI + 1.75), sz * (GAP + 0.75) + nrm[2] * 0.008];
    const pt = (k, y) => [fc[0] + rt[0] * 1.15 * k, y, fc[1] + rt[1] * 1.15 * k];
    P.quad(slabMats[ti % 8], pt(-1, 1.85), pt(1, 1.85), pt(1, 4.05), pt(-1, 4.05), nrm, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    // niche at the foot of the plinth (a dark rectangle, 0.9 x 0.6 m)
    {
      const nf = arm === 1 ? [sx * (GAP - 0.012), sz * (WI + 1.75)] : [sx * (WI + 1.75), sz * (GAP - 0.012)];
      const q = (k, y) => [nf[0] + rt[0] * 0.45 * k, y, nf[1] + rt[1] * 0.45 * k];
      P.quad(M.graniteDark, q(-1, 0.15), q(1, 0.15), q(1, 0.75), q(-1, 0.75), nrm);
    }
    // plinth collider + slab
    if (arm === 1) colBox(sx * (GAP + 1.3), sz * (WI + 1.75), 2.6, 3.5, 4.1); else colBox(sx * (WI + 1.75), sz * (GAP + 1.3), 3.5, 2.6, 4.1);
    const wp = FF.W(arm === 1 ? sx * (GAP - 2.5) : sx * (WI + 1.75), arm === 1 ? sz * (WI + 1.75) : sz * (GAP - 2.5));
    slabs.push({ x: wp.x, z: wp.z, text: ti }); ti++;
  }
  // bronze plaque on the upper plinth step of one slab (south-west arm 2), 0.55 x 0.55 m, facing the opening
  { const sx = -1, sz = 1, nrm = [0, 0, -sz], rt = [nrm[2], -nrm[0]], fc = [sx * (WI + 1.75), sz * (GAP + 0.35) + nrm[2] * 0.01];
    const pt = (k, y) => [fc[0] + rt[0] * 0.275 * k, y, fc[1]]; P.quad(plaqueMat, pt(-1, 0.98), pt(1, 0.98), pt(1, 1.53), pt(-1, 1.53), nrm, [[0, 0], [1, 0], [1, 1], [0, 1]]); }
  // ---- stub posts: rounded granite bollards 0.45 m, 0.9 m high, a pair per opening on the outer side of the walls
  const posts = [];
  for (const [mx, mz] of [[-3.2, WO + 2.6], [3.2, WO + 2.6], [-3.2, -WO - 2.6], [3.2, -WO - 2.6], [WO + 2.6, -3.2], [WO + 2.6, 3.2], [-WO - 2.6, -3.2], [-WO - 2.6, 3.2]]) {
    P.cyl(M.stub, [mx, 0, mz], [mx, 0.82, mz], 0.23, 0.2, 10, false); const g = new THREE.SphereGeometry(0.21, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); P.geo(M.stub, g, mx, 0.82, mz); g.dispose();
    FF.cyl(ph, mx, mz, 0.26, 0, 0.9); const w = FF.W(mx, mz); posts.push({ x: w.x, z: w.z });
  }
  // ---- inner paving: a rounded-square granite path (35.5 m, 7 m chamfers), four paved approaches (7.6 m wide) through the openings, grass-paver strips to the platform
  const ring = [[-12.4, -17.8], [12.4, -17.8], [17.8, -12.4], [17.8, 12.4], [12.4, 17.8], [-12.4, 17.8], [-17.8, 12.4], [-17.8, -12.4]];
  const wring = ring.map(([x, z]) => { const w = FF.W(x, z); return [w.x, w.z]; });
  // the path ring is drawn in the model frame (x, z): use model-frame ribbons by pushing a flat y
  ribbon(P, M.slab, ring, 2.4, 0.034, { closed: true, tile: 1.6 });
  void wring;
  const flat = (x0, x1, z0, z1, y, mat, tile = 1.6) => P.quad(mat, [x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], [0, 1, 0], [[x0 / tile, z0 / tile], [x0 / tile, z1 / tile], [x1 / tile, z1 / tile], [x1 / tile, z0 / tile]]);
  for (let k = 0; k < 4; k++) {
    P.push(0, 0, 0, k * Math.PI / 2);                                  // approach along +z (v / u axes rotate with the quarter turn)
    flat(-3.8, 3.8, 17.2, 38.5, 0.036, M.slab);                        // granite from the court path to the plaza edge (slabs of 0.8 x 1.6 m)
    flat(-3.8, 3.8, 4.4, 17.2, 0.037, M.paver, 3);                     // grass pavers between the path and the platform
    P.pop();
  }
  // ---- the Eternal Flame platform 7 x 7 x 0.45 m (dark bronze-brown stone), a stepped pit (5 m, 3 m), a round black burner 1.2 m across, 0.5 m above the pit floor
  const pl = M.platform;
  P.box(pl, -3.5, 3.5, 0, 0.45, -3.5, -2.5, 'b'); P.box(pl, -3.5, 3.5, 0, 0.45, 2.5, 3.5, 'b');
  P.box(pl, -3.5, -2.5, 0, 0.45, -2.5, 2.5, 'b'); P.box(pl, 2.5, 3.5, 0, 0.45, -2.5, 2.5, 'b');
  P.box(pl, -2.5, 2.5, 0, 0.25, -2.5, -1.5, 'b'); P.box(pl, -2.5, 2.5, 0, 0.25, 1.5, 2.5, 'b');
  P.box(pl, -2.5, -1.5, 0, 0.25, -1.5, 1.5, 'b'); P.box(pl, 1.5, 2.5, 0, 0.25, -1.5, 1.5, 'b');
  P.box(pl, -1.5, 1.5, 0, 0.08, -1.5, 1.5, 'b');
  P.cyl(M.burner, [0, 0.08, 0], [0, 0.6, 0], 0.62, 0.58, 18, true);
  P.cyl(M.graniteDark, [0, 0.6, 0], [0, 0.63, 0], 0.5, 0.5, 18, true);
  FF.cyl(ph, 0, 0, 0.8, 0, 2.6);
  // carnations laid on the platform edge (small red bundles)
  for (const [x, z, a] of [[-2.4, 3.15, 0.3], [2.2, 3.1, -0.4], [-3.1, -2.2, 1.2], [3.15, 1.8, 1.9], [0.4, -3.15, 0.1]]) { P.push(x, 0.45, z, a); P.box(M.geranium, -0.22, 0.22, 0.0, 0.07, -0.08, 0.08, 'b'); P.box(M.lampGreen, 0.22, 0.6, 0.0, 0.03, -0.03, 0.03, 'b'); P.pop(); }
  // red geranium borders: two strips of 0.8 m beside the platform edge on the court side (summer beds)
  P.box(M.geranium, -4.6, -3.8, 0, 0.08, -3.4, 3.4, 'b'); P.box(M.geranium, 3.8, 4.6, 0, 0.08, -3.4, 3.4, 'b');
  // twelve grave slabs flush with the lawn: three per quadrant along the inner face of the walls (1.0 x 0.6 m, pink granite)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = sx * (9 + i * 3.6), z = sz * (19.0), y = 0.026;
    P.box(M.gravestone, x - 0.5, x + 0.5, y - 0.012, y + 0.012, z - 0.3, z + 0.3, 'b');
  }
  P.pop();

  // ---- the flame: crossed planes with a flame texture, animated as a pure function of t (calm, ~1.8 m)
  const flameTex = ctx.tex.draw(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, h, 0, 0); grad.addColorStop(0, '#ff7a14'); grad.addColorStop(0.5, '#ffb43a'); grad.addColorStop(1, '#ffe27a');
    g.fillStyle = grad; g.beginPath(); g.moveTo(w * 0.5, 0); g.bezierCurveTo(w * 0.78, h * 0.3, w * 0.98, h * 0.6, w * 0.78, h * 0.86); g.bezierCurveTo(w * 0.68, h * 0.98, w * 0.32, h * 0.98, w * 0.22, h * 0.86); g.bezierCurveTo(w * 0.02, h * 0.6, w * 0.3, h * 0.3, w * 0.5, 0); g.fill();
    g.fillStyle = 'rgba(255,248,200,0.85)'; g.beginPath(); g.moveTo(w * 0.5, h * 0.28); g.bezierCurveTo(w * 0.66, h * 0.5, w * 0.7, h * 0.76, w * 0.6, h * 0.9); g.bezierCurveTo(w * 0.5, h * 0.98, w * 0.4, h * 0.9, w * 0.36, h * 0.82); g.bezierCurveTo(w * 0.32, h * 0.62, w * 0.42, h * 0.46, w * 0.5, h * 0.28); g.fill();
  }, { key: 'lmM-flameTex', repeat: [1, 1] });
  const fm = ctx.mat.emissive('#ffffff', 1.25, { map: flameTex, transparent: true, alphaTest: 0.12, side: 'double', depthWrite: false });
  const fg = new THREE.Group(); fg.name = 'lmM-flame';
  const wc = FF.W(0, 0);
  const planes = [];
  for (let k = 0; k < 3; k++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.6), fm); m.position.y = 0.8; m.rotation.y = k * Math.PI / 3; m.name = 'flame' + k;
    const holder = new THREE.Group(); holder.add(m); holder.position.set(0, 0.6, 0); holder.scale.set(1, 1, 1); fg.add(holder); planes.push(holder); ctx.noOutline(m); m.castShadow = false;
  }
  fg.position.set(wc.x, 0, wc.z);
  ctx.add(fg);
  ctx.onUpdate((dt, t) => {
    planes.forEach((h, k) => {
      const s = 1 + 0.07 * Math.sin(t * 4.3 + k * 2.1) + 0.04 * Math.sin(t * 7.9 + k);
      h.scale.set(1 + 0.05 * Math.sin(t * 3.1 + k * 1.3), s, 1); h.rotation.y = 0.12 * Math.sin(t * 1.7 + k);
    });
  });

  // ---- services: memorial geometry, crowd spots around the flame / slabs, photo spots
  const spots = []; for (let i = 0; i < 10; i++) { const a = i * Math.PI * 2 / 10, w = FF.W(Math.cos(a) * 6.5, Math.sin(a) * 6.5); spots.push({ x: w.x, z: w.z, kind: 'flame' }); }
  for (const s of slabs) spots.push({ x: s.x, z: s.z, kind: 'slab' });
  K.svc.crowd.push(...spots);
  const wf = FF.W(0, 0);
  K.svc.memorial = { x: C0.x, z: C0.z, flame: { x: wf.x, z: wf.z, h: 2.1 }, slabs, posts, rot: FF.rot, half: WO };
  K.svc.monuments.push({ id: 'w89083040', name: 'Мемориал «Борцам революции»', x: C0.x, z: C0.z, h: 4.1 }, { id: 'n6445811888', name: 'Вечный огонь', x: wf.x, z: wf.z, h: 2.1 });
  const ps = FF.W(0, 30);
  K.svc.photoSpots.push({ x: ps.x, z: ps.z, yaw: Math.atan2(-(wf.x - ps.x), -(wf.z - ps.z)) * 180 / Math.PI, pitch: 4, name: 'Вечный огонь на Марсовом поле' });
  void C0;
}
export const build = memorial;
