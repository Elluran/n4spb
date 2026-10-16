"""Small, cached OSM map API fallback when Overpass is unavailable.

python tools/fetch-osm-map.py N2 N3
Uses the same coordinate rectangles and raw layer schema as fetch-osm.mjs.
Downloads serially; raw data is ignored by git, baked modules carry ODbL credit.
Resumable: every tile is cached in data/osm-raw/map-api, a cut run simply continues. The API refuses a tile with more than 50 000 nodes
(HTTP 400); such a tile is cut into four quarters, recursively (up to 6 times), and a <tile>.split marker file remembers the refusal.
The raw layers are only extended (an element that is already there keeps its Overpass geometry) and written atomically.
An element that is new to the layers but lies wholly inside the extents of the regions listed BEFORE the first region asked for is not added:
the data of the regions that were baked and reviewed earlier must not grow because a later tile overlaps them (the counts are printed).
"""
import json
import math
import subprocess
import sys
import os
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'data/osm-raw'
CACHE = RAW / 'map-api'
CACHE.mkdir(parents=True, exist_ok=True)
regions = sys.argv[1:] or ['N2', 'N3']
js = "import {RECT_NAMES,EXTENT_RECTS,ORIGIN,KX,KY,unproj} from './tools/osm-lib.mjs'; console.log(JSON.stringify({origin:ORIGIN,kx:KX,ky:KY,names:RECT_NAMES,extents:EXTENT_RECTS,boxes:RECT_NAMES.map((n,i)=>({name:n,rect:EXTENT_RECTS[i],nw:unproj(EXTENT_RECTS[i].x0-40,EXTENT_RECTS[i].z0-40),se:unproj(EXTENT_RECTS[i].x1+40,EXTENT_RECTS[i].z1+40)}))}));"
frame = json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ROOT))
boxes = [b for b in frame['boxes'] if b['name'] in regions]
if len(boxes) != len(regions):
    raise ValueError('Unknown region')

# The tiles of a new region overlap the regions that were baked before it (and the tool classifies tags more broadly than the first Overpass
# queries did: restaurants, banks ... of St Isaac's Square appeared in the strip that the tiles of V3 shared with W2c / W2d). An element that is NEW
# to the raw layers and lies wholly inside the extents of the earlier regions would only add records to districts that were reviewed already, so it is
# not added (count printed at the end). Elements that reach outside them are kept whole. The regions asked for must be a tail of the region list.
first_idx = min(frame['names'].index(r) for r in regions)
earlier = frame['extents'][:first_idx]
LON0, LAT0, KX, KY = frame['origin']['lon'], frame['origin']['lat'], frame['kx'], frame['ky']
def in_earlier(lon, lat):
    x = (lon-LON0)*KX; z = -(lat-LAT0)*KY
    return any(r['x0'] <= x <= r['x1'] and r['z0'] <= z <= r['z1'] for r in earlier)
def element_points(d):
    if d['type'] == 'node':
        yield d['lon'], d['lat']
    elif d['type'] == 'way':
        for p in d.get('geometry', []):
            yield p['lon'], p['lat']
    else:
        for m in d.get('members', []):
            for p in m.get('geometry', []):
                yield p['lon'], p['lat']
            if 'lat' in m:
                yield m['lon'], m['lat']
def reaches_new_ground(d):
    seen = False
    for lon, lat in element_points(d):
        seen = True
        if not in_earlier(lon, lat):
            return True
    return not seen   # no geometry at all: cannot tell, keep

MAX_SPLIT_DEPTH = 6   # a refused tile is cut into quarters, at most 6 times (a 850 m tile -> 13 m)
split_log = []        # tiles the API refused (HTTP 400, more than 50 000 nodes): cut into quarters; failed = nothing left to cut
failed_log = []

