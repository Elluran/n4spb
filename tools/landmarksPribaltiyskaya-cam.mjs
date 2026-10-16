// tools/landmarksPribaltiyskaya-cam.mjs - camera strings for tools/shot.mjs from frame-local coordinates of landmarksPribaltiyskaya (frames H = hotel, K = Kirov, W = world).
// usage: node tools/landmarksPribaltiyskaya-cam.mjs "H:eyeA,eyeB,eyeY>tgtA,tgtB,tgtY" ["K:..." ...]   (walking eye: omit eyeY and give 4 numbers via 'w' prefix:  "Hw:eyeA,eyeB>tgtA,tgtB,tgtY" -> x,z,yaw,pitch at eye 1.7 m)
// prints the semicolon-joined --cams value.  yaw 0 = north (-z), 90 = west, 180 = south, -90 = east.
const FR = { H: [-7573.07, -746.9, 1.9966], K: [-7987.21, -1067.85, 2.0017], W: [0, 0, 0] };
const W = (f, a, b) => { const [x, z, r] = FR[f], C = Math.cos(r), S = Math.sin(r); return f === 'W' ? { x: a, z: b } : { x: x + C * a + S * b, z: z - S * a + C * b }; };
const out = [];
for (const spec of process.argv.slice(2)) {
  const m = /^([HKW])(w?):([^>]+)>(.+)$/.exec(spec); if (!m) { console.error('bad spec', spec); process.exit(1); }
  const f = m[1], walk = m[2] === 'w', e = m[3].split(',').map(Number), t = m[4].split(',').map(Number);
  const pe = W(f, e[0], e[1]), pt = W(f, t[0], t[1]), ey = walk ? 1.7 + (e[2] || 0) : e[2], ty = t[2] ?? 1.7;
  const dx = pt.x - pe.x, dz = pt.z - pe.z, dy = ty - ey, yaw = Math.atan2(-dx, -dz) * 180 / Math.PI, pitch = Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI;
  out.push(walk && !(e[2]) ? `${pe.x.toFixed(1)},${pe.z.toFixed(1)},${yaw.toFixed(1)},${pitch.toFixed(1)}` : `${pe.x.toFixed(1)},${ey.toFixed(1)},${pe.z.toFixed(1)},${yaw.toFixed(1)},${pitch.toFixed(1)}`);
}
console.log(out.join(';'));
