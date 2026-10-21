// CPU test of tools/baked-revision.mjs: the hash order is the POSIX-relative one on every platform (a Windows-made bake must be accepted by the Linux CI),
// and the revision of the real tree is the one the shipping manifest names. node tools/baked-revision-test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { bakedRevision, bakedRevisionFiles } from './baked-revision.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rev-'));
try {
  // names that sort differently with a native separator: '/' (0x2F) < 'F' (0x46) < '\' (0x5C)
  const put = (rel, text) => { const f = path.join(tmp, ...rel.split('/')); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
  put('index.html', '<html>');
  put('src/world/landmarksNorth/a.js', 'a');
  put('src/world/landmarksNorthFull.js', 'full');
  put('src/world/landmarksNorth.js', 'n');
  put('src/core/baked-revision.js', 'ignored');
  put('src/core/zz.txt', 'ignored');
  const order = bakedRevisionFiles(tmp).map(x => x.rel);
  assert.deepEqual(order, ['index.html', 'src/world/landmarksNorth.js', 'src/world/landmarksNorth/a.js', 'src/world/landmarksNorthFull.js'], 'POSIX order');
  assert.equal(bakedRevision(tmp), bakedRevision(tmp), 'deterministic');
  // CRLF and LF checkouts hash alike
  const before = bakedRevision(tmp);
  put('src/world/landmarksNorth.js', 'n');
  fs.writeFileSync(path.join(tmp, 'index.html'), '<html>');
  assert.equal(bakedRevision(tmp), before);
  put('src/world/landmarksNorthFull.js', 'full\r\n'); const crlf = bakedRevision(tmp); put('src/world/landmarksNorthFull.js', 'full\n'); assert.equal(bakedRevision(tmp), crlf, 'CRLF == LF');
  console.log('ok   fixture order and normalisation');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/baked/manifest.json'), 'utf8'));
const rev = bakedRevision(root);
console.log(`real tree revision ${rev}; manifest ${manifest.revision} (${rev === manifest.revision ? 'fresh' : 'STALE: the bake follows the next src change'})`);
console.log('RESULT: OK');
