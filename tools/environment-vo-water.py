#!/usr/bin/env python3
# tools/environment-vo-water.py - writes src/world/environment/vo-water.js, the water geometry of Vasilievsky Island that the city bake cannot give (build-water, 2026-10-07).
# usage: python tools/environment-vo-water.py [--tmp DIR]        (needs shapely and node; inputs below, nothing is downloaded)
# Inputs
#   docs/reference/vo-water-osm.json      OSM extracts (ODbL): the outer rings of relation 72500 (Malaya Neva) and 1114249 (Bolshaya Neva) and the natural=coastline chains north / south of the Gulf
#   docs/reference/vo-island-polygon.json the 684-point outline of the island (relation 1576083)
#   src/world/environment/petro-water.js  the real part of the Malaya Neva ring (149 vertices of the bake) that this tool continues with the real banks
#   the baked polygons of the Smolenka, its mouth, the Kovsh, Galerny Harbour and the Shkipersky canal (read through node from src/world/data)
# Outputs (exports of vo-water.js)
#   VO_MALAYA_TAIL   the real continuation of the Malaya Neva ring after its last baked vertex (-4147.9,-2324.6): around the Dekabristov Island shore to the mouth line near x -6790 and back to the Smolenka source
#                    (replaces the invented scenery tail of petro-water.js; the first 149 vertices stay exactly as they were)
#   VO_NEVA_BAY      the complete outer ring of the Bolshaya Neva (relation 1114249): the Bay between the island and the port, a scenery piece beyond the data extents
#   VO_SEA           the Gulf of Finland: everything outside the island outline west of the Neva Bay, bounded by the real coast north and south of it, 'bank' = a 0 / 1 string, 1 for the edges that lie on the
#                    island outline or inside the Vasilievsky extents (a shore that can be reached), 0 for every other edge (the far coasts and the open boundary: no quay, no collider)
import json, math, os, subprocess, sys
from shapely.geometry import Polygon, LineString, Point, MultiPolygon
from shapely.ops import unary_union

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = sys.argv[sys.argv.index('--tmp') + 1] if '--tmp' in sys.argv else os.environ.get('TEMP', '.')
osm = json.load(open(os.path.join(ROOT, 'docs/reference/vo-water-osm.json'), encoding='utf-8'))
island = [tuple(p) for p in json.load(open(os.path.join(ROOT, 'docs/reference/vo-island-polygon.json'), encoding='utf-8'))['points']]
if island[0] == island[-1]: island = island[:-1]
dist = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])
near = lambda pts, p: min(range(len(pts)), key=lambda i: dist(pts[i], p))
r1 = lambda p: [round(p[0], 1), round(p[1], 1)]

# ---------------------------------------------------------------- baked polygons (through node)
JS = r"""
import { pathToFileURL } from 'node:url';
const D = await import(pathToFileURL(process.argv[1] + '/src/world/data/city.js').href);
const W = await import(pathToFileURL(process.argv[1] + '/src/world/environment/petro-water.js').href);
const want = new Set(['r1576084', 'r1576086', 'w428079227', 'w95646723', 'r1648985', 'w10890576']);
const out = { baked: {}, petro: null, ext: D.EXTENT_RECTS.map((r, i) => ({ n: D.RECT_NAMES[i], x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 })) };
for (const w of D.WATER) if (want.has(w.id)) out.baked[w.id] = w.polys.map((p) => Array.from(p.o));
const p = W.PETRO_WATER.find((q) => q.id === 'r72500'); out.petro = { o: Array.from(p.o), real: p.real };
console.log(JSON.stringify(out));
"""
raw = subprocess.check_output(['node', '--input-type=module', '-e', JS, ROOT.replace('\\', '/')]).decode('utf-8')
baked = json.loads(raw)
ring = lambda o: [(o[i], o[i + 1]) for i in range(0, len(o), 2)]

# ---------------------------------------------------------------- the Malaya Neva: the real ring after the baked part
mal = [tuple(p) for p in osm['malayaNevaOuter']]
pw = baked['petro']; pwo = ring(pw['o'])[:pw['real']]
i0, i1 = near(mal, pwo[0]), near(mal, pwo[-1])
assert dist(mal[i0], pwo[0]) < 0.5 and dist(mal[i1], pwo[-1]) < 0.5, 'the baked Malaya Neva does not lie on the OSM ring'
for k, p in enumerate(pwo):                                   # every baked vertex is an OSM vertex, in the same order
    assert dist(mal[(i0 + k) % len(mal)], p) < 0.5, 'order mismatch at %d' % k
tail = []
i = (i1 + 1) % len(mal)
while i != i0:
    tail.append(mal[i]); i = (i + 1) % len(mal)
print('Malaya Neva tail', len(tail), 'vertices')

