"""List the building / water / park elements of the raw OSM XML snapshots (an inspector for the git-ignored third-party files in tools/tauride/raw/).

    python tools/tauride/read-osm.py            tauride.osm and paradny.osm: the named garden elements, the 9/11-storey and Parade-street office buildings
    python tools/tauride/read-osm.py --ponds    tauride-raw.json: the water elements and the members of the relations r1582714 / r6278222 (the old pond-inspect.py)
"""
import sys
sys.dont_write_bytecode = True      # no tools/tauride/__pycache__ (it is not git-ignored)
import json
import os
import sys
import xml.etree.ElementTree as E

from tauride_geom import RAW, load

if '--ponds' in sys.argv:
    d = load(os.path.join(RAW, 'tauride-raw.json'))
    for e in d['elements']:
        if e['tags'].get('natural') == 'water' or e['tags'].get('water') or e['type'] == 'relation' and str(e['id']) in ['1582714', '6278222']:
            print(e['type'], e['id'], e['tags'], [(m['ref'], m['role'], len(m['geometry'])) for m in e.get('members', [])])
    raise SystemExit(0)
for file in ['tauride', 'paradny']:
    src = os.path.join(RAW, file + '.osm')
    if not os.path.exists(src):
        print('missing', os.path.relpath(src))
        continue
    r = E.parse(src).getroot()
    out = []
    for el in r:
        if el.tag not in ['way', 'relation']:
            continue
        tags = {t.attrib['k']: t.attrib['v'] for t in el.findall('tag')}
        if tags.get('building') or tags.get('natural') == 'water' or tags.get('leisure') == 'park':
            out.append(dict(type=el.tag, id=el.attrib['id'], tags=tags))
    for e in out:
        t = e['tags']
        if file == 'tauride' and not (t.get('natural') == 'water' or 'Таврическ' in t.get('name', '') or t.get('leisure') == 'park'):
            continue
        if file == 'paradny' and not (t.get('building:levels') in ['9', '11'] or t.get('addr:street') == 'Парадная улица' and t.get('building') == 'office'):
            continue
        print(file, e['type'], e['id'], json.dumps(t, ensure_ascii=False))
