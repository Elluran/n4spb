// city-known.mjs - builds src/world/city/known-data.js (the KNOWN houses of the west extension) from the three research tables
//   docs/research/west-nevsky-{1,2,3}-houses.json  (+ the OSM footprints in src/world/data/city.js for the matching report).
// usage: node tools/city-known.mjs [--print] [--report]
//   --print   dump the extracted table (one line per OSM id) to stdout
//   --report  matching report: records matched by id / by position / unmatched / ambiguous
// The extraction is heuristic (free-text columns -> archetype, storeys, colours, trim class, roof); every field can be overridden by hand in src/world/city/known-extra.js
// (keyed by OSM id). Priority of duplicates: table 1 > table 3 > table 2 (table 2 lists the houses of the Sadovaya block "for completeness", tables 1 / 3 were checked
// against photographs by a critic pass).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const tables = [1, 3, 2].map((n) => ({ n, rows: JSON.parse(fs.readFileSync(path.join(root, `docs/research/west-nevsky-${n}-houses.json`), 'utf8')) }));
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const byId = new Map(D.BUILDINGS.map((b) => [b.id, b]));

const HC = [0, 5.0, 9.0, 13.5, 17.5, 21.0, 23.5, 25.5, 27];
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v));
const hexIn = (s) => { const m = /#[0-9a-fA-F]{6}\b/.exec(s || ''); return m ? m[0].toLowerCase() : null; };
const lum = (h) => { const v = parseInt(h.slice(1), 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255; };
const dist = (a, b) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); return Math.hypot((x >> 16) - (y >> 16), ((x >> 8) & 255) - ((y >> 8) & 255), (x & 255) - (y & 255)) / 441; };

