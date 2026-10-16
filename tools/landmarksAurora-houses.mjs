// landmarksAurora-houses: writes docs/research/aurora-houses.json = the ORDINARY houses around the Petrovskaya / Petrogradskaya embankment sights that `landmarksAurora` does not model
// (same shape as nikolsky-houses.json: the city owner turns it into KNOWN houses).  Curated entries come from the dossier docs/research/aurora.md and its photos; the rest of the
// buildings of the window get an entry from the OSM tags only.   node tools/landmarksAurora-houses.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const { unproj } = await import(pathToFileURL(path.join(root, 'tools/osm-lib.mjs')).href);
const WIN = { x0: -1260, x1: -800, z0: -2700, z1: -2230 };
const MINE = new Set(['r3272566', 'w28712204', 'w28712275', 'w1229214445', 'w486091825']);

const CUR = {
  w28712261: { addr: 'Петровская наб., 8 / Мичуринская ул., 1', name: 'Дом военморов (жилой дом Балтийского флота)', storeys: 7, hCornice: 27, style: 'сталинский неоклассицизм', era: '1938-1940 (Е. А. Левинсон, И. И. Фомин)',
    wall: '#d8c9a4', trim: '#e6dcc0', roof: '#6f6a62', conf: 'M', photos: ['74_lions_descent_voenmor'],
    notes: 'длинный (около 200 м) главный фасад вдоль Петровской набережной за газоном с липами; гранитный цоколь, рустованный низ, гигантские пилястры и лоджии в центре, аттик со скульптурными группами моряков над центральной частью, барельефы; тёплая песочная штукатурка. Мемориальные доски П. Ф. Папковичу и Ж. И. Алфёрову [OSM].' },
  w28712142: { addr: 'Петровская наб., 4', name: '«Дворянское гнездо»', storeys: 8, hCornice: 27, style: 'советский модернизм (жилой дом для элиты)', era: '1964 (Н. В. Баранов, В. М. Фромзель)',
    wall: '#cfd2cf', trim: '#e8e8e2', roof: '#7a7d80', conf: 'M', photos: ['50_cabin_0198'],
    notes: 'протяжённый светло-серый дом за садом Домика Петра: ровная сетка окон и застеклённых лоджий, плоская кровля; виден над футляром Домика. Мемориальные доски К. Ю. Лаврову, Ф. А. Абрамову, Е. А. Лебедеву, В. М. Орешникову [OSM]; рядом памятник Г. А. Товстоногову (2011).' },
  w28712281: { addr: 'Петровская наб., 2 к1', name: 'Дворец великого князя Николая Николаевича младшего', storeys: 3, hCornice: 16, style: 'неоклассицизм', era: '1910-1913 (А. С. Хренов)',
    wall: '#ece6d6', trim: '#f4f1e8', roof: '#4f8a6a', conf: 'M', photos: ['72_lions_pier_0265', '86_nn_palace'],
    notes: 'белый дворец у Троицкого моста: скруглённый угол-ротонда с колоннами и зелёным медным куполом, колонные портики, балюстрада на карнизе; ныне представительство полномочного представителя Президента в СЗФО. БЕЗ флага на куполе (правило сцены).' },
  w250815303: { addr: 'Петровская наб., 2 к2', name: null, storeys: 6, hCornice: 23, style: 'доходный дом / неоклассика', era: 'нач. XX в.', wall: '#e2d6b8', trim: '#f0eadb', roof: '#6b6f72', conf: 'L', photos: [], notes: 'шестиэтажный корпус позади дворца великого князя; светлая штукатурка.' },
  r11169679: { addr: 'Пеньковая ул., 1', name: 'Нахимовское училище, новый учебный корпус', storeys: 5, hCornice: 21, style: 'стилизация под петровское барокко', era: '2017-2018',
    wall: '#6db7e6', trim: '#f1f0ea', roof: '#57504f', conf: 'M', photos: ['01_aurora_port_2026'],
    notes: 'новый корпус с внутренним двором: голубые стены с белыми лопатками и наличниками, серо-зелёный низ, тёмная кровля с переломом: «единый ансамбль» с историческим Училищным домом (w28712204, его рисует landmarksAurora). Бюсты Ф. Ф. Ушакова и П. С. Нахимова у входа с Пеньковой улицы [OSM].' },
  r16206038: { addr: 'Пеньковая ул., 1 с2', name: 'Нахимовское училище, корпус', storeys: 4, hCornice: 17, style: 'стилизация под петровское барокко', era: '2018', wall: '#6db7e6', trim: '#f1f0ea', roof: '#57504f', conf: 'L', photos: [], notes: 'корпус нового комплекса училища в тех же цветах.' },
  w28712444: { addr: 'Мичуринская ул., 4', name: null, storeys: 10, hCornice: 31, style: 'советский жилой дом', era: '1970-е', wall: '#d9d2bf', trim: '#e9e4d6', roof: '#7a7d80', conf: 'L', photos: [], notes: 'десятиэтажный кирпичный дом за «Дворянским гнездом».' },
  w28712526: { addr: 'Мичуринская ул., 5', name: 'Пожарная часть № 1 (Петровская пожарная часть)', storeys: 3, hCornice: 13, style: 'кирпичный стиль', era: 'кон. XIX в.', wall: '#a8503c', trim: '#e0cfa8', roof: '#6a4a40', conf: 'L', photos: [], notes: 'красный кирпич, двускатная кровля [OSM roof:shape=gabled], ворота депо на первом этаже.' },
};

