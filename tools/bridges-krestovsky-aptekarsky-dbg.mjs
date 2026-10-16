// tools/bridges-krestovsky-aptekarsky-dbg.mjs - headless debug: builds environment + bridges and prints the entries of this group (tris, colliders, info) and deckY probes along given points
// usage: node tools/bridges-krestovsky-aptekarsky-dbg.mjs "x,z;x,z" ["x,z,r;..." (collider items near these points)] ["x,z;x,z;..." a Walker probe]
import { makeEnv } from './bridges-krestovsky-aptekarsky-env.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ctx } = await makeEnv(['environment', 'bridges']);
const bm = await import(pathToFileURL(path.join(root, 'src/world/bridges.js')).href); const t0 = Date.now(); await bm.build(ctx);
const B = ctx.services.bridges; console.log('build ms', Date.now() - t0, 'failed', JSON.stringify(B.failed), 'tris', B.stats.tris, 'colliders', B.stats.colliders);
for (const k of Object.keys(B.stats.per)) if (/^(yachtny|krestpond|ka-|malokrest|bychy|grebnoy|kantem)/.test(k)) console.log(' per', k, B.stats.per[k]);
console.log('list', B.list.filter((b) => /yachtny|krestpond|ka-/.test(b.id)).map((b) => b.id + '@' + Math.round(b.x) + ',' + Math.round(b.z)).join(' '));
if (process.argv[2]) for (const s of process.argv[2].split(';')) { const [x, z] = s.split(',').map(Number); console.log('deckY', x, z, B.deckY(x, z)); }
if (process.argv[3]) for (const sp of process.argv[3].split(';')) { const [x, z, r] = sp.split(',').map(Number); console.log('--- items near', x, z, r); for (const it of ctx.physics._query(x, z, r || 2)) console.log(' ', it.type, 'y', it.y0, it.y1 ?? it.top, 'c', it.cx.toFixed(1), it.cz.toFixed(1), it.type === 'cyl' ? 'r ' + it.r : 'hw ' + it.hw.toFixed(1) + ' hd ' + it.hd.toFixed(1)); }

// ---- a walker with the substep logic of Player.update (copy of tools/environment-banks.mjs): argv[4] = "x,z;x,z;..." waypoints, prints where it ends / stops
if (process.argv[4]) {
  const THREE = await import('three'); void THREE;
  const { STEP_HEIGHT, DROP_MAX } = await import(pathToFileURL(path.join(root, 'src/core/physics.js')).href);
  const ph = ctx.physics, R = 0.3, H = 1.7, STICK_DOWN = 0.75, UNDER_EPS = 0.05;
  const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
  class Walker {
    constructor(x, z, y = 0) { this.x = x; this.z = z; this.y = y; this.vy = 0; this.onGround = true; this.stick = false; this.fell = false; }
    step(dx, dz, dt = 1 / 60) {
      const sx = dx * dt, sz = dz * dt, n = Math.max(1, Math.ceil(Math.hypot(sx, sz) / 0.12)), p = { x: this.x, z: this.z }; let feet = this.y; const track = this.onGround && this.stick;
      for (let i = 0; i < n; i++) { const ox = p.x, oz = p.z; p.x += sx / n; p.z += sz / n; ph.resolve(p, R, feet, H); const S = ph.surfaceAt(p.x, p.z, feet, true, { y: 0, kind: null, item: null }), g = S.y; let refuse = g - feet > STEP_HEIGHT; if (!refuse && this.onGround && feet - g > DROP_MAX && S.kind !== 'terrain' && (feet < ph.heightAt(p.x, p.z) - UNDER_EPS || ph.inHole(p.x, p.z))) refuse = true; if (refuse) { p.x = ox; p.z = oz; } else if (track && g > feet) feet = g; }
      this.x = p.x; this.z = p.z; const S2 = ph.surfaceAt(this.x, this.z, this.y, true, { y: 0, kind: null, item: null }), g = S2.y, item = S2.item;
      if (this.onGround && (this.stick || (item && item.sticky)) && this.vy <= 0 && this.y > g && this.y - g <= STICK_DOWN) { this.y = g; this.vy = 0; this.onGround = true; }
      else { this.vy -= 12 * dt; this.y += this.vy * dt; if (this.y <= g) { this.y = g; this.vy = 0; this.onGround = true; } else if (this.y - g < 0.06 && this.vy <= 0) { this.y = g; this.vy = 0; this.onGround = true; } else this.onGround = false; }
      this.stick = this.onGround && !!(item && item.sticky); if (g === -Infinity) this.fell = true;
    }
    walkTo(tx, tz, speed = 3.6, maxT = 30) { for (let t = 0; t < maxT; t += 1 / 60) { const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz); if (d < 0.1) return true; this.step(dx / d * speed, dz / d * speed); } return false; }
  }
  const pts = process.argv[4].split(';').map((q) => q.split(',').map(Number)), w = new Walker(pts[0][0], pts[0][1], Math.max(0, L.heightAt(pts[0][0], pts[0][1])));
  for (const q of pts.slice(1)) { const ok = w.walkTo(q[0], q[1]); console.log('walk to', q.join(','), ok ? 'reached' : 'BLOCKED', 'at', w.x.toFixed(2), w.z.toFixed(2), 'y', w.y.toFixed(2), 'fell', w.fell); if (!ok) break; }
}
process.exit(0);
