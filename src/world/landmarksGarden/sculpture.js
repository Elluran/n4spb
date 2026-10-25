// landmarksGarden/sculpture.js - the white marble sculpture of the Summer Garden (dossier docs/research/summer-garden.md 6): the 93 OSM artwork nodes (43 statues and groups, 48 busts, the Krylov monument, the porphyry vase
// is in fence.js) at their real positions, each on a pale pink-grey granite pedestal (1.4 m, carved garland panel) and turned to face the nearest alley, so the Main alley shows its pairs at q = +-3.1 that look at
// each other.  Figures come from the shared figure kit (lib/figures.js): 12 statue poses (draped women: raising, offering, chest, drapery; helmeted Minerva / Bellona; muses with a lyre; basket bearers; nude
// athlete, Roman in a tunic with a laurel and a scroll, the bearded Saturn) and 8 bust heads, built once and INSTANCED (one InstancedMesh per variant).  The unique pieces are built separately: the Krylov monument
// (Klodt 1855: seated bronze fabulist on a dark granite pedestal swarming with bronze animals, in a cast-iron railing), Peace and Victory (Baratta 1725, on a pink pedestal), the two Sabine groups, Cupid and
// Psyche, Satyr and Bacchante.  Colliders: one box per pedestal.  Photos refs/summer-garden 184 197 206 090 229.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { human, bust, lion, extend, cached, figureMats, addWing, V, Sculpt } from '../lib/figures.js';
import * as G from './geo.js';
import { SCULPTURE } from './statues-data.js';
import { gardenPaths } from './ground.js';
import { nearestOnLine } from './frame.js';

const MALE = /Антиной|Вакх|Сатурн|Вертумн|Аполлон|Юноша|Рок|Полдень|Закат|Сатир/;
const SPECIAL = /Крылов|Мир и Победа|сабинянки|Амур и Психея|Сатир и вакханка|Порфировая/;
const hashN = (s) => { let h = 7; for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; return Math.abs(h); };

