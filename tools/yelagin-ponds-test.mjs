import { ctx, L, PH } from 'file:///D:/git2/agi-fun-tests/102_3d_piter/tools/yelagin-ponds-boot.mjs';
import { frameOfPond, PONDS, SLUICES } from 'file:///D:/git2/agi-fun-tests/102_3d_piter/src/world/bridges/yelaginPonds.js';
const { STEP_HEIGHT, DROP_MAX } = PH; const ph = ctx.physics; const sites = ctx.services.yelaginPonds.sites;
const R = 0.3, H = 1.7, STICK_DOWN = 0.75, UNDER_EPS = 0.05;
class Walker {
  constructor(x, z, y = 0) { this.x = x; this.z = z; this.y = y; this.vy = 0; this.onGround = true; this.stick = false; this.minY = y; this.maxY = y; this.fell = false; this.maxStep = 0; }
  step(dx, dz, dt = 1 / 60) {
    const sx = dx * dt, sz = dz * dt, n = Math.max(1, Math.ceil(Math.hypot(sx, sz) / 0.12)), p = { x: this.x, z: this.z };
    let feet = this.y; const track = this.onGround && this.stick;
    for (let i = 0; i < n; i++) {
      const ox = p.x, oz = p.z; p.x += sx / n; p.z += sz / n; ph.resolve(p, R, feet, H);
      const S = ph.surfaceAt(p.x, p.z, feet, true, { y: 0, kind: null, item: null }), g = S.y;
      let refuse = g - feet > STEP_HEIGHT;
      if (!refuse && this.onGround && feet - g > DROP_MAX && S.kind !== 'terrain' && (feet < ph.heightAt(p.x, p.z) - UNDER_EPS || ph.inHole(p.x, p.z))) refuse = true;
      if (refuse) { p.x = ox; p.z = oz; } else if (track && g > feet) feet = g;
    }
    this.x = p.x; this.z = p.z; const y0 = this.y;
    const S2 = ph.surfaceAt(this.x, this.z, this.y, true, { y: 0, kind: null, item: null }), g = S2.y, item = S2.item;
    if (this.onGround && (this.stick || (item && item.sticky)) && this.vy <= 0 && this.y > g && this.y - g <= STICK_DOWN) { this.y = g; this.vy = 0; this.onGround = true; }
    else { this.vy -= 12 * dt; this.y += this.vy * dt; if (this.y <= g) { this.y = g; this.vy = 0; this.onGround = true; } else if (this.y - g < 0.06 && this.vy <= 0) { this.y = g; this.vy = 0; this.onGround = true; } else this.onGround = false; }
    this.stick = this.onGround && !!(item && item.sticky);
    if (g === -Infinity) this.fell = true; this.minY = Math.min(this.minY, this.y); this.maxY = Math.max(this.maxY, this.y); this.maxStep = Math.max(this.maxStep, Math.abs(this.y - y0));
  }
}
let bad = 0;
for (const B of sites) {
  const rec = [...PONDS, ...SLUICES].find((q) => q.id === B.id), f = frameOfPond(rec), HL = (B.info.len || 7) / 2, sl = B.info.type === 'sluice';
  const W = (u, v) => ({ x: f.cx + u * f.c - v * f.s, z: f.cz + u * f.s + v * f.c });
  for (const dir of [1, -1]) for (const v of (sl ? [0.6, -0.6] : [0, B.info.hw * 0.6, -B.info.hw * 0.6])) {
    const pA = W(-dir * (HL + 4), v), pB = W(dir * (HL + 4), v), wk = new Walker(pA.x, pA.z, 0); let ok = false, dev = 0, frames = 0;
    const dx0 = pB.x - pA.x, dz0 = pB.z - pA.z, d0 = Math.hypot(dx0, dz0);
    for (let t = 0; t < 14; t += 1 / 60) {
      const dx = pB.x - wk.x, dz = pB.z - wk.z, d = Math.hypot(dx, dz); if (d < 0.2) { ok = true; break; }
      wk.step(dx / d * 3.6, dz / d * 3.6); frames++;
      const dy = B.deckAt ? B.deckAt(wk.x, wk.z) : null; if (dy !== null && wk.onGround) dev = Math.max(dev, Math.abs(wk.y - dy));
    }
    const prog = ((wk.x - pA.x) * dx0 + (wk.z - pA.z) * dz0) / d0;
    const flag = !ok || wk.fell || dev > 0.17 || wk.maxStep > 0.5; if (flag) bad++;
    console.log((flag ? 'FAIL ' : 'ok   ') + B.id.padEnd(8), dir > 0 ? 'fwd ' : 'back', 'v', v.toFixed(1).padStart(5), ok ? 'reached' : 'BLOCKED at ' + prog.toFixed(1) + '/' + d0.toFixed(1), 'y', wk.minY.toFixed(2) + '..' + wk.maxY.toFixed(2), 'dev', dev.toFixed(2), 'maxStep', wk.maxStep.toFixed(2));
  }
}
console.log(bad ? 'RESULT FAIL ' + bad : 'RESULT OK');
process.exit(0);
