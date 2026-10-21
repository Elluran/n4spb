import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
/** the files the bake revision covers, as { f: absolute path, rel: POSIX path relative to root }, in hash order */
export function bakedRevisionFiles(root) {
  const files = [];
  const walk = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name); if (e.isDirectory()) walk(f);
    else if (e.name.endsWith('.js') && e.name !== 'baked-revision.js') files.push(f);
  } };
  walk(path.join(root, 'src')); files.push(path.join(root, 'index.html'));
  // Order by the POSIX-relative path, never by the absolute native one: a native sort puts 'x\\' (Windows) and 'x/' (Linux) at different places among names such as
  // landmarksNorth/ and landmarksNorthFull.js, so a bake made on Windows would be rejected by the Linux CI (docs/AREAS.md). The revision of a tree without such names is unchanged.
  return files.map(f => ({ f, rel: path.relative(root, f).replaceAll('\\', '/') })).sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
}
export function bakedRevision(root) {
  const hash = createHash('sha256');
  for (const { f, rel } of bakedRevisionFiles(root)) { hash.update(rel); hash.update(fs.readFileSync(f, 'utf8').replaceAll('\r\n', '\n')); }
  return hash.digest('hex').slice(0, 20);
}