// ------------------------------------------------------------------------------------------------ statue poses (figure frame: +x = the figure's left, hands in metres)
const DRESS = { torso: 'dress', hem: 0.94, flare: 0.3, folds: 0.075, sleeves: 'short', collar: 'none' };
const W_POSES = {
  raise: { pelvisRot: [0, 0.12, 0.05], spine: [0, -0.1, -0.04], head: [-0.1, -0.35, 0.05], legs: { R: { foot: [-0.1, 0, 0.04] }, L: { foot: [0.12, 0, 0.14] } },
    arms: { R: { hand: [-0.28, 1.85, 0.12], pole: [-0.4, 0.2, -0.8], grip: 'open', palm: [0, 0.3, 0.3] }, L: { hand: [0.3, 0.9, 0.2], pole: [0.6, -0.4, -0.5], grip: 'hold', palm: [-0.5, 0.5, 0.5] } } },
  offer: { pelvisRot: [0, -0.1, -0.04], spine: [0, 0.1, 0.04], head: [0.1, 0.3, 0], legs: { L: { foot: [0.1, 0, 0.03] }, R: { foot: [-0.12, 0, 0.15] } },
    arms: { R: { hand: [-0.2, 1.2, 0.5], pole: [-0.3, -0.5, -0.4], grip: 'open', palm: [0, 1, 0] }, L: { hand: [0.15, 1.12, 0.22], pole: [0.5, -0.5, -0.5], grip: 'relaxed' } } },
  chest: { pelvisRot: [0, 0.08, 0.04], spine: [0, -0.08, 0], head: [0.22, 0.28, 0.06], legs: { R: { foot: [-0.1, 0, 0.0] }, L: { foot: [0.12, 0, 0.12] } },
    arms: { R: { hand: [-0.06, 1.27, 0.16], pole: [-0.6, -0.2, -0.6], grip: 'flat', palm: [0.7, 0, 0.3] }, L: { hand: [0.08, 1.2, 0.17], pole: [0.6, -0.3, -0.6], grip: 'flat', palm: [-0.7, 0, 0.3] } } },
  drape: { pelvisRot: [0, -0.12, 0.05], spine: [0, 0.12, -0.05], head: [0.05, 0.4, 0], legs: { L: { foot: [0.1, 0, 0.1] }, R: { foot: [-0.12, 0, 0.0] } },
    arms: { R: { hand: [-0.3, 0.75, 0.14], pole: [-0.6, -0.4, -0.4], grip: 'hold', palm: [0.5, 0.2, 0.4] }, L: { hand: [0.26, 1.36, 0.16], pole: [0.7, 0.2, -0.5], grip: 'relaxed' } } },
  basket: { pelvisRot: [0, 0.12, 0.04], spine: [0, -0.1, -0.04], head: [0.12, 0.3, 0.05], legs: { R: { foot: [-0.1, 0, 0.0] }, L: { foot: [0.12, 0, 0.12] } },
    arms: { R: { hand: [-0.26, 1.02, 0.22], pole: [-0.6, -0.4, -0.5], grip: 'cup', palm: [0.3, 0.9, 0.2] }, L: { hand: [0.36, 0.8, 0.16], pole: [0.6, -0.3, -0.6], grip: 'hold', palm: [-0.5, 0.5, 0.5] } } },
  helmet: { pelvisRot: [0, 0.1, 0.04], spine: [0, -0.1, 0], head: [0, 0.3, 0], legs: { R: { foot: [-0.1, 0, 0.0] }, L: { foot: [0.13, 0, 0.1] } },
    arms: { R: { hand: [-0.34, 1.32, 0.22], pole: [-0.6, -0.3, -0.5], grip: 'fist', palm: [0, 0, 1] }, L: { hand: [0.34, 1.0, 0.2], pole: [0.6, -0.3, -0.5], grip: 'hold', palm: [-0.5, 0, 0.5] } } },
  lyre: { pelvisRot: [0, -0.1, 0.04], spine: [0, 0.1, 0], head: [0.1, 0.3, 0.05], legs: { L: { foot: [0.1, 0, 0.1] }, R: { foot: [-0.12, 0, 0.0] } },
    arms: { R: { hand: [-0.18, 1.2, 0.36], pole: [-0.5, -0.3, -0.5], grip: 'hold', palm: [0.5, 0.3, 0.3] }, L: { hand: [0.26, 1.15, 0.3], pole: [0.6, -0.3, -0.5], grip: 'open', palm: [-0.6, 0.3, 0.3] } } },
};
const M_POSES = {
  nude: { pelvisRot: [0, 0.14, 0.06], spine: [0, -0.12, -0.05], head: [0, 0.3, 0.04], legs: { R: { foot: [-0.1, 0, 0.04] }, L: { foot: [0.13, 0, 0.18] } },
    arms: { R: { hand: [-0.24, 1.0, -0.02], pole: [-0.9, -0.1, -0.4], grip: 'fist' }, L: { hand: [0.28, 0.85, 0.08], pole: [0.6, -0.3, -0.5], grip: 'relaxed' } } },
  scroll: { pelvisRot: [0, -0.1, -0.04], spine: [0, 0.1, 0.04], head: [0.08, 0.35, 0], legs: { L: { foot: [0.1, 0, 0.04] }, R: { foot: [-0.12, 0, 0.16] } },
    arms: { R: { hand: [-0.22, 1.12, 0.34], pole: [-0.5, -0.4, -0.5], grip: 'hold', palm: [0.5, 0.3, 0.3] }, L: { hand: [0.24, 0.95, -0.02], pole: [0.9, -0.2, -0.4], grip: 'fist' } } },
  saturn: { pelvisRot: [0.05, 0.1, 0.04], spine: [0.14, -0.1, -0.04], head: [0.25, 0.3, 0], legs: { R: { foot: [-0.1, 0, 0.0] }, L: { foot: [0.12, 0, 0.1] } },
    arms: { R: { hand: [-0.3, 1.32, 0.3], pole: [-0.6, -0.2, -0.5], grip: 'fist' }, L: { hand: [0.3, 0.98, 0.16], pole: [0.6, -0.4, -0.5], grip: 'hold', palm: [-0.5, 0.5, 0.5] } } },
};
const woman = (pose, seed, o = {}) => human({ detail: 0.32, body: { sex: 'f' }, pose: W_POSES[pose], outfit: { ...DRESS, flare: 0.5, folds: 0.1, ...(o.outfit || {}) }, face: { age: 0.18 + (seed % 5) * 0.03, hair: 'cap', mouth: 'smile', seed } });
const manNude = (seed, o = {}) => human({ detail: 0.32, body: { sex: 'm', muscle: 0.8 }, pose: M_POSES.nude, outfit: { torso: 'nude', ...(o.outfit || {}) }, face: { age: 0.15, hair: 'curly', seed } });