def download(url, dest):
    """Fetch one map-API tile into the cache. Returns True when the tile is cached, False when the API refuses it as too big
    (HTTP 400 'You requested too many nodes': a marker file <tile>.split remembers that, so a re-run does not ask again)."""
    marker = dest.with_name(dest.name + '.split')
    if dest.exists():
        return True
    if marker.exists():
        return False
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={'User-Agent':'PiterCityResearch/1.0 (OSM data bake)'})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            ET.fromstring(data)  # never cache an HTML error response
            tmp = dest.with_name(dest.name + '.part')
            tmp.write_bytes(data)
            tmp.replace(dest)
            print(f'{dest.name}: {len(data)//1024} KiB', flush=True)
            time.sleep(1)
            return True
        except urllib.error.HTTPError as e:
            if e.code == 400:
                body = ''
                try:
                    body = e.read().decode('utf8', 'replace')[:160]
                except Exception:
                    pass
                print(f'refused (400, too many nodes): {dest.name} {body.strip()}', flush=True)
                marker.write_text('400 ' + body, encoding='utf8')
                time.sleep(1)
                return False
            print(f'retry {attempt+1}: HTTP {e.code} {e.reason}', flush=True)
            if attempt == 5:
                raise
            time.sleep(60 if e.code in (429, 509) else 4+attempt*3)   # 509 = bandwidth limit: wait it out
        except Exception as e:
            print(f'retry {attempt+1}: {e}', flush=True)
            if attempt == 5:
                raise
            time.sleep(4+attempt*3)

def fetch_tile(name, tile, files, depth=0):
    """One tile (w, s, e, n); a tile refused as too big is cut into four quarters, recursively (the dense blocks of Vasilievsky Island)."""
    dest = CACHE / (name+'-'+','.join(f'{v:.6f}' for v in tile)+'.osm')
    if download('https://api.openstreetmap.org/api/0.6/map?bbox='+','.join(f'{v:.7f}' for v in tile), dest):
        files.append(dest)
        return
    if depth >= MAX_SPLIT_DEPTH:
        failed_log.append(dest.name)
        print(f'FAILED (still refused at depth {depth}): {dest.name}', flush=True)
        return
    split_log.append(dest.name)
    w,s,e,n = tile
    mx,my = (w+e)/2,(s+n)/2
    for q in ((w,s,mx,my),(mx,s,e,my),(w,my,mx,n),(mx,my,e,n)):
        fetch_tile(name, q, files, depth+1)

files = []
for b in boxes:
    w,n = b['nw']; e,s = b['se']; r = b['rect']
    nx = math.ceil((r['x1']-r['x0']+80)/850)
    ny = math.ceil((r['z1']-r['z0']+80)/850)
    for j in range(ny):
        for i in range(nx):
            tile = (w+(e-w)*i/nx,s+(n-s)*j/ny,w+(e-w)*(i+1)/nx,s+(n-s)*(j+1)/ny)
            fetch_tile(b['name'], tile, files)
print(f'tiles: {len(files)} cached, {len(split_log)} refused and split, {len(failed_log)} failed', flush=True)
if failed_log:
    raise SystemExit('tiles that could not be fetched: ' + ', '.join(failed_log))

nodes, ways, relations = {}, {}, {}
def ingest(file):
    for e in ET.parse(file).getroot():
        if e.tag in ('node','way','relation'):
            {'node':nodes,'way':ways,'relation':relations}[e.tag][int(e.attrib['id'])] = e
for f in files:
    ingest(f)
