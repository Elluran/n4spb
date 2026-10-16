// streets/style.js - per-street choices of Saint Petersburg in one place (pavement material and width, kerb barrier, lamp family, parking, trolleybus wires).
// Sources: docs/research/streets.md (sections 2, 3, 9: Nevsky = grey granite slabs + chain bollards + two-arm flower-bowl lamps; Ligovsky / Vosstaniya square = black guard
// rails with flower boxes; side streets = small granite pavers, swan-neck lamps), nevsky.md, transport.md.
import * as L from '../layout.js';
import { inIsland } from '../lib/vo-island.js';

/** west of this x the island is modern (Gavan workers' town and the land fill: Nalichnaya, Korablestroiteley, Kruzenshterna ...): lamp family 'M' */
const MODERN_X = -6000;

export const NEVSKY = 'Невский проспект';
export const LIGOVSKY = 'Лиговский проспект';
const SLAB_STREETS = new Set([NEVSKY, 'площадь Восстания', 'Гончарная улица', 'Суворовский проспект', 'набережная реки Фонтанки', 'Аничков мост', 'Владимирский проспект', 'Литейный проспект']);
const RAIL_STREETS = new Set([LIGOVSKY, 'площадь Восстания']);

/** pavement style of a way: { walk: 'slab' | 'paver', W: nominal width (m, the strip is clipped by the facades), strip: dark granite kerb band } */
export function walkStyle(w) {
  const n = w.name || '';
  if (n === NEVSKY && w.rank >= 3) return { walk: 'slab', W: w.x && w.x[0] < -880 && w.x[w.n - 1] < -880 ? 24 : 8.5, strip: true };       // west of Sadovaya the slabs run to the facade (Gostiny Dvor promenade: 22.5 m from the kerb)
  if (SLAB_STREETS.has(n)) return { walk: 'slab', W: 7.5, strip: true };
  if (n === LIGOVSKY) return { walk: 'paver', W: 7.5, strip: false };
  if (w.rank >= 3) return { walk: 'paver', W: 7, strip: false };
  if (w.rank >= 2) return { walk: 'paver', W: 6, strip: false };
  return { walk: 'paver', W: 5.5, strip: false };
}
export const profMax = (w) => walkStyle(w).W;

/** kerb barrier at a point of a way's kerb: 'rail' (black guard rail with flower boxes) | 'chain' (bollards + chains) | null */
export function barrierAt(w, x, z) {
  const n = w.name || '';
  if (n === LIGOVSKY) return Math.hypot(x - L.SQUARE.x, z - L.SQUARE.z) < 340 ? 'rail' : null;       // the rails line the first blocks of Ligovsky (P18, P69-P72)
  if (n === 'площадь Восстания') return 'rail';
  if (n === NEVSKY && w.rank >= 3) {
    const g = L.toGrid(x, z), sq = Math.hypot(x - L.SQUARE.x, z - L.SQUARE.z);
    if (sq < 95) return 'rail';                                    // around Vosstaniya Square: rails with flower boxes (docs/research/streets.md P25, P49)
    void g;
    return 'chain';
  }
  return null;
}

/** west of the Fontanka (docs/research/west-life-furniture.md 4.1): the lamp family of the named streets
 *  S = Admiralty / Palace black swan neck with ONE globe (L3 / L4), L = black embankment / square lantern (L7), D = side-street swan neck (L10) */
const WEST_LAMPS = new Map([
  ['Адмиралтейский проспект', 'S'], ['Адмиралтейский проезд', 'S'], ['Дворцовый проезд', 'S'], ['Дворцовая набережная', 'S'], ['Адмиралтейская набережная', 'S'], ['Дворцовая площадь', 'S'],
  ['Английская набережная', 'S'], ['Университетская набережная', 'S'], ['Конногвардейский бульвар', 'S'], ['Сенатская площадь', 'S'], ['Биржевая площадь', 'S'], ['набережная Лебяжьей канавки', 'S'],
  // the Neva / Malaya Neva embankments of the Petrograd side and of Vasilievsky Island (2026-10-06): the same tall embankment standard as Dvortsovaya / Universitetskaya
  ['Петровская набережная', 'S'], ['Петроградская набережная', 'S'], ['Мытнинская набережная', 'S'], ['набережная Макарова', 'S'],
  ['набережная реки Мойки', 'L'], ['набережная канала Грибоедова', 'L'], ['набережная Зимней канавки', 'L'], ['Исаакиевская площадь', 'L'], ['Казанская площадь', 'L'], ['Конюшенная площадь', 'L'],
  ['Большая Морская улица', 'D'], ['Малая Морская улица', 'D'], ['Гороховая улица', 'D'], ['Большая Конюшенная улица', 'D'], ['Казанская улица', 'D'], ['Итальянская улица', 'D'], ['Вознесенский проспект', 'D'],
  ['Почтамтская улица', 'D'], ['Почтамтский переулок', 'D'], ['улица Якубовича', 'D'], ['Царицынский проезд', 'D'], ['Миллионная улица', 'D'], ['Малая Конюшенная улица', 'D'], ['Михайловская улица', 'D'],
  ['Инженерная улица', 'D'], ['Думская улица', 'D'], ['Перинная линия', 'D'], ['Мошков переулок', 'D'], ['Банковский переулок', 'D'], ['Конюшенный переулок', 'D'], ['Галерная улица', 'D'], ['улица Ломоносова', 'D'],
]);

/** lamp family of a way: 'A' (Nevsky pedestal lamp with a flower bowl and two globes), 'S' (Admiralty swan neck), 'L' (embankment lantern), 'D' (side-street swan neck) or null */
export function lampFamily(w) {
  const n = w.name || '';
  if (n === NEVSKY && w.rank >= 3) return 'A';
  if (n === LIGOVSKY || n === 'площадь Восстания' || n === 'Гончарная улица' || n === 'Суворовский проспект') return 'A';
  const west = WEST_LAMPS.get(n);
  if (west && w.rank >= 1) return west;
  if (w.rank >= 1 && w.n && w.x[w.n >> 1] < MODERN_X && inIsland(w.x[w.n >> 1], w.z[w.n >> 1])) return 'M';        // the modern west of Vasilievsky Island (1970s - 2020s superblocks): steel poles with cobra heads
  // the old island (Sredny, Maly, the Lines ...): the Nevsky flower-bowl pedestal lamp is Nevsky's alone; the streets get the slim swan neck 'D' (Bolshoy pr. keeps the black pedestal lamps of its boulevards)
  if (w.rank >= 3 && w.n && n !== 'Большой проспект В.О.' && inIsland(w.x[w.n >> 1], w.z[w.n >> 1])) return 'D';
  if (w.rank >= 3) return 'A';
  if (w.rank >= 1) return 'D';
  return null;
}

/** trolleybus wire layout is derived from ROADS[].trolley (wires.js); true when a way carries trolleybus routes */
export const hasTrolley = (w) => !!(w.rec && w.rec.trolley && w.rec.trolley.length);