const VARIANTS = {
  wRaise: () => woman('raise', 11), wOffer: () => woman('offer', 12), wChest: () => woman('chest', 13), wDrape: () => woman('drape', 14), wBasket: () => woman('basket', 15),
  wHelmet: () => extend(woman('helmet', 16, { outfit: { hat: 'roman' } }), (S, info) => {                     // Minerva / Bellona: a spear and a round shield
    const j = info.j, hr = j.hands.R.hold, hl = j.hands.L.hold;
    S.tube('main', [V.add(hr, [0, -0.95, 0]), V.add(hr, [0, 0.95, 0])], [[0.014, 0.014], [0.012, 0.012]], { seg: 6, per: 6 });
    S.blob('main', V.add(hr, [0, 1.0, 0]), [0.03, 0.09, 0.012], { w: 6, h: 5 });
    S.blob('main', V.add(hl, [0.08, 0.0, 0.02]), [0.2, 0.2, 0.03], { dir: [0, 0, 1], w: 10, h: 6 });
  }),
  wLyre: () => extend(woman('lyre', 17), (S, info) => {                                                    // a muse with a lyre
    const hr = info.j.hands.R.hold;
    S.tube('main', [V.add(hr, [0.0, -0.12, 0.02]), V.add(hr, [-0.1, 0.12, 0.0]), V.add(hr, [-0.08, 0.3, 0.0])], [[0.012, 0.012], [0.012, 0.012], [0.012, 0.012]], { seg: 5, per: 5 });
    S.tube('main', [V.add(hr, [0.0, -0.12, 0.02]), V.add(hr, [0.16, 0.1, 0.0]), V.add(hr, [0.1, 0.3, 0.0])], [[0.012, 0.012], [0.012, 0.012], [0.012, 0.012]], { seg: 5, per: 5 });
    S.tube('main', [V.add(hr, [-0.08, 0.28, 0.0]), V.add(hr, [0.1, 0.28, 0.0])], [[0.01, 0.01], [0.01, 0.01]], { seg: 5, per: 2 });
  }),
  mNude: () => manNude(21),
  mNude2: () => human({ detail: 0.4, body: { sex: 'm', muscle: 0.7 }, pose: { ...M_POSES.nude, pelvisRot: [0, -0.14, -0.06], spine: [0, 0.12, 0.05], head: [0, -0.3, 0], legs: { L: { foot: [0.1, 0, 0.04] }, R: { foot: [-0.13, 0, 0.18] } } }, outfit: { torso: 'nude' }, face: { age: 0.12, hair: 'short', seed: 22 } }),
  mTunic: () => extend(human({ detail: 0.4, body: { sex: 'm', muscle: 0.5 }, pose: M_POSES.scroll, outfit: { torso: 'tunic', hem: 0.5, flare: 0.2, folds: 0.05, sleeves: 'short', hat: 'laurel', cape: 'mantle' }, face: { age: 0.45, hair: 'short', seed: 23 } }), (S, info) => {
    const h = info.j.hands.R.hold; S.tube('main', [V.add(h, [-0.1, 0, 0]), V.add(h, [0.1, 0, 0])], [[0.028, 0.028], [0.028, 0.028]], { seg: 8, per: 2 });                    // a scroll
  }),
  mSaturn: () => extend(human({ detail: 0.4, body: { sex: 'm', muscle: 0.4 }, pose: M_POSES.saturn, outfit: { torso: 'robe', hem: 0.95, flare: 0.25, folds: 0.08, sleeves: 'none', cape: 'mantle' }, face: { age: 0.95, hair: 'long', beard: 'full', seed: 24 } }), (S, info) => {
    const h = info.j.hands.R.hold; S.tube('main', [V.add(h, [0, -0.5, 0]), V.add(h, [0, 0.6, 0])], [[0.014, 0.014], [0.012, 0.012]], { seg: 6, per: 5 }); S.blob('main', V.add(h, [0.1, 0.62, 0], 0), [0.1, 0.03, 0.01], { w: 6, h: 4 }); // a scythe
  }),
};
const BUST_HEADS = {
  emperor: { style: 'bare', turn: 0.25, face: { age: 0.5, hair: 'short', brow: 0.8, mouth: 'stern', seed: 31 } },
  emperor2: { style: 'bare', turn: -0.3, face: { age: 0.7, hair: 'short', brow: 0.9, jaw: 1.1, seed: 32 } },
  youth: { style: 'bare', turn: 0.2, face: { age: 0.1, hair: 'curly', seed: 33 } },
  philosopher: { style: 'robe', turn: -0.25, face: { age: 0.95, hair: 'bald', beard: 'full', brow: 1.0, seed: 34 } },
  woman: { style: 'bare', turn: 0.3, face: { age: 0.12, hair: 'long', jaw: 0.85, brow: 0.2, nose: 0.9, mouth: 'smile', seed: 35 } },
  woman2: { style: 'bare', turn: -0.25, face: { age: 0.3, hair: 'cap', jaw: 0.9, brow: 0.25, mouth: 'smile', seed: 36 } },
  wig: { style: 'civil', turn: 0.2, face: { age: 0.55, hair: 'wig', seed: 37 } },
  apollo: { style: 'bare', turn: 0.3, face: { age: 0.08, hair: 'curly', seed: 38 } },
};

