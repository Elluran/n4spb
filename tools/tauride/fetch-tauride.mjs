// Download the OpenStreetMap snapshot of the Tauride Garden area from Overpass: the only network step of the whole pipeline, and OPTIONAL (the generators read the North facade by default).
//   node tools/tauride/fetch-tauride.mjs [--out tools/tauride/raw/tauride-raw.json]
// Writes the raw Overpass JSON (about 1.7 MB, ODbL third-party data) into the git-ignored tools/tauride/raw/: it must never be committed. The query is the one of the source repository's
// fetch-tauride.mjs (buildings 59.9385..59.95 N / 30.364..30.381 E; water, highways, parks 59.941..59.949 / 30.369..30.379).
// Use it with `tauride-generate.mjs --source raw` to compare the facade against a fresh snapshot.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, RAW_DIR, parseArgs, rel } from './lib/common.mjs';

const args = parseArgs();
const out = path.resolve(ROOT, args.out || path.join(rel(RAW_DIR), 'tauride-raw.json'));
const q = '[out:json][timeout:90];(nwr[building](59.9385,30.364,59.95,30.381);nwr[natural=water](59.941,30.369,59.95,30.379);nwr[highway](59.941,30.369,59.949,30.379);nwr[leisure=park](59.941,30.369,59.949,30.379););out geom;';
const r = await fetch('https://overpass.kumi.systems/api/interpreter?data=' + encodeURIComponent(q), { signal: AbortSignal.timeout(110000) });
if (!r.ok) throw Error('Overpass answered ' + r.status);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, await r.text());
console.log('saved ' + rel(out) + ' (git-ignored; do not commit)');
