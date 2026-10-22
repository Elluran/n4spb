// hill-legibility.mjs - T3 fix round 2: how well the garden ground shader's relief term reads on each of the nine hills (data/relief.js) from a given distance. CPU only, no GPU, no browser: the JS port of the
// shader's relief term (ground-material.js reliefTone, the same LOOK numbers as the GLSL) on the real height function. node tools/tauride/hill-legibility.mjs [--dist 60,120,300,480] [--old]
//   lit / shade = the mean tone of the cells that face the sun over the mean tone of the cells that face away; vis = the share of the hill's cells whose tone differs from flat ground by more than 12 %.
//   --old also prints the first version of the shader (a painter's light from the NW, one soft term of amplitude 0.42 and gain 5 at every distance, melted away with the lawn's patchwork from 160 m): the numbers the
//   GPU QA of T3 called "soft dark smudges at 250-480 m". The image-side check of the same thing is the software-GL renders of tools/tauride/ground-preview.mjs (views aerial-*-250, top-300, top-480).
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const args = Object.fromEntries(process.argv.slice(2).reduce((a, s, i, all) => (s.startsWith('--') ? [...a, [s.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const GM = await imp('src/world/landmarksTauride/ground-material.js'), GH = await imp('src/world/landmarksTauride/height.js'), REL = await imp('src/world/landmarksTauride/data/relief.js');
const dists = String(args.dist || '60,120,300,480').split(',').map(Number);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const h = (x, z) => GH.gardenHeight(x, z) ?? 0;
const L0 = GM.LOOK, sl = Math.hypot(...L0.sun), SUN = [L0.sun[0] / sl, L0.sun[1] / sl];
const OLD = { ...L0, farAmp: 0.42, gainFar: 5, cel: 0, flankFar: 0, warm: [0, 0, 0], cool: [0, 0, 0] }, OLDLIGHT = [-0.55 / Math.hypot(-0.55, -0.83), -0.83 / Math.hypot(-0.55, -0.83)];
function stats(f, dist, light, L, melt) {
  const r = Math.max(f.rx, f.rz) * 1.15; let nl = 0, ns = 0, tl = 0, ts = 0, vis = 0, n = 0;
  for (let x = f.x - r; x <= f.x + r; x += 1) for (let z = f.z - r; z <= f.z + r; z += 1) {
    if (h(x, z) < 0.12) continue;
    const fx = -(h(x + 0.5, z) - h(x - 0.5, z)), fz = -(h(x, z + 0.5) - h(x, z - 0.5)), s = fx * light[0] + fz * light[1];
    let { tone } = GM.reliefTone(fx, fz, dist, light, L); if (melt) tone = 1 + (tone - 1) * (1 - sstep(160, 1100, dist) * 0.8);
    n++; if (Math.abs(tone - 1) > 0.12) vis++;
    if (s > 0.03) { tl += tone; nl++; } else if (s < -0.03) { ts += tone; ns++; }
  }
  return { ratio: (tl / nl) / (ts / ns), vis: vis / n };
}
console.log(`the sun on the ground plane (to the light): ${SUN.map((v) => v.toFixed(3)).join(', ')}; far range ${L0.farA}-${L0.farB} m, cel ${L0.cel}, far amplitude ${L0.farAmp}, far gain ${L0.gainFar}`);
console.log('hill  ' + dists.map((d) => `${String(d).padStart(4)} m: lit/shade  vis`).join(' | ') + (args.old ? '   [first version in brackets]' : ''));
for (const f of REL.FEATURES) {
  let row = `${f.key} ${f.id.padEnd(18)}`;
  for (const d of dists) {
    const a = stats(f, d, SUN, L0, false); row += ` | ${a.ratio.toFixed(2)} ${(a.vis * 100).toFixed(0).padStart(3)}%`;
    if (args.old) { const o = stats(f, d, OLDLIGHT, OLD, true); row += ` [${o.ratio.toFixed(2)} ${(o.vis * 100).toFixed(0).padStart(3)}%]`; }
  }
  console.log(row);
}
