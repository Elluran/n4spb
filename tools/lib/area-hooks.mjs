// Node module-loader hooks that give a headless tool the SAME area remap a page of that area gets from its import map (docs/AREAS.md): every import that resolves to a remap key
// (src/world/data/city.js, src/world/area.js ...) is served from the area's own file. Registered by tools/area.mjs (module.register); also exports areaModules for tests.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

let map = new Map();
/** module.register data: { root, remap: { 'src/world/area.js': 'src/areas/north/area.js', ... } } */
export async function initialize(data) {
  map = new Map(Object.entries(data?.remap || {}).map(([k, v]) => [pathToFileURL(path.join(data.root, k)).href, pathToFileURL(path.join(data.root, v)).href]));
}
export async function resolve(specifier, context, nextResolve) {
  const r = await nextResolve(specifier, context);
  const t = map.get(r.url);
  return t ? { ...r, url: t, shortCircuit: true } : r;
}

/** The area module and the data facade of a registry row, imported from their real files (no hook needed: they are the remap targets themselves). */
export async function areaModules(root, row) {
  const target = (k) => { const v = row.remap?.[k]; if (!v) throw new Error(`area ${row.id}: registry remap has no ${k}`); return pathToFileURL(path.join(root, v)).href; };
  const [A, C] = await Promise.all([import(target('src/world/area.js')), import(target('src/world/data/city.js'))]);
  return { A, C };
}
