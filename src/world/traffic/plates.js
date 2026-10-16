// traffic/plates.js - the small canvas atlases of the vehicle module (shared by key, drawn once):
//   plate atlas   512 x 1024, 2 columns x 18 rows of 240 x 52 px: 36 white plates `А123ВС 178 RUS` (invented numbers, regions 78 / 178 / 98 / 198 + others); the bottom strip is plain
//                 white (the car shader samples it for every non-plate vertex). No flag drawn on the plates (user rule: no flags in the scene).
//   route atlas   2 columns x 19 rows of 384 x 53 px (37 routes): the amber LED route boards (`7  Площадь Восстания`, `1  Ул. Маршала Тухачевского`, ...) on black
//   livery atlas  512 x 256, 4 rows of 64 px: ПОЛИЦИЯ (blue), СКОРАЯ МЕДИЦИНСКАЯ ПОМОЩЬ (white), СИТИ ТУР (white) as text decals on transparent
import { makePlateText, PLATES_COUNT, ROUTES } from './fleetdata.js';

export const PLATE_CELL = { w: 240, h: 52, cols: 2, W: 512, H: 1024 };
export const ROUTE_ROWS = ROUTES.length;
/** route atlas layout: cells of 384 x 53 px, `per` rows per column (the boards stay <= 1024 px tall for 37 routes) */
export const ROUTE_CELL = { w: 384, h: 53, per: 19, cols: Math.ceil(ROUTES.length / 19), W: 384 * Math.ceil(ROUTES.length / 19), H: 53 * 19 };

export function plateAtlas(ctx) {
  const r = ctx.rng('traffic-plates');
  return ctx.tex.draw(PLATE_CELL.W, PLATE_CELL.H, (g, W, H) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < PLATES_COUNT; i++) {
      const c = i % PLATE_CELL.cols, row = Math.floor(i / PLATE_CELL.cols), x = c * PLATE_CELL.w, y = row * PLATE_CELL.h;
      const t = makePlateText(r);
      g.fillStyle = '#f4f4f0'; ctx.tex.roundRect(g, x + 1, y + 1, PLATE_CELL.w - 2, PLATE_CELL.h - 2, 6); g.fill();
      g.lineWidth = 2.4; g.strokeStyle = '#15171a'; ctx.tex.roundRect(g, x + 3, y + 3, PLATE_CELL.w - 6, PLATE_CELL.h - 6, 5); g.stroke();
      g.fillStyle = '#15171a'; g.textBaseline = 'middle'; g.textAlign = 'left';
      ctx.tex.fitText(g, t.main, x + 12, y + PLATE_CELL.h * 0.54, PLATE_CELL.w * 0.64, 36, ctx.tex.FONTS.sans, 700);
      g.fillRect(x + PLATE_CELL.w * 0.745, y + 6, 1.6, PLATE_CELL.h - 12);                      // region block
      g.textAlign = 'center';
      ctx.tex.fitText(g, t.region, x + PLATE_CELL.w * 0.87, y + PLATE_CELL.h * 0.40, PLATE_CELL.w * 0.2, 26, ctx.tex.FONTS.sans, 700);
      ctx.tex.fitText(g, 'RUS', x + PLATE_CELL.w * 0.87, y + PLATE_CELL.h * 0.80, PLATE_CELL.w * 0.17, 11, ctx.tex.FONTS.sans, 700);
    }
  }, { key: 'pb-plates', anisotropy: 4 });
}

export function routeAtlas(ctx) {
  const C = ROUTE_CELL;
  return ctx.tex.draw(C.W, C.H, (g, W, H) => {
    g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, W, H);
    ROUTES.forEach((rt, i) => {
      const col = Math.floor(i / C.per), row = i % C.per, x0 = col * C.w, y = row * C.h;
      g.fillStyle = '#ffb21a'; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.font = `700 36px ${ctx.tex.FONTS.sans}`; g.fillText(rt.n, x0 + 8, y + 28);
      ctx.tex.fitText(g, rt.t, x0 + 84, y + 28, C.w - 94, 28, ctx.tex.FONTS.sans, 600);
      g.fillStyle = 'rgba(255,178,26,0.18)';
      for (let x = 0; x < C.w; x += 4) g.fillRect(x0 + x, y, 1, C.h);              // LED column grid
    });
  }, { key: 'pb-routes', anisotropy: 2 });
}

export function liveryAtlas(ctx) {
  return ctx.tex.draw(512, 256, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillStyle = '#1d4fa0'; ctx.tex.fitText(g, 'ПОЛИЦИЯ', W / 2, 32, W - 16, 52, ctx.tex.FONTS.sans, 800);
    g.fillStyle = '#ffffff'; ctx.tex.fitText(g, 'СКОРАЯ МЕДИЦИНСКАЯ ПОМОЩЬ', W / 2, 96, W - 16, 44, ctx.tex.FONTS.sans, 800);
    g.fillStyle = '#ffffff'; ctx.tex.fitText(g, 'СИТИ ТУР', W / 2, 160, W - 16, 56, ctx.tex.FONTS.sans, 800);
  }, { key: 'pb-livery', anisotropy: 4 });
}
