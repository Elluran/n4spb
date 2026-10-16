// tools/landmarksPetroMonuments-cams.mjs - walking-eye cameras for tools/shot.mjs in front of the pieces of landmarksPetroMonuments (yaw / position from the pieces after the road slide):
// usage: node tools/landmarksPetroMonuments-cams.mjs key:dist[:pitch[:side]],key:dist ...   -> prints the --cams string ("x,z,yawDeg,pitch;..."); `side` (deg) turns the camera round the piece.
// Example: node tools/landmarksPetroMonuments-cams.mjs popov:8:12,uglov:3.5:6,pp-rus:2.2:4
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = spawnSync(process.execPath, [path.join(root, 'tools/check.mjs'), 'landmarksPetroMonuments'], { env: { ...process.env, PM_DEBUG: '2', NODE_OPTIONS: '--max-old-space-size=14000' }, encoding: 'utf8' });
const rows = (r.stdout || '').split('\n').filter((l) => l.startsWith('PM_PART')).map((l) => JSON.parse(l.slice(8)));
const out = [];
for (const spec of (process.argv[2] || '').split(',').filter(Boolean)) {
  const [key, d = '4', pitch = '6', side = '0'] = spec.split(':'), p = rows.find((q) => q.key === key);
  if (!p) { console.error('missing piece', key); continue; }
  const yaw = p.yaw + Number(side) * Math.PI / 180, dist = Number(d);
  out.push([(p.x + Math.sin(yaw) * dist).toFixed(1), (p.z + Math.cos(yaw) * dist).toFixed(1), (yaw * 180 / Math.PI).toFixed(1), pitch].join(','));
}
console.log(out.join(';'));
