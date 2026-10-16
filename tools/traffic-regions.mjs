// Runs tools/traffic-test.mjs as the page runs the traffic (regional simulation round the camera, bridges built: deck services + the open-water rule) at a list of named places and
// prints one line per place: RESULT, vehicles, stopped share, violations.
//   node tools/traffic-regions.mjs [--minutes 6] [--only tram,palace] [--verbose]
// Places of the strip: Vosstaniya Square, Nevsky at Gostiny Dvor, the tram, the Palace Bridge, St Isaac's Square. Exit code 1 when a place fails.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
export const PLACES = {
  // id: [x, z, name]
  vosstaniya: [589, 173, 'Vosstaniya Square'],
  gostiny: [-1100, -240, 'Nevsky at Gostiny Dvor'],
  tram: [-868, -348, 'Tram 3 at Italyanskaya ulitsa'],
  palace: [-2416, -978, 'Palace Bridge (the data edge)'],
  isaac: [-2440, -200, "St Isaac's Square"],
};
const only = flag('only', false) ? String(flag('only')).split(',') : null;
const ids = Object.keys(PLACES).filter((k) => (only ? only.includes(k) : true));
let bad = 0;
for (const id of ids) {
  const [x, z, name] = PLACES[id], t0 = Date.now();
  const r = spawnSync(process.execPath, ['--max-old-space-size=12288', path.join(root, 'tools/traffic-test.mjs'), '--region', `${x},${z}`, '--minutes', String(flag('minutes', 6))], { cwd: root, encoding: 'utf8', env: { ...process.env, TRAFFIC_BUILDLIST: process.env.TRAFFIC_BUILDLIST || 'environment,streets,bridges,traffic' }, maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || ''), line = (re) => { const m = re.exec(out); return m ? m[1] : '?'; };
  const ok = /RESULT: OK/.test(out); if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${id.padEnd(11)} ${name.padEnd(40)} vehicles ${line(/vehicles: (min \d+ avg \d+ max \d+)/)}; stopped ${line(/stopped share avg (\d+ %)/)}, ${line(/mean speed ([\d.]+ m\/s)/)}; trams ${line(/trams: ([\d.]+) on the map/)} (pushes ${line(/standing queue (\d+) times/)}, unseen cars removed ${line(/on the rails (\d+) times/)}); ${line(/violations (\{.*\})/)} deadlock kills ${line(/deadlock kills (\d+)/)} (${Math.round((Date.now() - t0) / 1000)} s)`);
  if (!ok || args.includes('--verbose')) console.log(out.split('\n').filter((l) => /off-lane|off-rail|teleport|stuck|red run|standing > 45|hotspots/.test(l)).slice(0, 14).map((l) => '      ' + l.trim().slice(0, 400)).join('\n'));
}
console.log(bad ? `RESULT: FAIL (${bad} of ${ids.length})` : `RESULT: OK (${ids.length} places)`);
process.exit(bad ? 1 : 0);
