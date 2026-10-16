// landmarksH/horseman.js - the Bronze Horseman (Falconet 1782) on the Thunder Stone (Грозовой камень) on Senate Square.  The sculpture is built in bronze_statue.js (lofted horse, rider, cloak, bearskin, serpent: ~52 k triangles from
// bronze_geom.js), the rock in thunder_rock.js (smooth height field with chisel planes, speckled granite map + vertex tints, flat inscription panels: ~14 k triangles); this file keeps the materials / textures and the plaza.  Dossier docs/research/admiralty-stisaac.md section 6.1-6.2 (position OSM n249082841
// (-2745.5, -444.2); the horse faces the Neva, compass bearing ~320 deg; sculpture 5.35 m, pedestal 5.1 m high, 8.5 m long, ~6.4 m wide; rock = rapakivi granite #C2AA98 lit / #A98F80 shade; bronze #2F3D38 with
// verdigris; the Russian inscription on the NE flank, the Latin one on the SW flank), photos 056 059 063 066 067.  The plaza: round island r 12.3 m (OSM w823894407) with a continuous 1.2 m hedge, a bed of
// petunias, a granite kerb and a black cast-iron fence round the rock.  NO flags (the real square carries some on Navy Day).
import * as THREE from 'three';
import { buildRock, rockH, PLATEAU } from './thunder_rock.js';
import { buildStatue } from './bronze_statue.js';

