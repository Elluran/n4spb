// shops.js - shop fascias, awnings, doors and address plates of the ground floor.
//   * Every shop unit that walls.js laid out on a shop wall (w.units: pier to pier) gets a fascia sign above the glass (the dark board band is painted by the wall shader, the lettering is
//     geometry here: one atlas, a few draw calls). Names come from POIS (real small-business names); known chains / brands and every Latin-script name are replaced by invented generic
//     names of the matching category (docs/research/streets.md section 8: no corporate logos, plain wordmarks, generic pictograms).
//   * Awnings: dark-red / green / cream fabric boxes over the cafe / restaurant / bar / hotel units (nevsky.md section 11), instanced, only where the pavement is wide enough.
//   * Shop doors and parade doors are painted by the shader; this file only registers them as entrances (people use them) and adds the blue address plates (street abbreviation +
//     house number, 3.5-4 m above the pavement at the corner) with the SignAtlas.
import * as THREE from 'three';
import { POIS } from '../data/city.js';
import { hash01 } from '../lib/massing.js';
import * as LAY from '../layout.js';
import { templateOf, stamp, cellOf } from './meshes.js';
import { labelRegistry } from './slots.js';

const NEVSKY_RE = /Невск/;
const BRAND = /(альфа|втб|сбер|тинькофф|открытие|райффайзен|газпром|росбанк|почта банк|россельхоз|юнистрим|дикси|пят[её]рочка|магнит|лента|перекр[её]сток|билла|spar|вкусвилл|азбука|билайн|мтс|мегафон|теле2|связной|евросеть|днс|dns|эльдорадо|м\.?видео|ситилинк|горздрав|ригла|36[.,]6|аптека\s*апрель|буквоед|читай|республика|терем|теремок|додо|ростик|rostic|subway|сабвей|синнабон|cinnabon|шоколадница|макдоналдс|бургер|burger|kfc|starbucks|cofix|кофикс|coffee ?house|кофе ?хаус|кофемания|крошка|штолле|stolle|тануки|якитория|л'?этуаль|рив ?гош|иль ?де|ив ?роше|yves|natura|sunlight|санлайт|bristol|бристоль|красное|ecco|zara|h&m|mango|adidas|nike|colin|lee\b|intimissimi|tezenis|calzedonia|incanto|befree|oggi|ostin|остин|gloria|глория|sela|zarina|kari|carl'?s|ikea|ашан|оптика|линзасити|ленинградск|петербургская ?сбытовая)/i;
const GENERIC = {
  cafe: ['Кофейня «Зерно»', 'Кофе с собой', 'Кофейня «Фонтанка»', 'Чайная лавка', 'Кафе «Невский»', 'Пышечная', 'Булочная №5', 'Пекарня «Утро»', 'Блинная «Масленица»', 'Кондитерская «Эклер»', 'Пироги и чай', 'Вафли и сырники'],
  restaurant: ['Ресторан «Адмиралтейский»', 'Ресторан «Белые ночи»', 'Грузинская кухня', 'Стейк-хаус «Север»', 'Пельменная', 'Столовая №1', 'Чайхона «Восток»', 'Пицца и паста'],
  fast_food: ['Шаурма 24', 'Бургерная', 'Пельменная', 'Пышечная', 'Блинная «Масленица»', 'Вафли и сырники', 'Хлебник'],
  bar: ['Паб «Старый порт»', 'Пивной бар', 'Винотека', 'Рюмочная'],
  pub: ['Паб «Старый порт»', 'Пивной бар', 'Винотека'],
  pharmacy: ['Аптека 24', 'Аптека', 'Аптека «Здоровье»'],
  bank: ['Банк', 'Банк «Невский»', 'Банк «Северный»'],
  atm: ['Банкомат'],
  clothes: ['Магазин одежды «Север»', 'Одежда', 'Мода', 'Одежда и аксессуары'],
  shoes: ['Обувь', 'Обувной салон'],
  bag: ['Сумки', 'Кожа и аксессуары'],
  gift: ['Сувениры', 'Подарки «Петербург»', 'Матрёшки и открытки', 'Янтарь'],
  florist: ['Цветы', 'Цветочная лавка'],
  books: ['Книги', 'Книжная лавка'],
  jewelry: ['Ювелирный салон', 'Янтарь', 'Скупка золота'],
  beauty: ['Салон красоты', 'Барбершоп', 'Ногти и брови'],
  hairdresser: ['Парикмахерская', 'Барбершоп', 'Салон красоты'],
  supermarket: ['Продукты 24 часа', 'Мини-маркет', 'Универсам'],
  convenience: ['Продукты 24 часа', 'Мини-маркет', 'Продукты'],
  bakery: ['Булочная №5', 'Пекарня «Утро»', 'Хлебник'],
  confectionery: ['Кондитерская «Эклер»', 'Шоколад и конфеты', 'Мармеладная лавка'],
  travel_agency: ['Экскурсии и билеты', 'Круизы и визы', 'Горящие туры'],
  hotel: ['Отель', 'Мини-отель «Лиговский»', 'Гостиница'], hostel: ['Хостел «Центр»', 'Хостел'],
  mobile_phone: ['Салон связи', 'Телефоны'], electronics: ['Электроника', 'Ремонт электроники'], tobacco: ['Табак'], optician: ['Оптика'], pawnbroker: ['Ломбард'],
  default: ['Магазин', 'Сувениры', 'Подарки «Петербург»', 'Часы', 'Антиквариат', 'Фотопечать', 'Ключи и часы', 'Химчистка', 'Прокат самокатов', 'Печать на футболках', 'Нумизматика', 'Ремонт обуви'],
};
const ICON = { cafe: 'cup', restaurant: 'cup', fast_food: 'cup', pharmacy: 'cross', hairdresser: 'scissors', beauty: 'scissors', jewelry: 'gem', clothes: 'bag', shoes: 'bag', bag: 'bag', supermarket: 'bag' };
const AWN_SUB = new Set(['cafe', 'restaurant', 'bar', 'pub', 'fast_food', 'hotel', 'hostel', 'confectionery', 'bakery']);
const KIND_OK = new Set(['shop', 'amenity', 'tourism', 'craft']);
const SUB_OK = /^(cafe|restaurant|fast_food|pharmacy|bank|bar|pub|hookah_lounge|post_office|atm|cinema|theatre|hotel|hostel|guest_house|clothes|shoes|bag|gift|florist|books|jewelry|beauty|hairdresser|supermarket|convenience|bakery|confectionery|travel_agency|mobile_phone|electronics|tobacco|optician|pawnbroker|antiques|art|toys|tea|alcohol|cosmetics|perfumery|photo|copyshop|ticket|souvenir|general|houseware|games|computer|variety_store|massage|electronics_repair|ice_cream)$/;
const STYLES_NEV = [{ bg: '#25221f', fg: '#f0e6cf' }, { bg: '#1f2326', fg: '#f4f1e8' }, { bg: '#3a2a22', fg: '#e8d8b0' }, { bg: '#e9e2d0', fg: '#2a2622' }, { bg: '#1e3a2a', fg: '#efe8d0' }, { bg: '#4a1f26', fg: '#f3e6d0' }];
const STYLES_COL = [{ bg: '#c8202a', fg: '#ffffff' }, { bg: '#1b4fa8', fg: '#ffffff' }, { bg: '#1d8f4c', fg: '#ffffff' }, { bg: '#f28c00', fg: '#1b1b1b' }, { bg: '#e8e2d2', fg: '#3b2a24' }];
const AWNING = [['#8c1d2e', 55], ['#2f5d3a', 18], ['#d8cfb8', 12], ['#1d2026', 9], ['#2d4f7a', 6]];

