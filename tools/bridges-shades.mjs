// tools/bridges-shades.mjs - prints the BRIDGE_SHADES rows (environment/waterways.js, key smolenka) of the second-pass bridges of Vasilievsky Island: centre of the deck over the water, bearing, width between the faces,
// length bank to bank + 0.8 m overlap on each bank (data: src/world/bridges/sites-vo2.js VO2_SITES / FOOT).  The water owner pastes the rows; no module is built.
// usage: node tools/bridges-shades.mjs
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const V = await import(pathToFileURL(path.join(root, 'src/world/bridges/sites-vo2.js')).href);
const deg = Math.PI / 180;
const wo = (s, u, v) => { const T = (s.b - 90) * deg, c = Math.cos(T), sn = Math.sin(T); return [s.cx + u * c - v * sn, s.cz + u * sn + v * c]; };
for (const s of V.VO2_SITES) {
  const uc = (s.bank[0] + s.bank[1]) / 2, c = wo(s, uc, (s.v0 + s.v1) / 2);
  console.log(`{ id: '${s.id}-deck', key: 'smolenka', c: [${c[0].toFixed(1)}, ${c[1].toFixed(1)}], axis: ${s.b}, w: ${(s.v1 - s.v0).toFixed(1)}, len: ${(s.bank[1] - s.bank[0] + 1.6).toFixed(1)} },`);
}
const F = V.FOOT, uc = (F.bank[0] + F.bank[1]) / 2, c = wo(F, uc, 0);
console.log(`{ id: 'novo-andreevsky-deck', key: 'smolenka', c: [${c[0].toFixed(1)}, ${c[1].toFixed(1)}], axis: ${F.b}, w: ${(2 * F.hw).toFixed(1)}, len: ${(F.bank[1] - F.bank[0] + 1.6).toFixed(1)} },`);
