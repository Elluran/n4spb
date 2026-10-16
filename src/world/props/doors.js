// props/doors.js - what stands beside the entrances of the city module (S.city.entrances: parade doors and shop doors): on the shopping streets a black cast-iron flower urn or a
// terracotta pot of geraniums beside about one door in four (nevsky.md: "pavement flower pots" at the shops, streets.md: "planters under windows"). The stoop (3.0 x 3.2 m box in
// front of every door) is reserved by state.js, so everything stands beside it, against the facade, with the 2.6 m walking lane kept free towards the carriageway.
import * as L from '../layout.js';
import { hash01 } from './kit.js';

export function placeDoors(S) {
  const { W, R, F } = S, ents = (S.city && S.city.entrances) || [];
  const cnt = { entrances: ents.length, urns: 0, pots: 0 };
  const seen = [];
  for (const e of ents) {
    if (!W.inPlay(e.x, e.z, -2) || S.inForecourt(e.x, e.z, 2)) continue;
    if (hash01(Math.round(e.x * 2), Math.round(e.z * 2), 'door') > 0.075) continue;
    if (cnt.urns + cnt.pots >= 280) break;
    if (seen.some((q) => Math.hypot(q[0] - e.x, q[1] - e.z) < 2.5)) continue; seen.push([e.x, e.z]);
    const nx = Math.sin(e.rotY), nz = Math.cos(e.rotY), tx = nz, tz = -nx;
    const street = L.roadsNear(e.x + nx * 4, e.z + nz * 4, 8, { drivable: true });
    if (!street.length || street[0].gap > 7.5) continue;
    const sd = R() < 0.5 ? 1 : -1, wx = e.x - nx * 0.6, wz = e.z - nz * 0.6;
    const nevsky = /Невск/.test(street[0].road.name || '');
    const urn = nevsky ? R() < 0.55 : R() < 0.3;
    const off = urn ? 0.62 : 0.4, along = urn ? 2.35 : 1.95;
    const px = wx + nx * off + tx * sd * along, pz = wz + nz * off + tz * sd * along;
    if (!W.fits(px, pz, urn ? 0.9 : 0.5, urn ? 0.9 : 0.5, 0, { margin: 0.02, allow: F.BLD | F.DOOR | F.LAWN }) || S.inDoorBox(px, pz, urn ? 0.5 : 0.3) || S.placed.near(px, pz, 0.9)) continue;
    if (W.span(px, pz, nx, nz, 6, F.ROAD | F.WATER) < 2.6) continue;
    if (S.placed.near(px, pz, 2.2, 'cross') || S.placed.near(px, pz, 2.5, 'metro') || S.placed.near(px, pz, 1.4, 'lamp')) continue;
    if (urn) { S.add(['urnCast0', 'urnCast1', 'urnCastBig'][Math.floor(R() * 3)], px, pz, R() * 6.28); S.solidCyl(px, pz, 0.4, 0.95); S.svc.urns.push({ x: px, z: pz }); cnt.urns++; }
    else { S.add(R() < 0.5 ? 'pot0' : 'pot1', px, pz, R() * 6.28); S.solidCyl(px, pz, 0.21, 0.5); cnt.pots++; }
    S.placed.add(px, pz, 0.8, 'urn');
  }
  S.stats.doors = cnt;
}