const CX = -2745.5, CZ = -444.2, R_ISLAND = 12.3;
const BEAR = 320 * Math.PI / 180;
const DIRX = Math.sin(BEAR), DIRZ = -Math.cos(BEAR);                  // unit world direction the horse looks (towards the Neva, NW)
const ROT = Math.atan2(DIRX, DIRZ);
const hash = (a, b) => { let h = Math.imul(a * 73856093 ^ b * 19349663, 0x2c1b3c6d); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

export function build(K, ctx, H) {
  const P = K.P, M = H.M, T = ctx.mat.toon;
  const gran = T('#9b8f88', { name: 'lmH-hGranite' });
  // granite map of the Thunder Stone: rapakivi (pink-beige ground, lighter ovoids with grey rims, dark speckles)
  const rockTex = ctx.tex.draw(512, 512, (g, w, h) => {
    g.fillStyle = '#d7bfae'; g.fillRect(0, 0, w, h);
    let sd = 17; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    for (let i = 0; i < 900; i++) { g.globalAlpha = 0.22 + rnd() * 0.3; g.fillStyle = ['#cfa88e', '#e6cdb8', '#d8b3a0', '#ecd6c2'][Math.floor(rnd() * 4)]; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 3 + rnd() * 9, 2 + rnd() * 6, rnd() * 3, 0, 6.3); g.fill(); }
    for (let i = 0; i < 2400; i++) { g.globalAlpha = 0.35 + rnd() * 0.4; g.fillStyle = rnd() < 0.6 ? '#7f6e66' : '#a4857a'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2.2, 1 + rnd() * 2); }
    g.globalAlpha = 0.5; g.strokeStyle = '#a08c80'; g.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) { g.beginPath(); const x = rnd() * w, y = rnd() * h; g.moveTo(x, y); g.quadraticCurveTo(x + (rnd() - 0.5) * 120, y + (rnd() - 0.5) * 60, x + (rnd() - 0.5) * 160, y + (rnd() - 0.5) * 90); g.stroke(); }
    g.globalAlpha = 1;
  }, { key: 'lmH-rapakivi', repeat: [1, 1] });
  const rockMat = T('#ffffff', { map: rockTex, vertexColors: true, name: 'lmH-rockVC', paint: 0.05 });
  // bronze: dark green-black #2F3D38 with verdigris streaks on the up-facing surfaces (v = normal.y of the uv rule of bronze_geom.js)
  const patina = ctx.tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#2a3631'; g.fillRect(0, 0, w, h);
    let sd = 11; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    for (let i = 0; i < 300; i++) { g.globalAlpha = 0.4; g.fillStyle = rnd() < 0.5 ? '#27312d' : '#3b4c44'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 8, 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
    const r1 = Array.from({ length: 64 }, () => rnd()), r2 = Array.from({ length: 16 }, () => rnd()), r3 = Array.from({ length: 256 }, () => rnd());
    const vn = (a, x) => { const i = Math.floor(x), f = x - i, p = a[((i % a.length) + a.length) % a.length], q = a[(((i + 1) % a.length) + a.length) % a.length]; return p + (q - p) * f * f * (3 - 2 * f); };
    g.fillStyle = 'rgba(92,143,120,0.34)'; g.fillRect(0, 0, w, h * 0.2);
    for (let x = 0; x < w; x++) {
      const s = Math.max(0, Math.min(1, vn(r1, x / 11) * 0.6 + vn(r2, x / 40) * 0.7 + r3[x] * 0.12 - 0.3));
      if (s < 0.22) continue;
      const reach = 0.26 + s * 0.42, gr = g.createLinearGradient(0, 0, 0, h * reach);
      gr.addColorStop(0, `rgba(96,150,126,${0.42 + 0.5 * s})`); gr.addColorStop(1, 'rgba(96,150,126,0)');
      g.fillStyle = gr; g.fillRect(x, 0, 3, h * reach);
    }
    // blooms of verdigris on the side faces (the real bronze is blotched teal where rain runs off, photo 057)
    for (let i = 0; i < 46; i++) { g.globalAlpha = 0.12 + rnd() * 0.16; g.fillStyle = '#5c8f78'; g.beginPath(); g.ellipse(rnd() * w, h * (0.28 + rnd() * 0.3), 3 + rnd() * 10, 2 + rnd() * 7, rnd() * 3, 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
  }, { key: 'lmH-patina', repeat: [1, 1] });
  const bronze = T('#f0f6f2', { map: patina, name: 'lmH-hBronze2', paint: 0.03, emissive: '#0c1a14', emissiveIntensity: 0.5 });
  const snake = T('#4d7d5a', { name: 'lmH-hSnake', paint: 0.04 }), dark = T('#0f1416', { name: 'lmH-hMouth' });
  // inscriptions (old-style capitals, incised black), flush on the flat panels of the rock
  const insMat = (lines, key) => {
    const map = ctx.tex.draw(1024, 448, (g2, ww, hh) => {
      g2.clearRect(0, 0, ww, hh); g2.fillStyle = '#2a2320'; g2.textBaseline = 'alphabetic'; g2.textAlign = 'left';
      const serif = ctx.tex.FONTS.serif;
      lines.forEach((ln, i) => {
        const y = 118 + i * 138, x0 = i === 2 ? 250 : 40;
        let x = x0;
        for (const [txt, size] of ln) { g2.font = `bold ${size}px ${serif}`; g2.fillText(txt, x, y); x += g2.measureText(txt + ' ').width; }
      });
    }, { key: 'lmH-ins-' + key, repeat: [1, 1] });
    const m = T('#ffffff', { map, transparent: true, alphaTest: 0.4, side: 'double', name: 'lmH-ins-' + key });
    K.decalMats.add(m); return m;
  };
  const ins = {
    ru: insMat([[['ПЕТРУ', 100], ['ПЕРВОМУ', 58]], [['ЕКАТЕРИНА', 100], ['ВТОРАЯ', 58]], [['ЛЕТО 1782', 62]]], 'ru'),
    la: insMat([[['PETRO', 92], ['PRIMO', 52]], [['CATHARINA', 92], ['SECUNDA', 52]], [['MDCCLXXXII', 62]]], 'la'),
  };

  P.push(CX, 0, CZ, ROT);
  // the Thunder Stone, its plinth, the inscription panels; the bronze group stands on the crest (hooves at y = PLATEAU)
  const rk = buildRock(P, gran, ins);
  const rockMesh = new THREE.Mesh(rk.geo, rockMat); rockMesh.name = 'thunderStone'; rockMesh.castShadow = true; rockMesh.receiveShadow = false;      // receiving made the grazing flank a field of shadow-map speckles (smooth normals at the terminator); the toon bands + vertex tint shade it
  rockMesh.position.set(CX, 0, CZ); rockMesh.rotation.y = ROT; K.root.add(rockMesh); K.tris += rk.tris;
  P.push(0, PLATEAU, 0, 0);
  buildStatue(P, { bronze, snake, dark }, rockH, PLATEAU);
  P.pop();
  P.pop();

  // ---------------------------------------------------------------- the round plaza: kerb, petunia bed, hedge, black iron fence round the rock
  const kerb = T('#a8a29a', { name: 'lmH-hKerb' }), hedge = T('#ffffff', { map: ctx.tex.draw(128, 128, (g2, w, h) => { g2.fillStyle = '#3d6a38'; g2.fillRect(0, 0, w, h); let sd = 9; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; }; for (let i = 0; i < 420; i++) { g2.fillStyle = rnd() < 0.5 ? '#2f5a2e' : '#52823f'; g2.beginPath(); g2.arc(rnd() * w, rnd() * h, 2 + rnd() * 4, 0, 6.3); g2.fill(); } }, { key: 'lmH-hedgeTex', repeat: [1, 1] }), name: 'lmH-hHedge', paint: 0.05 }), bed = T('#ffffff', { map: ctx.tex.draw(128, 128, (g2, w, h) => {
    g2.fillStyle = '#3f6a30'; g2.fillRect(0, 0, w, h); let sd = 5; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    for (let i = 0; i < 160; i++) { g2.fillStyle = ['#e0457b', '#f08cb4', '#f5f1f0', '#d0242e'][Math.floor(rnd() * 4)]; g2.beginPath(); g2.arc(rnd() * w, rnd() * h, 3 + rnd() * 3, 0, 6.3); g2.fill(); }
  }, { key: 'lmH-petunia', repeat: [1, 1] }), name: 'lmH-petunia' }), lawn = T('#5f8f2a', { name: 'lmH-hLawn', paint: 0.06 });
  const ring = (r0, r1, y, mat, seg = 48) => {
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, p = (a, r) => [CX + Math.cos(a) * r, y, CZ + Math.sin(a) * r];
      P.quad(mat, p(a0, r0), p(a1, r0), p(a1, r1), p(a0, r1), [0, 1, 0], [[a0 * r0 / 2, r0 / 2], [a1 * r0 / 2, r0 / 2], [a1 * r1 / 2, r1 / 2], [a0 * r1 / 2, r1 / 2]]);
    }
  };
  ring(0.5, 11.0, 0.075, lawn);                                                    // lawn inside the hedge (the base disc lies above it)
  ring(11.0, 12.0, 0.09, bed);                                                    // petunia bed (raised 6 cm)
  P.cyl(kerb, [CX, 0, CZ], [CX, 0.16, CZ], R_ISLAND, R_ISLAND, 56, false);
  ring(12.0, R_ISLAND + 0.1, 0.16, kerb);
  // hedge: a closed ring 1.2 m high, 0.8 m wide (trapezoid section)
  {
    const seg = 56, r0 = 10.4, r1 = 11.2;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const q = (c, s, r, y) => [CX + c * r, y, CZ + s * r];
      P.quad(hedge, q(c0, s0, r1, 0), q(c1, s1, r1, 0), q(c1, s1, r1 - 0.12, 1.2), q(c0, s0, r1 - 0.12, 1.2), [c0, 0.1, s0], [[a0 * 6, 0], [a1 * 6, 0], [a1 * 6, 1], [a0 * 6, 1]]);
      P.quad(hedge, q(c1, s1, r0, 0), q(c0, s0, r0, 0), q(c0, s0, r0 + 0.12, 1.2), q(c1, s1, r0 + 0.12, 1.2), [-c0, 0.1, -s0]);
      P.quad(hedge, q(c0, s0, r1 - 0.12, 1.2), q(c1, s1, r1 - 0.12, 1.2), q(c1, s1, r0 + 0.12, 1.2), q(c0, s0, r0 + 0.12, 1.2), [0, 1, 0]);
    }
  }
  // iron fence: posts with ball finials and top / bottom rails, radius 9.0 round the rock (an opening of 3 m on the Neva-ward side is not needed: the whole ring is closed)
  {
    const seg = 60, r = 12.75;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, x0 = CX + Math.cos(a0) * r, z0 = CZ + Math.sin(a0) * r, x1 = CX + Math.cos(a1) * r, z1 = CZ + Math.sin(a1) * r;
      P.cyl(M.iron, [x0, 1.05, z0], [x1, 1.05, z1], 0.025, 0.025, 4, false); P.cyl(M.iron, [x0, 0.18, z0], [x1, 0.18, z1], 0.02, 0.02, 4, false);
      for (const t of [0, 0.34, 0.67]) { const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t; P.cyl(M.iron, [px, 0.1, pz], [px, 1.05, pz], 0.018, 0.018, 4, false); }
      if (i % 2 === 0) { P.cyl(M.iron, [x0, 0, z0], [x0, 1.15, z0], 0.05, 0.05, 5, true); P.geo(M.iron, K.ballGeo || (K.ballGeo = new THREE.SphereGeometry(0.1, 6, 5)), x0, 1.22, z0); }
    }
  }
  // colliders: the lawn island with its hedge (solid, r 11.6), the plaza kerb is a step
  ctx.physics.addCylinder(CX, CZ, 11.4, 0, 1.4);
  K.svc.monuments.push({ id: 'bronze-horseman', name: 'Медный всадник', nameEn: 'Bronze Horseman', x: CX, z: CZ, h: 10.45 });
  const ph = [{ x: CX + 22, z: CZ + 8, tx: CX, tz: CZ, name: 'Медный всадник', nameEn: 'Bronze Horseman, from the square' }, { x: CX - 20, z: CZ - 18, tx: CX, tz: CZ, name: 'Медный всадник и Нева', nameEn: 'the Horseman against the Neva' }];
  for (const p of ph) K.svc.photoSpots.push({ x: p.x, z: p.z, yaw: yawToward(p.x, p.z, p.tx, p.tz), pitch: 8, name: p.name, nameEn: p.nameEn });
  K.svc.spots.horseman = { x: CX, z: CZ, ring: R_ISLAND + 1.0 };
}

const yawToward = (x0, z0, x1, z1) => { const b = Math.atan2(x1 - x0, -(z1 - z0)) * 180 / Math.PI; return ((-b + 540) % 360) - 180; };