// houses that must not be applied (non-houses, duplicate records of the same polygon, landmarks drawn by their own module)
const SKIP_ADDR = [/портик Перинных/, /Казанская пл\. 2 \/ Невский 25x/, /Малая Садовая ул\. \(пешеходная\)/, /Садовая ул\. \(/, /Михайловская ул\. \(к Площади/, /Екатерининский сад/];

function parseIds(h) { return [...new Set((str(h.osm).match(/\b[wrn]\d{4,}\b/g) || []))]; }

function archOf(h, floors) {
  const s = (str(h.style) + ' ' + str(h.era)).toLowerCase(), n = str(h.notes).toLowerCase();
  if (/new building 20|2009-11|modern infill|glass facade|glass-and-render/.test(s)) return 'MODERN';
  if (/stalin|сталин/.test(s)) return 'STALIN';
  if (/art nouveau|modern\b|secession|северный модерн/.test(s)) return /neoclass/.test(s) ? 'NEOCLASS' : 'NOUVEAU';
  if (/neoclass|neo-greek|granite/.test(s) || /giant (corinthian|ionic|doric)? ?order/.test(s + ' ' + n.slice(0, 400))) return floors >= 4 ? 'NEOCLASS' : 'CLASSIC';
  if (/brick|pseudo-gothic|neo-gothic|neo-russian/.test(s)) return 'BRICK';
  if (/classic|empire|rossi|baroque.*classic|early classic/.test(s)) return floors <= 4 ? 'CLASSIC' : 'ECLECTIC';
  if (/baroque|rococo/.test(s) && floors <= 3) return 'CLASSIC';
  return 'ECLECTIC';
}

function floorsOf(h) {
  const st = h.storeys;
  let f = typeof st === 'number' ? st : null;
  if (f == null && typeof st === 'string') { const m = /^\s*(\d+)/.exec(st); if (m) f = +m[1]; }
  const hc = typeof h.hCornice === 'number' && h.hCornice > 0 ? h.hCornice : null;
  if (f == null && hc) { let best = 1, bd = 99; for (let i = 1; i < HC.length; i++) if (Math.abs(HC[i] - hc) < bd) { bd = Math.abs(HC[i] - hc); best = i; } f = best; }
  if (f != null && hc) { // keep storeys consistent with the cornice height (a 15 m "5 storey" entry is a typo: trust the metres)
    const exp = HC[Math.max(1, Math.min(8, f))];
    if (Math.abs(exp - hc) > 4.5) { let best = f, bd = 99; for (let i = 1; i < HC.length; i++) if (Math.abs(HC[i] - hc) < bd) { bd = Math.abs(HC[i] - hc); best = i; } f = best; }
  }
  return { floors: f, H: hc };
}

function trimOf(h, wall) {
  const t = str(h.trim), s = t.toLowerCase();
  if (!t || t === '-') return 0;
  const hi = t.indexOf('#'), th = hexIn(t);
  const kw = /white|cream|ivory/.exec(hi < 0 ? s : s.slice(0, hi));
  if (/same as wall|wall colour|in wall colour/.test(s)) return 2;
  if (kw && (hi < 0 || hi > 3 || !th)) return kw[0] === 'white' ? 1 : 3;
  if (th && wall) {
    if (dist(th, wall) < 0.07) return 2;                        // trim in the wall colour (monochrome stucco)
    if (lum(th) < 0.62) return /green|bronze|patina/.test(s) ? 6 : 5;   // dark stone / patinated bronze details: darker trim
    if (lum(th) < 0.80) return 4;                                // light grey stone / ochre accents
    const v = parseInt(th.slice(1), 16), r = v >> 16, g = (v >> 8) & 255, b = v & 255;
    return (r - b > 28) ? 3 : 1;                                 // cream (warm) vs white
  }
  return 0;
}

function roofOf(h) {
  const r = str(h.roof), s = r.toLowerCase();
  const hx = hexIn(r);
  const out = {};
  if (/mansard|hip|hipped|attic|dormer|gabled/.test(s) && !/^flat/.test(s)) out.ms = 1;
  else if (/^flat|flat roof|flat\b/.test(s)) out.ms = 0;
  if (hx) out.rf = hx;
  else if (/green/.test(s)) out.rf = '#5f7d68';
  else if (/red|brown/.test(s)) out.rf = '#8a5246';
  else if (/grey|gray|zinc/.test(s)) out.rf = '#8c9195';
  return out;
}

function featuresOf(h) {
  const n = (str(h.notes) + ' ' + str(h.style)).toLowerCase(), out = {};
  if (/erker|bay window|oriel/.test(n)) out.er = 1;
  if (/rusticat/.test(n + ' ' + str(h.wall).toLowerCase())) out.rust = 1;
  { // a carriage gate / passage the photos show (the position along the front: central / left / right of centre)
    const t = n + ' ' + str(h.shop).toLowerCase();
    const wm = /(d+(?:.d+)?) m (?:wide )?(?:arched )?(?:gate|passage|gateway|arch)/.exec(t), w = wm ? Math.min(5, Math.max(3, +wm[1])) : 3.6;
    if (/central[^.;]{0,40}(gate|passage|gateway|carriage arch)|(gate|passage|gateway)[^.;]{0,30}central/.test(t)) out.ga = [0.5, w];
    else if (/(carriage|arched|iron-gated|gate|gateway)[^.;]{0,40}(left of centre|left end|at the left|(left))|left of centre[^.;]{0,30}(gate|arch)/.test(t)) out.ga = [0.2, w];
    else if (/(carriage|arched|gate|gateway)[^.;]{0,40}(right of centre|right end|at the right|(right))/.test(t)) out.ga = [0.8, w];
    else if (/carriage (gate|arch)|arched carriage|arched gateway|gate passage/.test(t)) out.ga = [0.25, w];
  }
  if (/turret|cupola|corner tower|tower-roof|corner pavilion/.test(n + ' ' + str(h.roof).toLowerCase())) out.tu = 1;
  return out;
}

const known = {};      // osm id -> entry
const rep = { total: 0, idOk: 0, ptOk: 0, none: [], curated: 0, applied: 0, skippedAddr: 0, dupIds: 0, noHexGuess: 0 };
const rows = [];
for (const { n, rows: arr } of tables) {
  for (const h of arr) {
    rep.total++;
    const addr = str(h.addr);
    if (SKIP_ADDR.some((re) => re.test(addr))) { rep.skippedAddr++; continue; }
    const wallS = str(h.wall);
    const curated = wallS.length > 2 && wallS !== '-';
    let ids = parseIds(h).filter((i) => byId.has(i));
    let how = 'id';
    if (!ids.length && h.x != null) {
      // repair: the footprint at (x,z) (ground record), else the nearest footprint centroid within 12 m
      const at = D.BUILDINGS.find((b) => !b.skip && !(b.minH > 3) && b.polys.some((p) => inRing(p.o, h.x, h.z)));
      if (at) { ids = [at.id]; how = 'pt'; }
    }
    if (!ids.length) { rep.none.push(`${n}: ${addr} ${str(h.osm)} (${h.x},${h.z})`); continue; }
    if (how === 'id') rep.idOk++; else rep.ptOk++;
    if (!curated) continue;                                  // stubs of table 3 (no research): the generic grammar decides
    rep.curated++;
    const { floors, H } = floorsOf(h);
    const wall = hexIn(wallS);
    if (!wall) rep.noHexGuess++;
    const filler = /pastel guess|No photo checked|default pastel|colour is a guess/i.test(str(h.notes)) || h.confidence === 'OSM only';
    if (filler) { rep.filler = (rep.filler || 0) + 1; continue; }            // research placeholders (default pastel / OSM only): the generic grammar decides
    const e = { a: archOf(h, floors || 4), n: addr.slice(0, 48) };
    if (floors) e.f = floors;
    if (H && !filler) e.H = H;
    if (wall && !/\(guess\)/.test(wallS.slice(0, wallS.indexOf('#') < 0 ? 0 : wallS.indexOf('#')))) e.hex = wall;
    else if (wall) e.hex = wall;
    if (!filler) { const tr = trimOf(h, wall); if (tr) e.tr = tr; Object.assign(e, roofOf(h)); }
    Object.assign(e, featuresOf(h));
    e.src = n;
    for (const id of ids) {
      if (known[id]) { rep.dupIds++; for (const k of Object.keys(e)) if (known[id][k] === undefined && k !== 'n' && k !== 'src') known[id][k] = e[k]; continue; }
      known[id] = { ...e };
      rows.push([id, e]);
    }
  }
}
function inRing(o, x, z) { let c = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }

rep.applied = Object.keys(known).length;
if (args.has('--print')) for (const [id, e] of rows) console.log(id, JSON.stringify(e));
if (args.has('--report') || !args.has('--print')) console.log(JSON.stringify({ ...rep, none: undefined }), '\nunmatched:', rep.none);

const header = `// known-data.js - GENERATED by tools/city-known.mjs from docs/research/west-nevsky-{1,2,3}-houses.json (do not edit by hand: put corrections into known-extra.js).
// One entry per OSM building id (outline or part; a part inherits the entry of its parent outline). Fields: a archetype name (ARCH key), f storeys, H cornice height (m),
// hex facade colour, tr trim class (0 default warm white, 1 white, 2 wall colour, 3 cream, 4 light grey stone, 5 dark stone, 6 patinated green-bronze), rf roof colour,
// ms 1 mansard / hipped roof visible, 0 flat roof, er erkers, rust rusticated ground floor, n address, src table (1 Fontanka-Sadovaya, 2 Sadovaya-Kazan, 3 Kazan-Admiralty).
`;
// the block of tools/city-known-mars.mjs (Mars Field / Summer Garden houses) stays at the end of the file
const kdFile = path.join(root, 'src/world/city/known-data.js');
const oldText = fs.existsSync(kdFile) ? fs.readFileSync(kdFile, 'utf8') : '';
const marsAt = oldText.indexOf('// ---- BEGIN ');          // the generated blocks of tools/city-known-mars.mjs (MARS, SW) follow the west table
fs.writeFileSync(kdFile, header + 'export const KNOWN_DATA = ' + JSON.stringify(known) + ';\n' + (marsAt >= 0 ? oldText.slice(marsAt) : ''));
console.log('wrote', Object.keys(known).length, 'ids');