function pickStatue(name, idx) {
  const male = MALE.test(name);
  if (/Минерва|Беллона/.test(name)) return 'wHelmet';
  if (/Эвтерпа|Терпсихора|Талия|Муза/.test(name)) return 'wLyre';
  if (/Флора|Церера|Помона|Нимфа|Нереида|изобилия/.test(name)) return 'wBasket';
  if (/Сатурн/.test(name)) return 'mSaturn';
  if (/Вертумн/.test(name)) return 'mTunic';
  if (male) return idx % 2 ? 'mNude' : 'mNude2';
  return ['wRaise', 'wOffer', 'wChest', 'wDrape'][hashN(name) % 4];
}
function pickBust(name, idx) {
  if (/Гераклит|Демокрит|Диоген|Сенека|Аристотель|Эскулап/.test(name)) return 'philosopher';
  if (/Фридрих|Собеск|Курфюрст|Вельможа/.test(name)) return 'wig';
  if (/Аполлон|Юноша|Царь Мидас|Александр/.test(name)) return /Юноша/.test(name) ? 'youth' : 'apollo';
  if (/женщина|Римлянка|Марция|Петрония|Скрибония|Камилла|Амазонка|Мария|Аллегория|Сивилла|Коринна|Нерей/.test(name)) return idx % 2 ? 'woman' : 'woman2';
  return idx % 3 ? 'emperor' : 'emperor2';
}

/** one merged BufferGeometry of a figure (every material key -> the same marble) */
function flatGeo(fig) {
  const gs = Object.values(fig.geos).map((g) => { const c = g.clone(); for (const k of Object.keys(c.attributes)) if (!['position', 'normal', 'uv'].includes(k)) c.deleteAttribute(k); return c; });
  return mergeGeometries(gs, false);
}

export function build(K) {
  const { ctx, M, P, root, svc } = K, ph = ctx.physics;
  const fm = figureMats(ctx);
  const marble = ctx.mat.toon('#f7f3ec', fm.marble && fm.marble.map ? { map: fm.marble.map, name: 'lmGd-marbleTex', paint: 0.03 } : { name: 'lmGd-marbleTex', paint: 0.03 });
  const mkStatic = { main: marble, dark: M.marbleShade, accent: marble };
  const paths = gardenPaths();
  const faceOf = (x, z) => {
    let best = null;
    for (const p of paths) { if (p.steps) continue; const n = nearestOnLine(p.pts, x, z); if (!best || n.d < best.d) best = n; }
    if (!best || best.d < 0.3) return 0;
    return Math.atan2(best.x - x, best.z - z);
  };
  // ---- instanced variants
  const byVar = new Map();
  const addInst = (key, x, y, z, rotY, s) => { if (!byVar.has(key)) byVar.set(key, []); byVar.get(key).push({ x, y, z, rotY, s }); };
  let sIdx = 0, bIdx = 0, nStatue = 0, nBust = 0;
  for (const [s, q, type, name, author, x, z] of SCULPTURE) {
    if (type === 'vase' || SPECIAL.test(name)) continue;
    const rot = faceOf(x, z);
    if (type === 'bust') {
      // pedestal: base block, shaft with the garland panel, cornice
      G.tbox(P, M.pedestalPlain, x - 0.5, x + 0.5, 0, 0.22, z - 0.5, z + 0.5, 1, 1, 'b');
      G.tbox(P, M.pedestal, x - 0.38, x + 0.38, 0.22, 1.18, z - 0.38, z + 0.38, 0.76, 0.76, '');
      G.tbox(P, M.pedestalPlain, x - 0.46, x + 0.46, 1.18, 1.4, z - 0.46, z + 0.46, 1, 1, 'b');
      addInst('bust:' + pickBust(name, bIdx++), x, 1.4, z, rot, 1.15); nBust++;
    } else {
      G.tbox(P, M.pedestalPlain, x - 0.62, x + 0.62, 0, 0.25, z - 0.62, z + 0.62, 1, 1, 'b');
      G.tbox(P, M.pedestal, x - 0.48, x + 0.48, 0.25, 1.2, z - 0.48, z + 0.48, 0.96, 0.96, '');
      G.tbox(P, M.pedestalPlain, x - 0.58, x + 0.58, 1.2, 1.42, z - 0.58, z + 0.58, 1, 1, 'b');
      addInst('statue:' + pickStatue(name, sIdx++), x, 1.42, z, rot, 1.14); nStatue++;
    }
    ph.addBox(x, z, 1.1, 1.1, rot, 0, 3.4);
    svc.statues.push({ name, author, type, x, z, rotY: rot });
  }
  let tris = 0, variants = 0;
  for (const [key, list] of byVar) {
    const [kind, v] = key.split(':');
    const fig = cached('lmGd-' + key, () => (kind === 'bust' ? bust({ detail: 0.2, ...BUST_HEADS[v], key: 'main' }) : VARIANTS[v]()));
    const geo = flatGeo(fig);
    const im = new THREE.InstancedMesh(geo, marble, list.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    list.forEach((it, i) => { q.setFromAxisAngle(up, it.rotY); const wd = kind === 'statue' ? 1.2 : 1.0; m4.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.s * wd, it.s, it.s * wd)); im.setMatrixAt(i, m4); });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = true; im.receiveShadow = true; im.name = 'lmGd-sculpt-' + key;
    ctx.noBatch(im); root.add(im); tris += (geo.index.count / 3) * list.length; variants++;
  }
  K.extraTris += tris;

  // ---- the unique pieces
  const hero = (fn, name) => { try { fn(); } catch (e) { console.error(`[landmarksGarden] sculpture/${name}:`, e); } };
  hero(() => krylov(K, marble), 'krylov');
  hero(() => peaceAndVictory(K, marble, mkStatic), 'peace');
  hero(() => groups(K, marble, mkStatic), 'groups');
  svc.sculptureStats = { statues: nStatue, busts: nBust, variants, instTris: Math.round(tris) };
}

