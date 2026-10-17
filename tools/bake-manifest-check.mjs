// Verify the completed shipping manifest against source and real file sizes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { bakedRevision } from './baked-revision.mjs';
import { BAKED_REVISION } from '../src/core/baked-revision.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'assets/baked');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
assert.equal(manifest.revision,bakedRevision(root),'Stale shipping manifest');
assert.equal(BAKED_REVISION,manifest.revision,'Generated revision mismatch');
for(const key of ['field','roof','street-textures','street-kerbs','street-surfaces','city-base','nav-medium','nav-low'])assert(manifest.files[key],`Missing ${key}`);
let bytes=0;for(const [key,name] of Object.entries(manifest.files)){const size=fs.statSync(path.join(dir,name)).size;assert.equal(size,manifest.sizes[key].gzip,`Wrong size ${name}`);assert(name.includes(manifest.revision),`Wrong revision ${name}`);bytes+=size;}
assert.equal(fs.readdirSync(dir).filter(n=>n.endsWith('.part')).length,0,'Unfinished products remain');
console.log(`RESULT: OK (${manifest.revision}; ${Object.keys(manifest.files).length} complete products; ${(bytes/1048576).toFixed(1)} MiB gzip)`);
