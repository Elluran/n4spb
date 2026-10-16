// tools/bridges-cams-whsd.mjs - prints --cams strings for tools/shot.mjs around the WHSD scenery of bridges/whsd.js (data: sites-vo2.js WHSD).
// usage: node tools/bridges-cams-whsd.mjs [names,...]    names: portal (the VO portals from the south), portaln (the north portals), cut (the open cutting from the west bank, aerial), cut2 (the cutting from the street level), via1 (the first viaduct from the north
//   end, aerial), via2 (the viaduct over the Gulf shore from the east, aerial), shore (walking eye at the shore east of the viaduct), vista (the Korabelny pylons from the Gulf shore), pyl (the pylons from the south-east, aerial), under (below the viaduct)
const yawOf = (dx, dz) => -(Math.atan2(dx, -dz) * 180 / Math.PI);
const look = (from, fy, to, ty) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0]},${fy},${from[1]},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - fy, dh) * 180 / Math.PI).toFixed(1)}`; };
const walk = (from, to, ty = 1.6) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0]},${from[1]},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - 1.7, dh) * 180 / Math.PI).toFixed(1)}`; };
const cams = {
  portal: look([-8120, -1890], 6, [-8147, -1977], 4), portaln: look([-8035, -2330], 6, [-8062, -2257], 4), basin: look([-8150, -2100], -1.6, [-8147, -1977], 4), basinn: look([-8110, -2110], -1.6, [-8062, -2257], 4),
  cut: look([-8330, -1250], 40, [-8250, -1450], 0), cut2: walk([-8150, -1000], [-8180, -1100]), via1: look([-7960, -120], 40, [-7855, -240], 6), via2: look([-7960, 150], 34, [-7822, 330], 8),
  shore: walk([-7760, 440], [-7822, 440], 8), vista: look([-7500, 700], 3, [-7850, 1275], 60), pyl: look([-7500, 1000], 50, [-7870, 1440], 60), under: look([-7845, 40], 1.5, [-7838, 120], 7),
};
const pick = (process.argv[2] || Object.keys(cams).join(',')).split(',');
for (const k of pick) if (!cams[k]) { console.error('unknown camera', k, Object.keys(cams).join(' ')); process.exit(1); }
console.log(pick.map((k) => cams[k]).join(';'));
