// Tiled Overpass fetch of the named streets (the one-shot city-wide query times out): node fetch-tiles.mjs [secondary|tertiary]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const HEADERS = { 'User-Agent': 'n4spb-intro-map/1.0 (personal project)', 'Accept': '*/*', 'Content-Type': 'application/x-www-form-urlencoded' };
const JOBS = { secondary: { hw: 'secondary', box: [59.55, 29.40, 60.25, 30.90], dlat: 0.175, dlon: 0.30 }, tertiary: { hw: 'tertiary', box: [59.80, 30.10, 60.06, 30.60], dlat: 0.13, dlon: 0.25 } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS)) {
  const J = JOBS[name], out = path.join(here, 'raw', name + '.json');
  if (fs.existsSync(out)) { console.log('[cached]', name); continue; }
  const elements = new Map(); let fails = 0;
  for (let la = J.box[0]; la < J.box[2] - 1e-9; la += J.dlat) for (let lo = J.box[1]; lo < J.box[3] - 1e-9; lo += J.dlon) {
    const bb = [la, lo, Math.min(la + J.dlat, J.box[2]), Math.min(lo + J.dlon, J.box[3])].map((v) => v.toFixed(4)).join(',');
    const q = `[out:json][timeout:120];way["highway"="${J.hw}"]["name"](${bb});out geom;`;
    let ok = false;
    for (let attempt = 0; attempt < 8 && !ok; attempt++) {
      for (const url of ENDPOINTS) {
        try {
          const res = await fetch(url, { method: 'POST', headers: HEADERS, body: new URLSearchParams({ data: q }) });
          const text = await res.text();
          if (res.status === 200 && text.trim().startsWith('{')) { const d = JSON.parse(text); for (const e of d.elements) elements.set(e.id, e); console.log('[ok]', name, bb, d.elements.length, 'via', url); ok = true; break; }
          console.log('[' + name + ']', 'HTTP', res.status, bb, url);
        } catch (e) { console.log('[' + name + '] error', e.message, url); }
      }
      if (!ok) await sleep(8000 * (attempt + 1));
    }
    if (!ok) { fails++; console.log('[FAILED tile]', bb); }
    await sleep(1500);
  }
  if (fails) { console.log('[INCOMPLETE]', name, fails, 'tiles failed: not saved'); continue; }
  fs.writeFileSync(out, JSON.stringify({ elements: [...elements.values()] }));
  console.log('[saved]', name, elements.size, 'ways');
}
console.log('done');
