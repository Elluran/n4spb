import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
/**
 * Runtime-only files: they never build or change anything that is baked (the gates, the hand-off codec, the area registry), so editing them must not make the bake stale. Tuning a gate
 * rectangle or a prompt text is then free. tools/runtime-only-lint.mjs enforces the contract: no other file under src/ imports them except src/main.js.
 */
export const RUNTIME_ONLY = ['src/core/gates.js', 'src/core/handoff.js', 'src/core/version.js', 'src/areas/registry.js'];
/** the files the bake revision covers, as { f: absolute path, rel: POSIX path relative to root }, in hash order */
export function bakedRevisionFiles(root) {
  const files = [];
  const walk = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name); if (e.isDirectory()) walk(f);
    else if (e.name.endsWith('.js') && e.name !== 'baked-revision.js') files.push(f);
  } };
  walk(path.join(root, 'src')); files.push(path.join(root, 'index.html'));
  // every other page of an area (north.html ...) is part of the bake too: it carries the import map that decides which data the modules see
  for (const e of fs.readdirSync(root, { withFileTypes: true })) if (e.isFile() && e.name.endsWith('.html') && e.name !== 'index.html' && /<html[^>]*\sdata-area=/.test(fs.readFileSync(path.join(root, e.name), 'utf8'))) files.push(path.join(root, e.name));
  // Order by the POSIX-relative path, never by the absolute native one: a native sort puts 'x\\' (Windows) and 'x/' (Linux) at different places among names such as
  // landmarksNorth/ and landmarksNorthFull.js, so a bake made on Windows would be rejected by the Linux CI (docs/AREAS.md). The revision of a tree without such names is unchanged.
  return files.map(f => ({ f, rel: path.relative(root, f).replaceAll('\\', '/') })).filter(x => !RUNTIME_ONLY.includes(x.rel)).sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
}
export function bakedRevision(root) {
  const hash = createHash('sha256');
  for (const { f, rel } of bakedRevisionFiles(root)) { hash.update(rel); hash.update(fs.readFileSync(f, 'utf8').replaceAll('\r\n', '\n')); }
  return hash.digest('hex').slice(0, 20);
}
