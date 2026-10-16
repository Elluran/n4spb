// cams for the Troitsky Bridge (frame of bridges/troitsky.js): node tools/bridges-cams-troitsky.mjs [names]  names: entry,deck,water,aerial,vista,candel,bascule,arch,under,obelisk,far,viaduct,north,abut,aerial-n,steel
import { TROITSKY } from '../src/world/bridges/troitsky.js';
import { toWorld } from '../src/world/bridges/sites.js';
const S = { ...TROITSKY };
const W = (u, v) => toWorld(S, u, v);
const yawOf = (dx, dz) => +(-(Math.atan2(dx, -dz) * 180 / Math.PI)).toFixed(1);
const look = (a, c, y, ty) => { const dx = c.x - a.x, dz = c.z - a.z, dh = Math.hypot(dx, dz); return `${a.x.toFixed(1)},${y},${a.z.toFixed(1)},${yawOf(dx, dz)},${(Math.atan2(ty - y, dh) * 180 / Math.PI).toFixed(1)}`; };
const names = (process.argv[2] || 'entry,deck,water,aerial,vista,candel,bascule').split(',');
const out = [];
for (const n of names) {
  if (n === 'entry') out.push(look(W(-40, -4), W(60, -4), 1.7, 2.5));
  if (n === 'deck') out.push(look(W(100, -10.5), W(200, -10.5), 1.7, 3.5));
  if (n === 'water') out.push(look(W(90, 60), W(90, 0), -1.4, 1.5));
  if (n === 'aerial') out.push(look(W(-70, 70), W(110, 0), 45, 0));
  if (n === 'vista') out.push(look(W(-160, 40), W(150, 0), 12, 2));
  if (n === 'candel') out.push(look(W(5, -9), W(40, -11), 1.7, 4.0));
  if (n === 'bascule') out.push(look(W(35, 38), W(35, 0), 0.6, 0.5));
  if (n === 'arch') out.push(look(W(100, 34), W(100, 0), 0.5, -1.0));
  if (n === 'arch2') out.push(look(W(170, 50), W(170, 0), -0.8, 0.5));
  if (n === 'under') out.push(look(W(100, 8), W(100, -10), -2.4, 0));
  if (n === 'obelisk') out.push(look(W(-22, -4), W(-9, -13.2), 1.7, 5.5));
  if (n === 'obelisk2') out.push(look(W(-12, -7.5), W(-9, -13.2), 1.7, 7));
  if (n === 'candel2') out.push(look(W(20, -6.5), W(13.3, -11.25), 1.7, 3.5));
  if (n === 'far') out.push(look(W(200, 0), W(330, 0), 5, 3));
  // the north (Petrograd) end: the granite viaduct from the water, from the Kronverkskaya embankment corner, the abutment from the Petrovskaya side, the whole bridge from above the north bank
  if (n === 'viaduct') out.push(look(W(520, -45), W(520, 0), -1.5, 0.5));
  if (n === 'north') out.push(look(W(585, -40), W(400, 0), 1.7, 2));
  if (n === 'abut') out.push(look(W(575, 30), W(540, 12), 1.7, 0));
  if (n === 'aerial-n') out.push(look(W(640, -260), W(277, 0), 160, 0));
  if (n === 'steel') out.push(look(W(165, -38), W(218, -12), -0.5, 3));
}
console.log(out.join(';'));
