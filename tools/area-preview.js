// Loaded only by area-dev.mjs in an explicitly labelled, isolated authoring page.
import * as THREE from 'three';
const query = new URLSearchParams(location.search), key = 'piter.area.' + query.get('only') + '.' + (query.get('cam') || 'auto');
const panel = document.createElement('div');
panel.style.cssText = 'position:fixed;left:12px;right:12px;top:12px;z-index:10000;max-width:620px;padding:10px 14px;background:#19242eee;color:#edf2f7;font:13px/1.5 system-ui;border-radius:8px';
const label = document.createElement('div'); label.textContent = `AREA PREVIEW · ${query.get('only')} · loading`;
const note = document.createElement('div'); note.textContent = 'Isolated builders on a reference grid. Review roads, claims, neighbours and FPS in the full city.';
const reload = document.createElement('button'); reload.textContent = 'Reload';
const reset = document.createElement('button'); reset.textContent = 'Frame area';
const integrated = document.createElement('a'); integrated.textContent = 'Open integrated city'; integrated.style.cssText = 'color:#b4ddff;margin-left:12px'; integrated.target = '_blank'; integrated.rel = 'noopener';
panel.append(label, note, reload, reset, integrated); document.body.append(panel);
let ready = false;
const pose = () => {
  const p = window.__ctx?.playerObj, c = window.__camera;
  return p && c ? [c.position.x, c.position.y, c.position.z, p.yaw * 180 / Math.PI, p.pitch * 180 / Math.PI] : null;
};
const save = () => { const p = pose(); if (ready && p) sessionStorage.setItem(key, JSON.stringify(p)); };
const refresh = () => { save(); location.reload(); };
reload.onclick = refresh; addEventListener('pagehide', save);
const events = new EventSource('/__area/events'); events.onmessage = refresh;
integrated.onclick = () => { integrated.href = '/index.html?' + new URLSearchParams({ q: query.get('q') || 'medium', cam: pose().join(',') }); };
while (!document.body.classList.contains('loaded')) await new Promise(r => setTimeout(r, 100));
const ctx = window.__ctx, box = new THREE.Box3(), partBox = new THREE.Box3(), sphere = new THREE.Sphere();
ctx.staticRoot.traverse(o => {
  if (!o.isMesh || o.userData.ndProxy || o.userData.farProxy) return;
  if (o.isInstancedMesh && !o.boundingBox) o.computeBoundingBox();
  if (!o.isInstancedMesh && !o.geometry.boundingBox && o.geometry.attributes.position?.array.length) o.geometry.computeBoundingBox();
  const bounds = o.isInstancedMesh ? o.boundingBox : o.geometry.boundingBox;
  if (bounds) { box.union(partBox.copy(bounds).applyMatrix4(o.matrixWorld)); return; }
  if (o.isInstancedMesh && !o.boundingSphere) o.computeBoundingSphere();
  if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
  const s = o.isInstancedMesh ? o.boundingSphere : o.geometry.boundingSphere;
  if (s && Number.isFinite(s.radius)) { sphere.copy(s).applyMatrix4(o.matrixWorld); box.union(sphere.getBoundingBox(new THREE.Box3())); }
});
if (box.isEmpty()) box.set(new THREE.Vector3(-20, 0, -20), new THREE.Vector3(20, 20, 20));
const centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), span = Math.max(40, size.x, size.z);
const grid = new THREE.GridHelper(Math.min(6000, span * 2), Math.min(200, Math.ceil(span / 5)), 0x687b86, 0x829199);
grid.position.set(centre.x, -0.04, centre.z); grid.layers.set(1); ctx.scene.add(grid);
const frame = () => {
  const halfFov = Math.atan(Math.tan(ctx.camera.fov * Math.PI / 360) * Math.min(1, ctx.camera.aspect));
  const distance = Math.max(30, size.length() * .5 / Math.sin(halfFov)) * 1.05;
  window.__setCam(centre.x, centre.y + distance * .45, centre.z + distance * .893, 0, -26.75); ctx.playerObj.fly = true;
};
reset.onclick = frame;
let saved; try { saved = JSON.parse(sessionStorage.getItem(key)); } catch {}
if (Array.isArray(saved) && saved.length === 5 && saved.every(Number.isFinite)) { window.__setCam(...saved); ctx.playerObj.fly = true; }
else if (!query.has('cam')) frame();
label.textContent = `AREA PREVIEW · ${query.get('only')} · ${(window.__stats.timing.readyMs / 1000).toFixed(1)} s · ${window.__errors.length ? 'ERROR: see console' : 'ready'}`;
label.style.color = window.__errors.length ? '#ff9999' : '#edf2f7';
document.querySelector('#go')?.click(); document.body.classList.add('noui'); ready = true;
window.__areaPreview = { ready, frame, pose, modules: ctx.buildList, loadMs: window.__stats.timing.readyMs };
