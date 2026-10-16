// tools/environment-cams.mjs - prints the eye-level cameras of a west sweep for tools/zfight.mjs: node tools/environment-cams.mjs 90 > cams.txt; node tools/zfight.mjs --cams "$(cat cams.txt)" --quiet --params "tr=nopark,nomove&people=off&wl=nobirds" (cameras in water / inside trunks give false alarms)
import * as L from '../src/world/layout.js';
const step = Number(process.argv[2] || 150); const cams = [];
for (let x = -2850; x < -650; x += step) for (let z = -1150; z < 230; z += step) {
  if (!L.inPlay(x, z) || L.insideBuilding(x, z, 1.5) || L.isOnRoad && 0) continue;
  for (let k = 0; k < 2; k++) { const yaw = Math.round(((k / 2) * 360 + (((x * 7 + z * 13) | 0) % 90) + 360) % 360); cams.push(`${x},${z},${yaw},2`); }
}
console.log(cams.join(';'));
