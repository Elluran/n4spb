// tools/yelagin-ponds-stats.mjs - build time + triangles per bridge / cell of src/world/bridges/yelaginPonds.js (headless boot, environment + bridges).  usage: YPB_BRIDGES=1 node tools/yelagin-ponds-stats.mjs
process.env.YPB_BRIDGES = '1';
const { ctx, tEnv, tBridges } = await import('./yelagin-ponds-boot.mjs');
const I = ctx.services.yelaginPonds.info;
console.log(`environment ${tEnv} ms, whole bridges module ${tBridges} ms, yelaginPonds ${I.ms} ms, ${I.tris} tris in ${I.cells} cells (${I.bridges} bridges + ${I.sluices} sluices)`);
for (const [id, b] of Object.entries(I.banks)) console.log(id.padEnd(7), String(b.type).padEnd(6), 'tris', String(b.tris).padStart(6), 'rails', String(b.rails).padStart(3), 'colliders', String(b.colliders).padStart(3), 'cell', b.cell, b.dry ? 'DRY' : '', b.rimCut !== undefined ? 'rimCut ' + b.rimCut : '');
process.exit(0);