def tags(e):
    return {t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
# Map responses include parent relations but not necessarily all their members.
# Complete local building/park multipolygons. Existing full Neva data is retained.
for ident,e in list(relations.items()):
    t = tags(e)
    if t.get('type') != 'multipolygon' or not any(k in t for k in ('building','building:part','leisure','natural','landuse')):
        continue
    if ident in (2599821,1114249) or t.get('boundary') or t.get('water') == 'river':
        continue
    if any(m.attrib['type']=='way' and int(m.attrib['ref']) not in ways for m in e.findall('member')):
        f = CACHE/f'relation-{ident}.osm'
        download(f'https://api.openstreetmap.org/api/0.6/relation/{ident}/full',f)
        ingest(f)

def point(e):
    return {'lat':float(e.attrib['lat']),'lon':float(e.attrib['lon'])}
def geom(e):
    refs = [int(n.attrib['ref']) for n in e.findall('nd')]
    return [point(nodes[n]) for n in refs] if all(n in nodes for n in refs) else []
def convert(kind, ident, e):
    d = {'type':kind,'id':ident,'tags':tags(e)}
    if kind == 'node':
        d.update(point(e))
    elif kind == 'way':
        d['nodes'] = [int(n.attrib['ref']) for n in e.findall('nd')]
        d['geometry'] = geom(e)
    else:
        d['members'] = []
        for m in e.findall('member'):
            a = m.attrib
            mem = {'type':a['type'],'ref':int(a['ref']),'role':a.get('role','')}
            if a['type']=='way' and mem['ref'] in ways:
                mem['geometry'] = geom(ways[mem['ref']])
            elif a['type']=='node' and mem['ref'] in nodes:
                mem.update(point(nodes[mem['ref']]))
            d['members'].append(mem)
    return d

layers = {k:[] for k in ['buildings','roads','water','green','trees','street','pois','historic','parking','barriers','manmade','rail','bridges','transit']}
for kind,table in [('node',nodes),('way',ways),('relation',relations)]:
    for ident,e in table.items():
        t = tags(e)
        if not t:
            continue
        target = []
        if 'building' in t or 'building:part' in t: target.append('buildings')
        if (kind!='node' and 'highway' in t) or t.get('place')=='square' or 'area:highway' in t: target.append('roads')
        if t.get('natural')=='water' or 'waterway' in t or 'water' in t or t.get('landuse')=='basin' or t.get('amenity')=='fountain': target.append('water')
        if 'leisure' in t or 'landuse' in t or t.get('natural') in ['wood','scrub','grassland','tree_row','wetland','sand','shrubbery']: target.append('green')
        if kind=='node' and t.get('natural')=='tree': target.append('trees')
        if kind=='node' and any(k in t for k in ['highway','entrance','amenity','traffic_calming','advertising','leisure']): target.append('street')
        if any(k in t for k in ['shop','amenity','tourism','office','craft','healthcare']) or ('name' in t and ('historic' in t or 'leisure' in t)): target.append('pois')
        if any(k in t for k in ['historic','memorial','heritage']) or t.get('tourism')=='artwork': target.append('historic')
        if t.get('amenity') in ['parking','parking_space','parking_entrance','bicycle_parking','taxi']: target.append('parking')
        if 'barrier' in t: target.append('barriers')
        if 'man_made' in t or 'power' in t: target.append('manmade')
        if 'railway' in t or 'subway' in t or t.get('station')=='subway': target.append('rail')
        if 'bridge' in t or 'tunnel' in t or t.get('man_made')=='bridge': target.append('bridges')
        if 'public_transport' in t or t.get('highway')=='bus_stop': target.append('transit')
        if target:
            d = convert(kind,ident,e)
            for k in target: layers[k].append(d)

for name, entries in layers.items():
    f = RAW/(name+'.json')
    old = json.loads(f.read_text(encoding='utf8')) if f.exists() else {'elements':[]}
    merged = {(e['type'],e['id']):e for e in old['elements']}
    before = len(merged)
    pruned = 0
    for e in entries:
        key = (e['type'],e['id'])
        # Existing Overpass geometry is complete; map API parent relations can
        # have remote members not included in these small map responses.
        if key not in merged:
            if reaches_new_ground(e):
                merged[key] = e
            else:
                pruned += 1
    old['elements'] = list(merged.values())
    old.setdefault('mapApiCoverage',[]).extend([{'region':b['name'],'rect':b['rect']} for b in boxes])
    # written beside and renamed (other tools read these files while we work: they never see a half-written layer)
    tmp = f.with_name(f.name + '.tmp')
    tmp.write_text(json.dumps(old,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    for attempt in range(10):
        try:
            os.replace(tmp, f)
            break
        except PermissionError:
            if attempt == 9:
                raise
            time.sleep(1)
    print(f'{name}: +{len(merged)-before}, total {len(merged)} (not added: {pruned} new elements wholly inside the earlier regions)',flush=True)
print('Map API import complete; run node tools/bake-osm.mjs',flush=True)
