import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export function bakedRevision(root) {
  const files = [];
  const walk = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name); if (e.isDirectory()) walk(f);
    else if (e.name.endsWith('.js') && e.name !== 'baked-revision.js') files.push(f);
  } };
  walk(path.join(root, 'src')); files.push(path.join(root, 'index.html'));
  const hash = createHash('sha256');
  for (const f of files.sort()) { hash.update(path.relative(root, f).replaceAll('\\', '/')); hash.update(fs.readFileSync(f, 'utf8').replaceAll('\r\n', '\n')); }
  return hash.digest('hex').slice(0, 20);
}
