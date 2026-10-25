// lib/bridge-wires.js - the CONTACT WIRES over the moving span of a bascule bridge (docs/AREAS.md 13.8, 13.10). When the page builds the module of a bascule bridge the streets module (streets/wires.js) does not draw the wires
// of the span between the two pier faces (it clips them at the faces and hands the part over the span to ctx.services.streets.wires.cut[id]), and it draws no cross span, hanger or mast there: nothing may hang over the water
// gap of an open bridge, and nothing carries the wires while the leaves are up. This helper draws that part as ONE dynamic mesh (the same wire shader as the street wires: core/geo.js createWireSystem) that is visible only
// while the leaves are (almost) down: set(theta) from the module's frame update; theta in radians above the closed position.
import { createWireSystem } from '../../core/geo.js';

export const WIRES_DOWN_RAD = 3 * Math.PI / 180;               // the wires are drawn only while the leaves are lowered to less than this

/** the dynamic wire mesh of bridge `id` ('palace' | 'troitsky'), added to the dynamic root; null when the streets module cut nothing (the page has no module / no wire crosses the span) */
export function buildSpanWires(ctx, id) {
  const lines = ctx.services && ctx.services.streets && ctx.services.streets.wires && ctx.services.streets.wires.cut && ctx.services.streets.wires.cut[id];
  if (!lines || !lines.length) return null;
  const ws = createWireSystem();
  for (const l of lines) ws.add(l.pts, { width: l.width, color: l.color });
  const mesh = ws.build();
  if (!mesh) return null;
  mesh.name = 'span-wires-' + id;
  ctx.add(mesh);
  const out = { mesh, lines: lines.length, visible: true, set(theta) { const v = theta < WIRES_DOWN_RAD; if (v !== out.visible) { out.visible = v; mesh.visible = v; } } };
  return out;
}
