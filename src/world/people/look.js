// people/look.js - WHO is out there: makeSpec(rng, opts) draws a random person of the centre of Saint Petersburg on a July afternoon (characters half).
// Sources: docs/research/people.md S5 (body templates), S6 (the 40-colour clothing palette with weights, bottoms / shoes / bags / hats), S7 (skin, hair, faces: Slavic / Russian-looking
// 82 %, Central Asian 5, East Asian 5, Caucasus 3, South Asian 2, Middle Eastern 2, African 1), S8 (the 28 outfit templates T1..T28; the composite ones - families, couples, guided groups,
// the station population - are assembled by scenes.js from these single-person templates).
// Rules kept from the research: 65 % of the people wear one or two neutral colours (black, charcoal, navy, denim, white, cream, greys, beige, camel, brown, khaki) with at most one
// accent (a bag, shoes, a cap), jackets over tees in 25 % of the sunny crowd (`hot` 0 cool .. 1 hot; 0.7 = a 23 C afternoon), shorts only when hot, no beanies, no school uniforms, NO brand logos,
// NO FLAGS (user rule: a tour guide carries a plain coloured umbrella), no weapons on the police pair.
// Spec fields read by the simulation are listed in contract.js; extra fields of this module: spec.look (render recipe), spec.eats, spec.smokes, spec.role, spec.look.carry (items).
import { H, FACE } from './rig.js';

const wpick = (r, list) => { let tot = 0; for (const e of list) tot += e[1]; let x = r() * tot; for (const e of list) { x -= e[1]; if (x <= 0) return e[0]; } return list[list.length - 1][0]; };
const gauss = (r) => (r() + r() + r() - 1.5) * 2;                                         // ~N(0, 1), clamped to +-3
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
/** multiply a hex colour by k (0..1.x), keeps the albedo discipline */
export const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join(''); };
/** keep every albedo out of pure black (project rule: darkest ~ #33384a): lift very dark colours toward a blue-grey */
const lift = (hex) => { const v = lum(hex); if (v >= 0.2) return hex; const k = 0.7 * (1 - v / 0.2); const n = parseInt(hex.slice(1), 16), t = [0x3a, 0x3f, 0x50], c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x, j) => Math.round(x + (t[j] - x) * k)); return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join(''); };

// ------------------------------------------------------------------ the research palette (S6): [hex, weight %]; the first 12 rows + khaki are the neutrals
const PAL = [
  ['#23252b', 11.0], ['#3c3f48', 6.0], ['#2b3a5c', 5.5], ['#6f93bd', 4.0], ['#4a6a98', 3.5], ['#f0eee8', 6.5], ['#e6dcc4', 4.0], ['#b9bcc3', 4.0], ['#7d8089', 4.0], ['#c8b48f', 4.0], ['#b08a5a', 2.0], ['#5a4033', 2.0],
  ['#e0685a', 1.8], ['#c93a36', 2.2], ['#2f6fc0', 2.0], ['#2a52b0', 1.0], ['#9a7bc0', 1.2], ['#5a3a7a', 0.8], ['#efe2d3', 1.5], ['#2c3050', 1.0], ['#e8a0b0', 1.5], ['#c98a96', 1.0], ['#7a2a3a', 2.0], ['#a24a3a', 1.0],
  ['#d8a73a', 1.5], ['#f0cf45', 1.2], ['#e2803a', 1.2], ['#9ac04a', 0.8], ['#5fae4a', 1.2], ['#2f6b4f', 1.5], ['#6f7552', 3.0], ['#3a9a9a', 1.5], ['#4fc0c8', 1.0], ['#7fb6e0', 2.0], ['#b9c6de', 2.5], ['#5f8aa0', 1.2],
  ['#7a3a3a', 0.8], ['#d0d6e2', 1.2], ['#5a6048', 1.3], ['#f2a81d', 0.6],
];
const NEUTRAL = PAL.filter((p, i) => i < 12 || i === 30), ACCENT = PAL.filter((p, i) => i >= 12 && i !== 30 && i !== 39 && i !== 17);
const topCol = (r, neutral) => wpick(r, neutral ? NEUTRAL : PAL);
const accentCol = (r) => wpick(r, ACCENT);
const JEANS_B = [['#3f5a86', 24], ['#26324a', 12], ['#1f2026', 16], ['#6a6d75', 7], ['#bfa98a', 7], ['#6f7552', 4]];
const SHORTS_B = [['#5c7ba6', 5], ['#26272d', 3], ['#b7a678', 3], ['#5d8f78', 2]];
const LEG_B = [['#1c1c22', 6], ['#2a2f45', 4]];
const SHOES = { sneaker: [['#f0efe9', 28], ['#2b2b30', 22], ['#aeb1b5', 8]], flat: [['#2b2a2e', 12], ['#e8dcc2', 7], ['#25252b', 7]], sandal: [['#b08a5a', 6], ['#2b2b30', 6]] };
const CROSSBODY = ['#1f1f25', '#6a4a3b', '#b08a5a', '#d8c8a8', '#3fae9a'];
const BACKPACK = [['#2a2a2e', 40], ['#2f6fc0', 15], ['#c93a36', 10], ['#5f6a4a', 15], ['#e8a0b0', 5], ['#efe2d3', 5]];
const SUITCASE = [['#2b3a5c', 20], ['#3c3f48', 24], ['#b9bcc3', 20], ['#7a2a3a', 8], ['#4fc0c8', 10], ['#5a3a7a', 6], ['#c93a36', 4], ['#e0b84a', 4]];
const SKIN_ALL = [['#f7e0d2', 26], ['#f2d3bd', 30], ['#ecc5a6', 22], ['#e0b08a', 10], ['#c98f66', 6], ['#a8704b', 3], ['#7a4e34', 3]];
const SKIN_BY = {
  slavic: [['#f7e0d2', 38], ['#f2d3bd', 36], ['#ecc5a6', 20], ['#e0b08a', 6]],
  central: [['#ecc5a6', 30], ['#e0b08a', 40], ['#c98f66', 25], ['#f2d3bd', 5]],
  caucasus: [['#f2d3bd', 25], ['#ecc5a6', 40], ['#e0b08a', 25], ['#c98f66', 10]],
  east: [['#f7e0d2', 30], ['#f2d3bd', 40], ['#ecc5a6', 30]],
  south: [['#e0b08a', 30], ['#c98f66', 40], ['#a8704b', 30]],
  african: [['#a8704b', 25], ['#7a4e34', 55], ['#5e3b28', 20]],
  mideast: [['#e0b08a', 40], ['#ecc5a6', 30], ['#c98f66', 30]],
};
const HAIR_SLAVIC = [['#2b211c', 15], ['#4a3326', 22], ['#6e5238', 15], ['#8a6a44', 10], ['#c9ad75', 9], ['#d9c48f', 4], ['#17151a', 9], ['#7a3b26', 5], ['#d89a6a', 1]];
const HAIR_DARK = [['#17151a', 60], ['#2b211c', 28], ['#4a3326', 10], ['#7a3b26', 2]];
const FANCY = [['#c25a7c', 3], ['#7a3fa0', 1]];
const GREY = [['#a9a7a2', 62], ['#e6e3dc', 22], ['#c8c4bc', 16]];
const GROUPS = [['slavic', 82], ['central', 5], ['east', 5], ['caucasus', 3], ['south', 2], ['mideast', 2], ['african', 1]];

