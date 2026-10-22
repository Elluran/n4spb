"""Palace slicing (shapely): the footprint of the Tauride Palace r3801092 minus the open portico, cut into 5 strips at the gallery / central-block junctions, each with its design height `hc`.

    python tools/tauride/tauride-palace-parts.py [--work tools/tauride/raw/work] [--out tools/tauride/raw/out]

reads   <work>/derived.json   (the key `buildings`: the record r3801092 with `polys`; tauride-generate.mjs writes it from the North facade, or from the raw Overpass snapshot with --source raw)
writes  <out>/palace-parts.js ONE complete file (PALACE_PARTS, the same text as src/world/landmarksTauride/palace-parts.js of the source repository when run on the same footprint)

The heights (11.5 / 7.6 / 16.5 / 7.6 / 11.5 m) are DESIGN values of the source repository (OSM says 6.6 m / 2 levels), not surveyed. The garden remake keeps the palace and ports the committed palace-parts.js
verbatim; this script exists so the file can be rebuilt from the facade (the facade footprint is a simplified copy: the polygon differs from the committed one by < 0.5 m).
Why Python: polygon difference and intersection with boxes of a footprint that has a courtyard hole; shapely does it without special cases.
"""
import sys
sys.dont_write_bytecode = True      # no tools/tauride/__pycache__ (it is not git-ignored)
import os

from shapely.geometry import Polygon, box

from tauride_geom import args, load, write_text, ring, flat, parts, dumps

a = args()
d = load(os.path.join(a.work, 'derived.json'))
p = next(b['polys'][0] for b in d['buildings'] if b['id'] == 'r3801092')
poly = Polygon(ring(p['o']), [ring(h) for h in p['h']]).difference(box(1366, -1756, 1393, -1748.4))   # the open portico
out = []
for x0, x1, h in [(1200, 1316, 11.5), (1316, 1345, 7.6), (1345, 1420, 16.5), (1420, 1445, 7.6), (1445, 1520, 11.5)]:
    s = poly.intersection(box(x0, -1900, x1, -1600))
    for q in parts(s):
        out.append(dict(hc=h, poly=dict(o=flat(q.exterior.coords, closed=True), h=[flat(r.coords, closed=True) for r in q.interiors])))
text = '// OSM r3801092 footprint split at gallery/central-block junctions. Portico remains open.\nexport const PALACE_PARTS = ' + dumps(out) + ';\n'
write_text(os.path.join(a.out, 'palace-parts.js'), text)
print('palace parts', len(out), 'strips; %d B' % len(text.encode('utf-8')))
