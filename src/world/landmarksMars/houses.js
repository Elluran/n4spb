// landmarksMars/houses.js - the stucco houses of Suvorov Square drawn with the facade vocabulary kit (common.js / house.js): the service wing of the Marble Palace (Сл. корпус, Millionnaya 5, OSM
// r1413513: pale sage-green #b5ccb0, white paired pilasters, rusticated ground floor with round-arched windows, plain cornice with an iron rail), the Saltykov house (Dvortsovaya nab. 4, r1361783: mint
// green #a9cf9b, an arched gate with an iron balcony above it, small hoods) and the Betsky house (Dvortsovaya nab. 2, r1361784: dusty pink-lilac #d9bec6, rusticated ground floor with mask keystones,
// balustraded roof edge, the rounded corner is the footprint's own).  Dossier docs/research/mars-field.md 6.3 / 6.4, photos suvsq_01 salt_01 betsk_01.  Heights are estimates (4 / 3 / 3 storeys).
import * as L from '../layout.js';
import { buildHouse } from './house.js';
import { ringFromFlat } from '../lib/massing.js';
import { portico } from './parts.js';

function longestEdge(rec) { let best = 0; for (const p of rec.polys) { const o = p.o; for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length, l = Math.hypot(o[j] - o[i], o[j + 1] - o[i + 1]); best = Math.max(best, l); } } return best; }

/** a generic classical elevation: rustic ground storey with arched windows, rows of framed windows, pilasters, an optional gate with a balcony */
function classicFront(K, o) {
  const P = K.P, { wall, rust, trim, G, hc } = o;
  return (e, c) => {
    if (e.hole || e.len < 8) return false;
    const len = c.len, n = Math.max(3, Math.round((len - 1.6) / o.pitch)), p = (len - 1.6) / n;
    const xs = Array.from({ length: n }, (_, i) => 0.8 + p * (i + 0.5));
    K.wallQuad(rust, 0, len, 0.9, G, 3);
    K.wallQuad(wall, 0, len, G, hc + 0.45, 3);
    const gate = !o.noGate && e.len > o.gateLen - 0.01 && e.len >= o.gateLen - 0.5;
    const gi = gate ? Math.floor(n / 2) : -1;
    xs.forEach((x, i) => {
      if (i === gi) {
        { const f = c.f; K.svc.entrances.push({ x: f.x + f.xa[0] * x + e.n[0] * 0.8, z: f.z + f.xa[1] * x + e.n[1] * 0.8, rotY: Math.atan2(e.n[0], e.n[1]), bldg: e.rec && e.rec.id }); }
        K.gate(x, 0.9, 3.2, G - 0.9, { sw: 0.3, d: 0.16, ringMat: trim, doorMat: K.mats.doorDark });
        K.balcony(x - 2.0, x + 2.0, G + 0.4, 0.9, { slabMat: trim });
        K.window({ x, y: G + 0.9, w: 1.4, h: o.rows[0].h + 0.4, head: 'arch', sw: 0.2, d: 0.1, frame: 'white', surMat: trim, sill: false });
      } else {
        K.window({ x, y: 1.6, w: 1.3, h: G - 2.4, head: o.arches ? 'arch' : 'flat', sw: 0.16, d: 0.22, frame: 'white', surMat: trim, sill: false });
        if (o.keystone) P.box(trim, x - 0.17, x + 0.17, G - 0.95, G - 0.45, 0.02, 0.3, 'b');
        for (const r of o.rows) K.window({ x, y: G + r.y, w: r.w ?? 1.3, h: r.h, head: r.head || 'flat', sw: 0.16, d: 0.1, frame: 'white', surMat: trim, hood: r.hood || null, hoodH: 0.4, sill: r.sill !== false });
      }
    });
    if (o.pil) {
      for (let i = 0; i <= n; i++) {
        const x = 0.8 + p * i;
        if (o.pil === 'pair') for (const dx of [-0.42, 0.42]) K.pilaster(trim, x + dx, 0.42, G + 0.2, hc - 0.5, 0.14, 0.3);
        else K.pilaster(trim, x, 0.7, G + 0.2, hc - 0.5, 0.16, 0.34);
      }
    }
    P.box(trim, 0, len, G - 0.2, G + 0.16, 0, 0.3, 'b');
    if (o.balustrade) K.balustrade(0.4, len - 0.4, hc + 0.45, 0.9, 0.4, trim);
    if (o.portico && e.len > o.gateLen - 8) {                                                        // the 8-column portico of the Adamini house (south and east fronts)
      const cx = len / 2, w = 21.6, x0 = cx - w / 2, x1 = cx + w / 2, xsC = Array.from({ length: 8 }, (_, i) => x0 + 1.0 + i * (w - 2.0) / 7);
      P.box(trim, x0 - 0.5, x1 + 0.5, 0.9, G, 0, 3.6, 'b');
      portico(K, { x0, x1, depth: 2.6, y0: G, y1: hc - 1.6, r: 0.55, xs: xsC, ent: 1.6, ped: 2.9, mat: trim, matShade: K.mats.shade, wallMat: wall, steps: false });
    }
    return true;
  };
}

