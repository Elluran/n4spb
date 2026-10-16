// Runs tools/traffic-test.mjs as the page runs the traffic (regional simulation round the camera, bridges built: deck services + the open-water rule) at a list of named places and
// prints one line per place: RESULT, vehicles, stopped share, violations.
//   node tools/traffic-regions.mjs [--minutes 6] [--only trinity,palace] [--set petro|old|all] [--verbose]
// Places of the Petrograd side / Spit extension (2026-10-06): the five Neva bridges and the big junctions. Exit code 1 when a place fails.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
export const PLACES = {
  // id: [x, z, name, set]
  trinity: [-1330, -1820, 'Trinity Bridge (mid span)', 'petro'],
  palace: [-2416, -978, 'Palace Bridge', 'petro'],
  birzhevoy: [-2679, -1545, 'Birzhevoy Bridge', 'petro'],
  tuchkov: [-3676, -1842, 'Tuchkov Bridge', 'petro'],
  samps: [-778, -2845, 'Sampsonievsky Bridge', 'petro'],
  tolstoy: [-2198, -3714, 'Lev Tolstoy Square', 'petro'],
  troitskaya: [-1579, -2360, 'Troitskaya Square', 'petro'],
  birzhevaya: [-2580, -1240, 'Birzhevaya Square', 'petro'],
  austrian: [-1906, -3065, 'Austrian Square (Kamennoostrovsky pr.)', 'petro'],
  // P6..P9 (2026-10-07): the rest of Petrogradsky Island
  pionerskaya: [-3800, -3050, 'Pionerskaya ulitsa (Bolshoy pr. - Lazarev emb.)', 'petro'],
  lazarev: [-4333, -3634, 'Lazarevsky Bridge head', 'petro'],
  bkrest: [-3964, -3857, 'Bolshoy Krestovsky Bridge head', 'petro'],
  karpovka: [-2300, -4080, 'Kamennoostrovsky pr. at the Karpovka', 'petro'],
  grenadersky: [-932, -3960, 'Grenadersky Bridge head', 'petro'],
  posadskaya: [-1350, -3095, 'Bolshaya Posadskaya (tram depot)', 'petro'],
  bolshoy: [-2962, -2795, 'Bolshoy pr. P.S. (middle)', 'petro'],
  // Vasilievsky Island (2026-10-09; --set vo): the bridges and the busy streets of docs/research/vo-roster-metro.md 3.5
  vo_blag: [-3450, -265, 'Blagoveshchensky Bridge (trolleybus 12)', 'vo'],
  vo_univ: [-3500, -600, 'Universitetskaya emb. at the Academy', 'vo'],
  vo_hub: [-4090, -1190, 'Vasileostrovskaya hub (Sredny pr. x 8-9 liniya, trams)', 'vo'],
  vo_bolshoy: [-3957, -676, 'Bolshoy pr. (two one-way carriageways)', 'vo'],
  vo_tuchkov: [-3741, -1700, 'Sportivnaya bridge-head (Tuchkov Bridge, trams)', 'vo'],
  vo_depot: [-4949, -677, 'Tram depot fork (Sredny pr.)', 'vo'],
  vo_gorny: [-5023, 7, 'Gorny Institut (Kosaya liniya tram)', 'vo'],
  vo_maly: [-6340, -159, 'Maly pr. at the Shkipersky protok', 'vo'],
  vo_nalichny: [-6702, -1708, 'Nalichny Bridge', 'vo'],
  vo_kor: [-7532, -1948, 'Korablestroiteley Bridge', 'vo'],
  vo_uralsky: [-4628, -1827, 'Uralsky Bridge', 'vo'],
  vo_smolensky: [-5287, -1646, 'Smolensky Bridge', 'vo'],
  vosstaniya: [589, 173, 'Vosstaniya Square', 'old'],
  gostiny: [-1100, -240, 'Nevsky at Gostiny Dvor', 'old'],
  isaac: [-2440, -200, "St Isaac's Square", 'old'],
};
const set = String(flag('set', 'petro')), only = flag('only', false) ? String(flag('only')).split(',') : null;
const ids = Object.keys(PLACES).filter((k) => (only ? only.includes(k) : set === 'all' || PLACES[k][3] === set));
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
