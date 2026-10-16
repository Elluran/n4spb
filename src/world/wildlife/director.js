// wildlife/director.js - the animals follow the player. The map is 2.4x bigger than the first build but the bird budget (~130) stays, so every second the director looks at the
// animals that the player has left far behind and moves them to a free place of the zone table (zones.js) / a quay post / a boat roof / an orbit over the water that lies 70-230 m
// from the player and, when it is close, out of the camera's view cone - so nobody ever pops into the picture, and the flocks of the Kazan lawn, the Alexander Garden or Palace Square
// are where the player walks.
//   * resting pigeon / sparrow flocks (state rest, every bird on the ground) farther than 240 m  ->  the best free site (weight x nearness) of their species
//   * crows (on the ground or on a perch) farther than 280 m  ->  a perch / a foraging site near the player
//   * gulls: post gulls (> 260 m; also the ones sitting on a boat roof) -> a free post / lion, boat gulls (> 260 m) -> a boat roof slot, sky gulls (orbit centre > 320 m) -> open water near the player, escort gulls
//     (their boat > 300 m away) -> the nearest moving boat; swifts (orbit centre > 420 m) -> a new orbit round the player
// The first pass (when the player's position is known: the spawn) is unrestricted so that the start view is populated at once. A pass runs once per second (one move per class, two post gulls).
import * as THREE from 'three';
import { BOAT_KEY as BK } from './boats.js';

