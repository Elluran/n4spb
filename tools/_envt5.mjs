import { env, ctx, L } from './environment-harness.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..');
for (const m of ['streets', 'city', 'metro', 'props']) {
  try { const t0 = Date.now(); const mm = await import(pathToFileURL(path.join(root, `src/world/${m}.js`)).href); await mm.build(ctx); console.log('built', m, Date.now() - t0, 'ms'); } catch (e) { console.log('FAIL', m, e.message.slice(0, 160)); }
}
for (const f of ctx._updates) f(0.05, 1);
const ent = ctx.services.metro && ctx.services.metro.entrances || [];
const pits = ent.filter((e) => e.kind === 'pit');
console.log('entrances', ent.length, 'pits', pits.length, JSON.stringify(pits.slice(0, 5).map((p) => [p.id, Math.round(p.x), Math.round(p.z)])));
const S = ctx.services;
const check = (name, list) => { if (!list) return; let n = 0, ex = []; for (const q of list) for (const p of pits) { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < 2.0) { n++; if (ex.length < 4) ex.push([Math.round(q.x*10)/10, Math.round(q.z*10)/10, Math.round(d*10)/10]); } } console.log(name, list.length, 'within 2 m of a pit:', n, JSON.stringify(ex)); };
check('env.trees', env.trees);
check('streets.lamps', S.streets && S.streets.lamps); check('streets.stops', S.streets && (S.streets.stops || S.streets.busStops)); check('streets.signals', S.streets && S.streets.signals);
check('props.benches', S.props && S.props.benches); check('props.lamps', S.props && S.props.lamps); check('props.bins', S.props && S.props.bins);
console.log('props keys', S.props && Object.keys(S.props).join(','));
for (const k of Object.keys(S.props)) if (Array.isArray(S.props[k]) && S.props[k][0] && Number.isFinite(S.props[k][0].x)) check('props.' + k, S.props[k]);
for (const k of ['city', 'landmarksE']) if (S[k]) for (const kk of Object.keys(S[k])) if (Array.isArray(S[k][kk]) && S[k][kk][0] && Number.isFinite(S[k][kk][0].x)) check(k + '.' + kk, S[k][kk]);
