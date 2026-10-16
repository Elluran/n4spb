// Regression for sector visibility of meshes that retain their streamed-region parent.
// No renderer needed: exercise camera movement, off-camera shadow casters, zone hiding and region removal.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LOD } from '../src/core/lod.js';
import { splitInstanced, sizeClass } from '../src/core/spatial.js';
import { batchStatic } from '../src/core/batch2.js';

const root = new THREE.Group(), region = new THREE.Group();
root.add(region); LOD.init(root);
const camera = new THREE.PerspectiveCamera(60, 1, 0.25, 3000);
const player = new THREE.Vector3();
function view(x, z, tx, tz, options = {}) {
  camera.position.set(x, 2, z); camera.lookAt(tx, 2, tz);
  player.set(x, 0, z); LOD.update(player, camera, options);
}
function add(x, z, opts = {}) {
  const object = new THREE.Object3D(); region.add(object);
  LOD.add(object, x, z, 1, opts.far ?? Infinity, opts);
  return object;
}

const city = add(160, -1120), attached = add(160, -1120, { attach: true }), ndProxy = add(160, -1120, { attach: true, nd: true });
assert.equal(attached.parent.parent, LOD.root, 'colour pieces belong to the colour sector tree');
assert.equal(ndProxy.parent.parent, LOD.ndRoot, 'outline proxies belong to a separate sector tree');
assert.equal(LOD.ndRoot.parent, LOD.root.parent, 'both static pass trees are siblings');
view(160, 0, 160, -1120);
assert.equal(city.visible, true, 'visible streamed mesh draws');
assert.equal(attached.parent.visible, true, 'visible sector draws attached pieces');
assert.equal(ndProxy.parent.visible, false, 'outline sector beyond outline range stays hidden while colour remains drawn');
view(160, -1000, 160, -1120);
assert.equal(ndProxy.parent.visible, true, 'nearby outline sector becomes visible');
view(160, 0, 160, 1120);
assert.equal(city.visible, false, 'off-camera streamed mesh is hidden');
assert.equal(attached.parent.visible, false, 'off-camera sector hides attached pieces');
assert.equal(ndProxy.parent.visible, false, 'off-camera sector also hides outline proxies');
assert.equal(city.parent, region, 'streamed mesh keeps its region parent');

const late = add(160, -1120);
city.visible = true; // A zone can restore visibility after LOD ran.
view(160, 0, 160, 1120);
assert.equal(late.visible, false, 'mesh attached to an already hidden sector is hidden');
assert.equal(city.visible, false, 'zone-restored mesh in a hidden sector is hidden again');
view(160, 0, 160, -1120);
assert.equal(city.visible, true, 'turning back restores the streamed mesh');
assert.equal(late.visible, true, 'turning back restores a newly attached mesh');

// The whole sector is behind this camera but close enough to contain sun-shadow casters.
const caster = add(160, -160, { shadow: true });
const detail = add(160, -160, { shadow: false });
view(160, 100, 160, 1000, { shadowR: 110 });
assert.equal(caster.visible, true, 'nearby caster survives camera-facing culling');
assert.equal(detail.visible, false, 'off-camera non-caster stays hidden');
view(160, 1000, 160, 2000, { shadowR: 110 });
assert.equal(caster.visible, false, 'caster outside the shadow range is hidden');

const zoned = add(160, -1120);
zoned.userData._zh = true; zoned.visible = false;
view(160, 0, 160, -1120);
assert.equal(zoned.visible, false, 'LOD never unhides a zone-hidden mesh');
zoned.userData._zh = false;
view(160, 0, 160, -1120);
assert.equal(zoned.visible, true, 'mesh returns when its zone becomes visible');

const closeDetail = add(160, -1120, { far: 100 });
const registeredCount = LOD.items.length;
LOD.add(closeDetail, 160, -1120, 8, 400);
assert.equal(LOD.items.length, registeredCount, 're-registering an unsplit mesh creates no duplicate');
assert.equal(LOD.of(closeDetail).far, 100, 'generic registration preserves the authored LOD distance');
view(160, 0, 160, -1120);
assert.equal(closeDetail.visible, false, 'visible sector preserves per-mesh distance LOD');
view(160, -1080, 160, -1120);
assert.equal(closeDetail.visible, true, 'detail returns within its LOD range');