# ---------------------------------------------------------------- the Gulf
iC = near(island, (-6741.7, 634.8)); iI = near(island, (-8304.6, -2083.7))
assert dist(island[iC], (-6741.7, 634.8)) < 3 and dist(island[iI], (-8304.6, -2083.7)) < 3 and iI > iC, (iC, iI)
iI2 = near(island, (-8237, -2071))                              # one vertex further east: the sea reaches into the basin of the Smolenka mouth (w428079227), so that its edge there is the basin's own edge (an exact join)
assert dist(island[iI2], (-8237, -2071)) < 3 and iI2 < iI and iI - iI2 < 6, (iI2, iI)
path = island[iI2:] + island[:iC + 1]                           # the island coast from the Smolenka mouth round the west tip and the south coast to the corner of the Neva Bay
south = [tuple(p) for p in osm['coastSouth']]                  # (-6742,635) -> (-8795,4734): the west edge of the Neva Bay, then the port land
north = [tuple(p) for p in osm['coastNorth']]                  # (-14408,-6810) -> (-8273,-2211)
k0 = near(north, (-7600.5, -4088.7)); k1 = near(north, (-7554.2, -3538.2))
assert k0 < k1 and dist(north[k0], (-7600.5, -4088.7)) < 2 and dist(north[k1], (-7554.2, -3538.2)) < 2
far_sw = [(-10300, 4830), (-12000, 4500), (-14000, 3600), (-17500, 2000), (-17500, -7500)]
# the mouth of the Malaya Neva: the real ring ends at a line x ~ -6750 (tail vertices 102..105); the strip west of it up to the WHSD bridges is water (the Gulf reaches the cap)
ca, cb = near(tail, (-6729.9, -3963.4)), near(tail, (-6789.1, -3301.5))
assert ca < cb and dist(tail[ca], (-6729.9, -3963.4)) < 1 and dist(tail[cb], (-6789.1, -3301.5)) < 1
cap_seq = tail[ca:cb + 1]                                       # the four vertices of the mouth line: the same coordinates as the Malaya Neva ring, so the two rings join exactly there
seq = path + south[1:] + far_sw + north[:k0 + 1] + cap_seq + north[k1:]
ringpts = []
for p in seq:
    if not ringpts or dist(p, ringpts[-1]) > 0.05: ringpts.append(p)
if dist(ringpts[0], ringpts[-1]) < 0.05: ringpts.pop()
sea = Polygon(ringpts)
if not sea.is_valid:
    print('sea ring invalid:', sea.is_valid, '-> buffer(0)'); sea = sea.buffer(0)
print('sea area km2', round(sea.area / 1e6, 1), sea.geom_type)
others = unary_union([Polygon(ring(o)) for k, v in baked['baked'].items() for o in v])
sea2 = sea.difference(others)
polys = list(sea2.geoms) if isinstance(sea2, MultiPolygon) else [sea2]
polys = [p for p in polys if p.area > 2000]
shore = LineString(island + [island[0]])
ext = [r for r in baked['ext'] if r['n'].startswith('V')]                # the Vasilievsky extents: any edge of the sea ring inside them is a shore the player can reach (a far coast outside them is not)
inext = lambda q: any(r['x0'] <= q[0] <= r['x1'] and r['z0'] <= q[1] <= r['z1'] for r in ext)
out_sea = []
for p in polys:
    ex = [tuple(c) for c in p.exterior.coords][:-1]
    if p.interiors: print('WARNING: the sea has', len(p.interiors), 'hole(s): ignored (kept as land only by the island outline)')
    bank = ''
    for a, b in zip(ex, ex[1:] + ex[:1]):
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        on_island = all(shore.distance(Point(q)) < 2.5 for q in (a, b, m))
        reachable = any(inext(q) for q in (a, b, m)) and dist(a, b) < 1500 and not (a[0] < -6700 and b[0] < -6700 and abs(a[0] - b[0]) < 120 and abs(a[1] - b[1]) > 300)
        bank += '1' if (on_island or reachable) else '0'
    out_sea.append({'o': [round(c, 1) for pt in ex for c in pt], 'bank': bank, 'area': round(p.area)})
    print('sea polygon', len(ex), 'vertices,', round(p.area / 1e6, 2), 'km2,', bank.count('1'), 'bank edges')

bay = [tuple(p) for p in osm['bolshayaNevaOuter']]

def flat(pts): return '[' + ','.join('%g,%g' % (round(p[0], 1), round(p[1], 1)) for p in pts) + ']'
src = []
src.append('// GENERATED by tools/environment-vo-water.py (do not edit). OpenStreetMap contributors, ODbL: docs/reference/vo-water-osm.json + vo-island-polygon.json, 2026-10-07.')
src.append('// The water of Vasilievsky Island that the city bake cannot give: the real Malaya Neva beyond x -4313, the whole Neva Bay, the Gulf of Finland (see the header of the tool).')
src.append('/** the real Malaya Neva ring after the last baked vertex (-4147.9,-2324.6) round the Dekabristov Island shore to the mouth line near x -6790 and back to (-4330.2,-1959.3) (the Smolenka source); flat [x, z, ...] */')
src.append('export const VO_MALAYA_TAIL = ' + flat(tail) + ';')
src.append('/** the complete outer ring of the Bolshaya Neva (relation 1114249): the Neva Bay between the island and the port; drawn only beyond the data extents (excludeExtent) */')
src.append('export const VO_NEVA_BAY = ' + flat(bay) + ';')
src.append('/** the Gulf of Finland west and south of the island: [{ o: flat ring, bank: "0101..." one char per edge (1 = a shore of the island outline) }] */')
src.append('export const VO_SEA = [' + ','.join('{o:' + flat(zip(s['o'][0::2], s['o'][1::2])) + ',bank:"' + s['bank'] + '"}' for s in out_sea) + '];')
open(os.path.join(ROOT, 'src/world/environment/vo-water.js'), 'w', encoding='utf-8').write('\n'.join(src) + '\n')
print('written src/world/environment/vo-water.js', os.path.getsize(os.path.join(ROOT, 'src/world/environment/vo-water.js')), 'bytes')
