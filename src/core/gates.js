// ============================================================================
//  AREA GATES (docs/AREAS.md): near the border toward another area the game offers to load it; accepting navigates to that area's page (core/handoff.js builds the URL), where
//  the player continues at the same pose. RUNTIME-ONLY (tools/baked-revision.mjs RUNTIME_ONLY): only src/main.js imports it, so editing it never makes a bake stale.
//
//  Three layers, so that the logic can be tested without a browser:
//    1. pure geometry   gateCoords, depthFor, chipFor                         (street frame: x east, z south; a gate's `inward` points from the border into its OWN area)
//    2. the state machine  createGateMachine({ gates })                       when does the chip show, when is the question asked, when is a decline over
//    3. the DOM layer   createGates(deps)                                     chip, ui.confirm, preflight, travel veil, navigation, window.__gates
//  plus planArrival (the destination side: ?cam= + ?ho= -> the pose the player really starts at).
// ============================================================================
import { REGISTRY, GATES as ALL_GATES, GATES_ENABLED } from '../areas/registry.js';
import { makeHo, arrivalUrl, decodeHo, parseCamParam, resolveArrival, makeProbe } from './handoff.js';

// ---------------------------------------------------------------- tuning (m, s, m/s); the registry's zone (walking depth) overrides DEPTH_WALK per gate
export const DEFAULTS = {
  depthWalk: 30,          // the prompt zone for a walker: this far from the border
  chipWalk: 90,           // the passive chip shows from here
  exitMargin: 20,         // after a decline the player must get this far beyond the zone before the next question
  cooldownS: 45,          // ... and this long (game time) must have passed
  graceS: 6,              // no question in the first seconds after an arrival
  holdS: 1.5,             // after a teleport the velocity estimate is ignored for this long
  emaS: 0.5,              // time constant of the speed estimate
  approachV: 0.5,         // m/s toward the border that count as "approaching"
  nearD: 8,               // ... or this close to the border
  lateralTol: 0,          // a walker / car must be between the ends of the segment
  flyTol: 100,            // a flyer may overshoot the border by up to this much (core/player.js)
  behind: 120,            // d below zero (outside the area, a flyer) still counts down to this
  failCooldownS: 30,      // after a failed preflight
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- 1. geometry
/** depth of the prompt zone (m from the border) for a mode ('walk' | 'fly' | 'car') at speed v (m/s): a walker 30 m, a vehicle or flyer clamp(30 + 0.5 v + v^2/60, 40, 160) (92 m at 48 m/s: the coupe stops in 38 m at full brake) */
export function depthFor(mode, v, C = DEFAULTS) { return mode === 'walk' ? C.depthWalk : clamp(30 + 0.5 * v + v * v / 60, 40, 160); }
/** distance from which the passive chip shows */
export function chipFor(mode, v, C = DEFAULTS) { return mode === 'walk' ? C.chipWalk : depthFor(mode, v, C) + 30; }
/** (x,z) in the frame of a gate: d = metres from the border into the gate's own area, s = metres along the segment from its first end, len = segment length */
export function gateCoords(g, x, z) {
  const [a, b] = g.seg, ex = b[0] - a[0], ez = b[1] - a[1], len = Math.hypot(ex, ez) || 1, tx = ex / len, tz = ez / len;
  const px = x - a[0], pz = z - a[1];
  return { d: px * g.inward[0] + pz * g.inward[1], s: px * tx + pz * tz, len, tx, tz };
}

// ---------------------------------------------------------------- 2. the state machine
export function createGateMachine({ gates, config = {} }) {
  const C = { ...DEFAULTS, ...config };
  const st = new Map(gates.map((g) => [g.id, { until: -1e9, needExit: false, open: false }]));
  let clock = 0, lastX = null, lastZ = null, vx = 0, vz = 0, holdUntil = 0, graceUntil = C.graceS;
  const machine = {
    config: C,
    get clock() { return clock; },
    get speed() { return clock < holdUntil ? 0 : Math.hypot(vx, vz); },
    /**
     * One step. inp = { dt, x, z, mode: 'walk'|'fly'|'car', blocked: bool (not started, travelling, a panel open, underground, riding ...), teleported?: bool }.
     * Returns { chip: { gate, d, depth } | null (show the passive chip), offer: gate | null (ask now) }.
     */
    update(inp) {
      const { dt, x, z, mode, blocked } = inp;
      clock += dt;
      if (lastX === null) { lastX = x; lastZ = z; }
      else if (dt > 0) {
        const dx = x - lastX, dz = z - lastZ;
        if (inp.teleported || Math.hypot(dx, dz) > 40 + 80 * dt) { vx = vz = 0; holdUntil = clock + C.holdS; }      // a jump is a teleport, not a motion
        else { const k = Math.min(1, dt / C.emaS); vx += (dx / dt - vx) * k; vz += (dz / dt - vz) * k; }
        lastX = x; lastZ = z;
      }
      const held = clock < holdUntil, v = held ? 0 : Math.hypot(vx, vz);
      let chip = null, offer = null;
      for (const g of gates) {
        const s = st.get(g.id), c = gateCoords(g, x, z);
        const depth = depthFor(mode, v, { ...C, depthWalk: g.zone || C.depthWalk }), chipD = chipFor(mode, v, { ...C, depthWalk: g.zone || C.depthWalk, chipWalk: Math.max(C.chipWalk, (g.zone || C.depthWalk) * 3) });
        const tol = mode === 'fly' ? C.flyTol : C.lateralTol, lateral = c.s >= -tol && c.s <= c.len + tol;
        if (!lateral || c.d > depth + C.exitMargin) s.needExit = false;       // the player has left the zone by the margin: a decline is over (the time must also have passed)
        if (blocked || !lateral || c.d < -C.behind || c.d > chipD) continue;
        if (!chip || c.d < chip.d) chip = { gate: g, d: c.d, depth };
        if (s.open || clock < graceUntil) continue;
        const vIn = held ? 0 : vx * g.inward[0] + vz * g.inward[1];
        if (c.d <= depth && (vIn <= -C.approachV || c.d <= C.nearD) && clock >= s.until && !s.needExit && !offer) offer = g;
      }
      return { chip, offer, v };
    },
    /** the question is on screen for gate g */
    markOpen(g) { st.get(g.id).open = true; },
    /** declined: no question for cooldownS and until the player has left the zone by exitMargin */
    decline(g) { const s = st.get(g.id); s.open = false; s.until = clock + C.cooldownS; s.needExit = true; },
    /** the question ended without a decision by the player (a failed preflight, a cancelled travel): wait `seconds`, no exit needed */
    cooldown(g, seconds = C.failCooldownS) { const s = st.get(g.id); s.open = false; s.until = clock + seconds; s.needExit = false; },
    /** no question for `seconds` from now (an arrival) */
    grace(seconds) { graceUntil = clock + seconds; },
    /** forget the speed estimate (a teleport) */
    teleported() { vx = vz = 0; holdUntil = clock + C.holdS; lastX = lastZ = null; },
    state: (g) => ({ ...st.get(g.id) }),
  };
  return machine;
}

// ---------------------------------------------------------------- the destination side
/**
 * The arrival at THIS page: ?cam= plus a valid ?ho= for this area -> { ho, mode, fly, pose { x, y|null, z, yaw, pitch }, how, moved, gate } or null (no hand-off) or { invalid } (a bad ho is ignored).
 * L is this page's layout module; the arrival rect comes from the registry gate named by ho.gate (a dev gate or a gate of another page: none, any valid spot).
 */
export function planArrival({ L, A, params }) {
  const raw = params.get('ho'); if (!raw) return null;
  const dec = decodeHo(raw, { to: A.ID }); if (!dec.ok) return { invalid: dec.why };
  const cam = parseCamParam(params.get('cam')); if (!cam) return { invalid: 'cam' };
  const ho = dec.ho, fly = params.has('fly') && cam.y !== null, mode = ho.car ? 'car' : fly ? 'fly' : 'walk';
  const gate = ALL_GATES.find((g) => g.id === ho.gate && g.to === A.ID) || null;
  const probe = makeProbe(L); if (fly) probe.blocked = () => false;      // a flyer over a building or the river is fine, only the border matters
  const r = resolveArrival(probe, { x: cam.x, z: cam.z, yaw: cam.yaw }, mode === 'fly' ? 'walk' : mode, gate ? gate.arrive : null);
  return { ho, mode, fly, gate, how: r.how, moved: r.moved, pose: { x: r.x, y: fly && r.how !== 'hero' ? cam.y : null, z: r.z, yaw: r.how === 'hero' ? r.yaw : cam.yaw, pitch: r.how === 'hero' ? 8 : cam.pitch } };
}

// ---------------------------------------------------------------- texts (Russian first, English after the dot)
export function promptTexts(to) {
  const a = REGISTRY[to], mb = a.approxMB;
  return {
    title: `Новая область: ${a.title} · New area: ${a.titleEn}`, sights: a.sights.join(' · '),
    scene: `Отдельная сцена, около ${mb} МБ, 25–40 с, страница перезагрузится · A separate scene, about ${mb} MB, 25–40 s; the page reloads`,
    fine: 'Машина, время суток и звук поедут с вами, припаркованное останется · Your car, time of day and sound come along; anything parked stays here',
    yes: 'Загрузить · Load', no: 'Не сейчас · Not now', chip: `${a.title} впереди · ${a.titleEn} ahead · N`, travelKicker: 'Загрузка области · Loading the area',
    stalled: 'Версия области устарела: обновите страницу · The area is out of date: reload the page', offline: 'Нет связи с областью · Cannot reach the area', unavailable: 'Область недоступна · The area is not available',
  };
}
/** the body of the question as DOM (text nodes only: the strings above are never parsed as HTML) */
export function promptBody(doc, T) {
  const body = doc.createElement('div');
  const sights = doc.createElement('div'); sights.className = 'sights'; sights.textContent = T.sights; body.append(sights);
  const p = doc.createElement('p'); p.textContent = T.scene; body.append(p);
  const fine = doc.createElement('p'); fine.className = 'fine'; fine.textContent = T.fine; body.append(fine);
  return body;
}

// ---------------------------------------------------------------- 3. the DOM layer
/**
 * deps = { ctx, player, camera, ui, tod, audio, guard, params, A, isStarted: () => bool, toast: (text) => void, win = window, doc = document, fetchImpl = fetch, setTimeoutImpl = setTimeout }
 * Returns the API that is also exposed as window.__gates (tests replace api.navigate / api.preflight and drive api.machine). null when the gates are off or this area has none.
 */
export function createGates(deps) {
  const { ctx, player, camera, ui, tod, audio, guard, params, A, isStarted, toast } = deps;
  const win = deps.win || window, doc = deps.doc || document, fetchImpl = deps.fetchImpl || ((...a) => fetch(...a));
  const off = params.get('gates') === '0' || (params.get('gates') !== '1' && !GATES_ENABLED);
  const gates = ALL_GATES.filter((g) => g.from === A.ID && (!g.dev || params.has('devgates')));
  if (off || !gates.length) return null;
  const machine = createGateMachine({ gates });
  const chipEl = doc.getElementById('gatechip'), veil = doc.getElementById('travel');
  let traveling = false, chipGate = null, watchdog = null;
  const DEG = 180 / Math.PI;

  const mode = () => (ctx.drive && ctx.drive.active ? 'car' : player.fly ? 'fly' : 'walk');
  /** the pose to hand over: { x, y|null, z, yaw (deg, camera convention), pitch (deg) } */
  function currentPose() {
    const d = ctx.drive;
    if (d && d.active) { const c = d.car; return { x: c.x, y: null, z: c.z, yaw: ((c.yaw + Math.PI) * DEG + 540) % 360 - 180, pitch: 0 }; }
    if (player.fly) return { x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: player.yaw * DEG, pitch: player.pitch * DEG };
    return { x: player.pos.x, y: null, z: player.pos.z, yaw: player.yaw * DEG, pitch: player.pitch * DEG };
  }
  const xz = () => { const d = ctx.drive; return d && d.active ? { x: d.car.x, z: d.car.z } : { x: player.pos.x, z: player.pos.z }; };
  const isBlocked = () => !isStarted() || traveling || !!(guard && guard.dead) || !!ctx.travelPending || ui.open || player.riding || player.isUnderground();

  function setChip(c) {
    chipGate = c ? c.gate : null;
    if (!chipEl) return;
    const touch = doc.documentElement.classList.contains('tc');
    const txt = c ? promptTexts(c.gate.to).chip.replace(touch ? / · N$/ : /$^/, '') : '';      // (no key hint on a touch screen)
    if (chipEl.textContent !== txt) chipEl.textContent = txt;
    chipEl.classList.toggle('show', !!c);
  }
  function tick(dt) {
    if (dt <= 0) return;
    const p = xz(), r = machine.update({ dt, x: p.x, z: p.z, mode: mode(), blocked: isBlocked() });
    setChip(r.chip);
    if (r.offer && !ui.open && !traveling) prompt(r.offer, 'gate');
  }
  function prompt(g, via = 'gate') {
    if (traveling || ui.open) return false;
    machine.markOpen(g);
    const T = promptTexts(g.to);
    ui.confirm({ title: T.title, body: promptBody(doc, T), yes: T.yes, no: T.no, onYes: () => api.go(g, via), onNo: () => machine.decline(g) });
    return true;
  }

  // ---- preflight: is the destination there, and does it match this version of the page?
  async function preflight(to) {
    const row = REGISTRY[to];
    if (!row) return { ok: false, why: 'unknown area' };
    if (params.has('baked') || params.has('only') || params.has('allcity')) return { ok: true, dev: true };      // development flags run without a bake
    const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
    try {
      const head = await Promise.race([fetchImpl(new URL(row.page, win.location.href), { method: 'HEAD', cache: 'no-cache' }), timeout(4000)]);
      if (!head.ok) return { ok: false, why: 'page', status: head.status };
      const peekManifest = deps.peekManifest || (await import('./baked-world.js')).peekManifest, BAKED_REVISION = deps.bakedRevision ?? (await import('./baked-revision.js')).BAKED_REVISION;      // (injectable for tests)
      const m = await Promise.race([peekManifest(row.bake), timeout(4000)]);
      if (!m) return { ok: false, why: 'manifest' };
      if (m.area && m.area !== to) return { ok: false, why: 'area' };
      if (m.revision !== BAKED_REVISION) return { ok: false, why: 'stale' };
      return { ok: true };
    } catch (e) { return { ok: false, why: 'offline' }; }
  }
  const showVeil = (to) => {
    if (!veil) return; const T = promptTexts(to), a = REGISTRY[to];
    veil.querySelector('.t-kicker').textContent = T.travelKicker; veil.querySelector('.t-title').textContent = `${a.title} · ${a.titleEn}`; veil.querySelector('.t-sights').textContent = a.sights.join(' · ');
    veil.classList.remove('stalled'); veil.hidden = false;
  };
  const hideVeil = () => { if (veil) { veil.hidden = true; veil.classList.remove('stalled'); } };
  function endTravel(g) { traveling = false; ctx.travelPending = false; player.inputLock = Math.max(0, player.inputLock - 1); clearTimeout(watchdog); hideVeil(); if (g) machine.cooldown(g); }

  /** accept: preflight, show the veil, navigate. The origin page stays alive (and playable behind the veil) until the browser commits the new page. */
  async function go(g, via = 'gate') {
    if (traveling) return false;
    traveling = true; ctx.travelPending = true; player.inputLock++;
    const veilTimer = setTimeout(() => { if (traveling) showVeil(g.to); }, 300);      // feedback at once when the preflight is slow; an instant failure never flashes the veil
    const pf = await api.preflight(g.to);
    clearTimeout(veilTimer);
    if (!pf.ok) {
      endTravel(g);
      { const T = promptTexts(g.to); toast(pf.why === 'stale' ? T.stalled : pf.why === 'offline' ? T.offline : T.unavailable); }
      return false;
    }
    const pose = currentPose(), d = ctx.drive, m = mode();
    const incoming = ctx.handoff && ctx.handoff.ho ? ctx.handoff.ho.n : 0;
    const ho = makeHo({ from: A.ID, to: g.to, via, gate: g.id, n: incoming + 1, mute: !!audio.muted, noui: doc.body.classList.contains('noui'), ret: { x: pose.x, z: pose.z, yaw: pose.yaw, pitch: pose.pitch },
      car: m === 'car' ? { id: d.vehicle.id, view: d.view.mode, d: [d.damage.state.front, d.damage.state.rear, d.damage.state.left, d.damage.state.right] } : null });
    const url = arrivalUrl({ page: REGISTRY[g.to].page, pose, fly: m === 'fly', tod: tod.k, look: tod.variant, ho, search: win.location.search });
    showVeil(g.to);
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {      // the new page has not committed: the player may retry or stay
      if (!traveling || !veil) return; veil.classList.add('stalled');
      const retry = veil.querySelector('.t-retry'), stay = veil.querySelector('.t-stay');
      if (retry) retry.onclick = () => { veil.classList.remove('stalled'); api.navigate(url); clearTimeout(watchdog); watchdog = setTimeout(() => veil.classList.add('stalled'), 25000); };
      if (stay) stay.onclick = () => { try { win.stop(); } catch (e) { /* a fake window in tests */ } endTravel(g); };      // stop(): the pending location.replace must not complete behind the player's back
      try { doc.exitPointerLock && doc.exitPointerLock(); } catch (e) { /* the buttons need the mouse */ }
    }, 25000);
    api.lastUrl = url;
    api.navigate(url);
    return true;
  }
  const api = {
    machine, gates, prompt, go, preflight, mode, currentPose, tick,
    lastUrl: null,
    /** replaceable in tests: the navigation itself (location.replace keeps ONE history entry, so a page that holds a gigabyte cannot be restored from the back/forward cache) */
    navigate: (url) => win.location.replace(new URL(url, win.location.href)),
    get traveling() { return traveling; }, get chipGate() { return chipGate; },
    /** the player teleported (views, R, the hand-off): forget the speed */
    teleported: () => machine.teleported(),
  };
  ctx.onUpdate((dt) => tick(dt));
  win.addEventListener('keydown', (e) => {      // N: the question again, whenever the chip shows
    if (e.code !== 'KeyN' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || !isStarted() || ui.open || traveling) return;
    if (e.target && /^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (chipGate) { e.preventDefault(); prompt(chipGate, 'gate'); }
  });
  if (chipEl) chipEl.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (chipGate && isStarted() && !ui.open && !traveling) prompt(chipGate, 'gate'); });
  win.addEventListener('pageshow', (e) => { if (e.persisted && traveling) endTravel(null); });      // restored from the back/forward cache after a travel: the veil must go
  return api;
}
