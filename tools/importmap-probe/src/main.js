import * as A from './world/a.js';
import * as D from './world/sub/deep.js';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) }); };
check('static import ../data/city.js is remapped', A.seen.city === 'north', A.seen.cityWho);
check('static import ../area.js is remapped', A.seen.area === 'north', A.seen.area);
check('static import from a deeper directory (../../data/city.js) is remapped', D.seen.city === 'north' && D.seen.area === 'north', D.seen.city + '/' + D.seen.area);
check('both importers share ONE module instance', A.seen.ns === D.seen.ns);
check('a module that is not in the map is untouched (data/metro.js)', A.seen.metro === 'strip', A.seen.metro);
const dyn = await A.dyn(); check('dynamic import(relative) is remapped', dyn.AREA === 'north', dyn.AREA);
const dynAbs = await A.dynAbsolute(); check('dynamic import(absolute URL) is remapped', dynAbs.AREA === 'north', dynAbs.AREA);
check('dynamic and static imports share the instance', dyn === A.seen.ns);
check('import.meta.resolve gives the mapped URL (informational)', A.resolved === null || /city-north\.js$/.test(A.resolved), A.resolved);
let workerSees = 'n/a';
try {
  workerSees = await new Promise((res, rej) => { const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }); w.onmessage = (e) => { res(e.data.city); w.terminate(); }; w.onerror = (e) => rej(new Error(e.message || 'worker error')); setTimeout(() => rej(new Error('worker timeout')), 4000); });
} catch (e) { workerSees = 'error: ' + e.message; }
const info = { workerSees, ua: navigator.userAgent, base: location.href, importMapSupported: typeof HTMLScriptElement !== 'undefined' && HTMLScriptElement.supports ? HTMLScriptElement.supports('importmap') : 'unknown' };
const ok = results.every((r) => r.ok || /informational/.test(r.name));
window.__probe = { ok, results, info };
document.title = (ok ? 'PASS' : 'FAIL') + ' import-map probe';
document.getElementById('out').textContent = (ok ? 'PASS' : 'FAIL') + '\n' + results.map((r) => (r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.detail ? '  [' + r.detail + ']' : '')).join('\n') + '\n\nworker sees: ' + workerSees + ' (import maps do not apply in workers)\nimport map supported: ' + info.importMapSupported + '\n' + info.ua;
document.body.className = ok ? 'pass' : 'fail';
