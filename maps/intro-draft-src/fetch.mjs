// Sequential, cached Overpass fetch for the St Petersburg schematic map.
// Raw responses are cached under ./raw/<name>.json; a rerun skips cached ones.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.join(here, 'raw');
fs.mkdirSync(rawDir, { recursive: true });

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const HEADERS = {
  'User-Agent': 'n4spb-schematic-map/1.0 (personal project)',
  'Accept': '*/*',
  'Content-Type': 'application/x-www-form-urlencoded',
};

const BBOX = '59.55,29.40,60.25,30.90';
const CB = '59.880,30.15,59.990,30.50';
const H = '[out:json][timeout:180];';
const AREA = 'area(3600337422)->.a;';

const Q = {
  boundary: `${H}relation(337422);out geom;`,
  districts: `${H}relation["boundary"="administrative"]["admin_level"="5"](${BBOX});out geom;`,
  coast: `${H}way["natural"="coastline"](${BBOX});out geom;`,
  rivers: `${H}${AREA}way["waterway"~"^(river|canal|stream)$"]["name"](area.a);out geom;`,
  water: `${H}${AREA}(way["natural"="water"](area.a);relation["natural"="water"](area.a);way["waterway"="riverbank"](area.a);relation["waterway"="riverbank"](area.a););out geom;`,
  roads: `${H}way["highway"~"^(motorway|trunk)$"](${BBOX});out geom;`,
  metro: `${H}relation["route"="subway"](${BBOX});out geom;`,
  stations: `${H}(node["station"="subway"](${BBOX});nwr["railway"="station"]["station"="subway"](${BBOX}););out center;`,
  places: `${H}(` +
    `nwr["name"~"^(Главное Адмиралтейство|Адмиралтейство|Дворцовая площадь|Государственный Эрмитаж|Эрмитаж|Зимний дворец|Петропавловская крепость|Санкт-Петербург-Главный|Московский вокзал|площадь Восстания|Смольный собор|Таврический сад|Спасо-Преображенский собор|Летний сад|Исаакиевский собор|Михайловский замок|Инженерный замок|Лахта Центр|Лахта центр|Газпром Арена|Зенит-Арена|Стадион «Санкт-Петербург»|Крестовский стадион)$"](${BBOX});` +
    `nwr["name"~"^(Чернышевская|Пулково|Международный аэропорт Пулково|Аэропорт Пулково)$"](${BBOX});` +
    `nwr["place"~"^(city|town|suburb|village|borough|locality)$"]["name"~"^(Петергоф|Стрельна|Ломоносов|Кронштадт|Пушкин|Павловск|Колпино|Сестрорецк|Зеленогорск|Красное Село|Санкт-Петербург|Царское Село)$"](${BBOX});` +
    `);out center tags;`,
  extra: `${H}(` +
    `nwr["name"~"Лахта.?[Цц]ентр|Смольный собор|Собор Смольного|Смольного монастыря|Фрунзенская|Парк Победы"](59.80,30.0,60.10,30.55);` +
    `nwr["name:en"~"Lakhta Center|Smolny|Frunzenskaya|Park Pobedy"](59.80,30.0,60.10,30.55);` +
    `);out center tags;`,
  // central detail layer
  c_water: `${H}(way["natural"="water"](${CB});relation["natural"="water"](${CB});way["waterway"="riverbank"](${CB});relation["waterway"="riverbank"](${CB}););out geom;`,
  c_rivers: `${H}way["waterway"~"^(river|canal|stream)$"](${CB});out geom;`,
  c_streets: `${H}way["highway"~"^(trunk|primary|secondary)$"](${CB});out geom;`,
  c_streets_req: `${H}way["highway"]["name"~"^(улица Восстания|улица Чайковского|Шпалерная улица|Кирочная улица|Суворовский проспект|Садовая улица|Загородный проспект|Невский проспект|Литейный проспект|Лиговский проспект|Московский проспект)$"](${CB});out geom;`,
  c_parks: `${H}(way["leisure"~"^(park|garden)$"](${CB});relation["leisure"~"^(park|garden)$"](${CB});way["landuse"~"^(recreation_ground|village_green)$"]["name"](${CB}););out geom;`,
  c_rail: `${H}(way["railway"="rail"](${CB}););out geom;`,
  c_rail_st: `${H}(nwr["railway"="station"]["station"!="subway"](${CB});nwr["public_transport"="station"]["train"="yes"](${CB}););out center tags;`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function once(url, query) {
  const res = await fetch(url, { method: 'POST', headers: HEADERS, body: new URLSearchParams({ data: query }) });
  const text = await res.text();
  return { status: res.status, text };
}

async function get(name) {
  const file = path.join(rawDir, name + '.json');
  if (fs.existsSync(file) && fs.statSync(file).size > 50) {
    console.log(`[cache] ${name} ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
    return;
  }
  const query = Q[name];
  let attempt = 0;
  for (;;) {
    const url = ENDPOINTS[attempt >= 3 ? 1 : 0];
    attempt++;
    let r;
    try {
      r = await once(url, query);
    } catch (e) {
      console.log(`[${name}] network error ${e.message}`);
      r = { status: 0, text: '' };
    }
    let ok = false;
    if (r.status === 200) {
      try {
        const j = JSON.parse(r.text);
        if (j.remark && /error|timed out|out of memory/i.test(j.remark)) {
          console.log(`[${name}] remark: ${j.remark}`);
        } else ok = true;
      } catch (e) {
        console.log(`[${name}] bad json: ${r.text.slice(0, 120)}`);
      }
    } else console.log(`[${name}] HTTP ${r.status} ${r.text.slice(0, 120).replace(/\s+/g, ' ')} (${url})`);
    if (ok) {
      fs.writeFileSync(file, r.text);
      console.log(`[ok] ${name} ${(r.text.length / 1024).toFixed(0)} KB via ${url}`);
      return;
    }
    if (attempt > 8) throw new Error('giving up on ' + name);
    const wait = Math.min(120000, 15000 * attempt);
    console.log(`[${name}] retry in ${wait / 1000}s`);
    await sleep(wait);
  }
}

const only = process.argv.slice(2);
const names = only.length ? only : Object.keys(Q);
const fetched = new Date().toISOString();
fs.writeFileSync(path.join(here, 'fetched.txt'), fs.existsSync(path.join(here, 'fetched.txt')) ? fs.readFileSync(path.join(here, 'fetched.txt'), 'utf8') : fetched);
for (const n of names) {
  await get(n);
  await sleep(4000);
}
console.log('done');
