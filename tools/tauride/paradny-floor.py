"""Paradny podium floor (shapely): the podium polygon minus the mapped stair approaches, each cut as a flat-ended strip of the stair's width + 0.07 m, so no upper tread is buried under the cap.

    python tools/tauride/paradny-floor.py [--work tools/tauride/raw/work] [--out tools/tauride/raw/out]

reads   <work>/paradny-surface-data.json   { podium: { o: [..] }, stairs: [{ id, pts, w }] }   (paradny-floor.mjs dumps it from paradny-surface.js)
writes  <out>/paradny-floor.js             ONE complete file (PARADNY_FLOOR, the same text as the source repository's paradny-floor.js when run on the same surface data)

Why Python: a polygon difference with ~9 mitred strips whose ends touch the podium outline; GEOS is robust against the sliver and touching cases, a node port is not worth the risk for committed data.
"""
import sys
sys.dont_write_bytecode = True      # no tools/tauride/__pycache__ (it is not git-ignored)
import os

from shapely.geometry import Polygon, LineString

from tauride_geom import args, load, write_text, ring, flat, parts, dumps

a = args()
d = load(os.path.join(a.work, 'paradny-surface-data.json'))
floor = Polygon(ring(d['podium']['o']))
for s in d['stairs']:
    floor = floor.difference(LineString(ring(s['pts'])).buffer(s['w'] / 2 + .035, cap_style=2, join_style=2))
out = [dict(o=flat(p.exterior.coords, 4), h=[flat(h.coords, 4) for h in p.interiors]) for p in parts(floor)]
text = '// Podium cap with exact mapped stair approaches cut out; avoids burying upper treads.\nexport const PARADNY_FLOOR = ' + dumps(out) + ';\n'
write_text(os.path.join(a.out, 'paradny-floor.js'), text)
print('paradny floor: %d polygons; %d B' % (len(out), len(text.encode('utf-8'))))