const out = [];
for (const b of D.BUILDINGS) {
  if (b.part || MINE.has(b.id) || b.cx < WIN.x0 || b.cx > WIN.x1 || b.cz < WIN.z0 || b.cz > WIN.z1) continue;
  if ((b.area || 0) < 60 && !CUR[b.id]) continue;
  const c = CUR[b.id] || {}, [lon, lat] = unproj(b.cx, b.cz), o = b.polys[0].o, fp = [];
  for (let i = 0; i < o.length; i += 2) fp.push([Math.round(o[i] * 10) / 10, Math.round(o[i + 1] * 10) / 10]);
  const st = c.storeys ?? b.levels ?? null;
  out.push({
    addr: c.addr || (b.addr ? `${b.addr.street || ''}, ${b.addr.no || ''}`.replace(/^, |, $/g, '') : null), name: c.name ?? b.name ?? null, osm: b.id, scope: 'aurora', side: null,
    lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6, x: Math.round(b.cx), z: Math.round(b.cz),
    storeys: st, storeysSource: c.storeys ? 'dossier / photo' : b.levels ? 'OSM building:levels' : null,
    hCornice: c.hCornice ?? Math.round(L.heightOf(b)), hSource: c.hCornice ? 'estimated from photos (storeys x 3.3-3.6 + plinth)' : 'layout.heightOf',
    style: c.style || null, era: c.era || null, wall: c.wall || null, trim: c.trim || null, roof: c.roof || null, shop: null,
    notes: c.notes || 'not researched in depth (no curated entry): the blocks behind Petrovskaya embankment are a mix of 1930s-1970s Soviet housing (sand / grey plaster or brick) and red-brick service buildings of the former water works and fire station',
    conf: c.conf || 'L', photos: c.photos || [],
    osmTags: { colour: b.colour ?? null, levels: b.levels ?? null, height: b.h ?? null, start_date: b.startDate ?? null, roofShape: b.roof ?? null, heritage: b.heritage ?? null, wikidata: b.wikidata ?? null },
    footprintArea: Math.round(b.area || 0), footprint: fp,
  });
}
out.sort((a, b) => (CUR[b.osm] ? 1 : 0) - (CUR[a.osm] ? 1 : 0) || b.footprintArea - a.footprintArea);
fs.writeFileSync(path.join(root, 'docs/research/aurora-houses.json'), JSON.stringify(out, null, 1));
console.log(`aurora-houses.json: ${out.length} houses, ${out.filter((h) => CUR[h.osm]).length} curated`);
