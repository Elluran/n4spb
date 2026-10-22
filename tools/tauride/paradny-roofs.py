"""Paradny roof insets (shapely): the footprint of each of 7 apartment blocks buffered inwards by 2.4 m (the recessed two-storey terrace, a photo-derived setback), mitred corners.

    python tools/tauride/paradny-roofs.py [--work tools/tauride/raw/work] [--out tools/tauride/raw/out]

reads   <work>/paradny-data.json   (BUILDINGS near the Paradny quarter; paradny-inspect.mjs writes it from the North facade)
writes  <out>/paradny-roofs.js     ONE complete file (PARADNY_ROOFS, the same text as the source repository's paradny-roofs.js when run on the same footprints)

Why Python: a negative mitred buffer of a footprint with courtyards (straight-skeleton-like inset) is exactly what GEOS does robustly; a node port would have to handle collapsing wings and
self-touching offsets, and the result is committed data (the roofs are not on the hot path), so the Python dependency is only needed by whoever regenerates it.
"""
import sys
sys.dont_write_bytecode = True      # no tools/tauride/__pycache__ (it is not git-ignored)
import os

from shapely.geometry import Polygon

from tauride_geom import args, load, write_text, ring, flat, parts, dumps

IDS = ['w102153008', 'w102153013', 'w145419644', 'r1452259', 'r1967088', 'r3304715', 'r3304716']
a = args()
d = load(os.path.join(a.work, 'paradny-data.json'))
out = {}
for b in d['BUILDINGS']:
    if b['id'] not in IDS:
        continue
    ps = []
    for p in b['polys']:
        shape = Polygon(ring(p['o']), [ring(h) for h in p['h']]).buffer(-2.4, join_style=2)
        for q in parts(shape):
            if q.area > 20:
                ps.append(dict(o=flat(q.exterior.coords), h=[flat(h.coords) for h in q.interiors]))
    out[b['id']] = ps
text = '// OSM footprint insets (2.4m photo-derived terrace setback).\nexport const PARADNY_ROOFS = ' + dumps(out) + ';\n'
write_text(os.path.join(a.out, 'paradny-roofs.js'), text)
print('paradny roofs: %d buildings, %d polygons; %d B' % (len(out), sum(len(v) for v in out.values()), len(text.encode('utf-8'))))
