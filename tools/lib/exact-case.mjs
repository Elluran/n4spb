// Windows and macOS file systems ignore the case of a path; the Linux host of the deployed site (GitHub Pages) does not. These helpers decide whether a path exists with EXACTLY that spelling.
import fs from 'node:fs';
import path from 'node:path';

/** true when `rel` (POSIX, relative to root) exists and every segment has exactly this spelling on disk */
export function existsExact(root, rel) {
  let dir = root;
  for (const seg of rel.split('/').filter(Boolean)) {
    if (seg === '.') continue;
    let names; try { names = fs.readdirSync(dir); } catch (e) { return false; }
    if (!names.includes(seg)) return false;
    dir = path.join(dir, seg);
  }
  return fs.existsSync(dir);
}
/** the spelling on disk of `rel` when it exists with another case, else null */
export function realSpelling(root, rel) {
  let dir = root; const out = [];
  for (const seg of rel.split('/').filter(Boolean)) {
    let names; try { names = fs.readdirSync(dir); } catch (e) { return null; }
    const hit = names.find((n) => n.toLowerCase() === seg.toLowerCase()); if (!hit) return null;
    out.push(hit); dir = path.join(dir, hit);
  }
  return out.join('/');
}
/** every .js file under src/ as { abs, rel } (POSIX rel) */
export function srcFiles(root) {
  const out = [];
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else if (e.name.endsWith('.js')) out.push({ abs: f, rel: path.relative(root, f).replaceAll('\\', '/') }); } };
  walk(path.join(root, 'src'));
  return out;
}
/**
 * the import specifiers of a source text: { spec, kind: 'static'|'dynamic'|'template', line }. Comments are blanked first (line numbers stay), then ONE regex runs over the whole text, so a
 * specifier on the line after `from` and a multi-line import list are seen too (a quote-delimited specifier after from / import( / import is; strings are not otherwise parsed).
 */
export function importsOf(text) {
  const blank = text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
  const out = [], re = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"`])([^'"`\n]+)\1/g; let m;
  while ((m = re.exec(blank))) {
    const line = blank.slice(0, m.index).split('\n').length;
    if (m[1] === '`' && m[2].includes('${')) out.push({ spec: m[2], kind: 'template', line });
    else out.push({ spec: m[2], kind: /import\s*\(/.test(m[0]) || m[1] === '`' ? 'dynamic' : 'static', line });
  }
  return out;
}
