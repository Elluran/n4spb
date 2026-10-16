// lod.js - the visibility registry of the static scene: sector culling + distance LOD in one place.
//
// Why: three.js visits every object of the scene in each of its passes (normal / depth twice, colour, sun shadow): with the static scene cut into ~30 000 cell meshes
// (core/batch2.js, core/spatial.js, core/ndproxy.js) that walk alone cost ~20 ms a frame. Registered objects are kept in SECTOR m sectors (aligned with the 320 m piece
// cells of the batches); a sector is tested once per frame (camera frustum, the sun shadow box round the player, the normal / depth range). Objects created by the engine
// (batch pieces, instanced pieces, proxies: world-space matrices) are re-parented into one Group per sector, so an out-of-view sector costs the renderer ONE visibility
// test; objects that must stay where they are (the streamed city regions) are hidden one by one. Inside a visible sector an object with a finite `far` is hidden beyond
// far * scale metres (scale = the quality tier). Objects hidden by the zone system (core/zones.js, userData._zh) are left alone.
// Attached colour details with the same range share a second group: a conservative
// circle rejects their entire subtree, while boundary objects keep exact per-mesh tests.
//   LOD.init(staticRoot)                              creates the sector root (main.js, before the batching)
//   LOD.add(obj, cx, cz, r, far = Infinity, opts)     obj: a Mesh with a world bounding circle (cx, cz, r); far: the LOD distance in m; opts.nd: a normal / depth proxy
//                                                     (drawn only within ndFar); opts.shadow: cull by the shadow box too (default = obj.castShadow); opts.attach: move obj
//                                                     into the sector group (its matrix must be a world matrix)
//   LOD.update(playerPos, camera, { shadowR, ndFar }) once per frame from main.js; the call without a camera (world/city.js) is a no-op once main.js manages it.
//   LOD.addSuper(mesh, members, cx, cz, r, until, ur, opts)
//                                                     FAR SUPER-CELLS (plan 2026-10-15 item 1b): `mesh` is ONE merged draw of the member meshes (already registered). Beyond
//                                                     until * scale + ur m from (cx, cz) the merged mesh draws and every member hides; inside it the members keep their own rules
//                                                     and the merged mesh hides. Both sides evaluate the same expression (strict < / >=), so exactly one of them is on. `ur` is
//                                                     unscaled: a caller makes it large enough that the members' own switches (e.g. a far proxy's near) are already passed.
//                                                     ?supercells=0 builds none (LOD.superCells).
import * as THREE from 'three';

export const SECTOR = 320;
const _frustum = new THREE.Frustum(), _m = new THREE.Matrix4(), _s = new THREE.Sphere();

