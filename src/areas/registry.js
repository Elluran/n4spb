// ============================================================================
//  AREA REGISTRY (docs/AREAS.md) - which areas exist, where their page and their bake live, and the gates between them. PURE DATA, no imports.
//  RUNTIME-ONLY: tools/baked-revision.mjs leaves this file out of the bake revision (RUNTIME_ONLY), so tuning a gate rectangle or a prompt text never makes the bake stale; because of that
//  nothing that builds the scene may import it (tools/runtime-only-lint.mjs: only src/main.js, via core/gates.js, does). The CPU tests (tools/areas-test.mjs) check every row against the
//  real data facade of the area, so a copied number cannot drift.
//  Street frame everywhere: metres, x east, z south (north = -z), yaw 0 = north, 90 = west.
// ============================================================================
export const SCHEMA = 1;

/** Staged release (docs/AREAS.md): false hides every gate (no chip, no prompt, no navigation); a runtime flag, so flipping it needs no re-bake. ?gates=0 / ?gates=1 override it per visit. */
export const GATES_ENABLED = true;

/**
 * id        the area module's ID (src/world/area.js, src/areas/<id>/area.js) and <html data-area>
 * page      the HTML page of the area, relative to the site root (the page next to index.html keeps the PWA scope)
 * bake      directory of its baked products under assets/ (trailing slash); the strip keeps the original path, so the deployed URL and every cached page keep working
 * requireBake  true: a missing or stale bake is an error card, never a procedural rebuild (set for areas that are reached by a hand-off)
 * remap     URL-like keys (relative to the site root) the page's import map points at this area's files; empty for the strip (its files are the defaults)
 * play      the play rectangles (a copy of the data facade's PLAY_RECTS; tools/areas-test.mjs compares)
 */
export const REGISTRY = {
  strip: {
    id: 'strip', page: 'index.html', bake: 'baked/', requireBake: false,
    title: 'Невский проспект', titleEn: 'Nevsky strip',
    sights: ['Московский вокзал', 'Невский проспект', 'Дворцовая площадь', 'Адмиралтейство'],
    approxMB: 48, remap: {}, dev: false,
    play: [
      { name: 'OLD', x0: -595, x1: 835, z0: -405, z1: 1060 },
      { name: 'W1', x0: -1750, x1: -595, z0: -1000, z1: 160 },
      { name: 'N1', x0: -595, x1: -420, z0: -1000, z1: -405 },
      { name: 'W2a', x0: -1950, x1: -1750, z0: -1300, z1: 170 },
      { name: 'W2b', x0: -2200, x1: -1950, z0: -1180, z1: 170 },
      { name: 'W2c', x0: -2450, x1: -2200, z0: -1010, z1: 170 },
      { name: 'W2d', x0: -2700, x1: -2450, z0: -800, z1: 240 },
      { name: 'W2e', x0: -2900, x1: -2700, z0: -620, z1: 240 },
      { name: 'SG', x0: -1000, x1: -600, z0: -1300, z1: -1000 },
    ],
  },
};

// The North (docs/AREAS.md section 4): Chernyshevskaya, Tauride Garden + Palace, Paradny, Smolny, Preobrazhenskaya, Muruzi, Suvorov, Kirochnaya, 3.947 km2. NA includes a one-sided 200 m band of
// the strip's territory (z -405 .. -205, x -420 .. 835), so an arrival from the strip lands on real, identical streets. (`status: 'planned'` marks a row whose files do not exist yet: the tools skip it;
// the North was planned until milestone M3 and is a real area since.) The remap of city/known-data.js gives the page the dossiers of ITS houses (docs/AREAS-DATA.md section 6).
REGISTRY.north = {
  id: 'north', page: 'north.html', bake: 'baked/north/', requireBake: true,
  title: 'Север', titleEn: 'North',
  sights: ['Чернышевская', 'Таврический сад', 'Смольный', 'Спасо-Преображенский собор', 'Литейный проспект'],
  approxMB: 36, dev: false,
  remap: {
    'src/world/data/city.js': 'src/areas/north/data/city.js', 'src/world/area.js': 'src/areas/north/area.js',
    'src/world/city/known-data.js': 'src/areas/north/known-data.js',
  },
  play: [
    { name: 'NA', x0: -420, x1: 835, z0: -2000, z1: -205 },
    { name: 'NB', x0: 835, x1: 1550, z0: -2000, z1: -800 },
    { name: 'NC', x0: 1550, x1: 2650, z0: -2060, z1: -1300 },
  ],
};

/**
 * Gates between areas: { id, from, to, seg: [[x,z],[x,z]] (the border segment in the FROM area), inward: [nx,nz] (unit vector pointing from the border into the FROM area), zone (m: depth of the
 * prompt zone, walking), arrive: { x0, x1, z0, z1 } (where the player may land in the TO area), reverse (id of the gate back) }.
 */
export const GATES = [
  // g1 / g2 - the strip and the North share one border, the line z = -405 .. -205 across Liteyny (x -420 .. 835). The strip ends at z = -405 (its OLD rectangle); the North holds the strip's 200 m band
  // z -405 .. -205 as its own territory again (identical streets and buildings, tools/band-parity.mjs), so a crossing lands in the middle of a street that exists on both sides and the ping-pong margin
  // is 100+ m: g1 arrives in the North between z -460 and -310 (the band and the first 55 m beyond it; 105+ m north of g2's border), g2 arrives in the strip at z -300 .. -230 (inside the strip, 175+ m south of g1's border).
  // The arrival rectangles are the planned ones (x -350 .. 805) trimmed to what the 25 m arrival grid of tools/areas-test.mjs resolves 100 % (walk / fly / car x both headings): the Fontanka water spans x -434 .. -379 in the band
  // and the library block x -350 .. -250 has no north-south lane for a car (a car must land on a lane within 30 degrees of its heading, and the ring search stays inside the rectangle), so x starts at -225; g1 stops at x 755 and
  // z -310 (no lane at (775 .. 805, -345 .. -300), (-25, -300), (0, -345)) and starts at z -460 (no lane at (-100 .. 805, -520 .. -470)); g2 ends at z -230 (no lane at (375 .. 400, -220)). A walker or a car that leaves the
  // strip at a spot outside the rectangle lands at the nearest point of it (the departure x is clamped, so a crossing on the Fontanka quay at x -370 lands 145 m east of it).
  { id: 'g1', from: 'strip', to: 'north', seg: [[-420, -405], [835, -405]], inward: [0, 1], zone: 30, arrive: { x0: -225, x1: 755, z0: -460, z1: -310 }, reverse: 'g2' },
  { id: 'g2', from: 'north', to: 'strip', seg: [[-420, -205], [835, -205]], inward: [0, -1], zone: 30, arrive: { x0: -225, x1: 805, z0: -300, z1: -230 }, reverse: 'g1' },
  // g0 - the dev loop (?devgates=1): a gate across the Nevsky approach to Vosstaniya Square (a vertical segment at x = 470, the strip east of it is the "own area") that leads back to the SAME page at
  // the same pose. It exercises the whole hand-off (prompt, preflight, veil, navigation, arrival, memory) before a second area exists, and stays as a test fixture afterwards.
  { id: 'g0', dev: true, from: 'strip', to: 'strip', seg: [[470, 100], [470, 240]], inward: [1, 0], zone: 30, arrive: { x0: 440, x1: 700, z0: 80, z1: 260 }, reverse: 'g0' },
];
