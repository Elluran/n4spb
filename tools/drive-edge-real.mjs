// drive-edge-real.mjs - the car at the edge of the strip in the REAL scene (GPU browser through tools/shot.mjs): node tools/drive-edge-real.mjs [--q medium]
// Runs tools/drive-edge-page.js in the page: the red coupe (first half of the runs) and the Roadster (second half) drive into the invisible edge along real streets (buildings, kerbs, parked cars and traffic around) from ~80 random edge
// points, then must be able to escape (reverse / steer out) every time; no footprint corner may ever be outside the map. Companion of the headless tools/drive-edge-test.mjs.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const q = process.argv.includes('--q') ? process.argv[process.argv.indexOf('--q') + 1] : 'medium';
const page = fs.readFileSync(path.join(here, 'drive-edge-page.js'), 'utf8');
const r = spawnSync(process.execPath, [path.join(here, 'shot.mjs'), '--cams', 'hero', '--eval', page, '--params', `baked=0&people=off&q=${q}`, '--out', 'shots/edge/real'], { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 40 * 60 * 1000 });
const m = /^eval: (.*)$/m.exec(r.stdout || '');
if (!m) { console.log((r.stdout || '').split('\n').filter((l) => !/X4000|WebGLProgram/.test(l)).slice(-12).join('\n')); console.log(r.stderr || ''); console.log('RESULT: FAIL (no report from the page)'); process.exit(1); }
const rep = JSON.parse(JSON.parse(m[1]));
console.log(`real-scene edge runs ${rep.runs} (skipped ${rep.skipped}): hits ${rep.hits}, escaped ${rep.escaped}, stuck ${rep.stuck.length}, per car ${JSON.stringify(rep.perCar)}, jammed between walls away from the edge ${rep.jams.length}, footprint outside the map in ${rep.outsideFrames} frames, centre outside ${rep.centreOut}, NaN ${rep.nan}`);
if (rep.stuck.length || rep.outsideFrames || rep.centreOut || rep.nan || rep.runs < 30 || !(rep.perCar.coupe >= 10 && rep.perCar.roadster >= 10)) { console.log('stuck at (car, x, z, yaw):', JSON.stringify(rep.stuck)); console.log('RESULT: FAIL'); process.exit(1); }
if (rep.jams.length) console.log('jammed away from the edge (car, x, z, yaw):', JSON.stringify(rep.jams));
console.log('RESULT: OK');