const _of = new WeakMap();      // object -> its registry item (not in userData: three.js clones userData through JSON.stringify)
// Only finite-range colour details are grouped. ND / far proxies remain direct children:
// main.js deliberately reveals those sector children for the one-time GPU upload frame.
function rangeKey(it) { return `${it.far}/${+it.sector}/${+it.shadow}`; }
function touchBounds(group) { if (group) group.userData.lodBoundsVersion = (group.userData.lodBoundsVersion || 0) + 1; }
export const LOD = {
  items: [], scale: 1, managed: false, sectors: new Map(), root: null, ndRoot: null,
  stats: { sectors: 0, visibleSectors: 0, get visible() { return LOD.counts().visible; }, get hidden() { return LOD.counts().hidden; }, attached: 0 },
  countCache: null,
  // Diagnostics should not walk thousands of rejected details during every
  // gameplay frame. Compute the same counters only when a tool reads them.
  counts() {
    if (this.countCache) return this.countCache;
    let visible = 0, hidden = 0;
    const count = (items, forceHidden = false) => {
      for (const it of items) {
        if (it.obj.userData._zh) continue;
        if (!forceHidden && it.obj.visible) visible++; else hidden++;
      }
    };
    if (!this.managed) count(this.items);
    else for (const s of this.sectors.values()) {
      count(s.loose);
      if (!s.vis) continue;
      count(s.direct);
      count(s.ndDirect, !s.nd);
      for (const range of s.ranges.values()) count(range.items, !range.group.visible);
    }
    return this.countCache = { visible, hidden };
  },
  superCells: typeof location === 'undefined' || new URLSearchParams(location.search).get('supercells') !== '0',
  rangeCulling: typeof location === 'undefined' || new URLSearchParams(location.search).get('lodgroups') !== '0',
  of(obj) { return _of.get(obj) || null; },
  init(staticRoot) {
    if (this.root && this.root.parent === staticRoot) return this.root;
    this.root = new THREE.Group(); this.root.name = 'sectors'; this.root.matrixAutoUpdate = false; staticRoot.add(this.root);
    this.ndRoot = new THREE.Group(); this.ndRoot.name = 'nd-sectors'; this.ndRoot.matrixAutoUpdate = false; staticRoot.add(this.ndRoot);
    return this.root;
  },
  add(obj, cx, cz, r, far = Infinity, opts = {}) {
    this.countCache = null;
    if (!Number.isFinite(cx + cz + r)) return;
    // City authors already register their instanced details; the later spatial pass may encounter the same unsplit mesh. Preserve that authored range and one registry entry.
    if (_of.has(obj)) return;
    // sector: the LOD distance is measured from the sector centre (the detail pieces and the far proxy of a sector switch at exactly the same moment); near: drawn only beyond near m
    const it = { obj, cx, cz, r, far, near: opts.near || 0, nearR: opts.nearR || 0, until: 0, ux: 0, uz: 0, ur: 0, ranged: false, sector: !!opts.sector, nd: !!opts.nd, shadow: opts.shadow ?? !!obj.castShadow, on: true };
    this.items.push(it);
    const kx = Math.floor(cx / SECTOR), kz = Math.floor(cz / SECTOR), key = (kx + 4096) * 8192 + (kz + 4096);
    let s = this.sectors.get(key);
    if (!s) this.sectors.set(key, (s = { cx: (kx + 0.5) * SECTOR, cz: (kz + 0.5) * SECTOR, r: SECTOR * 0.7072, items: [], loose: [], direct: [], ndDirect: [], ranges: new Map(), vis: true, nd: true, group: null, ndGroup: null }));
    s.items.push(it);
    s.r = Math.max(s.r, Math.hypot(cx - s.cx, cz - s.cz) + r);
    _of.set(obj, it);
    if (opts.attach && this.root) {
      const key = it.nd ? 'ndGroup' : 'group', parent = it.nd ? this.ndRoot : this.root;
      if (!s[key]) { s[key] = new THREE.Group(); s[key].name = `sector ${kx},${kz}`; s[key].matrixAutoUpdate = false; parent.add(s[key]); }
      let target = s[key];
      if (!it.nd && !it.near && !obj.userData.farProxy && Number.isFinite(it.far) && it.far >= 0 && it.r >= 0) {
        const key = rangeKey(it); let range = s.ranges.get(key);
        if (!range) {
          const group = new THREE.Group(); group.name = `range ${key}`; group.matrixAutoUpdate = false; target.add(group);
          s.ranges.set(key, (range = { group, items: [], far: it.far, sector: it.sector, shadow: it.shadow, r: 0, inner: Infinity }));
        }
        const offset = Math.hypot(cx - s.cx, cz - s.cz);
        // A tiny outward rounding allowance keeps tangent cases on the exact path.
        it.ranged = true; range.items.push(it); range.r = Math.max(range.r, offset + r + 1e-6); range.inner = Math.min(range.inner, r - offset - 1e-6);
        target = range.group;
      } else (it.nd ? s.ndDirect : s.direct).push(it);
      if (obj.parent) obj.parent.remove(obj);
      target.add(obj); obj.matrixAutoUpdate = false; obj.updateMatrixWorld(true); this.stats.attached++;
      touchBounds(s[key]);      // nested additions can leave the sector's direct child count unchanged
    } else s.loose.push(it);      // streamed meshes keep their region parent: the sector group cannot hide them
  },
  /** registers a merged super-cell draw that replaces its (registered, non range-grouped) members beyond until * scale + ur m from (cx, cz); returns the members switched */
  addSuper(mesh, members, cx, cz, r, until, ur, opts = {}) {
    const list = [];
    for (const m of members) { const it = _of.get(m); if (it && !it.ranged && !it.until && !it.nd) list.push(it); }
    if (!list.length || !(until > 0) || !Number.isFinite(cx + cz + r + until + ur)) return 0;
    this.add(mesh, cx, cz, r, Infinity, { ...opts, sector: false, near: until, nearR: ur });
    if (!_of.has(mesh)) return 0;
    for (const it of list) { it.until = until; it.ux = cx; it.uz = cz; it.ur = ur; }
    mesh.userData.superCell = list.length;
    return list.length;
  },
  /** removes the registrations of every object under root (a region group that is dropped) */
  remove(root) {
    this.countCache = null;
    const gone = new Set(); root.traverse((o) => { const it = _of.get(o); if (it) { gone.add(it); _of.delete(o); } });
    if (!gone.size) return;
    this.items = this.items.filter((it) => !gone.has(it));
    for (const s of this.sectors.values()) {
      const oldLength = s.items.length;
      s.items = s.items.filter((it) => !gone.has(it)); s.loose = s.loose.filter((it) => !gone.has(it)); s.direct = s.direct.filter((it) => !gone.has(it)); s.ndDirect = s.ndDirect.filter((it) => !gone.has(it));
      if (s.items.length === oldLength) continue;
      for (const [key, range] of s.ranges) {
        range.items = range.items.filter((it) => !gone.has(it));
        if (!range.items.length) { range.group.removeFromParent(); s.ranges.delete(key); }
        // An over-large bound after partial removal remains conservative; no rebuild is needed.
      }
      touchBounds(s.group); touchBounds(s.ndGroup);
    }
  },
  update(p, camera = null, { shadowR = 110, ndFar = 200 } = {}) {
    this.countCache = null;
    if (!camera) { if (this.managed) return; for (const it of this.items) this._apply(it, true, p); return; }
    this.managed = true;
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const cx = camera.position.x, cz = camera.position.z, cy = camera.position.y, st = this.stats;
    st.visibleSectors = 0; st.sectors = this.sectors.size;
    for (const s of this.sectors.values()) {
      _s.center.set(s.cx, cy, s.cz); _s.radius = s.r;
      const inView = _frustum.intersectsSphere(_s), d = Math.hypot(cx - s.cx, cz - s.cz) - s.r;
      const nearShadow = d < shadowR, nd = inView && d < ndFar;
      const vis = inView || nearShadow;
      if (vis) st.visibleSectors++;
      if (s.group && s.group.visible !== vis) s.group.visible = vis;
      if (s.ndGroup && s.ndGroup.visible !== nd) s.ndGroup.visible = nd;
      if (!vis) {
        s.vis = false; s.nd = false;
        // Only attached pieces inherit group visibility. In particular, a streamed city mesh still belongs to its region and otherwise remains drawable in every render pass.
        // Check these each frame too: zones may have restored an object's visibility since the last update, or a region may have attached while this sector was already hidden.
        for (const it of s.loose) this._apply(it, false, p, s);
        continue;
      }
      s.vis = vis; s.nd = nd;
      for (const it of s.loose) {
        const on = it.nd ? nd : (inView || (nearShadow && it.shadow));
        this._apply(it, on, p, s);
      }
      for (const it of s.direct) this._apply(it, inView || (nearShadow && it.shadow), p, s);
      // Hidden ND parents reject whole outline cells. Do not visit their many
      // proxies until the camera re-enters the outline range.
      if (nd) for (const it of s.ndDirect) this._apply(it, true, p, s);
      const dx = p.x - s.cx, dz = p.z - s.cz, d2 = dx * dx + dz * dz;
      for (const range of s.ranges.values()) {
        const on = inView || (nearShadow && range.shadow);
        const far = range.far * this.scale, lim = far + (range.sector ? 0 : range.r);
        // Triangle inequality: every member's own (far * scale + radius) circle
        // lies inside this circle. Boundary groups keep the original exact tests.
        const outside = this.rangeCulling && (!on || (this.scale >= 0 && d2 >= lim * lim));
        range.group.visible = !outside;
        if (!outside) {
          const inner = far + (range.sector ? 0 : range.inner);
          if (this.rangeCulling && on && this.scale >= 0 && inner > 0 && d2 < inner * inner) {
            // Every member is definitely within its own range. Still restore local
            // visibility each frame: zones can release a previously hidden object.
            for (const it of range.items) { const o = it.obj; if (!o.userData._zh) o.visible = true; }
          } else for (const it of range.items) this._apply(it, on, p, s);
        }
      }
    }
  },
  _apply(it, on, p, s = null) {
    if (on && (it.far < Infinity || it.near)) {
      const sc = it.sector && s, dx = p.x - (sc ? s.cx : it.cx), dz = p.z - (sc ? s.cz : it.cz), d2 = dx * dx + dz * dz;
      if (it.near) { const lim = it.near * this.scale + it.nearR; on = !(d2 < lim * lim); }
      else { const lim = it.far * this.scale + (sc ? 0 : it.r); on = d2 < lim * lim; }
    }
    if (on && it.until) { const dx = p.x - it.ux, dz = p.z - it.uz, lim = it.until * this.scale + it.ur; on = dx * dx + dz * dz < lim * lim; }      // member of a super-cell: hidden where the merged draw takes over
    const o = it.obj;
    if (o.userData._zh) return;                              // hidden by the zone system: it restores the visibility itself
    if (o.visible !== on) o.visible = on;
  },
};