// ------------------------------------------------------------------ the 28 outfit templates (S8): id, share among single walkers, sex, age
export const ARCH = [
  { id: 'tourist_f', w: 7, fem: true, age: 'adult' }, { id: 'tourist_m', w: 5, fem: false, age: 'adult' }, { id: 'follower', w: 0, fem: null, age: 'adult' }, { id: 'guide', w: 0, fem: null, age: 'adult' },
  { id: 'asian', w: 1.5, fem: null, age: 'adult' }, { id: 'office_f', w: 6, fem: true, age: 'adult' }, { id: 'office_m', w: 5, fem: false, age: 'adult' }, { id: 'student_f', w: 6, fem: true, age: 'adult' },
  { id: 'student_m', w: 6, fem: false, age: 'adult' }, { id: 'teen', w: 3, fem: null, age: 'teen' }, { id: 'mid_f', w: 6, fem: true, age: 'adult' }, { id: 'mid_m', w: 4, fem: false, age: 'adult' },
  { id: 'elder_f', w: 3, fem: true, age: 'elder' }, { id: 'elder_m', w: 2, fem: false, age: 'elder' }, { id: 'parent', w: 0, fem: null, age: 'adult' }, { id: 'child', w: 0, fem: null, age: 'child' },
  { id: 'toddler', w: 0, fem: null, age: 'child' }, { id: 'courier', w: 0, fem: false, age: 'adult' }, { id: 'cleaner', w: 0, fem: null, age: 'adult' }, { id: 'police', w: 0, fem: null, age: 'adult' },
  { id: 'staff', w: 0, fem: null, age: 'adult' }, { id: 'tout', w: 0, fem: false, age: 'adult' }, { id: 'traveler_f', w: 0, fem: true, age: 'adult' }, { id: 'traveler_m', w: 0, fem: false, age: 'adult' },
  { id: 'busker', w: 0, fem: false, age: 'adult' }, { id: 'painter', w: 0, fem: null, age: 'adult' }, { id: 'statue', w: 0, fem: false, age: 'adult' }, { id: 'bride', w: 0, fem: true, age: 'adult' },
  { id: 'groom', w: 0, fem: false, age: 'adult' }, { id: 'guest', w: 0, fem: null, age: 'adult' }, { id: 'date_f', w: 0, fem: true, age: 'adult' }, { id: 'date_m', w: 0, fem: false, age: 'adult' },
  { id: 'sport', w: 0.5, fem: null, age: 'adult' },
  // the Petrograd side: Nakhimov cadets (summer whites), anglers of the Neva embankments (a rod), sunbathers at the wall of the Peter and Paul Fortress
  { id: 'cadet', w: 0, fem: false, age: 'teen' }, { id: 'angler', w: 0, fem: false, age: 'adult' }, { id: 'beach_m', w: 0, fem: false, age: 'adult' }, { id: 'beach_f', w: 0, fem: true, age: 'adult' },
];
const ARCH_BY = Object.fromEntries(ARCH.map((a) => [a.id, a]));
const WALK = ARCH.filter((a) => a.w > 0).map((a) => [a.id, a.w]);
const ROLE_ARCH = {
  office: [['office_f', 6], ['office_m', 5]], elder: [['elder_f', 3], ['elder_m', 2]], student: [['student_m', 6], ['student_f', 6], ['teen', 2]], courier: [['courier', 1]], cleaner: [['cleaner', 1]],
  kid: [['child', 1]], toddler: [['toddler', 1]], parent: [['parent', 1]], rider: [['teen', 4], ['student_m', 3], ['student_f', 2], ['mid_m', 1]], tourist: [['tourist_f', 7], ['tourist_m', 5], ['mid_f', 2], ['mid_m', 1]],
  guide: [['guide', 1]], follower: [['follower', 1]], asian: [['asian', 1]], police: [['police', 1]], staff: [['staff', 1]], tout: [['tout', 1]], busker: [['busker', 1]], painter: [['painter', 1]], statue: [['statue', 1]],
  bride: [['bride', 1]], groom: [['groom', 1]], guest: [['guest', 1]], traveler: [['traveler_f', 6], ['traveler_m', 5]], vendor: [['mid_f', 4], ['mid_m', 2], ['elder_f', 2]],
  dogwalker: [['mid_f', 4], ['tourist_m', 2], ['elder_f', 2], ['elder_m', 2], ['student_f', 2], ['mid_m', 2]], date: [['date_f', 1]], sport: [['sport', 1]], walk: WALK,
  cadet: [['cadet', 1]], angler: [['angler', 1]], beach: [['beach_m', 5], ['beach_f', 4]],
};

