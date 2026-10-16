// bridges/styles.js - what makes each road bridge recognisable, drawn on top of the generic arch of arch.js (B = makeArch(...) result; everything in the site frame):
//   kazansky  solid rough-hewn granite parapets 1.1 m with rolled coping, the black plate "ПРОХОД СУДОВ ЗАПРЕЩЁН" and the board "2.0"            (photos refs/canals 01 04 08)
//   green     green openwork railing (rope rings + lozenge lattice), four granite pylons carrying the gilded green lamp standards, granite parapets (photos 11 12 15 18)
//   pevchesky dark bottle-green palmette railing, salmon-pink end blocks with tripod name poles, plain parapets                                  (photos 21 23 24 27)
//   red       red railing of the Moika pattern, four granite obelisks with gilded balls and wall lanterns, board "2.8"                           (photos 43 45 46)
//   blue      ultramarine beaded railing, granite pylons with black tripod name poles "Синий мост", replica lamp standards, 97 m passage     (photos 35 36 38)
//   novo      forged black loop railing + granite tumbas (35 m wide Novo-Konyushenny)
//   stone2    the three stone bridges of the Winter Canal: pink-granite arches, solid parapets, boards "2.5", end pylons with tripod poles   (photos 66 67 68 72)
import { lampGreen, lampBlack, obelisk, tripod, pylon, tumba } from './sculpt.js';

const frame = (B, P, fn) => { P.push(B.f.cx, 0, B.f.cz, -B.T); try { fn(); } finally { P.pop(); } };

/** a plate / board on the fascia of face sg at (u, y) of size w x h, 3 cm proud (polygon offset through the decal-like thin gap) */
function board(P, mat, B, sg, u, y, w, h) {
  const v = (sg < 0 ? B.site.v0 : B.site.v1) + sg * 0.06;
  P.quad(mat, [u - sg * w / 2, y, v], [u + sg * w / 2, y, v], [u + sg * w / 2, y + h, v], [u - sg * w / 2, y + h, v], [0, 0, sg], [[0, 0], [1, 0], [1, 1], [0, 1]]);
}
const tint = (ctx, hex) => ctx.mat.toon(hex, { paint: 0.03, name: 'brg-t-' + hex });

const kazansky = (e, B) => {
  const { P, M } = e;
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), uA = fi.a - 3.5, uB = fi.b + 3.5;
      B.parapet(sg, uA, uB, 1.1, 0.52, M.parapet); B.faceCollider(sg, uA - 0.3, uB + 0.3, 0.26, 0.6);
      for (const u of [uA, uB]) P.box(M.parapet, u - 0.42, u + 0.42, 0.05, 1.42, fi.v - sg * 0.56, fi.v, 'b', 1.2);          // end posts (the tube railing of the quay starts here)
      board(P, M.noShips, B, sg, fi.a + 2.6, B.yDeck(fi.a + 2.6) - 0.05, 0.5, 1.0);                                          // black plate on the abutment cornice? stands on the parapet face
      board(P, M.clear('2.0'), B, sg, B.uc, B.crownY + 0.5, 0.42, 0.42);
    }
  });
};

const green = (e, B) => {
  const { P, M, ctx } = e, rg = '#4a8a68', post = tint(ctx, '#3f7a5a');
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b, w = 2.6, d = 2.4, v0 = sg < 0 ? fi.v : fi.v - d, v1 = sg < 0 ? fi.v + d : fi.v;
      B.railLine(sg, a, b, 'greenrings', rg, { postMat: post, postW: 0.28 });
      for (const [u0, u1] of [[a - w, a], [b, b + w]]) {
        const y0 = B.yDeck((u0 + u1) / 2) - 0.1, top = y0 + 2.0;
        pylon(P, M.pylon, M.coping, u0, u1, y0, top, v0, v1, { cap: 0.1 });
        lampGreen(P, M, (u0 + u1) / 2, top, (v0 + v1) / 2);
      }
      for (const [u0, u1] of [[a - w - 6.5, a - w], [b + w, b + w + 6.5]]) B.parapet(sg, u0, u1, 1.1, 0.52, M.parapetPink);
      B.faceCollider(sg, a - w - 6.7, b + w + 6.7, 0.25, 0.6);
      board(P, M.clear('2.7'), B, sg, B.uc, B.yDeck(B.uc) - 0.41, 0.4, 0.4);
    }
  });
};

const pevchesky = (e, B) => {
  const { P, M, ctx } = e, rg = '#2f4a3c', post = tint(ctx, '#2b4437');
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b, bw = 1.3, bd = 1.3, v0 = sg < 0 ? fi.v : fi.v - bd, v1 = sg < 0 ? fi.v + bd : fi.v;
      B.railLine(sg, a, b, 'palmette', rg, { postMat: post, postW: 0.26 });
      for (const [u0, u1, ts] of [[a - bw, a, -1], [b, b + bw, 1]]) {
        const y0 = B.yDeck((u0 + u1) / 2) - 0.1;
        pylon(P, M.pylon, M.coping, u0, u1, y0, y0 + 1.5, v0, v1, { cap: 0.08 });
        tripod(P, M, ts < 0 ? u0 - 0.7 : u1 + 0.7, y0 + 0.1, sg < 0 ? v0 + 0.6 : v1 - 0.6, 'Певческий мост');
      }
      for (const [u0, u1] of [[a - bw - 4.5, a - bw], [b + bw, b + bw + 4.5]]) B.parapet(sg, u0, u1, 1.05, 0.5, M.parapetPink);
      B.faceCollider(sg, a - bw - 4.7, b + bw + 4.7, 0.25, 0.6);
    }
  });
};

