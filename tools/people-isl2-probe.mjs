// tools/people-isl2-probe.mjs - an --eval script of tools/people-test.mjs: what the sight services of the islands (round 2) publish for the people / wildlife owner.
//   node tools/people-test.mjs --mods environment,streets,city,landmarksYelaginPalace,... --eval tools/people-isl2-probe.mjs
// PROBE=svc (default) prints the shapes, PROBE=crowd the crowd / photoSpots / benches / gates, PROBE=bridges the bridge list near the islands, PROBE=closed the fenced yards.
const KEYS = ['landmarksKrestovsky', 'landmarksYelaginPalace', 'landmarksYelaginKitchen', 'landmarksYelaginServices', 'landmarksYelaginRossi', 'landmarksYelaginSpits', 'landmarksYelaginPark', 'landmarksKamennyPalace', 'landmarksKamennyChurch',
  'landmarksBotanicalGreenhouses', 'landmarksBotanicalGarden', 'landmarksPetrovskyStadium', 'landmarksPetrovskyYacht',
  'landmarksKamennyTheatre', 'landmarksKamennyDachasEast', 'landmarksKamennyDachasWest', 'landmarksTVTower', 'landmarksLETI', 'landmarksTransfiguration', 'landmarksPetrovskyWest', 'landmarksZhdanovka'];
const f1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : v);
export default async function probe(ctx) {
  const what = (process.env.PROBE || 'svc').split(',');
  const sv = ctx.services;
  if (what.includes('svc')) {
    for (const k of KEYS) {
      const s = sv[k]; if (!s) { console.log('== ' + k + ': MISSING'); continue; }
      console.log('== ' + k + ': ' + Object.keys(s).map((q) => (Array.isArray(s[q]) ? q + '[' + s[q].length + ']' : q)).join(' '));
    }
  }
  if (what.includes('crowd')) {
    for (const k of KEYS) {
      const s = sv[k] || {};
      for (const c of s.crowd || []) console.log(k + ' crowd', JSON.stringify(c));
      for (const c of (s.photoSpots || []).slice(0, 8)) console.log(k + ' photo', JSON.stringify({ name: c.name, x: f1(c.x), z: f1(c.z), y: c.y, yaw: c.yaw }));
      console.log(k + ' benches ' + (s.benches || []).length + ' entrances ' + (s.entrances || []).length + ' monuments ' + (s.monuments || []).length + ' gates ' + JSON.stringify((s.gates || []).slice(0, 6).map((g) => [g.id, f1(g.x), f1(g.z), g.open ?? !g.closed])));
    }
  }
  if (what.includes('ground')) {                                          // PROBE=ground GX=x GZ=z GR=r: an ASCII map of the physics ground height round (x, z): . < -0.3, ~ water, 0 [-0.3, 0.1), 1 [0.1, 0.5), 2 [0.5, 1.0), 3 [1.0, 2.0), # >= 2, B building, X blocked, ! fence-like
    for (const spec of String(process.env.GROUND || (process.env.GX + ',' + process.env.GZ + ',' + (process.env.GR || 30) + ',' + (process.env.GS || 2))).split(';')) {
    const [gx, gz, gr, step] = spec.split(',').map(Number), ph = ctx.physics, env = sv.environment || {};
    const rows = []; for (let z = gz - gr; z <= gz + gr; z += step) { let row = ''; for (let x = gx - gr; x <= gx + gr; x += step) { const h = ph.groundHeight(x, z, 3, false); let c = !Number.isFinite(h) ? '?' : h < -0.3 ? '.' : h < 0.1 ? '0' : h < 0.5 ? '1' : h < 1.0 ? '2' : h < 2 ? '3' : '#'; if (env.waterAt && env.waterAt(x, z) && !(Number.isFinite(h) && h > -0.05)) c = '~'; let solid = false; try { solid = ph.columnBlocked(x, z, 0.3, (Number.isFinite(h) ? h : 0) + 0.5, (Number.isFinite(h) ? h : 0) + 1.6); } catch (e) { solid = false; } if (solid) c = 'X'; row += c; } rows.push((z + '').padStart(7) + ' ' + row); }
    console.log('ground map centre', gx, gz, 'step', step, 'x from', gx - gr); for (const r of rows) console.log(r);
    }
  }
  if (what.includes('bridges')) {
    const b = sv.bridges || {};
    console.log('bridges keys', Object.keys(b).join(' '));
    for (const e of b.list || []) { const c = e.bounds || e; if (c && Number.isFinite(c.x0 ?? c.cx ?? c.x) ) console.log('bridge', e.id, JSON.stringify(e.bounds || {}).slice(0, 140)); }
    console.log('spans', JSON.stringify((b.spans || []).map((s) => [s.id, f1(s.a && s.a.x), f1(s.a && s.a.z), f1(s.b && s.b.x), f1(s.b && s.b.z), s.hw])));
  }
}
