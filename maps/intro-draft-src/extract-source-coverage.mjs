// Reads the playable regions (rectangles) and the authored sights out of the source project's coverage page
// (D:/git2/agi-fun-tests/102_3d_piter/coverage.html, made by its tools/coverage-map.mjs) into raw/source-coverage.json. Same frame as this project (ORIGIN 30.351279, 59.932421).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.argv[2] || 'D:/git2/agi-fun-tests/102_3d_piter/coverage.html';
const h = fs.readFileSync(SRC, 'utf8');
const a = h.indexOf('id="data"'), b = h.indexOf('>', a) + 1, c = h.indexOf('</script>', b);
const D = JSON.parse(h.slice(b, c));
fs.mkdirSync(path.join(here, 'raw'), { recursive: true });
fs.writeFileSync(path.join(here, 'raw', 'source-coverage.json'), JSON.stringify({
  regions: D.regions.map((r) => ({ name: r.name, file: r.file, playRect: r.playRect })),
  sights: D.sights.map((s) => ({ name: s.name, key: s.key, owner: s.owner, at: s.at, buildings: s.buildings })),
  origin: D.origin, buildings: D.buildings,
}));
console.log('regions', D.regions.length, 'sights', D.sights.length);
