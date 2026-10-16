// landmarksJ/isaac.js - St Isaac's Cathedral: the body (cathedral.js) and the great dome (drum.js) drawn in the cathedral model frame (frame.js).
import * as L from '../layout.js';
import { C0, ROT, W } from './frame.js';
import * as Body from './cathedral.js';
import * as Drum from './drum.js';

export function build(K) {
  K.P.push(C0.x, 0, C0.z, ROT);
  try { Body.build(K); Drum.build(K); } finally { K.P.pop(); }
  const sv = K.svc, S = W(0, 45), N = W(0, -70), Wp = W(-75, 0);
  sv.monuments.push({ id: 'r3229838', name: 'Исаакиевский собор', x: C0.x, z: C0.z, h: 101.5 });
  sv.photoSpots.push({ x: N.x, z: N.z, yaw: L.yawToward(N.x, N.z, C0.x, C0.z), pitch: 20, name: 'Исаакиевский собор с Александровского сада' }, { x: Wp.x, z: Wp.z, yaw: L.yawToward(Wp.x, Wp.z, C0.x, C0.z), pitch: 22, name: 'Исаакиевский собор, западный портик' });
  sv.crowd.push(...[[-6, 52], [6, 55], [-14, 50], [14, 53], [0, 62], [-24, 58], [24, 60]].map(([a, b]) => W(a, b)));      // the queue at the south portico
  void S;
  // ---- the colonnade: up through the SE bell tower (entrance on the Isaac's Square side), down through the NW one (as in the real museum)
  const ctx = K.ctx, pl = () => ctx.playerObj;
  if (ctx.interact) {
    const up = W(25.7, 36.2), down = W(-25.7, -36.2), deckIn = W(13.5, 13.5), deckOut = W(-13.5, -13.5);
    const yawOut = (a, b) => L.yawToward(a.x, a.z, b.x, b.z);
    ctx.interact.add({ id: 'isaac-up', radius: 4.2, label: 'Подняться на колоннаду (262 ступени)', labelEn: "Climb to the colonnade of St Isaac's (262 steps)",
      at: () => ({ x: up.x, y: 1.6, z: up.z }), enabled: () => !!pl() && !pl().fly && !pl().riding && pl().pos.y < 8,
      onUse: () => pl().setPose(deckIn.x, deckIn.z, yawOut(deckIn, W(40, 40)), 6, 44.6, { stand: true }) });
    ctx.interact.add({ id: 'isaac-down', radius: 4.2, label: 'Спуститься (выход через северо-западную башню)', labelEn: 'Go down (exit through the north-west bell tower)',
      at: () => ({ x: deckOut.x, y: 45.6, z: deckOut.z }), enabled: () => !!pl() && !pl().fly && !pl().riding && pl().pos.y > 40 && pl().pos.y < 47,
      onUse: () => pl().setPose(down.x, down.z, yawOut(down, W(-60, -60)), 4) });
  }
}