// ------------------------------------------------------------------------------------------------ Peace and Victory (Baratta 1725), the Sabine groups, Cupid and Psyche, Satyr and Bacchante
function pedestalBig(K, x, z, w, h, mat) {
  const { P, M } = K;
  G.tbox(P, M.pedestalPlain, x - w * 0.62, x + w * 0.62, 0, 0.3, z - w * 0.62, z + w * 0.62, 1, 1, 'b');
  G.tbox(P, mat, x - w * 0.5, x + w * 0.5, 0.3, h - 0.3, z - w * 0.5, z + w * 0.5, 1.2, 1.2, '');
  G.tbox(P, M.pedestalPlain, x - w * 0.6, x + w * 0.6, h - 0.3, h, z - w * 0.6, z + w * 0.6, 1, 1, 'b');
  K.ctx.physics.addBox(x, z, w * 1.3, w * 1.3, 0, 0, h + 2.2);
}
function peaceAndVictory(K, marble, mk) {
  const { P, M, svc } = K, x = -856, z = -1669, rot = Math.atan2(-0.4153, -0.9097);                                // faces the Neva fence
  const pink = K.ctx.mat.toon('#a67a68', { name: 'lmGd-pinkBrown', paint: 0.03 });
  pedestalBig(K, x, z, 1.5, 2.4, pink);
  const victory = cached('lmGd-victory', () => extend(woman('raise', 41, { outfit: { sleeves: 'none' } }), (S) => {
    addWing(S, { root: [0.1, 1.42, -0.1], side: 1, pose: 'half', span: 0.95, key: 'main', boneKey: 'main', tilt: [0.1, 0.95, -0.05] });
    addWing(S, { root: [-0.1, 1.42, -0.1], side: -1, pose: 'half', span: 1.0, key: 'main', boneKey: 'main', tilt: [0.1, 0.8, 0.05] });
  }));
  victory.place(P, mk, x, 2.4, z, rot, 1.2);
  manNude(42).place(P, mk, x + Math.cos(rot) * 0.5, 2.4, z - Math.sin(rot) * 0.5, rot + 0.5, 0.85);              // the youth with trophies at her side
  cached('lmGd-lionP', () => lion({ detail: 0.3 })).place(P, mk, x, 2.4, z + 0.0, rot, 0.4);
  svc.monuments.push({ id: 'n5152028821', name: 'Мир и Победа', x, z, h: 5.4 });
}
function groups(K, marble, mk) {
  const { P, M, svc } = K;
  const at = (name) => SCULPTURE.filter((r) => r[3] === name);
  const faceTo = (x, z) => { const ps = gardenPaths().filter((p) => !p.steps); let b = null; for (const p of ps) { const n = nearestOnLine(p.pts, x, z); if (!b || n.d < b.d) b = n; } return b && b.d > 0.3 ? Math.atan2(b.x - x, b.z - z) : 0; };
  // two nudes close together (Satyr and Bacchante, Cupid and Psyche)
  const pair = (x, z, rot, seedA, seedB, h) => {
    pedestalBig(K, x, z, 1.8, h, M.pedestal);
    const c = Math.cos(rot), s = Math.sin(rot);
    manNude(seedA).place(P, mk, x + c * 0.28, h, z - s * 0.28, rot + 0.5, 1.0, 0, -0.1);
    cached('lmGd-wNude' + seedB, () => human({ detail: 0.4, body: { sex: 'f' }, pose: { ...W_POSES.offer, head: [0.1, -0.5, 0] }, outfit: { torso: 'dress', hem: 0.6, flare: 0.2, folds: 0.06, sleeves: 'none' }, face: { age: 0.15, hair: 'long', seed: seedB } }))
      .place(P, mk, x - c * 0.28, h, z + s * 0.28, rot - 0.5, 0.95, 0, 0.1);
  };
  for (const r of at('Сатир и вакханка')) { pair(r[5], r[6], faceTo(r[5], r[6]), 51, 52, 1.5); svc.monuments.push({ id: 'satyr', name: r[3], x: r[5], z: r[6], h: 4 }); }
  for (const r of at('Амур и Психея')) { pair(r[5], r[6], Math.atan2(0.9432, 0.3325) - 0.2, 53, 54, 1.6); svc.monuments.push({ id: 'cupid', name: r[3], x: r[5], z: r[6], h: 4 }); }
  // Abduction of the Sabine woman: a standing man with a woman lifted across his arm
  for (const r of at('Похищение сабинянки')) {
    const [x, z] = [r[5], r[6]], rot = faceTo(x, z);
    pedestalBig(K, x, z, 1.8, 1.5, M.pedestal);
    manNude(61).place(P, mk, x, 1.5, z, rot, 1.05);
    cached('lmGd-sabine', () => human({ detail: 0.4, body: { sex: 'f' }, pose: W_POSES.raise, outfit: { ...DRESS, hem: 0.7 }, face: { age: 0.15, hair: 'long', seed: 62 } }))
      .place(P, mk, x + Math.sin(rot) * 0.15, 1.5 + 1.15, z + Math.cos(rot) * 0.15, rot + 1.0, 0.85, -1.15, 0);
    svc.monuments.push({ id: 'sabine', name: r[3], x, z, h: 4.2 });
  }
}

