"""Step 2 of the Tauride data pipeline: the water union (shapely).

    python tools/tauride/tauride-union.py [--work tools/tauride/raw/work]

reads   <work>/derived.json          (the key `ponds`: the OSM water polygons and the canal strips, from tauride-generate.mjs)
writes  <work>/union.json            ONE complete file: { schema, shapely, polygons: [{o, h: [..]}], stats }   (never appended to: the old script appended to terrain.js and doubled the export on a second run)

The union is the single watertight outline of all water of the garden. The ring cleanup of the old clean-tauride-rings.py is part of this step: adjacent duplicate vertices (after rounding to 1 mm)
and a repeated closing vertex are dropped, degenerate holes (< 3 distinct vertices or area < 1e-6) are removed, and every result polygon is asserted valid and of positive area.
Why Python: a polygon union with holes needs a robust boolean engine (GEOS); the lake touches the canal strips along sliver edges and a hand-written node union would be the riskiest line of the pipeline.
"""
import sys
sys.dont_write_bytecode = True      # no tools/tauride/__pycache__ (it is not git-ignored)
import shapely
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.validation import explain_validity

from tauride_geom import args, load, write_text, ring, flat, parts, dumps, clean_ring, flat_pts, banner
import os

a = args()
d = load(os.path.join(a.work, 'derived.json'))


def shape(p):
    return Polygon(ring(p['o']), [ring(h) for h in p['h']]).buffer(0)


pieces = d['ponds']


def is_strip(p):
    """a canal strip (estimated width) as opposed to an OSM polygon; the legacy shape marks it with `estimatedWidth`"""
    return p.get('kind') == 'canal-strip' or 'estimatedWidth' in p


shapes = [shape(p) for p in pieces]
u = unary_union(shapes)

polys = []
removed = 0
for q in parts(u):
    outer = clean_ring(flat(q.exterior.coords))
    holes = []
    for r in q.interiors:
        h = clean_ring(flat(r.coords))
        if len(set(h)) < 3 or Polygon(h).area < 1e-6:
            removed += 1
            continue
        holes.append(h)
    shp = Polygon(outer, holes)
    assert shp.is_valid, explain_validity(shp)
    assert shp.area > 0
    polys.append({'o': flat_pts(outer), 'h': [flat_pts(h) for h in holes]})
polys.sort(key=lambda p: -Polygon(ring(p['o'])).area)      # stable: one polygon today

# stats (all derived from the shapes, deterministic)
stats = {'netAreaM2': round(sum(Polygon(ring(p['o']), [ring(h) for h in p['h']]).area for p in polys), 1), 'polygons': len(polys), 'removedDegenerateHoles': removed, 'holes': [], 'pieces': []}
for p in polys:
    for h in p['h']:
        hp = Polygon(ring(h))
        b = hp.bounds
        stats['holes'].append({'areaM2': round(hp.area, 1), 'x0': round(b[0], 1), 'x1': round(b[2], 1), 'z0': round(b[1], 1), 'z1': round(b[3], 1), 'cx': round(hp.centroid.x, 1), 'cz': round(hp.centroid.y, 1)})
shore = 0.0
for p in polys:
    shore += Polygon(ring(p['o'])).exterior.length + sum(Polygon(ring(h)).exterior.length for h in p['h'])
stats['shoreM'] = round(shore, 1)
for s, p in zip(shapes, pieces):
    row = {'id': p['id'], 'areaM2': round(s.area, 1)}
    if is_strip(p):
        others = unary_union([t for t, q in zip(shapes, pieces) if not is_strip(q)])
        row['addedOutsideOsmPolygonsM2'] = round(s.difference(others).area, 1)
        row['width'] = p.get('width', p.get('estimatedWidth'))
    stats['pieces'].append(row)

out = {'schema': 'tauride-union/1', 'shapely': shapely.__version__, 'geos': shapely.geos_version_string, 'polygons': polys, 'stats': stats}
write_text(os.path.join(a.work, 'union.json'), dumps(out) + '\n')
banner('union polygons %d, net area %d m2, shoreline %d m, holes %s, degenerate holes removed %d' % (len(polys), round(stats['netAreaM2']), round(shore), [round(h['areaM2']) for h in stats['holes']], removed))
