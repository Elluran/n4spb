"""OSM XML -> raw JSON (the Overpass-shaped file the legacy generator reads).

    python tools/tauride/tauride-extract.py

reads   tools/tauride/raw/tauride.osm and tools/tauride/raw/paradny.osm   (OSM API "map" downloads of the two areas, third-party ODbL data, git-ignored)
writes  tools/tauride/raw/tauride-raw.json

Only needed to rebuild the raw snapshot for `tauride-generate.mjs --source raw`; the default pipeline reads the North facade.
"""
import sys
sys.dont_write_bytecode = True      # no tools/tauride/__pycache__ (it is not git-ignored)
import json
import os
import xml.etree.ElementTree as E

from tauride_geom import RAW, write_text, dumps

out = {}
for file in ['tauride', 'paradny']:
    src = os.path.join(RAW, file + '.osm')
    if not os.path.exists(src):
        raise SystemExit('missing %s (download the OSM map of the area into tools/tauride/raw/)' % os.path.relpath(src))
    r = E.parse(src).getroot()
    nodes = {n.attrib['id']: {'lon': float(n.attrib['lon']), 'lat': float(n.attrib['lat'])} for n in r.findall('node')}
    ways = {w.attrib['id']: w for w in r.findall('way')}

    def geom(w):
        return [nodes[n.attrib['ref']] for n in w.findall('nd') if n.attrib['ref'] in nodes]

    for el in r:
        if el.tag not in ['node', 'way', 'relation']:
            continue
        e = {'id': int(el.attrib['id']), 'type': el.tag, 'tags': {t.attrib['k']: t.attrib['v'] for t in el.findall('tag')}}
        if el.tag == 'node':
            e.update(nodes[el.attrib['id']])
        if el.tag == 'way':
            e['geometry'] = geom(ways[el.attrib['id']])
        if el.tag == 'relation':
            e['members'] = [{'type': m.attrib['type'], 'ref': int(m.attrib['ref']), 'role': m.attrib['role'], 'geometry': geom(ways[m.attrib['ref']])} for m in el.findall('member') if m.attrib['type'] == 'way' and m.attrib['ref'] in ways]
        out[el.tag + el.attrib['id']] = e
write_text(os.path.join(RAW, 'tauride-raw.json'), dumps({'elements': list(out.values())}))
print('tauride-raw.json: %d elements' % len(out))