function house(K, spec) {
  const rec = L.buildingById(spec.id); if (!rec) throw new Error(`${spec.name} record ${spec.id} missing`);
  const T = (hex, name, o = {}) => K.mat(hex, { name: 'lmM-' + name, paint: 0.04, ...o });
  const o = { wall: K.wall(spec.wall), rust: K.rust(spec.rust), trim: T(spec.trim || '#f2eee4', spec.key + '-trim'), G: spec.G, hc: spec.hc, pitch: spec.pitch, rows: spec.rows, pil: spec.pil, arches: spec.arches, keystone: spec.keystone, balustrade: spec.balustrade, noGate: spec.noGate, portico: spec.portico, gateLen: longestEdge(rec) };
  const front = classicFront(K, o);
  buildHouse(K, { name: spec.key, recs: [rec], hc: spec.hc, wall: spec.wall, court: spec.court || spec.wall, plinth: 0.9, plinthMat: K.rust(spec.plinth || '#8f8a82'), floors: spec.floors, courtPitch: spec.pitch, corniceMat: o.trim, roof: 'none', railing: !!spec.railing, front, partyOpts: { tol: 0.8 }, collideH: spec.hc + 3 });
  const poly = rec.polys[0];
  K.P.cap(T(spec.roof || '#8a948f', spec.key + '-roof'), ringFromFlat(poly.o), spec.hc + 0.5, true, 4, poly.h.map(ringFromFlat));
  K.svc.houses.push({ id: spec.id, name: spec.name, x: rec.cx, z: rec.cz });
}

export function build(K) {
  const specs = [
    { id: 'r1413513', key: 'serviceWing', name: 'Служебный корпус Мраморного дворца', wall: '#b5ccb0', rust: '#a8bda4', G: 5.6, hc: 19.0, pitch: 4.5, pil: 'pair', arches: true, plinth: '#8c8f88', railing: true, floors: [5.6, 4.6, 4.4, 4.4],
      rows: [{ y: 0.8, h: 3.1, hood: 'tri' }, { y: 5.2, h: 2.9 }, { y: 9.6, h: 2.4 }] },
    { id: 'r1361783', key: 'saltykov', name: 'Дом Салтыкова', wall: '#a9cf9b', rust: '#9bbf8e', G: 5.0, hc: 15.3, pitch: 4.4, pil: null, arches: true, plinth: '#8c8f88', railing: true, floors: [5.0, 5.0, 4.6],
      rows: [{ y: 0.9, h: 3.3, hood: 'seg' }, { y: 5.9, h: 2.8 }] },
    { id: 'r1361784', key: 'betsky', name: 'Дом Бецкого', wall: '#d9bec6', rust: '#cfa8aa', G: 5.4, hc: 15.2, pitch: 4.6, pil: 'single', arches: true, keystone: true, balustrade: true, plinth: '#8c7f7a', railing: false, floors: [5.4, 5.0, 4.4],
      rows: [{ y: 0.9, h: 3.4, hood: 'tri' }, { y: 5.9, h: 2.8 }] },
    { id: 'r7033585', key: 'adamini', name: 'Дом Адамини', wall: '#efd068', rust: '#e4c35c', G: 5.0, hc: 15.6, pitch: 4.4, pil: null, arches: true, balustrade: true, noGate: true, portico: true, plinth: '#8c8f88', railing: false, floors: [5.0, 4.8, 4.4],
      rows: [{ y: 0.8, h: 3.6, hood: 'seg' }, { y: 5.7, h: 3.0 }] },
  ];
  for (const s of specs) { try { house(K, s); } catch (e) { console.error(`[landmarksMars] houses/${s.key}:`, e); throw e; } }
}
