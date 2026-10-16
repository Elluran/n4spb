// tools/landmarksMining-figs.mjs - script for tools/figures-view.mjs: the two sculpture groups of the Mining University stair (Hercules and Antaeus, Pluto and Proserpine) side by side on their plinths.
// usage: node tools/figures-view.mjs --script tools/landmarksMining-figs.mjs --out shots/landmarksMining/fig --cams "0,8,9,0,1.8,0;60,8,9,0,1.8,0" --w 1200 --h 800
import { herculesAntaeus, plutoProserpine } from '/src/world/landmarksMining/sculpt.js';
export default function (THREE) {
  const trav = new THREE.MeshToonMaterial({ color: 0xd9cbb0 }), dark = new THREE.MeshToonMaterial({ color: 0x1a1a18 }), accent = new THREE.MeshToonMaterial({ color: 0xc99a3a });
  const mats = { main: trav, dark, accent };
  const g = new THREE.Group();
  const a = herculesAntaeus().toGroup(mats); a.scale.setScalar(1.7); a.position.set(2.2, 0.73, 0); g.add(a);
  const b = plutoProserpine().toGroup(mats); b.scale.setScalar(1.7); b.position.set(-2.2, 0.73, 0); g.add(b);
  for (const x of [-2.2, 2.2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.73, 2.3), new THREE.MeshToonMaterial({ color: 0xc9bfa8 })); p.position.set(x, 0.365, 0); g.add(p); }
  return g;
}
