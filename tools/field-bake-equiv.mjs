// Checks the complete field textures and 20,000 deterministic query samples.
// Record before a format change with --record <scratch.json>, then compare with
// --compare <scratch.json>. --file selects a field bake; --compact drops the
// redundant legacy channels before hydration to exercise the compact format.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { decodeBaked } from '../src/core/baked-codec.js';
import { buildField } from '../src/world/environment/field.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2), arg = name => args.includes(name) ? args[args.indexOf(name) + 1] : null;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/baked/manifest.json'), 'utf8'));
const file = arg('--file') || path.join(root, 'assets/baked', manifest.files.field);
const raw = gunzipSync(fs.readFileSync(file));
const payload = decodeBaked(raw.byteOffset === 0 && raw.byteLength === raw.buffer.byteLength ? raw.buffer : raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const channels = [['qB', 0], ['qR', 1], ['qW', 2], ['qV', 3]];
let legacyBytes = 0;
for (const [key, channel] of channels) {
  const plane = payload[key]; if (!plane) continue;
  legacyBytes += plane.byteLength;
  for (let i = 0; i < plane.length; i++) if (plane[i] !== payload.dtex[i * 4 + channel]) throw Error(`${key} differs from distance texture at ${i}`);
}
if (args.includes('--compact')) for (const [key] of channels) delete payload[key];
const field = buildField({}, new Set(), payload);
const hash = value => createHash('sha256').update(value).digest('hex');
const methods = ['bldDist', 'roadDist', 'pathDist', 'ptDist', 'hardOnlyDist', 'hardDist', 'shore', 'claimed', 'paveDist', 'clsAt', 'categoryAt'];
const samples = createHash('sha256');
for (let i = 0; i < 20000; i++) {
  // Stride through the complete extent, including 20 m outside every edge.
  const x = payload.x0 - 20 + ((i * 8191.371) % (payload.x1 - payload.x0 + 40));
  const z = payload.z0 - 20 + ((i * 4093.613) % (payload.z1 - payload.z0 + 40));
  samples.update(JSON.stringify(methods.map(key => field[key](x, z))));
  samples.update(JSON.stringify([field.free(x, z), field.free(x, z, 1.3), field.free(x, z, 0.2, { loose: true, onPave: true, claimOk: true }), field.clear(x, z), field.clear(x, z, 1.2)]));
}
// Dynamic flowerbed claims must still change the mutable keep-out channels.
const cx = (payload.x0 + payload.x1) / 2, cz = (payload.z0 + payload.z1) / 2;
field.addBlock(cx, cz, 3);
for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) samples.update(JSON.stringify([field.hardOnlyDist(cx + dx, cz + dz), field.ptDist(cx + dx, cz + dz), field.free(cx + dx, cz + dz), field.clear(cx + dx, cz + dz)]));
const result = { dimensions: [payload.dg.W, payload.dg.H], distanceTexture: hash(payload.dtex), classTexture: hash(payload.clsB), noise: hash(payload.noiseData), queries: samples.digest('hex') };
if (arg('--record')) fs.writeFileSync(arg('--record'), JSON.stringify(result, null, 2));
if (arg('--compare')) {
  const expected = JSON.parse(fs.readFileSync(arg('--compare'), 'utf8'));
  if (JSON.stringify(result) !== JSON.stringify(expected)) throw Error(`Field output changed: ${JSON.stringify({ expected, result })}`);
}
console.log(JSON.stringify({ ...result, legacyBytes, rawBytes: raw.length, compact: args.includes('--compact') }));
console.log('RESULT: OK');