function usablePoi(p) {
  if (!p.name || !KIND_OK.has(p.kind)) return false;
  if (p.kind === 'amenity' || p.kind === 'tourism' || p.kind === 'shop' || p.kind === 'craft') return SUB_OK.test(p.sub || '') || p.kind === 'shop';
  return true;
}
const SKIP_BLDG = new Set(['r15081493', 'r15081487', 'r15081488']);
const cleanName = (n) => { let t = n.replace(/[«»"“”]/g, '').replace(/\s+/g, ' ').trim().split(/[,(]/)[0].trim(); if (t.length > 26) t = t.slice(0, 26).replace(/\s+\S*$/, ''); return t; };
const isBrandName = (n) => BRAND.test(n) || /[A-Za-z]{3}/.test(n);
const pickGeneric = (sub, h) => { const l = GENERIC[sub] || GENERIC.default; return l[Math.floor(h * l.length) % l.length]; };

const ABBR = [[/проспект/i, 'пр.'], [/улица/i, 'ул.'], [/переулок/i, 'пер.'], [/набережная/i, 'наб.'], [/площадь/i, 'пл.']];
function plateText(street) {
  let kind = '', main = street || '';
  for (const [re, ab] of ABBR) if (re.test(main)) { kind = ab; main = main.replace(re, '').trim(); break; }
  return { top: (main + ' ' + kind).trim().toUpperCase(), kind, main };
}

export function buildShops(ctx, { M, info, atlas, avoid = [], net = null }) {
  const byB = new Map();
  for (const p of POIS) if (p.bldg && !SKIP_BLDG.has(p.bldg) && usablePoi(p)) { let a = byB.get(p.bldg); if (!a) byB.set(p.bldg, (a = [])); a.push(p); }
  const awnings = [];
  const entrances = [];
  const labels = labelRegistry(ctx);                                    // facade slots (slots.js): nothing is drawn on a rectangle another label already holds
  let nSigns = 0, nAwn = 0, nPlates = 0, tris = 0, nSkipSign = 0, nSkipAwn = 0, nSkipPlate = 0;
  const F = ctx.tex.FONTS;
  info = info.slice().sort((p, q) => { const a = cellOf(p.st.ob.cx, p.st.ob.cz), b2 = cellOf(q.st.ob.cx, q.st.ob.cz); return a < b2 ? -1 : a > b2 ? 1 : 0; });          // atlas pages fill cell by cell: a cell touches 1-2 pages
  for (const rec of info) {
    const { b, st } = rec;
    const units = [];                                                              // u.s / u.door / d.s are LOCAL to w.a (walls.js: w.a already includes s0 along the edge). The checkpoint-44 'fix' subtracted w.s0 again: every sub-wall that does not start at the edge start (>30 m split, party-wall pieces, behind arches) got its signs / awnings / entrances moved s0 metres BACK, on top of the first sub-wall's: the crossing shop signs
    for (const w of rec.walls) if (w.shop && !w.hole && w.units.length) for (const u of w.units) units.push({ w, u, x: w.a[0] + w.dx * u.s, z: w.a[1] + w.dz * u.s });
    if (!units.length) continue;
    // assign the building's POIs to the nearest free unit (closest pairs first)
    const pois = (byB.get(b.id) || []).slice();
    const pairs = [];
    pois.forEach((p, pi) => units.forEach((q, ui) => pairs.push({ pi, ui, d: Math.hypot(p.x - q.x, p.z - q.z) })));
    pairs.sort((a, c) => a.d - c.d);
    const takenP = new Set(), takenU = new Map();
    for (const pr of pairs) { if (takenP.has(pr.pi) || takenU.has(pr.ui) || pr.d > 28) continue; takenP.add(pr.pi); takenU.set(pr.ui, pois[pr.pi]); }
    units.forEach((q, ui) => {
      const { w, u } = q;
      if (LAY.inRiver(q.x, q.z) || LAY.inRiver(q.x + w.nx * 1.6, q.z + w.nz * 1.6) || LAY.inRiver(q.x - w.nx * 0.6, q.z - w.nz * 0.6)) return;     // never over the Fontanka
      if (avoid.some((a) => Math.hypot(a.x - q.x, a.z - q.z) < a.r)) return;                   // facades of landmark groups / metro portals: the owner draws its own signs
      const nev = w.street && NEVSKY_RE.test(w.street.name);
      const hs = hash01(b.id + ':sg:' + w.id + ':' + ui);
      const poi = takenU.get(ui);
      let text, sub = poi ? poi.sub : null, real = false;
      const mainSt = w.street && /Невск|Лиговск|Владимирск|Литейн|Марата|Маяковского|Пушкинск/.test(w.street.name);
      if (poi && !isBrandName(poi.name) && hs < (nev ? 0.72 : mainSt ? 0.55 : 0.28)) { text = cleanName(poi.name); real = true; }
      else {
        if (!poi && hs > (nev ? 0.97 : w.street && /Лиговск|Владимирск|Литейн|Марата|Маяковского|Пушкинск/.test(w.street.name) ? 0.9 : 0.78)) text = null;
        else {
          if (!sub) { const keys = ['cafe', 'default', 'clothes', 'gift', 'convenience', 'default', 'restaurant', 'beauty', 'pharmacy', 'travel_agency', 'shoes', 'bank', 'bakery', 'jewelry']; sub = keys[Math.floor(hash01(b.id + ':k' + ui + w.id) * keys.length)]; }
          text = pickGeneric(sub, hash01(b.id + ':g' + ui + w.id));
        }
      }
      const yBand = w.base + w.plinth + w.G;
      if (text) {
        const want = Math.min(u.w - 0.4, Math.max(2.0, text.length * 0.31 + 1.1));
        const W = [6.2, 5.0, 4.0, 3.0, 2.2, 1.8, 1.4].find((q) => q <= want + 0.05) || 0, hh = 0.62;
        let style;
        const h2 = hash01(text);
        if (sub === 'pharmacy') style = { bg: '#f0efe8', fg: '#1d8f4c' };
        else if (sub === 'bank' || sub === 'atm') style = { bg: '#e9e9e4', fg: '#1b4fa8' };
        else if (nev || h2 < 0.55) style = STYLES_NEV[Math.floor(h2 * 7919) % STYLES_NEV.length];
        else style = STYLES_COL[Math.floor(h2 * 7919) % STYLES_COL.length];
        if (W && W <= u.w - 0.15 && labels.reserve(b.id, q.x + w.nx * 0.035, yBand - 0.57, q.z + w.nz * 0.035, W, hh, w.nx, w.nz, 'shop')) {
        const o = { text, bg: style.bg, fg: style.fg, w: W, h: hh, pxH: 40, maxW: 560, font: h2 > 0.7 ? F.serif : F.round, weight: h2 > 0.7 ? 700 : 600 };
        if (ICON[sub] && h2 < 0.35 && W > 3) o.icon = ICON[sub];
        const r = atlas.add(o);
        atlas.quad(r, q.x + w.nx * 0.035, yBand - 0.57, q.z + w.nz * 0.035, w.nx, w.nz, W, hh, false, { b: b.id, w: w.id, u: ui }); nSigns++; tris += 2;
        } else nSkipSign++;
      }
      // awning over cafes / restaurants / hotels (and a few shops), only with a wide enough pavement
      const padW = (w.street ? 3 + Math.max(0, w.street.gap) : 3);
      const proj = Math.min(1.3, padW - 1.5);
      // an awning projects 1.3 m: near a wall corner it would hang through the awning / pipes of the perpendicular wall, so it starts proj + 0.1 m away from a corner
      const q0 = (w.flags & 16) ? Math.max(u.s - u.w / 2 + 0.15, proj + 0.1) : u.s - u.w / 2 + 0.15, q1 = (w.flags & 32) ? Math.min(u.s + u.w / 2 - 0.15, w.len - proj - 0.1) : u.s + u.w / 2 - 0.15;
      if (proj > 0.7 && q1 - q0 > 1.6 && !w.gate && !(net && net.coverAt(w.a[0] + w.dx * (q0 + q1) / 2 + w.nx * 1.0, w.a[1] + w.dz * (q0 + q1) / 2 + w.nz * 1.0, rec.bi, 0))) {
        const pA = AWN_SUB.has(sub) ? (nev ? 0.75 : 0.5) : (nev ? 0.12 : 0.06);
        if (hash01(b.id + ':aw' + ui + w.id) < pA && (labels.reserve(b.id, w.a[0] + w.dx * (q0 + q1) / 2, yBand - 1.5, w.a[1] + w.dz * (q0 + q1) / 2, q1 - q0, 1.0, w.nx, w.nz, 'awning', proj) || (nSkipAwn++, false))) {
          const col = AWNING.reduce((acc, [c, wt]) => { acc.t += wt; acc.l.push([c, acc.t]); return acc; }, { t: 0, l: [] });
          const x = hash01(b.id + ':ac' + ui) * col.t; const chosen = col.l.find(([, t]) => x < t)[0];
          awnings.push({ x: w.a[0] + w.dx * (q0 + q1) / 2, y: yBand - 1.0, z: w.a[1] + w.dz * (q0 + q1) / 2, rotY: Math.atan2(w.nx, w.nz), sx: q1 - q0, sy: 1, sz: proj, color: chosen }); nAwn++;
        }
      }
      entrances.push({ x: w.a[0] + w.dx * u.door + w.nx * 0.6, z: w.a[1] + w.dz * u.door + w.nz * 0.6, rotY: Math.atan2(w.nx, w.nz), bldg: b.id });
    });
  }
  // address plates + parade-door entrances
  for (const rec of info) {
    const { b, st } = rec;
    for (const w of rec.walls) { if (w.gate) continue; for (const d of w.doors) entrances.push({ x: w.a[0] + w.dx * d.s + w.nx * 0.6, z: w.a[1] + w.dz * d.s + w.nz * 0.6, rotY: Math.atan2(w.nx, w.nz), bldg: b.id }); }
    const no = b.addr && b.addr.no; if (!no) continue;
    // plate on the first street wall (longest), left end; a second plate with the cross street on a corner
    const sw = rec.walls.filter((w) => w.street && !w.hole && !w.gate && w.len > 2).sort((a, c) => c.len - a.len);
    if (!sw.length) continue;
    const w = sw[0];
    if (labels.has(b.id, 'number') || labels.has(b.id, 'plate-city')) { nSkipPlate++; continue; }          // streets/plates.js already hangs this house's number plate
    const txt = String(no).replace(/\s+/g, '').slice(0, 8);
    const { top } = plateText(b.addr.street || (w.street && w.street.name) || '');
    const W = 0.62, H = 0.32;
    const r = atlas.add({ text: txt, top, bg: '#1f3d94', fg: '#f4f6f8', border: '#eef1f4', w: W, h: H, pxH: 40, weight: 700, font: F.sans });
    const yP = w.base + w.plinth + w.G + 0.75;
    const s = Math.min(w.len - 0.45, 0.6);
    if (!labels.reserve(b.id, w.a[0] + w.dx * s + w.nx * 0.04, yP, w.a[1] + w.dz * s + w.nz * 0.04, W, H, w.nx, w.nz, 'plate-city')) { nSkipPlate++; continue; }
    atlas.quad(r, w.a[0] + w.dx * s + w.nx * 0.04, yP, w.a[1] + w.dz * s + w.nz * 0.04, w.nx, w.nz, W, H); nPlates++; tris += 2;
  }
  // awning geometry: a sloped fabric box (unit width, depth, 1): top slope from the wall (y 0) down to the front (y -0.5), valance 0.3 tall, side triangles
  const g = new THREE.BufferGeometry();
  const P = [[-0.5, 0, 0], [0.5, 0, 0], [0.5, -0.5, 1], [-0.5, -0.5, 1], [-0.5, -0.82, 1], [0.5, -0.82, 1]];
  const pos = [], nrm = [], idx = [];
  const tri = (a, b2, c, n) => { const i = pos.length / 3; for (const q of [a, b2, c]) { pos.push(...P[q]); nrm.push(...n); } idx.push(i, i + 1, i + 2); };
  tri(0, 3, 2, [0, 0.9, 0.45]); tri(0, 2, 1, [0, 0.9, 0.45]);                      // slope (up-facing)
  tri(3, 4, 5, [0, 0, 1]); tri(3, 5, 2, [0, 0, 1]);                                 // valance
  tri(0, 1, 2, [0, -0.5, -0.9]); tri(0, 2, 3, [0, -0.5, -0.9]);                    // underside
  tri(0, 3, 4, [-1, 0, 0]); tri(1, 5, 2, [1, 0, 0]);                                // sides (valance + slope corners)
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setIndex(idx);
  const awT = templateOf(g);
  for (const a of awnings) stamp(M.fine(a.x, a.z), awT, a);
  tris += nAwn * 8;
  return { triangles: tris, signs: nSigns, awnings: nAwn, plates: nPlates, skipped: { signs: nSkipSign, awnings: nSkipAwn, plates: nSkipPlate }, entrances };
}
