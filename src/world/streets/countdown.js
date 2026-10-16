// streets/countdown.js - the LED COUNTDOWN timers of the Petersburg traffic lights (docs/research/streets.md section 4, transport.md section 8; photos nevsky 26, P52 "25", "57"):
// every vehicle head and every pedestrian head gets a small black panel with a two-digit number under the housing: green digits count the seconds of green left, red digits the
// seconds of red left; amber shows nothing. The digits are instanced quads of one glyph atlas; a per-instance uv offset (InstancedBufferAttribute 'uvOff') picks the glyph, so the
// number is a pure function of the simulation time t (graph.signalInfo / pedInfo). Only the instances whose number changed are touched (once per second).
import * as THREE from 'three';
import { createSignalDisplayClock } from './display-clock.js';

const PANEL = new THREE.PlaneGeometry(1, 1);
const COL = { red: new THREE.Color('#ff2a1a').multiplyScalar(1.6), green: new THREE.Color('#2cff78').multiplyScalar(1.5) };

export function buildCountdowns(ctx, heads, graph, poles) {
  const list = heads.filter((h) => h.kind === 'veh' || h.kind === 'ped');
  if (!list.length) return { count: 0 };
  const F = ctx.tex.FONTS;
  const atlas = ctx.tex.draw(640, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 56px ${F.sans}`;
    for (let i = 0; i < 10; i++) g.fillText(String(i), i * 64 + 32, 34);
  }, { key: 'pt-countdown-glyphs', anisotropy: 4 });
  // panels (static, merged into the poles VB): 0.3 x 0.2 x 0.06 black box under the housing
  for (const h of list) {
    const ry = Math.atan2(h.dx, h.dz), y = h.y - (h.kind === 'veh' ? 0.66 : 0.4);
    poles.geo(PANEL, '#15171a', [h.x - h.dx * 0.09, y, h.z - h.dz * 0.09], [0, ry, 0], [0.3, 0.19, 1]);
    poles.geo(PANEL, '#15171a', [h.x - h.dx * 0.1, y, h.z - h.dz * 0.1], [0, ry + Math.PI, 0], [0.3, 0.19, 1]);       // the back of the panel: a one-sided quad seen from behind showed only its outline (thin blue rectangles beside the heads)       // one quad (the 12-triangle box was a third of the head's cost)
    h.cd = { x: h.x + h.dx * 0.025, y, z: h.z + h.dz * 0.025, ry, rx: h.dz, rz: -h.dx };       // rx,rz = the viewer's right (local +X) in the world
  }
  const geo = new THREE.PlaneGeometry(0.1, 0.15), N = list.length * 2;
  const uvOff = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
  // each glyph cell is 0.1 of the atlas: shrink the plane uv to one cell, the instance attribute shifts it
  { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.1); }
  geo.setAttribute('uvOff', uvOff);
  const mat = new THREE.MeshBasicMaterial({ map: atlas, transparent: true, alphaTest: 0.4, toneMapped: false, depthWrite: false, name: 'pt-countdown' });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float uvOff;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv.x += uvOff;\n#endif');
  };
  const im = new THREE.InstancedMesh(geo, mat, N); im.frustumCulled = false; im.renderOrder = 4; ctx.addStatic(im); ctx.noOutline(im); ctx.noBatch(im);
  const D = new THREE.Object3D();
  list.forEach((h, i) => {
    const c = h.cd;
    for (let k = 0; k < 2; k++) {
      const off = (k === 0 ? -0.055 : 0.055);
      D.position.set(c.x + c.rx * off, c.y, c.z + c.rz * off); D.rotation.set(0, c.ry, 0); D.scale.setScalar(0.001); D.updateMatrix();
      im.setMatrixAt(i * 2 + k, D.matrix); im.setColorAt(i * 2 + k, COL.red);
    }
  });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  // per head the 'on' (scale 1) / 'off' (0.001) matrix of both digit quads composed once (the same D.updateMatrix() values the frame used to recompose), the signal info of every
  // approach / crossing once per frame, an integer code per head instead of a string key: the frame and the start simulation no longer rebuild keys and matrices for every head
  const MAT = list.map((h) => { const c = h.cd, on = [], off = []; for (let k = 0; k < 2; k++) { const o = (k === 0 ? -0.055 : 0.055); D.position.set(c.x + c.rx * o, c.y, c.z + c.rz * o); D.rotation.set(0, c.ry, 0); D.scale.setScalar(1); D.updateMatrix(); on.push(D.matrix.clone()); D.scale.setScalar(0.001); D.updateMatrix(); off.push(D.matrix.clone()); } return { on, off }; });
  const uniq = [], keyIdx = new Map(), idx = list.map((h) => { const key = h.kind === 'veh' ? h.sig + '#' + h.ap : 'p' + h.cross; let j = keyIdx.get(key); if (j === undefined) { j = uniq.length; keyIdx.set(key, j); uniq.push(h); } return j; });
  const infos = new Array(uniq.length), last = new Int32Array(list.length).fill(-2);
  const displayDue = createSignalDisplayClock(graph, 1);
  const update = (t) => {
    if (!displayDue(t)) return;
    for (let j = 0; j < uniq.length; j++) { const h = uniq[j]; infos[j] = h.kind === 'veh' ? graph.signalInfo(h.sig, h.ap, t) : graph.pedInfo(h.cross, t); }
    let dirty = false;
    for (let i = 0; i < list.length; i++) {
      const inf = infos[idx[i]];
      const show = inf.state !== 'amber' && inf.state !== 'free', n = Math.min(99, Math.max(0, inf.remain | 0));
      const green = inf.state === 'green' || inf.state === 'walk' || inf.state === 'flash';
      const sig = show ? (green ? 100 : 200) + n : -1;
      if (last[i] === sig) continue; last[i] = sig; dirty = true;
      const m = MAT[i], d0 = Math.floor(n / 10), d1 = n % 10;
      for (let k = 0; k < 2; k++) {
        const on = show && !(k === 0 && n < 10);
        im.setMatrixAt(i * 2 + k, on ? m.on[k] : m.off[k]); im.setColorAt(i * 2 + k, green ? COL.green : COL.red);
        uvOff.setX(i * 2 + k, (k === 0 ? d0 : d1) * 0.1);
      }
    }
    if (dirty) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; uvOff.needsUpdate = true; }
  };
  update(0);
  ctx.onUpdate((dt, t) => update(t));
  return { count: list.length };
}