/** A = the closures of birds.js: { birds, flocks, sites: { pigeon, sparrow }, R, spot, layoutFlock, setGround, setPerch, takeBoat, leaveBoat, boatList, boatTaken, soarGull, boatNear, okSites, openWater, gY } */
export function makeDirector(ctx, W, A) {
  const { birds, flocks, R } = A, P = W.player, cam = ctx.camera;
  const fwd = new THREE.Vector3(), eye = { x: 0, y: 0, z: 0 };
  let next = 0, inited = false, moves = 0, lastX = 0, lastZ = 0;
  const dist = (x, z) => Math.hypot(x - P.x, z - P.z);
  /** would a bird appearing at (x,y,z) be noticed: within 70 m (a pigeon is a few pixels beyond that) and inside a generous view cone (houses are not tested: a popping bird is worse than a missed move) */
  function seen(x, y, z) {
    const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z, d = Math.hypot(dx, dy, dz);
    if (d < 4) return true;
    if (d > 70) return false;
    return (dx * fwd.x + dy * fwd.y + dz * fwd.z) / d > 0.25;
  }
  function look() {
    eye.x = P.x; eye.y = P.y + 1.6; eye.z = P.z;
    try { if (cam && cam.getWorldDirection) { cam.getWorldDirection(fwd); return; } } catch (e) { /* no camera: everything counts as seen when near */ }
    fwd.set(0, 0, -1);
  }
  const scoreSite = (s, d) => s.w * Math.exp(-d / 130) * (0.7 + 0.6 * R());

  function flockStep(t, init) {
    for (const f of flocks) {
      if (f.state !== 'rest' || !f.birds.every((b) => b.dead || b.st === 'ground')) continue;
      if (dist(f.site.x, f.site.z) < (init ? 150 : 240)) continue;
      let best = null, bk = -1;
      for (const s of A.sites[f.sp] || []) {
        if (s.taken && s.taken !== f) continue;
        if (s.cnt && !f.big) continue;                                             // a zone with a flock size (Xenia: 45 pigeons asked) belongs to the big flock
        const d = dist(s.x, s.z);
        if (d < (init ? 12 : 25) || d > (init ? 300 : 215)) continue;
        if (!init && seen(s.x, 1, s.z)) continue;
        const k = scoreSite(s, d) * (f.big ? (s.cnt ? 4 : 0.6) : (s.cnt ? 0.25 : 1)); if (k > bk) { bk = k; best = s; }
      }
      if (!best) continue;
      if (f.site.taken === f) f.site.taken = null;
      f.site = best; best.taken = f; A.layoutFlock(f, ctx.time || 0); f.state = 'rest'; moves++;
      if (!init) return;
    }
  }
  let crowOrder = null;
  function crowStep(t, init) {
    crowOrder ||= birds.filter((b) => b.sp === 'crow').sort((x, y) => (y.jack ? 1 : 0) - (x.jack ? 1 : 0));          // the jackdaws first: one move per pass, and the island haunts (the cemetery) are where they belong
    for (const b of crowOrder) {
      if (b.dead || (b.st !== 'ground' && b.st !== 'perch')) continue;
      if (dist(b.x, b.z) < (init ? 170 : 280)) continue;
      let moved = false;
      if (R() < 0.62) {
        const cand = W.perchesNear(P.x, P.z, init ? 12 : 25, 200, { kinds: b.cfg.kinds, self: b }).filter((p) => init || !seen(p.x, p.y, p.z));
        if (cand.length) { A.setPerch(b, cand[Math.floor(R() * cand.length)], t); b.until = t + R.range(4, 30); moved = true; }
      }
      if (!moved) {
        const pool = A.okSites.filter((s) => { const d = dist(s.x, s.z); return d > (init ? 8 : 25) && d < 200 && (init || !seen(s.x, 0.5, s.z)); });
        if (pool.length) {
          const s = pool[Math.floor(R() * pool.length)], q = !A.siteOk || A.siteOk(s) ? A.spot(s.x, s.z, 0, s.r, null, { road: 1.5 }) : null;
          if (q) { A.setGround(b, q.x, q.z, t, { x: s.x, z: s.z, r: s.r }); moved = true; }
        }
      }
      if (!moved) {                                                                      // no perch and no cafe / bench / bin about (a cemetery, a park): a crow walks the free ground of the paths near the player
        for (let k = 0; k < 8 && !moved; k++) {
          const a = R() * Math.PI * 2, d = (init ? 12 : 28) + R() * 110, x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d;
          if (!W.ok(x, z, { road: 1.5 }) || (!init && seen(x, 0.5, z))) continue;
          A.setGround(b, x, z, t, { x, z, r: 6 }); moved = true;
        }
      }
      if (moved) { moves++; if (!init) return; }
    }
  }
  function gullStep(t, init) {
    let posts = 0, boat = 0, sky = 0, esc = 0;
    for (const b of birds) {
      if (b.dead || b.sp !== 'gull') continue;
      if (b.mode === 'post' && (b.st === 'perch' || b.st === 'boat') && posts < (init ? 99 : 2)) {      // (a post gull that flew to a boat roof stays there until scared: it is a post gull for the director)
        if (dist(b.x, b.z) < (init ? 150 : 260)) continue;
        const cand = W.perchesNear(P.x, P.z, init ? 6 : 15, 210, { kinds: ['post', 'lion'], self: b }).filter((p) => init || !seen(p.x, p.y, p.z));
        const lions = cand.filter((p) => p.kind === 'lion');
        cand.sort((p, q) => dist(p.x, p.z) - dist(q.x, q.z));
        const pick = lions.length && R() < 0.4 ? lions[Math.floor(R() * lions.length)] : R() < 0.6 ? cand[Math.floor(R() * Math.min(cand.length, 14))] : cand[Math.floor(R() * cand.length)];   // the gulls gather at the near quay, a few farther
        if (pick) { if (b.st === 'boat') A.leaveBoat(b); A.setPerch(b, pick, t); b.until = t + R.range(4, 30); posts++; moves++; }
      } else if (b.mode === 'boat' && b.st === 'boat' && boat < (init ? 99 : 1)) {
        if (dist(b.x, b.z) < (init ? 150 : 260)) continue;
        const order = A.boatList.map((bt, i) => ({ i, a: bt.at(t) })).filter((e) => { const d = dist(e.a.x, e.a.z); return d > (init ? 6 : 15) && d < 210 && (init || !seen(e.a.x, 3, e.a.z)); });
        let done = false;
        for (let k = 0; k < order.length * 2 && !done; k++) {
          const e = order[Math.floor(R() * order.length)], bt = A.boatList[e.i];
          for (let s = 0; s < bt.n; s++) if (!A.boatTaken.has(e.i * BK + s)) { A.leaveBoat(b); A.takeBoat(b, e.i, s); done = true; boat++; moves++; break; }
        }
      } else if (b.mode === 'sky' && b.st === 'soar' && sky < 1) {
        if (dist(b.orb.cx, b.orb.cz) < (init ? 330 : 330)) continue;
        const cand = A.openWater.filter((q) => { const d = dist(q.x, q.z); return d > (init ? 20 : 60) && d < 290 && (init || !seen(q.x, 18, q.z)); });
        if (cand.length) { A.soarGull(b, cand[Math.floor(R() * cand.length)]); sky++; moves++; }
      } else if (b.mode === 'escort' && b.st === 'soar' && esc < 1) {
        const a = b.orb.follow ? b.orb.follow.at(t) : { x: 1e5, z: 1e5 };
        if (dist(a.x, a.z) < 300) continue;
        const nb = A.boatNear(P.x, P.z, 260, t, b.orb.follow);
        if (nb) { A.soarGull(b, null, nb); esc++; moves++; }
      }
    }
  }
  function swiftStep(t) {
    for (const b of birds) {
      if (b.dead || b.sp !== 'swift' || !b.orb) continue;
      if (dist(b.orb.cx, b.orb.cz) < 420) continue;
      const a = R() * Math.PI * 2, d = R.range(0, 260);
      b.orb.cx = P.x + Math.cos(a) * d; b.orb.cz = P.z + Math.sin(a) * d; return;
    }
  }

  return {
    get moves() { return moves; },
    /** call every frame; the passes run once per second (the first one as soon as the player has a position) */
    update(t) {
      if (t < next) return;
      if (!(P.x || P.z)) return;
      next = t + 1;
      look();
      const jump = inited && Math.hypot(P.x - lastX, P.z - lastZ) > 90;        // a teleport / a jump to another viewpoint: populate the new place at once
      lastX = P.x; lastZ = P.z;
      const init = !inited || jump; inited = true;
      flockStep(t, init); crowStep(t, init); gullStep(t, init); swiftStep(t);
    },
    reset() { inited = false; next = 0; },
  };
}
