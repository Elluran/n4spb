"""Plan of the garden data (matplotlib): buildings, garden outline, the water pieces (union drawn on top), ways coloured by class, fences, gates, bridges.

    python tools/tauride/tauride-plan.py [--work tools/tauride/raw/work] [--out tools/tauride/raw/out] [--crop x0,x1,z0,z1]

reads   <work>/derived.json (+ <work>/union.json when present)      writes  <out>/tauride-plan.png   North up (z is south: the plot is mirrored in z).
"""
import sys
sys.dont_write_bytecode = True      # no tools/tauride/__pycache__ (it is not git-ignored)
import os

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from tauride_geom import args, load

a = args([('crop', '900,1520,1240,1830', 'x0,x1,-z0,-z1 window (metres, north up)')])
d = load(os.path.join(a.work, 'derived.json'))
u = os.path.join(a.work, 'union.json')
union = load(u)['polygons'] if os.path.exists(u) else []
x0, x1, y0, y1 = [float(v) for v in a.crop.split(',')]
COL = {'main': '#d2691e', 'side': '#e8a317', 'trail': '#8b5a2b', 'steps': '#9400d3', 'bridge': '#d62728'}
fig, ax = plt.subplots(figsize=(13, 13))
for b in d['buildings']:
    for q in b['polys']:
        ax.fill(q['o'][::2], [-z for z in q['o'][1::2]], color='#bbb')
        for h in q['h']:
            ax.fill(h[::2], [-z for z in h[1::2]], color='white')
    ax.text(b['cx'], -b['cz'], b['id'], fontsize=6, clip_on=True)
for q in d['garden']:
    ax.plot(q['o'][::2] + [q['o'][0]], [-z for z in q['o'][1::2]] + [-q['o'][1]], color='green', lw=2)
for q in d['ponds']:
    ax.fill(q['o'][::2], [-z for z in q['o'][1::2]], color='#8bd', alpha=.5)
for p in union:
    ax.plot(p['o'][::2] + [p['o'][0]], [-z for z in p['o'][1::2]] + [-p['o'][1]], color='#1f77b4', lw=1.5)
    for h in p['h']:
        ax.plot(h[::2] + [h[0]], [-z for z in h[1::2]] + [-h[1]], color='#1f77b4', lw=1.5, ls='--')
for r in d['paths']:
    c = COL.get(r.get('cls'), 'orange')
    ax.plot(r['pts'][::2], [-z for z in r['pts'][1::2]], color=c, lw={'main': 2.6, 'bridge': 3}.get(r.get('cls'), 1.2))
for f in d.get('barriers', []):
    ax.plot(f['pts'][::2], [-z for z in f['pts'][1::2]], color='red', lw=1, ls=':')
for g in d.get('gates', []):
    p = g.get('p') or [g['x'], g['z']]
    ax.plot([p[0]], [-p[1]], 'k^', ms=6)
ax.set_aspect('equal')
ax.grid(alpha=.3)
ax.set_xlim(x0, x1)
ax.set_ylim(y0, y1)
os.makedirs(a.out, exist_ok=True)
fig.savefig(os.path.join(a.out, 'tauride-plan.png'), dpi=90, bbox_inches='tight')
print('tauride-plan.png written to', os.path.relpath(a.out))
