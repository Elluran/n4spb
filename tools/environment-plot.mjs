// tools/environment-plot.mjs - plan plot of the waterways / data for the environment module (scratch tool, canvas + headless Edge).
// usage: node tools/environment-plot.mjs --box x0,z0,x1,z1 --px 1600 --out shots/environment/plan.png [--layers water,banks,roads,bld,rects,green,piers,bridges,trees] [--dump file.json]
// Draws the baked data (RIVER polygons, the bank chains of environment/waterways.js, roads, buildings, GREEN, PIERS, BRIDGES, tree nodes) at a given box.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }
const box = (args.box || '-3020,-1420,-1200,300').split(',').map(Number);
const PX = Number(args.px || 1600);
const layers = new Set((args.layers || 'water,banks,roads,bld,rects').split(','));
const C = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
let WW = null;
if (layers.has('banks')) { try { WW = await import(pathToFileURL(path.join(root, 'src/world/environment/waterways.js')).href); } catch (e) { console.log('no waterways.js yet:', e.message.split('\n')[0]); } }
const inBox = (x, z, m = 50) => x > box[0] - m && x < box[2] + m && z > box[1] - m && z < box[3] + m;
const data = { box, PX, layers: [...layers] };
data.water = C.RIVER.flatMap((r) => r.polys.map((p) => ({ key: r.key, o: Array.from(p.o), h: p.h.map((h) => Array.from(h)) }))).filter((p) => p.o.some((v, i) => i % 2 === 0 && inBox(v, p.o[i + 1], 400)));
data.ponds = layers.has('ponds') ? C.WATER.filter((w) => !C.RIVER.some((r) => r.id === w.id)).flatMap((w) => w.polys.map((p) => ({ id: w.id, kind: w.kind, o: Array.from(p.o), h: (p.h || []).map((h) => Array.from(h)) }))).filter((p) => inBox(p.o[0], p.o[1], 300)) : [];
data.emb = layers.has('emb') ? C.EMBANKMENTS.filter((e) => inBox(e.pts[0], e.pts[1], 100)).map((e) => ({ kind: e.kind, pts: Array.from(e.pts) })) : [];
data.steps = layers.has('steps') ? C.STEPS.filter((e) => inBox(e.pts[0], e.pts[1], 100)).map((e) => Array.from(e.pts)) : [];
data.roads = layers.has('roads') ? C.ROADS.filter((r) => !r.tunnel && r.pts.some((v, i) => i % 2 === 0 && inBox(v, r.pts[i + 1]))).map((r) => ({ pts: Array.from(r.pts), hw: r.hw, w: r.w || 4 })) : [];
data.bld = layers.has('bld') ? C.BUILDINGS.filter((b) => !b.skip && b.polys.some((p) => p.o.some((v, i) => i % 2 === 0 && inBox(v, p.o[i + 1], 0)))).flatMap((b) => b.polys.map((p) => Array.from(p.o))) : [];
data.green = layers.has('green') ? C.GREEN.flatMap((g) => g.polys.filter((p) => p.o.some((v, i) => i % 2 === 0 && inBox(v, p.o[i + 1], 0))).map((p) => ({ kind: g.kind, o: Array.from(p.o) }))) : [];
data.piers = layers.has('piers') ? C.PIERS.flatMap((g) => g.polys.map((p) => ({ name: g.name, o: Array.from(p.o) }))).filter((p) => inBox(p.o[0], p.o[1])) : [];
data.bridges = layers.has('bridges') ? C.BRIDGES.filter((b) => (b.pts && b.pts.length) || (b.polys && b.polys.length)).map((b) => ({ name: b.name, kind: b.kind, pts: b.pts ? Array.from(b.pts) : [], polys: (b.polys || []).map((p) => Array.from(p.o)), w: b.w })).filter((b) => (b.pts.length ? inBox(b.pts[0], b.pts[1]) : b.polys.length && inBox(b.polys[0][0], b.polys[0][1]))) : [];
data.trees = layers.has('trees') ? C.TREES.filter((t) => inBox(t.x, t.z, 0)).map((t) => [t.x, t.z]) : [];
data.treerows = layers.has('trees') ? (C.TREE_ROWS || []).map((t) => Array.from(t.pts || [])) : [];
data.rects = layers.has('rects') ? { play: C.PLAY_RECTS, ext: C.EXTENT_RECTS } : null;
data.banks = WW && WW.debugBanks ? WW.debugBanks() : null;
data.extra = args.extra ? JSON.parse(fs.readFileSync(args.extra, 'utf8')) : [];      // --extra file.json: [{ pts: [[x, z], ...], color, name, close }] drawn on top
if (args.dump) fs.writeFileSync(args.dump, JSON.stringify(data));
const W = PX, H = Math.round(PX * (box[3] - box[1]) / (box[2] - box[0]));
const html = `<!doctype html><body style="margin:0;background:#fff"><canvas id=c width=${W} height=${H}></canvas><script>
const D=${JSON.stringify(data)};const cv=document.getElementById('c'),g=cv.getContext('2d');
const S=${W}/(D.box[2]-D.box[0]);const X=x=>(x-D.box[0])*S,Z=z=>(z-D.box[1])*S;
g.fillStyle='#f4f1ea';g.fillRect(0,0,cv.width,cv.height);
const ring=(o,close=true)=>{g.beginPath();for(let i=0;i<o.length;i+=2){const x=X(o[i]),z=Z(o[i+1]);i?g.lineTo(x,z):g.moveTo(x,z);}if(close)g.closePath();};
for(const p of D.green){ring(p.o);g.fillStyle=p.kind==='garden'||p.kind==='park'?'#cfe5b0':'#dcebc4';g.fill();}
for(const p of D.water){ring(p.o);for(const h of p.h){for(let i=0;i<h.length;i+=2){const x=X(h[i]),z=Z(h[i+1]);i?g.lineTo(x,z):g.moveTo(x,z);}g.closePath();}g.fillStyle='#9ec4ea';g.fill('evenodd');g.lineWidth=1;g.strokeStyle='#e44';g.stroke();}
for(const p of D.ponds){ring(p.o);for(const h of p.h){for(let i=0;i<h.length;i+=2){const x=X(h[i]),z=Z(h[i+1]);i?g.lineTo(x,z):g.moveTo(x,z);}g.closePath();}g.fillStyle=p.kind==='fountain'?'#7fe0e0':'#7fb0f0';g.fill('evenodd');g.lineWidth=1;g.strokeStyle='#06a';g.stroke();g.fillStyle='#024';g.font='10px sans-serif';g.fillText(p.id,X(p.o[0]),Z(p.o[1]));}
for(const r of D.roads){ring(r.pts,false);g.lineWidth=Math.max(1,(r.w||4)*S);g.strokeStyle=r.hw==='footway'||r.hw==='steps'||r.hw==='path'?'#e0d0c0':'#fff';g.lineCap='round';g.stroke();}
for(const o of D.bld){ring(o);g.fillStyle='#c9b9a8';g.fill();g.lineWidth=0.5;g.strokeStyle='#8a7a6a';g.stroke();}
for(const p of D.piers){ring(p.o);g.fillStyle='#e6a';g.fill();}
for(const e of D.emb){ring(e.pts,false);g.lineWidth=2;g.strokeStyle=e.kind==='embankment'?'#0a0':'#a50';g.setLineDash([]);g.stroke();}
for(const e of D.steps){ring(e,false);g.lineWidth=3;g.strokeStyle='#f0c000';g.stroke();}
for(const b of D.bridges){g.lineWidth=Math.max(2,(b.w||6)*S);g.strokeStyle='rgba(120,60,200,.55)';if(b.pts.length){ring(b.pts,false);g.stroke();}for(const o of b.polys){ring(o);g.fillStyle='rgba(120,60,200,.35)';g.fill();}}
g.fillStyle='#2a7a2a';for(const t of D.trees){g.fillRect(X(t[0])-1,Z(t[1])-1,3,3);}
for(const t of D.treerows){ring(t,false);g.lineWidth=2;g.strokeStyle='#2a7a2a';g.stroke();}
if(D.banks){for(const b of D.banks){ring(b.pts.flat(),false);g.lineWidth=2.5;g.strokeStyle=b.color||'#003';g.stroke();const m=b.pts[Math.floor(b.pts.length/2)];g.fillStyle='#003';g.font='12px sans-serif';g.fillText(b.name||'',X(m[0]),Z(m[1]));}}
for(const e of D.extra){ring(e.pts.flat(),!!e.close);g.lineWidth=e.w||2;g.strokeStyle=e.color||'#f0f';g.setLineDash([]);g.stroke();if(e.name){const m=e.pts[Math.floor(e.pts.length/2)];g.fillStyle=e.color||'#f0f';g.font='12px sans-serif';g.fillText(e.name,X(m[0]),Z(m[1]));}}
if(D.rects){for(const r of D.rects.ext){g.strokeStyle='#999';g.setLineDash([6,4]);g.strokeRect(X(r.x0),Z(r.z0),(r.x1-r.x0)*S,(r.z1-r.z0)*S);}for(const r of D.rects.play){g.strokeStyle='#d60';g.setLineDash([]);g.lineWidth=1.5;g.strokeRect(X(r.x0),Z(r.z0),(r.x1-r.x0)*S,(r.z1-r.z0)*S);}}
// grid ticks every 100 m
g.setLineDash([]);g.fillStyle='#000';g.font='11px sans-serif';g.strokeStyle='rgba(0,0,0,.15)';g.lineWidth=1;
const step=(D.box[2]-D.box[0])>3000?500:(D.box[2]-D.box[0])>800?100:20;
for(let x=Math.ceil(D.box[0]/step)*step;x<D.box[2];x+=step){g.beginPath();g.moveTo(X(x),0);g.lineTo(X(x),cv.height);g.stroke();g.fillText(x,X(x)+2,10);}
for(let z=Math.ceil(D.box[1]/step)*step;z<D.box[3];z+=step){g.beginPath();g.moveTo(0,Z(z));g.lineTo(cv.width,Z(z));g.stroke();g.fillText(z,2,Z(z)-2);}
window.__done=true;</script></body>`;
const tmp = path.join(root, 'shots', 'environment', '_plot.html');
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, html);
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-first-run', '--disable-extensions', '--allow-file-access-from-files'], defaultViewport: { width: W, height: H } });
const page = await browser.newPage();
await page.goto(pathToFileURL(tmp).href);
await page.waitForFunction('window.__done===true', { timeout: 60000 });
const out = path.resolve(root, args.out || 'shots/environment/plan.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out });
await browser.close();
console.log('saved', out, W + 'x' + H);
