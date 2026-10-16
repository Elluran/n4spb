// tools/landmarksMariinsky-figs.mjs - script for tools/figures-view.mjs: the two bronze figures of Teatralnaya Square (Glinka, Rimsky-Korsakov) side by side on a bare stage.
// usage: node tools/figures-view.mjs --script tools/landmarksMariinsky-figs.mjs --out shots/figures/mar --cams "0,10,7,-1.5,2.5,0;..."
import { glinkaFig, rkFig } from '/src/world/landmarksMariinsky/monuments.js';
export default function (THREE) {
  const bronze = new THREE.MeshToonMaterial({ color: 0x5a6b58 }), dark = new THREE.MeshToonMaterial({ color: 0x1a1a18 }), accent = new THREE.MeshToonMaterial({ color: 0xd9c070 });
  const mats = { main: bronze, dark, accent };
  const g = new THREE.Group();
  const a = glinkaFig().toGroup(mats); a.scale.setScalar(2.0); a.position.set(-3, 0, 0); g.add(a);
  const b = rkFig().toGroup(mats); b.scale.setScalar(2.8); b.position.set(3, 0, 0); g.add(b);
  return g;
}