// ------------------------------------------------------------------------------------------------ the Krylov monument (Klodt 1851-55)
const bronzeOf = (ctx) => figureMats(ctx).keys('bronze', 'bronze');
function krylov(K, marble) {
  const { ctx, P, M, svc } = K, ph = ctx.physics;
  const x = -909, z = -1537, rot = Math.atan2(-0.3325, -0.9432) + Math.PI;                                    // faces the Main alley (west-south-west)
  const faceAng = Math.atan2(-0.9432, 0.3325);
  void rot;
  const mb = bronzeOf(ctx);
  // base: red granite step, the iron railing 5 x 5 m with corner urn posts
  G.tbox(P, M.porphyryPlinth, x - 3.0, x + 3.0, 0, 0.12, z - 3.0, z + 3.0, 2, 2, 'b');
  const R = 2.5, rails = [[-R, -R, R, -R], [R, -R, R, R], [R, R, -R, R], [-R, R, -R, -R]];
  for (const [ax, az, bx, bz] of rails) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.18);
    for (let i = 0; i <= n; i++) { const t = i / n, px = x + ax + (bx - ax) * t, pz = z + az + (bz - az) * t; P.cyl(M.iron, [px, 0.12, pz], [px, 1.1, pz], 0.012, 0.012, 4, false); P.cyl(M.gold, [px, 1.1, pz], [px, 1.18, pz], 0.0, 0.03, 4, false); }
    P.cyl(M.black, [x + ax, 1.0, z + az], [x + bx, 1.0, z + bz], 0.02, 0.02, 4, false); P.cyl(M.black, [x + ax, 0.35, z + az], [x + bx, 0.35, z + bz], 0.018, 0.018, 4, false);
    ph.addBox(x + (ax + bx) / 2, z + (az + bz) / 2, Math.abs(bx - ax) + 0.1, Math.abs(bz - az) + 0.1, 0, 0, 1.2);
  }
  for (const [px, pz] of [[-R, -R], [R, -R], [R, R], [-R, R]]) { G.tbox(P, M.graniteDark, x + px - 0.15, x + px + 0.15, 0.12, 1.15, z + pz - 0.15, z + pz + 0.15, 1, 1, 'b'); G.ball(P, M.gold, x + px, 1.27, z + pz, 0.12, 8); }
  // the pedestal: a stepped dark granite block, a rock mass with the animals, the plaque, a cornice
  G.tbox(P, M.graniteDark, x - 1.45, x + 1.45, 0.12, 0.5, z - 1.45, z + 1.45, 1.5, 1.5, 'b');
  G.tbox(P, M.graniteDark, x - 1.2, x + 1.2, 0.5, 2.2, z - 1.2, z + 1.2, 1.5, 1.5, '');
  G.tbox(P, M.graniteGrey, x - 1.0, x + 1.0, 2.2, 3.15, z - 1.0, z + 1.0, 1.5, 1.5, '');
  G.tbox(P, M.graniteDark, x - 1.18, x + 1.18, 3.15, 3.5, z - 1.18, z + 1.18, 1.5, 1.5, 'b');
  const rock = new THREE.IcosahedronGeometry(1, 1), rock2 = () => rock;
  const rr = (i) => { const h = Math.sin(i * 91.7) * 43758.5453; return h - Math.floor(h); };
  for (let i = 0; i < 26; i++) {                                                                         // boulders round the lower pedestal
    const a = i / 26 * Math.PI * 2 + rr(i) * 0.3, r = 1.28 + rr(i + 3) * 0.25, y = 0.35 + rr(i + 7) * 1.5;
    P.geo(M.graniteDark, rock, x + Math.cos(a) * r, y, z + Math.sin(a) * r, rr(i) * 3, rr(i + 1) * 3, 0, 0.32 + rr(i + 5) * 0.2, 0.26 + rr(i + 9) * 0.18, 0.32 + rr(i + 2) * 0.2);
  }
  const kinds = ['bear', 'fox', 'ram', 'lion', 'elephant', 'monkey'];
  let ai = 0;
  for (let f = 0; f < 4; f++) {                                                                          // three animals on each face of the pedestal, standing on boulder ledges
    const a = f * Math.PI / 2 + 0.2, dx = Math.cos(a), dz = Math.sin(a);
    for (let k = 0; k < 3; k++) {
      const t = (k - 1) * 0.85, y = 0.62 + ((k + f) % 2) * 0.75 + (k === 1 ? 0.35 : 0), r = 1.34;
      const px = x + dx * r - dz * t, pz = z + dz * r + dx * t, kind = kinds[ai++ % kinds.length], sc = (kind === 'fox' || kind === 'monkey' ? 1.5 : 1.8);
      P.geo(M.graniteDark, rock2(), px - dx * 0.1, y - 0.12, pz - dz * 0.1, 0, a, 0, 0.5, 0.3, 0.5);
      bronzeAnimal(kind).place(P, mb, px, y, pz, Math.atan2(dx, dz) + (k - 1) * 0.35, sc);
    }
  }
  // the seated bronze fabulist: an overcoat, an open book on the knees, the head bowed
  const statue = cached('lmGd-krylov', () => extend(human({
    detail: 0.55, body: { muscle: 0.1, bulk: 1.15 },
    pose: { pelvis: [0, 0.5, -0.08], pelvisRot: [0.08, 0.1, 0], spine: [0.2, 0.1, 0], head: [0.4, 0.2, 0.05],
      legs: { L: { foot: [0.15, 0, 0.32], yaw: 0.25, pole: [0.1, 0.2, 1] }, R: { foot: [-0.14, 0, 0.2], yaw: -0.3, pole: [-0.1, 0.2, 1] } },
      arms: { L: { hand: [0.1, 0.66, 0.42], pole: [0.6, -0.5, -0.4], grip: 'hold', palm: [-0.6, 0.2, 0.3] }, R: { hand: [-0.08, 0.66, 0.4], pole: [-0.6, -0.5, -0.4], grip: 'hold', palm: [0.6, 0.2, 0.3] } } },
    outfit: { torso: 'coat', hem: 0.5, flare: 0.35, folds: 0.07, sleeves: 'long', trousers: 'long', boots: 0.12, collar: 'fall', buttons: false },
    face: { age: 0.8, hair: 'short', beard: 'sideburns', brow: 0.9, mouth: 'stern', seed: 95 },
  }), (S) => {
    S.blob('main', [0, 0.72, 0.5], [0.16, 0.012, 0.11], { dir: [0, 0.4, 1], w: 8, h: 4 });                    // the open book
    S.blob('main', [0, 0.28, -0.12], [0.34, 0.28, 0.3], { w: 10, h: 7 });                                     // the rock / stool under him
  }));
  statue.place(P, mb, x, 3.5, z, faceAng, 2.2);
  ph.addCylinder(x, z, 1.7, 0, 7);
  svc.monuments.push({ id: 'n1711793873', name: 'Памятник И. А. Крылову', x, z, h: 6.5 });
  svc.crowd.push({ x, z, r: 6, n: 7, kind: 'monument' });
  svc.photoSpots.push({ x: x - 5, z: z + 3, yaw: -105, pitch: 8, name: 'Памятник Крылову' });
}

