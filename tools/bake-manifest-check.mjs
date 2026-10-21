// Verify the completed shipping manifests against source and real file sizes: one manifest per real area (src/areas/registry.js, not 'planned'), ONE global revision.
//   node tools/bake-manifest-check.mjs        every area      (npm run bakecheck)
//   node tools/bake-manifest-check.mjs --area north    one area
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { bakedRevision } from './baked-revision.mjs';
import { BAKED_REVISION } from '../src/core/baked-revision.js';
import { REGISTRY } from '../src/areas/registry.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const only = process.argv.includes('--area') ? process.argv[process.argv.indexOf('--area') + 1] : null;
if (only && !REGISTRY[only]) { console.error(`bake-manifest-check: unknown area "${only}" (known: ${Object.keys(REGISTRY).join(', ')})`); process.exit(2); }
const rows = Object.values(REGISTRY).filter((a) => a.status !== 'planned' && (!only || a.id === only));
if (!rows.length) { console.error(`bake-manifest-check: area "${only}" is planned: it has no bake`); process.exit(2); }
const revision = bakedRevision(root);
let bytes = 0, products = 0;
const REQUIRED = ['field', 'roof', 'street-textures', 'street-kerbs', 'street-surfaces', 'city-base', 'nav-medium', 'nav-low'];
for (const row of rows) {
  const dir = path.join(root, 'assets', row.bake), tag = `[${row.id}] `;
  assert(fs.existsSync(path.join(dir, 'manifest.json')), `${tag}No manifest in assets/${row.bake} (node tools/bake-scene.mjs --area ${row.id})`);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.revision, revision, `${tag}Stale shipping manifest`);
  // `area` is written by the bake since the areas exist; a manifest of the strip made before that has none (the runtime tolerates it too)
  if (manifest.area !== undefined || row.id !== 'strip') assert.equal(manifest.area, row.id, `${tag}manifest.area`);
  for (const key of REQUIRED) assert(manifest.files[key], `${tag}Missing ${key}`);
  for (const [key, name] of Object.entries(manifest.files)) {
    const size = fs.statSync(path.join(dir, name)).size;
    assert.equal(size, manifest.sizes[key].gzip, `${tag}Wrong size ${name}`);
    assert(name.includes(manifest.revision), `${tag}Wrong revision ${name}`);
    bytes += size; products++;
  }
  // direct children only: the strip's directory holds the other areas' directories
  assert.equal(fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.part')).length, 0, `${tag}Unfinished products remain`);
}
assert.equal(BAKED_REVISION, revision, 'Generated revision mismatch (src/core/baked-revision.js does not match the source: run npm run bake)');
console.log(`RESULT: OK (${revision}; ${rows.length > 1 ? `${rows.map((r) => r.id).join(' + ')}: ` : ''}${products} complete products; ${(bytes / 1048576).toFixed(1)} MiB gzip)`);