const gone = new Set(); region.traverse(o => { if (LOD.of(o)) gone.add(o); });
LOD.remove(region);
assert.equal(LOD.items.some(it => gone.has(it.obj)), false, 'removed region leaves no registry items');
for (const sector of LOD.sectors.values()) {
  assert.equal(sector.items.some(it => gone.has(it.obj)), false, 'removed region leaves no sector items');
  assert.equal(sector.loose.some(it => gone.has(it.obj)), false, 'removed region leaves no external visibility items');
}
assert.equal(LOD.of(city), null, 'removed mesh loses its registry lookup');
assert.ok(LOD.of(attached), 'sector-owned mesh remains registered');

const instanced = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), 2);
instanced.setMatrixAt(0, new THREE.Matrix4()); instanced.setMatrixAt(1, new THREE.Matrix4().makeTranslation(450, 0, 0)); root.add(instanced);
LOD.add(instanced, 225, 0, 230, 120, { shadow: false });
const split = splitInstanced(root);
assert.equal(split.split, 1, 'wide instanced source splits into cells');
assert.equal(LOD.of(instanced), null, 'replaced source leaves no registry lookup');
assert.equal(LOD.items.some(it => it.obj === instanced), false, 'replaced source leaves no registry item');
const pieces = LOD.items.filter(it => it.obj.isInstancedMesh);
assert.equal(pieces.length, 2, 'both replacement cells register');
assert.ok(pieces.every(it => it.far === 120 && it.shadow === false), 'split cells retain the authored distance and shadow eligibility');

// Skyline objects (tall thin spire / mast / crane jib) are class L and survive far culling; long thin things near the ground stay S / M.
assert.equal(sizeClass(45, 1.2, 45), 'L', 'a 45 m needle is L');
assert.equal(sizeClass(30, 0.4, 30), 'L', 'a 30 m mast thinner than 0.6 m is L, not S');
assert.equal(sizeClass(40, 2, 55), 'L', 'a crane jib 55 m up is L');
assert.equal(sizeClass(29, 1.2, 29), 'M', 'under 30 m a thin object keeps its class');
assert.equal(sizeClass(60, 0.4, 4), 'S', 'a long railing near the ground stays S');
assert.equal(sizeClass(60, 2.0, 4), 'M', 'a long low wall stays M');
assert.equal(sizeClass(7, 1, 78), 'L', 'the gilded tip of a needle (7 m piece, top 78 m) is L');
assert.equal(sizeClass(29.8, 1, 71), 'L', 'a needle stage just under 30 m but standing high is L');
assert.equal(sizeClass(3, 1, 60), 'S', 'a small thing high up (under 4 m) keeps its class');
assert.equal(sizeClass(10, 3, 39), 'M', 'a 10 m piece with its top under 40 m keeps its class');
assert.equal(sizeClass(3, 1, 3, true), 'L', 'an explicit userData.skyline flag forces L');
const skyRoot = new THREE.Group(); root.add(skyRoot);
const skyMat = new THREE.MeshBasicMaterial();
const put = (w, h, d, x, y, z, flag) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), skyMat); m.position.set(x, y, z); if (flag) m.userData.skyline = true; skyRoot.add(m); return m; };
const needle = [put(1, 50, 1, 2500, 25, 2500), put(1, 50, 1, 2510, 25, 2500)], rail = [put(60, 0.5, 0.3, 2500, 0.5, 2520), put(60, 0.5, 0.3, 2500, 0.5, 2525)], pin = [put(2, 4, 2, 3500, 2, 3540, true), put(2, 4, 2, 3505, 2, 3540, true)];
const rep = batchStatic(skyRoot, { mat: null });
assert.equal(rep.merged, 3, 'needles, rails and flagged pins form three batches (one per class)');
const farOf = (name) => LOD.items.filter(it => it.obj.parent && it.obj.isMesh && it.obj.userData.sources === 2).map(it => it.far);
const fars = farOf().sort((a, b) => a - b);
assert.deepEqual(fars, [350, Infinity, Infinity], 'only the rails get a finite LOD distance; needles and flagged pins never vanish');
console.log('RESULT: OK (streamed-sector visibility, shadow casters, zones, distance LOD, removal)');
