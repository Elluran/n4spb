// city-ref.mjs - the city module AS COMMITTED at a git ref, importable beside the working tree (helper of tools/city-signature.mjs --ref and tools/city-wall-audit.mjs --ref).
//   const ref = extractCityRef(root, 'HEAD');      // { dir, files, path: (p) => module path of 'city.js' | 'city/walls.js' ..., cleanup() }
// The files are read with `git show` (nothing is checked out, the index and the working tree are not touched) into shots/city/_ref-<pid>/ (git-ignored). Relative imports that
// stay inside the module keep pointing at the copy; every other import (layout, data, lib, core, streets) is rewritten to the REAL file of the working tree. So the old CODE runs
// over today's DATA and CLAIMS: what differs from a normal run is your change of the module and nothing else (other agents edit their claims while you work).
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export function extractCityRef(root, ref) {
  const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
  const dir = path.join(root, 'shots/city/_ref-' + process.pid);
  // ls-tree / show run in the project folder: the names are relative to it (src/world/city.js, src/world/city/x.js)
  const files = git('ls-tree', '-r', '--name-only', ref, '--', 'src/world/city', 'src/world/city.js').split('\n').filter(Boolean);
  for (const rel of files) {
    let text = git('show', ref + ':./' + rel);
    const orig = path.join(root, rel), dst = path.join(dir, rel.replace(/^src\/world\//, ''));
    text = text.replace(/(from\s+|import\s*\(\s*|import\s+)(['"])(\.{1,2}\/[^'"]+)\2/g, (m, pre, q, spec) => {
      const target = path.resolve(path.dirname(orig), spec), inMod = target === path.join(root, 'src/world/city.js') || target.startsWith(path.join(root, 'src/world/city') + path.sep);
      return pre + q + (inMod ? spec : pathToFileURL(target).href) + q;
    });
    fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, text);
  }
  return { dir, files, path: (p) => path.relative(root, path.join(dir, p)), cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
