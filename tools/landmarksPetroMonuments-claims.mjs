// tools/landmarksPetroMonuments-claims.mjs - compares the claims of landmarksPetroMonuments/groups.js with the pieces the module can draw (PIECES of every part file): every claimed id must have a piece and every piece id must
// be claimed (a claim of an undrawn object makes a hole in the city).  Also lists ids claimed by another module.  usage: node tools/landmarksPetroMonuments-claims.mjs
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const U = (p) => pathToFileURL(path.join(root, p)).href;
const { GROUPS_LIST } = await import(U('src/world/landmarksPetroMonuments/groups.js'));
const FILES = ['busts', 'men', 'men2', 'peter', 'violins', 'small', 'alexander', 'fountains'];
const piece = new Map();
for (const f of FILES) { const m = await import(U(`src/world/landmarksPetroMonuments/${f}.js`)); for (const p of m.PIECES) { if (piece.has(p.id)) console.log('DUPLICATE piece id', p.id); piece.set(p.id, f + ':' + p.key); } }
const claimed = new Set(GROUPS_LIST.flatMap((g) => [...g.ids, ...g.osm]));
let bad = 0;
for (const id of claimed) if (!piece.has(id)) { console.log('claimed but NO piece:', id); bad++; }
for (const [id, k] of piece) if (!claimed.has(id)) { console.log('piece NOT claimed:', id, k); bad++; }
const L = await import(U('src/world/layout.js'));
for (const id of claimed) { const by = L.claimedBy ? L.claimedBy(id) : null; if (by && by !== 'landmarksPetroMonuments') { console.log('claimed by ANOTHER module:', id, by); bad++; } }
console.log(`claims ${claimed.size}, pieces ${piece.size}, problems ${bad}`);
process.exit(bad ? 1 : 0);