/** a bronze animal from blobs and lofted limbs (faces +z, stands on y = 0, nominal body length ~0.6-0.9 m): bear, fox, ram, lion, elephant, monkey */
function bronzeAnimal(kind) {
  return cached('lmGd-animal-' + kind, () => {
    const S = new Sculpt({ detail: 0.45 });
    const P = {
      bear: { L: 0.8, W: 0.2, H: 0.22, legH: 0.2, head: 0.1, hump: 0.06, snout: 0.07, ear: 0.035, tail: 0.04, leg: 0.065 },
      fox: { L: 0.55, W: 0.09, H: 0.1, legH: 0.18, head: 0.06, hump: 0, snout: 0.09, ear: 0.045, tail: 0.3, leg: 0.025 },
      ram: { L: 0.62, W: 0.15, H: 0.17, legH: 0.26, head: 0.075, hump: 0, snout: 0.06, ear: 0.04, tail: 0.04, leg: 0.032, horns: 1 },
      lion: { L: 0.85, W: 0.14, H: 0.17, legH: 0.22, head: 0.1, hump: 0.0, snout: 0.06, ear: 0.03, tail: 0.32, leg: 0.045, mane: 1 },
      elephant: { L: 1.0, W: 0.3, H: 0.3, legH: 0.3, head: 0.17, hump: 0.04, snout: 0.0, ear: 0.17, tail: 0.04, leg: 0.1, trunk: 1 },
      monkey: { L: 0.34, W: 0.09, H: 0.12, legH: 0.12, head: 0.07, hump: 0.0, snout: 0.04, ear: 0.03, tail: 0.3, leg: 0.03 },
    }[kind];
    const b = (c, r, o = {}) => S.blob('main', c, r, { w: 10, h: 7, ...o });
    const t = (path, rad, o = {}) => S.tube('main', path, rad, { seg: 7, per: 4, ...o });
    const by = P.legH + P.H, L = P.L, W = P.W, H = P.H;
    b([0, by, 0], [W, H, L * 0.5]);                                                                      // torso
    b([0, by + P.hump, L * 0.26], [W * 0.95, H * 1.0, L * 0.28]);                                          // shoulders
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {                                                   // four legs
      const x = sx * W * 0.62, z = sz * L * 0.3 + (kind === 'monkey' ? 0 : 0);
      t([[x, by - H * 0.3, z], [x * 1.05, by - H - P.legH * 0.4, z + sz * 0.015], [x, 0.03, z + 0.04]], [[P.leg * 1.2, P.leg * 1.2], [P.leg, P.leg], [P.leg * 0.9, P.leg * 1.2]]);
      b([x, 0.03, z + 0.05], [P.leg * 1.3, 0.035, P.leg * 1.9]);                                           // paw / hoof
    }
    const neckUp = kind === 'elephant' ? 0.05 : 0.25 + (kind === 'lion' ? 0.1 : 0) + (kind === 'ram' ? 0.15 : 0);
    t([[0, by + H * 0.2, L * 0.34], [0, by + H * (0.5 + neckUp), L * 0.5], [0, by + H * (0.6 + neckUp), L * 0.6]], [[W * 0.7, W * 0.7], [W * 0.55, W * 0.55], [W * 0.5, W * 0.5]]);
    const hy = by + H * (0.62 + neckUp), hz = L * 0.66 + P.head * 0.5;
    b([0, hy, hz], [P.head * 0.85, P.head * 0.85, P.head * 1.0]);                                          // skull
    if (P.snout) b([0, hy - P.head * 0.25, hz + P.head * 1.05], [P.snout * 0.8, P.snout * 0.65, P.snout * 1.3]);
    for (const sx of [-1, 1]) b([sx * P.head * 0.55, hy + P.head * 0.7, hz - P.head * 0.2], kind === 'elephant' ? [0.03, P.ear, P.ear * 0.9] : [P.ear * 0.6, P.ear, P.ear * 0.5], { dir: [sx * 0.3, 1, -0.1] });   // ears
    if (kind === 'elephant') {
      t([[0, hy - 0.05, hz + P.head * 0.9], [0, hy - 0.2, hz + P.head * 1.5], [0, hy - 0.4, hz + P.head * 1.6], [0, hy - 0.52, hz + P.head * 1.2]], [[0.07, 0.07], [0.055, 0.055], [0.04, 0.04], [0.03, 0.03]]);   // the trunk
      for (const sx of [-1, 1]) t([[sx * 0.07, hy - 0.14, hz + P.head * 0.9], [sx * 0.09, hy - 0.22, hz + P.head * 1.5]], [[0.015, 0.015], [0.005, 0.005]]);                                              // tusks
    }
    if (P.horns) for (const sx of [-1, 1]) t([[sx * 0.04, hy + P.head * 0.6, hz - 0.02], [sx * 0.12, hy + P.head * 0.9, hz - 0.08], [sx * 0.15, hy + P.head * 0.4, hz - 0.1], [sx * 0.1, hy + P.head * 0.15, hz + 0.0]], [[0.025, 0.025], [0.02, 0.02], [0.016, 0.016], [0.008, 0.008]]);   // curled horns
    if (P.mane) b([0, hy - P.head * 0.1, hz - P.head * 0.7], [P.head * 1.45, P.head * 1.45, P.head * 0.9]);   // the lion's mane
    t([[0, by + H * 0.2, -L * 0.45], [0, by + H * 0.5, -L * 0.62], [0, by - H * 0.1 + P.tail * 0.5, -L * 0.6 - P.tail * 0.5]], [[P.tail * 0.18 + 0.01, P.tail * 0.18 + 0.01], [P.tail * 0.15 + 0.01, P.tail * 0.15 + 0.01], [P.tail * 0.2 + 0.01, P.tail * 0.2 + 0.01]]);     // tail / brush
    return S.finish({});
  });
}
