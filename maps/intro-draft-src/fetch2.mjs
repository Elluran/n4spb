// Overpass fetch for the intro map: municipal districts (admin_level 8), named places, main roads. Cached under ./raw.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.join(here, 'raw');
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const HEADERS = { 'User-Agent': 'n4spb-intro-map/1.0 (personal project)', 'Accept': '*/*', 'Content-Type': 'application/x-www-form-urlencoded' };
const BBOX = '59.55,29.40,60.25,30.90';
const H = '[out:json][timeout:240];';
const Q = {
  mo: `${H}relation["boundary"="administrative"]["admin_level"="8"](${BBOX});out geom;`,
  mo_tags: `${H}relation["boundary"="administrative"]["admin_level"="8"](${BBOX});out tags center;`,
  places2: `${H}(node["place"~"^(suburb|neighbourhood|quarter|island|city|town|village|locality)$"](${BBOX}););out tags;`,
  main_roads: `${H}way["highway"~"^(trunk|primary)$"](${BBOX});out geom;`,
  secondary: `${H}way["highway"="secondary"]["name"](${BBOX});out geom;`,
  tertiary: `${H}way["highway"="tertiary"]["name"](59.80,30.10,60.06,30.60);out geom;`,
  primary_names: `${H}way["highway"~"^(trunk|primary)$"]["name"](${BBOX});out geom;`,
  railways: `${H}way["railway"="rail"]["service"!~"."](59.55,29.40,60.25,30.90);out geom;`,
};
const only = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [name, query] of Object.entries(Q)) {
  if (only.length && !only.includes(name)) continue;
  const f = path.join(rawDir, name + '.json');
  if (fs.existsSync(f) && fs.statSync(f).size > 100) { console.log('[cached]', name); continue; }
  let done = false;
  for (let attempt = 0; attempt < 6 && !done; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, { method: 'POST', headers: HEADERS, body: new URLSearchParams({ data: query }) });
        const text = await res.text();
        if (res.status === 200 && text.trim().startsWith('{')) { fs.writeFileSync(f, text); console.log('[ok]', name, (text.length / 1024) | 0, 'KB via', url); done = true; break; }
        console.log('[' + name + ']', 'HTTP', res.status, text.slice(0, 80).replace(/\s+/g, ' '), url);
      } catch (e) { console.log('[' + name + '] error', e.message, url); }
    }
    if (!done) await sleep(15000 * (attempt + 1));
  }
  if (!done) console.log('[FAILED]', name);
}
console.log('done');