// ------------------------------------------------------------------ outfits
const FLORAL = [['#efe2d3', '#d9776a'], ['#e8c3bb', '#c4584d'], ['#cdd9e8', '#4f6fa8'], ['#b7d4b0', '#d98aa0'], ['#f2d98a', '#c4584d'], ['#d9a0b0', '#f0e6d8'], ['#efe2d3', '#4fb8ab'], ['#2c3050', '#e8c3bb']];
const LIGHT_SHOES = ['#f0efe9', '#e8e6e0', '#d8d6d0', '#ecebe6'];
const KID_TEE = ['#f2c230', '#3fae7c', '#e8563c', '#e58fb5', '#3f9fd6', '#a98bd0'];

/** the garment recipe of an archetype: { torso, A, B, C, upper, fore, thigh, shin, foot, pants, shoeB, shoeC, hat, hatCol, bag, bagCol, lanyard, glassesP, carry } */
function outfit(r, arch, fem, age, hot, layerWorn, o2) {
  const o = { torso: 'tee', A: '#efefee', B: '#ffffff', C: '#222222', upper: 'short', fore: 'bare', thigh: 'std', shin: 'std', foot: 'sneaker', pants: '#2c303b', shoeB: '#25252b', shoeC: '#e8e6e0', hat: null, hatCol: '#e9e7e1', bag: null, bagCol: '#2b2b30', lanyard: false, glassesP: 0.22, carry: {} };
  const r1 = r(), pick = (a) => a[Math.floor(r() * a.length)], neutral = r() < 0.65;
  const sleeves = (t) => { if (t === 'tank' || t === 'dress') { o.upper = 'bare'; o.fore = 'bare'; } else if (t === 'tee' || t === 'dressS' || t === 'vest' || t === 'teetie') { o.upper = 'short'; o.fore = 'bare'; } else if (t === 'hoodie' || t === 'jacket') { o.upper = 'bulk'; o.fore = 'bulk'; } else { o.upper = 'long'; o.fore = 'long'; } };
  const top = () => { const c = topCol(r, neutral); o.A = c; o.B = shade(c, 0.82); o.C = '#d0d0d4'; };
  const bottoms = (allowShorts = true, allowSkirt = false) => {
    const x = r();
    if (allowShorts && hot > 0.55 && x < (fem ? 0.2 : 0.16)) { o.thigh = 'shorts'; o.shin = 'bare'; o.pants = wpick(r, SHORTS_B); }
    else if (x < 0.5) { o.thigh = o.shin = pick(['jeans', 'jeans', 'std']); o.pants = wpick(r, JEANS_B.slice(0, 2)); }
    else { o.thigh = o.shin = 'std'; o.pants = wpick(r, JEANS_B); }
  };
  const shoes = (kind) => { o.foot = kind; o.shoeB = wpick(r, SHOES[kind]); o.shoeC = kind === 'sneaker' ? '#ffffff' : '#25252b'; };
  const backpack = () => { o.bag = 'backpack'; o.bagCol = wpick(r, BACKPACK); };
  const crossbody = () => { o.bag = 'crossbody'; o.bagCol = pick(CROSSBODY); };
  const cap = (p, colr) => { if (r() < p) { o.hat = 'cap'; o.hatCol = colr || pick(['#2b3a5c', '#23252b', '#f0eee8', '#6f7552']); } };
  switch (arch) {
    case 'tourist_f':
      o.torso = r1 < 0.5 ? 'tee' : r1 < 0.78 ? 'shirt' : 'dressS'; top(); sleeves(o.torso);
      if (o.torso === 'dressS') { const [a, b] = pick(FLORAL); o.A = a; o.B = b; o.C = shade(b, 0.9); o.thigh = o.shin = 'bare'; o.foot = 'sandal'; o.shoeB = '#e6d3b8'; o.shoeC = '#d8c4a4'; } else { bottoms(true, false); shoes(r() < 0.75 ? 'sneaker' : 'sandal'); }
      if (o.torso === 'dressS') shoes('sandal');
      crossbody(); cap(0.2); o.glassesP = 0.42; if (r() < 0.12) o.carry.camera = true; break;
    case 'tourist_m':
      o.torso = r1 < 0.55 ? 'tee' : 'shirt'; top(); sleeves(o.torso); bottoms(true); shoes('sneaker'); o.bag = r() < 0.6 ? 'belt' : null; o.bagCol = '#2e2e33'; cap(0.35); o.glassesP = 0.4; if (r() < 0.2) o.carry.camera = true; break;
    case 'follower': case 'asian': {
      o.torso = r1 < 0.45 ? 'jacket' : r1 < 0.8 ? 'tee' : 'shirt'; top(); sleeves(o.torso); bottoms(true); shoes('sneaker'); o.lanyard = true; if (r() < 0.6) backpack(); else crossbody();
      o.hat = 'cap'; o.hatCol = o2.cap || '#d94a3a'; if (arch === 'asian') { o.A = pick(['#e0685a', '#7fb6e0', '#f0eee8', '#f0cf45', '#9ac04a']); o.B = shade(o.A, 0.84); } o.glassesP = 0.3; break;
    }
    case 'guide':
      o.torso = r() < 0.6 ? 'vest' : 'jacket'; o.A = o.torso === 'vest' ? '#23252b' : o2.guideCol; o.B = o2.guideCol; o.C = '#d0d0d4'; sleeves(o.torso); if (o.torso === 'vest') { o.upper = 'short'; o.fore = 'bare'; }
      bottoms(false); shoes('sneaker'); o.lanyard = true; o.bag = r() < 0.5 ? 'crossbody' : null; o.bagCol = '#23252b'; o.hat = r() < 0.5 ? 'cap' : null; o.hatCol = o2.guideCol; o.carry.umbrella = o2.guideCol; o.glassesP = 0.35; break;
    case 'office_f':
      if (r1 < 0.4) { o.torso = 'blazerSkirt'; o.A = pick(['#3b4252', '#6b7280', '#c9b9a0', '#2b3a5c']); o.B = '#f0ede6'; o.C = '#2c303b'; o.thigh = o.shin = 'bare'; o.upper = 'long'; o.fore = 'long'; }
      else if (r1 < 0.7) { o.torso = 'blazer'; o.A = pick(['#3b4252', '#6b7280', '#c9b9a0', '#b9bcc3']); o.B = '#f0ede6'; o.C = '#f0ede6'; o.pants = '#2c303b'; o.upper = 'long'; o.fore = 'long'; }
      else { o.torso = 'shirt'; top(); o.upper = 'short'; o.fore = 'bare'; o.pants = wpick(r, [['#1f2026', 3], ['#6a6d75', 1]]); }
      o.foot = 'flat'; o.shoeB = '#25252b'; o.shoeC = '#25252b'; o.lanyard = r() < 0.4; o.bag = 'shoulder'; o.bagCol = pick(CROSSBODY); break;
    case 'office_m':
      o.torso = 'shirt'; o.A = pick(['#c7d3e2', '#f0ede6', '#b9c6de', '#d8dde6']); o.B = o.A; o.C = shade(o.A, 0.88); o.upper = 'long'; o.fore = 'roll'; o.pants = pick(['#2d3240', '#2d3240', '#4a4f5a']); o.shoeB = '#2b2a2e'; o.shoeC = '#2b2a2e'; o.foot = 'flat';
      o.lanyard = r() < 0.4; o.bag = r() < 0.4 ? 'hand' : null; o.bagCol = '#3a332e'; o.glassesP = 0.18; break;
    case 'student_f':
      o.torso = r1 < 0.8 ? 'tee' : 'jacket'; { const c = pick(['#f0eee8', '#23252b', '#e8a0b0', '#7fb6e0', '#e6dcc4', '#9a7bc0']); o.A = c; o.B = shade(c, 0.82); o.C = '#d0d0d4'; } sleeves(o.torso);
      o.thigh = o.shin = 'wide'; o.pants = pick(['#5c7ba6', '#5c7ba6', '#26324a', '#e8e4da']); shoes('sneaker'); o.shoeB = '#ecebe6'; r() < 0.55 ? crossbody() : backpack(); o.bagCol = pick(['#e6dcc4', '#23252b', '#e0513c']); break;
    case 'student_m':
      o.torso = r1 < 0.45 ? 'hoodie' : r1 < 0.75 ? 'tee' : 'track'; top(); sleeves(o.torso); o.thigh = o.shin = pick(['std', 'jeans', 'wide']); o.pants = wpick(r, JEANS_B.slice(0, 3)); shoes('sneaker'); backpack(); cap(0.25); break;
    case 'teen':
      o.torso = r1 < 0.5 ? 'tee' : r1 < 0.8 ? 'track' : 'hoodie'; { const c = pick(['#23252b', '#23252b', '#3c3f48', '#f0eee8', accentCol(r)]); o.A = c; o.B = shade(c, 0.8); o.C = '#e0dedb'; } sleeves(o.torso);
      o.thigh = o.shin = pick(['wide', 'wide', 'jeans']); o.pants = pick(['#454d5e', '#454d5e', '#26324a', '#5c7ba6']); shoes('sneaker'); r() < 0.6 ? backpack() : crossbody(); break;
    case 'mid_f':
      o.torso = r1 < 0.5 ? 'tee' : r1 < 0.8 ? 'shirt' : 'jacket'; top(); sleeves(o.torso); bottoms(true); shoes(r() < 0.5 ? 'flat' : 'sneaker'); r() < 0.7 ? (o.bag = 'shoulder', o.bagCol = pick(CROSSBODY)) : (o.bag = 'shop', o.bagCol = pick(['#f2f2ef', '#5fae4a', '#e6dcc4'])); break;
    case 'mid_m':
      o.torso = r1 < 0.5 ? 'shirt' : 'tee'; top(); if (r() < 0.12) { o.A = '#5f8aa0'; o.B = '#7a3a3a'; } sleeves(o.torso); if (o.torso === 'shirt') { o.upper = 'short'; o.fore = 'bare'; } o.thigh = o.shin = 'std'; o.pants = pick(['#6a6d75', '#6a6d75', '#bfa98a', '#4a4f5a']); shoes('flat'); o.shoeB = '#3a332e'; o.shoeC = '#2b2a2e'; cap(0.3, '#f0eee8'); o.glassesP = 0.3; o.bag = r() < 0.5 ? 'belt' : null; o.bagCol = '#2e2e33'; break;
    case 'elder_f':
      o.torso = r1 < 0.65 ? 'jacket' : 'tee'; o.A = pick(['#b9a1c6', '#cdb99a', '#9a9aa0', '#d8c8b0', '#e6dcc4', '#7d8089']); o.B = shade(o.A, 0.85); o.C = '#d8d0c4'; sleeves(o.torso); o.pants = '#3b3e4a'; o.thigh = o.shin = 'std'; o.foot = 'flat'; o.shoeB = '#75675a'; o.shoeC = '#4a4038';
      if (r() < 0.5) { o.hat = r() < 0.5 ? 'beret' : 'crochet'; o.hatCol = o.hat === 'beret' ? '#d6707d' : '#ece3cf'; } o.bag = r() < 0.7 ? 'shoulder' : 'shop'; o.bagCol = pick(['#d8b6c0', '#3fae9a', '#8a6a4a']); o.glassesP = 0.08; break;
    case 'elder_m':
      o.torso = r1 < 0.7 ? 'jacket' : 'shirt'; o.A = pick(['#b7aa8f', '#8c8f93', '#9a9aa0', '#c8b48f']); o.B = shade(o.A, 0.85); o.C = '#d8d0c4'; sleeves(o.torso); o.pants = '#666a72'; o.thigh = o.shin = 'std'; o.foot = 'flat'; o.shoeB = '#3a3530'; o.shoeC = '#2b2a2e';
      if (r() < 0.6) { o.hat = 'cap'; o.hatCol = '#c9c6bd'; } o.glassesP = 0.1; break;
    case 'parent':
      o.torso = r1 < 0.5 ? 'hoodie' : 'tee'; top(); sleeves(o.torso); bottoms(false); shoes('sneaker'); o.bag = r() < 0.4 ? 'crossbody' : null; o.bagCol = '#2b2b30'; break;
    case 'child': case 'toddler':
      o.torso = 'tee'; o.A = pick(KID_TEE); o.B = shade(o.A, 0.85); o.C = '#ffffff'; o.upper = 'short'; o.fore = 'bare';
      if (r() < 0.55) { o.thigh = 'shorts'; o.shin = 'bare'; o.pants = pick(['#2c3a55', '#7a4f9a', '#3f5a86', '#c4584d']); } else { o.thigh = o.shin = 'jeans'; o.pants = pick(['#2c3a55', '#7a4f9a', '#5c7ba6']); }
      if (fem && r() < 0.4) { o.torso = 'dressS'; o.A = pick(['#e58fb5', '#f2c230', '#a98bd0', '#3f9fd6']); o.B = '#ffffff'; o.C = '#e8563c'; o.thigh = o.shin = 'bare'; }
      o.foot = 'sneaker'; o.shoeB = pick(LIGHT_SHOES); o.shoeC = '#ffffff'; o.glassesP = 0; if (r() < 0.2) { o.hat = 'cap'; o.hatCol = pick(['#e8563c', '#3f9fd6', '#ebeaf0']); } o.bag = r() < 0.3 ? 'backpack' : null; o.bagCol = pick(['#e0513c', '#3f9fd6', '#3fae7c']); break;
    case 'courier':
      o.torso = 'vest'; o.A = '#2a2d33'; o.B = pick(['#f2a81d', '#ea6a2a']); o.C = '#d8dde2'; o.upper = 'short'; o.fore = 'bare'; o.pants = '#2a2d33'; o.thigh = o.shin = 'std'; shoes('sneaker'); o.shoeB = '#3a3a3e'; o.bag = 'courier'; o.bagCol = r() < 0.65 ? '#f2c230' : '#8a5ac0'; o.glassesP = 0.1; break;
    case 'cleaner':
      o.torso = 'vest'; o.A = '#2a2d33'; o.B = '#f2a81d'; o.C = '#e8e4da'; o.upper = 'long'; o.fore = 'long'; o.pants = '#2a2d33'; o.thigh = o.shin = 'std'; o.foot = 'flat'; o.shoeB = '#3a332e'; o.shoeC = '#2b2a2e'; o.hat = r() < 0.5 ? 'cap' : null; o.hatCol = '#f2a81d'; o.carry.broom = true; break;
    case 'police':
      o.torso = 'shirt'; o.A = '#7f8fa4'; o.B = '#e8e8ee'; o.C = '#d0d6e2'; o.upper = 'short'; o.fore = 'bare'; o.pants = '#2c3548'; o.thigh = o.shin = 'std'; o.foot = 'flat'; o.shoeB = '#26272d'; o.shoeC = '#26272d'; o.hat = 'cap'; o.hatCol = '#3a4660'; o.glassesP = 0.2; break;
    case 'staff':
      o.torso = 'vest'; o.A = '#2c3a5c'; o.B = '#f2a81d'; o.C = '#e8e8ee'; o.upper = 'long'; o.fore = 'long'; o.pants = '#2c3548'; o.thigh = o.shin = 'std'; o.foot = 'flat'; o.shoeB = '#26272d'; o.shoeC = '#26272d'; o.lanyard = true; break;
    case 'tout':
      o.torso = 'jacket'; o.A = pick(['#23252b', '#3c3f48', '#2b3a5c']); o.B = shade(o.A, 0.85); o.C = '#c9c9cf'; sleeves('jacket'); o.thigh = o.shin = 'jeans'; o.pants = '#26324a'; shoes('flat'); o.shoeB = '#2b2a2e'; cap(0.3, '#23252b'); break;
    case 'traveler_f': case 'traveler_m':
      o.torso = r1 < 0.35 ? 'jacket' : r1 < 0.7 ? 'tee' : 'hoodie'; top(); sleeves(o.torso); bottoms(true); shoes('sneaker'); r() < 0.35 ? backpack() : crossbody(); cap(0.15);
      if (r() < 0.78) o.carry.suitcase = wpick(r, SUITCASE); o.glassesP = 0.2; break;
    case 'busker':
      o.torso = 'shirt'; o.A = pick(['#23252b', '#7a2a3a', '#2b3a5c']); o.B = o.A; o.C = shade(o.A, 0.85); o.upper = 'long'; o.fore = 'long'; o.pants = '#26324a'; o.thigh = o.shin = 'jeans'; shoes('sneaker'); o.hat = 'cap'; o.hatCol = '#23252b'; o.carry.guitar = '#b5793c'; o.glassesP = 0.3; break;
    case 'painter':
      o.torso = 'vest'; o.A = '#e8e4da'; o.B = '#c9a46a'; o.C = '#3a3c42'; o.upper = 'long'; o.fore = 'long'; o.pants = '#3c3f48'; o.thigh = o.shin = 'std'; o.foot = 'flat'; o.shoeB = '#3a332e'; o.shoeC = '#2b2a2e'; o.hat = 'beret'; o.hatCol = '#2b3a5c'; o.carry.easel = true; break;
    case 'statue':
      o.torso = 'shirt'; o.A = '#d8b24a'; o.B = '#e8c860'; o.C = '#c09a38'; o.upper = 'long'; o.fore = 'long'; o.pants = '#c9a444'; o.thigh = o.shin = 'std'; o.foot = 'flat'; o.shoeB = '#c9a444'; o.shoeC = '#b08a30'; o.hat = 'bucket'; o.hatCol = '#e8c860'; o.glassesP = 0; break;
    case 'bride':
      o.torso = 'dress'; o.A = '#f4f1ea'; o.B = '#e8e2d6'; o.C = '#d8d0c4'; o.upper = 'bare'; o.fore = 'bare'; o.thigh = o.shin = 'bare'; o.foot = 'flat'; o.shoeB = '#f0ede6'; o.shoeC = '#d8d0c4'; o.glassesP = 0; o.carry.bouquet = pick(['#e8a0b0', '#f0cf45', '#f0eee8']); break;
    case 'groom':
      o.torso = 'blazer'; o.A = '#2c3548'; o.B = '#f0ede6'; o.C = '#f0ede6'; o.upper = 'long'; o.fore = 'long'; o.pants = '#2c3548'; o.thigh = o.shin = 'std'; o.foot = 'flat'; o.shoeB = '#26272d'; o.shoeC = '#26272d'; o.glassesP = 0.2; break;
    case 'guest':
      if (fem) { const [a, b] = pick(FLORAL); o.torso = 'dressS'; o.A = r() < 0.5 ? a : pick(['#7fb6e0', '#c98a96', '#9a7bc0', '#e6dcc4']); o.B = b; o.C = shade(o.B, 0.9); o.thigh = o.shin = 'bare'; o.foot = 'flat'; o.shoeB = '#e6d3b8'; o.shoeC = '#d8c4a4'; o.bag = 'hand'; o.bagCol = '#e6dcc4'; }
      else { o.torso = 'shirt'; o.A = pick(['#f0eee8', '#b9c6de', '#e6dcc4']); o.B = o.A; o.C = shade(o.A, 0.9); o.upper = 'long'; o.fore = 'roll'; o.pants = pick(['#2c3548', '#6a6d75']); o.thigh = o.shin = 'std'; o.foot = 'flat'; o.shoeB = '#26272d'; o.shoeC = '#26272d'; }
      break;
    case 'date_f': { const [a, b] = pick(FLORAL); o.torso = 'dressS'; o.A = a; o.B = b; o.C = shade(b, 0.9); o.thigh = o.shin = 'bare'; sleeves('dressS'); o.foot = 'sandal'; o.shoeB = '#e6d3b8'; o.shoeC = '#d8c4a4'; crossbody(); o.carry.bouquet = pick(['#e8a0b0', '#f0cf45']); break; }
    case 'date_m':
      o.torso = 'shirt'; o.A = pick(['#f0eee8', '#b9c6de', '#2b3a5c']); o.B = o.A; o.C = shade(o.A, 0.88); o.upper = 'long'; o.fore = 'roll'; o.pants = pick(['#2c3548', '#4a4f5a']); o.thigh = o.shin = 'std'; shoes('flat'); o.shoeB = '#26272d'; break;
    case 'sport':
      o.torso = r1 < 0.5 ? 'tank' : 'tee'; o.A = pick(['#e0685a', '#2f6fc0', '#23252b', '#d8a73a', '#5fae4a']); o.B = shade(o.A, 0.8); o.C = '#ffffff'; sleeves(o.torso); o.thigh = 'shorts'; o.shin = 'bare'; o.pants = wpick(r, LEG_B); shoes('sneaker'); cap(0.3, '#23252b'); o.glassesP = 0.3; break;
    case 'cadet':                                                    // the summer everyday uniform of the Nakhimov school: a white jumper with the blue sailor collar, black trousers, a white peakless cap
      o.torso = 'shirt'; o.A = '#f2f2ee'; o.B = '#2b3c66'; o.C = '#f2f2ee'; o.upper = 'long'; o.fore = 'long'; o.pants = '#191b21'; o.thigh = o.shin = 'std'; o.foot = 'flat'; o.shoeB = '#1c1c20'; o.shoeC = '#1c1c20'; o.hat = 'beret'; o.hatCol = '#f4f4f0'; o.glassesP = 0; break;
    case 'angler':                                                   // a fisherman of the embankments: a khaki vest over a shirt, a panama, a long rod
      o.torso = 'vest'; o.A = pick(['#8a8d86', '#7d8089', '#9a9382']); o.B = pick(['#6f7552', '#5d6248', '#77705a']); o.C = '#c9c6bd'; o.upper = 'long'; o.fore = 'roll'; o.pants = pick(['#4a4f3e', '#3b3e4a', '#5a5348']); o.thigh = o.shin = 'std';
      o.foot = 'flat'; o.shoeB = '#3a3530'; o.shoeC = '#2b2a2e'; o.hat = r() < 0.7 ? 'bucket' : 'cap'; o.hatCol = pick(['#8c8f73', '#b7aa8f', '#6f7552']); o.glassesP = 0.15; o.carry.rod = true; break;
    case 'beach_m':                                                  // a sunbather: swimming trunks (the torso takes the skin colour in makeSpec)
      o.torso = 'tank'; sleeves('tank'); o.thigh = 'shorts'; o.shin = 'bare'; o.pants = pick(['#2f6fc0', '#23252b', '#c4584d', '#3fae7c', '#28365f', '#e8892b']); o.foot = 'sandal'; o.shoeB = '#3a332e'; o.shoeC = '#2b2a2e'; o.glassesP = 0.45; cap(0.2); break;
    case 'beach_f':                                                  // a sunbather: a swimsuit top and beach shorts
      o.torso = 'tank'; sleeves('tank'); o.A = pick(['#e0685a', '#2f6fc0', '#f0cf45', '#23252b', '#3fae9a', '#e58fb5', '#f0eee8']); o.B = shade(o.A, 0.86); o.C = '#ffffff'; o.thigh = 'shorts'; o.shin = 'bare'; o.pants = pick(['#e8e4da', '#5c7ba6', o.A, '#23252b']);
      o.foot = 'sandal'; o.shoeB = '#e6d3b8'; o.shoeC = '#d8c4a4'; o.glassesP = 0.5; if (r() < 0.25) { o.hat = 'bucket'; o.hatCol = '#f0ede6'; } break;
    default: break;
  }
  // summer layers: a light jacket worn (cooler hours) or tied round the waist
  const nonLayer = ['cadet', 'angler', 'beach_m', 'beach_f', 'child', 'toddler', 'parent', 'courier', 'cleaner', 'police', 'staff', 'bride', 'groom', 'guest', 'date_f', 'date_m', 'statue', 'painter', 'busker', 'guide', 'follower', 'asian', 'elder_f', 'elder_m', 'office_f', 'office_m'];
  if (layerWorn && o.torso === 'tee' && !nonLayer.includes(arch)) {
    if (r() < 0.55) { o.torso = 'jacket'; o.A = pick(['#6d8fb8', '#4a5a3e', '#28365f', '#b7aa8f', '#23252b', '#7d8089']); o.B = shade(o.A, 0.85); o.C = '#c9c9cf'; sleeves('jacket'); }
    else { o.torso = 'teetie'; o.upper = 'short'; o.fore = 'bare'; }
  }
  if (hot < 0.5 && o.upper === 'short' && !['dress', 'dressS', 'vest', 'bride', 'statue'].includes(o.torso) && !nonLayer.includes(arch) && r() < 0.5) { o.torso = 'jacket'; o.A = pick(['#6d8fb8', '#23252b', '#4a5a3e']); o.B = shade(o.A, 0.85); sleeves('jacket'); }
  if (hot < 0.6 && o.thigh === 'shorts' && arch !== 'child' && arch !== 'sport') { o.thigh = o.shin = 'std'; o.pants = '#3f5a86'; }
  return o;
}

