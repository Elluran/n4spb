// Drive-over probe (in the real page): for every bridge of the Mars Field reach and the south-west (+ the Palace Bridge) samples services.bridges.deckY along the road axis and across the deck and reports
//   * the profile along the axis (u every 3 m over the whole bank-to-bank deck + 6 m of approach),
//   * steps steeper than 20 % between neighbouring samples (a car would hop) and null holes inside the deck,
//   * the same across the width (v every 2 m at u = 0).
// usage: node tools/bridges-deckprobe.mjs
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expr = `(async () => {
  const S = await import('/src/world/bridges/sites.js'), PA = await import('/src/world/bridges/palace.js');
  const B = window.__ctx.services.bridges, deckY = B.deckY, res = { ids: B.list.map((b) => b.id), failed: B.failed, sites: {} };
  const ids = S.SITES.slice(11).map((q) => q.id);
  const probe = (frame, uMin, uMax, v0, v1, name, step = 3) => {
    const ax = [], bad = [];
    let prev = null, gap = false;
    for (let u = uMin - 6; u <= uMax + 6; u += step) {
      const w = S.toWorld(frame, u, (v0 + v1) / 2), y = deckY(w.x, w.z), inside = u >= uMin + 0.5 && u <= uMax - 0.5;
      ax.push(y === null ? null : +y.toFixed(2));
      if (y === null && prev !== null) gap = true; if (y !== null && gap && prev === null && ax.length > 2 && ax.slice(0, -1).some((q) => q !== null)) bad.push('hole before u=' + u);
      if (prev !== null && y !== null && Math.abs(y - prev) / step > 0.2) bad.push('jump ' + prev.toFixed(2) + '->' + y.toFixed(2) + ' at u=' + u);
      prev = y;
    }
    const cross = [];
    for (let v = v0 - 3; v <= v1 + 3; v += 2) { const w = S.toWorld(frame, 0, v), y = deckY(w.x, w.z), inside = v >= v0 && v <= v1; cross.push(y === null ? null : +y.toFixed(2)); if (inside && y === null && v > v0 + 0.3 && v < v1 - 0.3) bad.push('cross hole at v=' + v); }
    res.sites[name] = { axis: ax, cross, bad };
  };
  for (const id of ids) { const s = S.SITES.find((q) => q.id === id); probe(s, -12, 12, s.v0, s.v1, id); }
  probe(PA.PALACE, 1.5, 251, -13.85, 13.85, 'palace', 10);
  return res;
})()`;
const r = spawnSync('node', [path.join(root, 'tools/shot.mjs'), '--only', 'environment,streets,city,bridges', '--cams', '-1493,-90,0,2', '--out', 'shots/bridges/_probe', '--eval', expr], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const line = r.stdout.split('\n').find((l) => l.startsWith('eval:'));
if (!line) { console.log(r.stdout.slice(-2000), r.stderr.slice(-1500)); process.exit(1); }
const res = JSON.parse(line.slice(5));
let bad = 0;
console.log('bridges built:', res.ids.length, res.failed && res.failed.length ? 'FAILED ' + res.failed : '');
for (const [id, o] of Object.entries(res.sites)) { console.log(id.padEnd(20), o.bad.length ? 'FAIL ' + o.bad.join('; ') : 'ok', '\n   axis', JSON.stringify(o.axis), '\n   cross', JSON.stringify(o.cross)); bad += o.bad.length; }
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
