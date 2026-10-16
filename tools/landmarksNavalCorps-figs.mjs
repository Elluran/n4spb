// tools/landmarksNavalCorps-figs.mjs - script for tools/figures-view.mjs: the bronze figure of Admiral Krusenstern (landmarksNavalCorps/figure.js) on a bare stage, in the verdigris bronze of the monument.
// usage: node tools/figures-view.mjs --script tools/landmarksNavalCorps-figs.mjs --out shots/figures/krus --cams "0,8,6,0,1.5,0;90,8,6,0,1.5,0;180,8,6,0,1.5,0;40,12,3,0,1.9,0"
import { krusensternFig } from '/src/world/landmarksNavalCorps/figure.js';
export default function (THREE) {
  const bronze = new THREE.MeshToonMaterial({ color: 0x4a6a5e }), dark = new THREE.MeshToonMaterial({ color: 0x1a1d1c }), accent = new THREE.MeshToonMaterial({ color: 0x6d6a50 });
  const g = new THREE.Group();
  const a = krusensternFig().toGroup({ main: bronze, dark, accent }); a.scale.setScalar(1.71); g.add(a);
  return g;
}
