// tools/bridges-krestovsky-aptekarsky-boxes.mjs - headless: lists the collider boxes near points with their axis angle. usage: node tools/bridges-krestovsky-aptekarsky-boxes.mjs "x,z,r;x,z,r"
import { makeEnv } from './bridges-krestovsky-aptekarsky-env.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ctx } = await makeEnv(['environment', 'bridges']);
const bm = await import(pathToFileURL(path.join(root, 'src/world/bridges.js')).href); await bm.build(ctx);
for (const sp of process.argv[2].split(';')) { const [x, z, r] = sp.split(',').map(Number); console.log('--- items near', x, z, r); for (const it of ctx.physics._query(x, z, r || 3)) console.log(' ', it.type, 'y', it.y0, it.y1 ?? it.top, 'c', it.cx.toFixed(1), it.cz.toFixed(1), it.type === 'cyl' ? 'r ' + it.r : 'hw ' + it.hw.toFixed(1) + ' hd ' + it.hd.toFixed(2) + ' dir deg ' + (Math.atan2(-it.s, it.c) * 180 / Math.PI).toFixed(0)); }
process.exit(0);