// ------------------------------------------------------------------ the spec
/** opts: { role, arch, age, fem, vehicle, hot (0..1), weights, cap (group cap colour), guideCol (umbrella colour), suitcase (true | false | hex), dog, pram } -> spec (see contract.js) */
export function makeSpec(r, opts = {}) {
  const role = opts.role || 'walk', hot = opts.hot ?? 0.7;
  let archId = opts.arch || wpick(r, ROLE_ARCH[role] || ROLE_ARCH.walk);
  if (role === 'walk' && opts.age === 'elder') archId = wpick(r, ROLE_ARCH.elder);
  const A0 = ARCH_BY[archId] || ARCH_BY.tourist_m;
  let age = opts.age || A0.age;
  let fem = opts.fem ?? (A0.fem ?? (archId === 'parent' ? r() < 0.78 : r() < 0.54));
  if (archId === 'toddler') age = 'child';
  const toddler = archId === 'toddler';
  // group, skin, hair, height
  let group = wpick(r, opts.weights ? Object.entries(opts.weights) : GROUPS); if (archId === 'asian') group = 'east';
  const skin = archId === 'statue' ? '#d9b24a' : r() < 0.2 ? wpick(r, SKIN_ALL) : wpick(r, SKIN_BY[group] || SKIN_ALL);
  let hairCol = age === 'elder' ? wpick(r, GREY) : group === 'slavic' ? wpick(r, HAIR_SLAVIC) : wpick(r, HAIR_DARK);
  if (age === 'adult' && r() < 0.06) hairCol = wpick(r, GREY);
  if (fem && age !== 'elder' && r() < 0.045) hairCol = wpick(r, FANCY);
  if (archId === 'statue') hairCol = '#c9a444';
  let h;
  if (age === 'child') h = toddler ? 0.85 + r() * 0.17 : 1.12 + r() * 0.36;
  else if (age === 'teen') h = (fem ? 1.58 : 1.68) + gauss(r) * 0.045;
  else h = (fem ? 1.65 : 1.77) + gauss(r) * (fem ? 0.06 : 0.065) - (age === 'elder' ? 0.03 : 0);
  h = Math.max(age === 'child' ? 0.82 : 1.5, Math.min(age === 'child' ? 1.5 : 1.85, h));
  const kidT = age === 'child' ? Math.max(0, Math.min(1, (h - 0.85) / 0.65)) : 1;          // 0 toddler .. 1 12 y
  const headK = age === 'child' ? 1.5 - 0.15 * kidT : age === 'teen' ? 1.14 : 1.07 + r() * 0.05, legK = age === 'child' ? 0.88 + 0.08 * kidT : 1;
  const heightRef = (H.thigh + H.shin) * legK + H.ankle + H.neck + H.head * headK, sc = h / heightRef;
  const build = r(), wid = age === 'child' ? 0.86 + 0.06 * kidT : (fem ? 0.95 + r() * 0.05 : 1.0 + r() * 0.07) * (build < 0.15 ? 1.1 : build > 0.95 ? 0.92 : 1) * (age === 'elder' ? 1.04 : 1);
  // vehicle
  let vehicle = opts.vehicle || null;
  if (!vehicle && role === 'rider') vehicle = archId === 'teen' ? (r() < 0.55 ? 'escooter' : 'bike') : (r() < 0.55 ? 'bike' : 'escooter');
  // outfit
  const o2 = { cap: opts.cap, guideCol: opts.guideCol || '#d33a2a' };
  const o = outfit(r, archId, fem, age, hot, r() < 0.3, o2);
  if (opts.suitcase === true && !o.carry.suitcase) o.carry.suitcase = wpick(r, SUITCASE); else if (typeof opts.suitcase === 'string') o.carry.suitcase = opts.suitcase; else if (opts.suitcase === false) delete o.carry.suitcase;
  if (opts.bouquet && !o.carry.bouquet) o.carry.bouquet = opts.bouquet;
  if (o.carry.suitcase && age === 'child') delete o.carry.suitcase;
  // hair style (S7)
  let hair;
  if (age === 'child') hair = fem ? wpick(r, [['pigtails', 3], ['pony', 3], ['bob', 3], ['long', 2], ['crop', 1]]) : wpick(r, [['crop', 5], ['short', 4]]);
  else if (fem) hair = age === 'elder' ? wpick(r, [['bob', 4], ['bun', 3], ['crop', 3], ['long', 1]]) : wpick(r, [['long', 30], ['pony', 12], ['bun', 10], ['bob', 18], ['crop', 4], ['halfup', 6]]);
  else hair = wpick(r, [['short', 55], ['crop', 30], ['bald', age === 'elder' ? 22 : 3]]);
  let headStyle = hair;
  if (o.hat === 'cap') headStyle = 'cap'; else if (o.hat === 'beret') headStyle = 'beret'; else if (o.hat === 'crochet') headStyle = 'crochet'; else if (o.hat === 'bucket') headStyle = 'bucket';
  else if (age !== 'child' && r() < (age === 'elder' ? 0.04 : 0.04) && o.hat === null && hair !== 'long' && archId !== 'bride' && archId !== 'groom') { headStyle = 'bucket'; o.hat = 'bucket'; o.hatCol = '#f0ede6'; }
  // face
  const fam = group === 'slavic' && r() < 0.15 ? 3 : Math.floor(r() * 3);
  let face, faceG = -1;
  if (age === 'child') { face = FACE.girl + (fem ? 0 : 2) + (r() < 0.5 ? 0 : 1); }
  else if (age === 'elder') { face = (fem ? FACE.elderF : FACE.elderM) + (r() < 0.5 ? 0 : 1); }
  else { face = (fem ? FACE.f : FACE.m) + fam; faceG = FACE.glasses + (face - 0); }
  const glasses = age !== 'child' && r() < o.glassesP * (hot > 0.5 ? 1 : 0.4) && faceG >= 0;
  // radius / speed (S: free walking 1.35, young 1.55, elderly 1.15, strolling tourists 0.85-0.9, office 1.45, couriers 1.6)
  const touristy = archId === 'tourist_f' || archId === 'tourist_m' || archId === 'follower' || archId === 'asian' || archId === 'guide';
  const speedBase = age === 'child' ? 1.15 + r() * 0.3 : age === 'elder' ? 1.0 + r() * 0.2 : age === 'teen' ? 1.4 + r() * 0.2 : touristy ? 0.95 + r() * 0.25 : archId === 'office_f' || archId === 'office_m' ? 1.4 + r() * 0.2 : archId === 'courier' ? 1.55 + r() * 0.15 : 1.3 + r() * 0.2;
  let rad = (age === 'child' ? 0.17 : 0.23) * (wid > 1.05 ? 1.1 : 1), speed = speedBase * (1 + (r() - 0.5) * 0.24);
  const pram = archId === 'parent' || opts.pram === true;
  if (pram) { rad = 0.42; speed = 1.0 + r() * 0.2; }
  if (o.carry.suitcase) { rad = Math.max(rad, 0.34); speed *= 0.93; }
  if (vehicle === 'bike') { rad = 0.45; speed = 3.2 + r() * 0.8; } else if (vehicle === 'escooter') { rad = 0.35; speed = 3.8 + r() * 0.8; } else if (vehicle === 'kick') { rad = 0.3; speed = 2.0 + r() * 0.8; } else if (vehicle === 'balance') { rad = 0.3; speed = 1.3 + r() * 0.4; }
  const dog = opts.dog === true || role === 'dogwalker' ? { kind: wpick(r, [['spitz', 3], ['poodle', 2], ['terrier', 3], ['laika', 2]]) } : null;
  const phone = age !== 'elder' && age !== 'child' ? r() < 0.16 : false;                 // S5: at most ~18 % head-down
  const bag = vehicle ? (o.bag === 'backpack' || o.bag === 'courier' ? o.bag : null) : o.bag;
  const spec = {
    id: -1, arch: archId, role, age, fem, h, r: rad, speed, vehicle, pram, dog, seed: r() * 1000, phone, glasses, hat: o.hat, bag,
    eats: age === 'child' ? r() < 0.35 : r() < 0.14, smokes: age === 'adult' && (role === 'office' ? r() < 0.4 : r() < (fem ? 0.04 : 0.1)), guide: archId === 'guide',
    look: {
      group, sc, headK, legK, wid, torso: o.torso, upper: o.upper, fore: o.fore, thigh: o.thigh, shin: o.shin, foot: o.foot, head: headStyle, face, faceG: glasses ? faceG : face, faceN: face,
      skin, hair: lift(hairCol), A: lift(o.A), B: lift(o.B), C: lift(o.C), pants: lift(o.pants), shoeB: lift(o.shoeB), shoeC: lift(o.shoeC), hatCol: lift(o.hatCol), bagCol: lift(o.bagCol), lanyard: o.lanyard && !vehicle,
      handBag: bag === 'hand' || bag === 'shop' ? (bag === 'shop' ? 'shopbag' : 'handbag') : null, back: bag === 'backpack' ? 'backpack' : bag === 'courier' ? 'courier' : bag === 'crossbody' || bag === 'shoulder' ? 'crossbody' : bag === 'belt' ? 'belt' : null,
      vehicleCol: vehicle === 'bike' ? ['#2f7f74', '#c8453c', '#3466b0', '#e8b93a', '#5d6670', '#8a5aa0', '#2b2f36'][Math.floor(r() * 7)] : vehicle === 'kick' || vehicle === 'balance' ? ['#e8563c', '#3f9fd6', '#3fae7c', '#f2c230', '#d9569a'][Math.floor(r() * 5)] : '#ffffff',
      dogCol: dog ? ({ spitz: '#ece6da', poodle: '#3a3030', terrier: '#c9a66b', laika: '#cfcac0' }[dog.kind]) : null, dogK: dog ? ({ spitz: 0.85, poodle: 0.9, terrier: 0.8, laika: 1.2 }[dog.kind]) : 1,
      sitStyle: Math.floor(r() * 4), kneeSpread: fem ? 0.0 : 0.05 + r() * 0.1, carryHand: o.bag === 'hand' || o.bag === 'shop', carry: o.carry,
    },
  };
  if (archId === 'beach_m') { spec.look.A = spec.look.B = spec.look.C = skin; }               // bare-chested: the tank top takes the skin colour
  if (archId === 'beach_m' || archId === 'beach_f' || archId === 'cadet' || archId === 'angler') { if (archId !== 'beach_f') spec.phone = false; spec.eats = false; spec.smokes = false; }
  return spec;
}
export { lum };