const red = (e, B) => {
  const { P, M, ctx } = e, rg = '#d8182c', post = tint(ctx, '#c8182c');
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b;
      B.railLine(sg, a, b, 'moika', rg, { postMat: post, postW: 0.2 });
      for (const ts of [-1, 1]) {
        const ou = ts < 0 ? a - 1.1 : b + 1.1, ov = fi.v - sg * 0.8, y0 = B.yDeck(ou) - 0.05;
        const dx = B.uc - ou, dz = 0 - ov;
        obelisk(P, M, ou, y0, ov, Math.atan2(dx, dz), 4.6);
      }
      for (const [u0, u1] of [[a - 2.4 - 4.5, a - 2.4], [b + 2.4, b + 2.4 + 4.5]]) B.parapet(sg, u0, u1, 1.1, 0.52, M.parapetPink);
      B.faceCollider(sg, a - 6.9, b + 6.9, 0.25, 0.6);
      board(P, M.clear('2.8'), B, sg, B.uc, B.yDeck(B.uc) - 0.42, 0.42, 0.42);
    }
  });
};

const blue = (e, B) => {
  const { P, M, ctx } = e, rg = '#2f72d0', post = tint(ctx, '#2a62bc');
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b, w = 2.5, d = 2.5, v0 = sg < 0 ? fi.v : fi.v - d, v1 = sg < 0 ? fi.v + d : fi.v;
      B.railLine(sg, a, b, 'blue', rg, { postMat: post, postW: 0.3 });
      for (const [u0, u1, ts] of [[a - w, a, -1], [b, b + w, 1]]) {
        const y0 = B.yDeck((u0 + u1) / 2) - 0.1;
        pylon(P, M.pylon, M.coping, u0, u1, y0, y0 + 0.85, v0, v1, { cap: 0.08 });
        tripod(P, M, ts < 0 ? u1 - 0.7 : u0 + 0.7, y0 + 0.8, sg < 0 ? v0 + 0.7 : v1 - 0.7, 'Синий мост');
        lampBlack(P, M, ts < 0 ? u0 + 0.7 : u1 - 0.7, y0 + 0.8, sg < 0 ? v1 - 0.7 : v0 + 0.7, 3.8);
      }
      for (const [u0, u1] of [[a - w - 5, a - w], [b + w, b + w + 5]]) B.parapet(sg, u0, u1, 1.0, 0.5, M.parapetPink);
      B.faceCollider(sg, a - w - 5.2, b + w + 5.2, 0.25, 0.6);
    }
  });
};

const novo = (e, B) => {
  const { P, M } = e;
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b;
      B.railLine(sg, a + 0.9, b - 0.9, 'loops', '#202428', { postMat: M.iron, postW: 0.2, h: 1.0 });
      for (const [uu, ts] of [[a + 0.4, -1], [b - 0.4, 1]]) tumba(P, M, uu, B.yDeck(uu) - 0.05, fi.v - sg * 0.6, 0, 0.9, 1.2, 0.3);
      for (const [u0, u1] of [[a - 4.5, a - 0.05], [b + 0.05, b + 4.5]]) B.parapet(sg, u0, u1, 1.0, 0.5, M.parapetPink);
      B.faceCollider(sg, a - 4.7, b + 4.7, 0.25, 0.6);
    }
  });
};

const stone2 = (e, B) => {
  const { P, M } = e, name = { hermitage: 'Эрмитажный мост', zimny1: '1-й Зимний мост', zimny2: '2-й Зимний мост' }[B.site.id];
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b, uA = a - 2.2, uB = b + 2.2;
      B.parapet(sg, uA, uB, 1.05, 0.55, M.parapetPink); B.faceCollider(sg, uA - 0.3, uB + 0.3, 0.27, 0.6);
      if (B.site.clear) board(P, M.clear(B.site.clear), B, sg, B.uc, B.crownY + 0.35, 0.55, 0.55);
      // end pylons: rough dark pink-grey blocks with a rounded front, 1.5 x 1.0 x 1.0, black tripod name pole on the first
      for (const [uu, ts] of [[uA - 0.9, -1], [uB + 0.9, 1]]) {
        const y0 = B.yDeck(uu) - 0.05, v0 = sg < 0 ? fi.v : fi.v - 1.0, v1 = sg < 0 ? fi.v + 1.0 : fi.v;
        P.box(M.pylonRough, uu - 0.75, uu + 0.75, y0, y0 + 1.0, v0, v1, 'b', 1.5);
        P.box(M.coping, uu - 0.8, uu + 0.8, y0 + 0.92, y0 + 1.02, v0 - sg * 0.0 - 0.05, v1 + 0.05, 'b', 1.5);
        if (ts < 0 && sg < 0) tripod(P, M, uu - 1.1, y0, sg < 0 ? v0 + 0.5 : v1 - 0.5, name);
      }
    }
  });
};

export const STYLES = { kazansky, green, pevchesky, red, blue, novo, hermitage: stone2, zimny1: stone2, zimny2: stone2 };
