// core/water-view.js - THE UNDERWATER TINT (docs/AREAS.md 13.7, the world rule "water is reachable"). The water surface is drawn by environment/water.js; when the camera goes BELOW it (a walker wading in the
// Neva, a car on the bed of a canal, a flyer diving into a pond) a soft blue-green veil fades in over the frame, so the surface does not just vanish. One fixed div, no canvas, no shader: the fade follows
// physics.waterLevel at the camera (the same answer as the wading of core/player.js and the drag of the car), eased so that the surface crossing is not a flash. Runtime-only: nothing of it is baked.
//   createWaterView({ ctx, camera, physics, doc }) -> { update(dt), amount, dispose() }     ctx.onUpdate drives it; headless callers pass their own `doc` stub or none (then it only computes `amount`).
const TINT = 'rgba(38,104,112,0.46)';       // blue-green, never opaque: the scene stays readable on the bed
const EASE_IN = 9, EASE_OUT = 5;             // 1/s

export function createWaterView({ ctx = null, camera, physics, doc = typeof document !== 'undefined' ? document : null }) {
  let el = null, amount = 0;
  try {
    if (doc && doc.body && doc.createElement) {
      el = doc.createElement('div'); el.id = 'water-view';
      el.setAttribute('aria-hidden', 'true');
      const st = el.style; st.position = 'fixed'; st.left = '0'; st.top = '0'; st.right = '0'; st.bottom = '0'; st.pointerEvents = 'none'; st.zIndex = '4';
      st.background = `radial-gradient(ellipse at 50% 45%, rgba(60,140,150,0.30) 0%, ${TINT} 70%, rgba(20,64,76,0.62) 100%)`; st.opacity = '0'; st.willChange = 'opacity';
      doc.body.appendChild(el);
    }
  } catch (e) { el = null; }
  function update(dt) {
    const p = camera.position, w = physics.waterLevel ? physics.waterLevel(p.x, p.z) : null;
    const want = w !== null && p.y < w - 0.02 ? 1 : 0;
    amount += (want - amount) * Math.min(1, (want > amount ? EASE_IN : EASE_OUT) * (dt > 0 ? dt : 1 / 60));
    if (amount < 0.004) amount = 0;
    if (el) el.style.opacity = amount.toFixed(3);
  }
  if (ctx && ctx.onUpdate) ctx.onUpdate((dt) => update(dt));
  return { update, get amount() { return amount; }, dispose() { try { if (el && el.parentNode) el.parentNode.removeChild(el); } catch (e) { /* gone */ } el = null; } };
}
