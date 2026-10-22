"""Plan of the Paradny quarter (matplotlib): buildings with ids, roads, barriers, stair ways (red), fountains.

    python tools/tauride/paradny-plan.py [--work tools/tauride/raw/work] [--out tools/tauride/raw/out]

reads   <work>/paradny-data.json (paradny-inspect.mjs)      writes  <out>/paradny-plan.png   North up.
"""
import sys
sys.dont_write_bytecode = True      # no tools/tauride/__pycache__ (it is not git-ignored)
import os

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from tauride_geom import args, load

a = args()
d = load(os.path.join(a.work, 'paradny-data.json'))
fig, ax = plt.subplots(figsize=(13, 13))
for b in d['BUILDINGS']:
    for q in b['polys']:
        ax.fill(q['o'][::2], [-z for z in q['o'][1::2]], color='#ccc')
        for h in q['h']:
            ax.fill(h[::2], [-z for z in h[1::2]], color='white')
    ax.text(b['cx'], -b['cz'], b['id'], fontsize=6, clip_on=True)
for b in d['ROADS']:
    if b.get('pts'):
        ax.plot(b['pts'][::2], [-z for z in b['pts'][1::2]], color='#aaa', lw=.7)
for b in d['BARRIERS']:
    if b.get('pts'):
        ax.plot(b['pts'][::2], [-z for z in b['pts'][1::2]], color='orange', lw=2)
for b in d['STEPS']:
    ax.plot(b['pts'][::2], [-z for z in b['pts'][1::2]], color='red', lw=2)
for b in d['WATER']:
    for q in b['polys']:
        ax.fill(q['o'][::2], [-z for z in q['o'][1::2]], color='blue')
ax.set_xlim(700, 1120)
ax.set_ylim(850, 1230)
ax.grid()
ax.set_aspect('equal')
os.makedirs(a.out, exist_ok=True)
fig.savefig(os.path.join(a.out, 'paradny-plan.png'), dpi=90, bbox_inches='tight')
print('paradny-plan.png written to', os.path.relpath(a.out))
