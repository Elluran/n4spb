"""Shared helpers of the Tauride shapely scripts (tools/tauride/*.py). Needs Python 3 and shapely (tested with Python 3.12 / shapely 2.1.2).

Every script reads JSON written by the node steps and writes a COMPLETE output file (never appends): running a script twice gives the same bytes.
Paths are repo-relative: the repo root is two folders above this file, the work folder defaults to tools/tauride/raw/work (git-ignored).
"""
import argparse
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RAW = os.path.join(ROOT, 'tools', 'tauride', 'raw')
WORK = os.path.join(RAW, 'work')


def args(extra=None):
    """--work <dir> (intermediate files), --out <dir> (generated modules), plus extra (name, default, help) triples"""
    p = argparse.ArgumentParser()
    p.add_argument('--work', default=WORK)
    p.add_argument('--out', default=None)
    for name, default, help_ in (extra or []):
        p.add_argument('--' + name, default=default, help=help_)
    a = p.parse_args()
    a.work = os.path.abspath(os.path.join(ROOT, a.work))
    a.out = os.path.abspath(os.path.join(ROOT, a.out)) if a.out else os.path.join(a.work, '..', 'out')
    a.out = os.path.abspath(a.out)
    return a


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def write_text(path, text):
    """whole file, UTF-8 without BOM, LF only"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def ring(r):
    """flat [x, z, x, z ...] -> [(x, z), ...]"""
    return list(zip(r[::2], r[1::2]))


def flat(r, nd=3, closed=False):
    """closed shapely coordinate sequence -> flat list, rounded; the closing vertex is dropped unless closed=True (the palace parts of the source repository keep it)"""
    pts = list(r) if closed else list(r)[:-1]
    return [round(v, nd) for p in pts for v in p]


def parts(geom):
    """the polygons of a (multi)geometry"""
    return [g for g in (geom.geoms if hasattr(geom, 'geoms') else [geom]) if g.geom_type == 'Polygon']


def dumps(v):
    return json.dumps(v, separators=(',', ':'), ensure_ascii=False)


def clean_ring(r):
    """drop adjacent duplicate vertices and a repeated closing vertex of a flat ring -> [(x, z)]"""
    pts = []
    for q in ring(r):
        if not pts or q != pts[-1]:
            pts.append(q)
    if len(pts) > 1 and pts[-1] == pts[0]:
        pts.pop()
    return pts


def flat_pts(pts):
    return [v for q in pts for v in q]


def banner(msg):
    sys.stdout.write(msg + '\n')
