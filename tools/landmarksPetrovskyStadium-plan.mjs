// landmarksPetrovskyStadium-plan.mjs - plan view (SVG -> PNG with headless Edge, no GPU) of the stadium area: island outline, WATER, pitches / tracks, building footprints, masts.  usage: node tools/landmarksPetrovskyStadium-plan.mjs x0 x1 z0 z1 px/m out.png
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
const root='D:/git2/agi-fun-tests/102_3d_piter/';
const D = await import(pathToFileURL(root+'src/world/data/city.js').href);
const isl = JSON.parse(fs.readFileSync(root+'docs/reference/islands2-island-polys.json','utf8'));
const [x0,x1,z0,z1,sc,out] = [Number(process.argv[2]),Number(process.argv[3]),Number(process.argv[4]),Number(process.argv[5]),Number(process.argv[6]),process.argv[7]];
const W=Math.round((x1-x0)*sc),H=Math.round((z1-z0)*sc);
const tx=x=>((x-x0)*sc).toFixed(1), tz=z=>((z-z0)*sc).toFixed(1);
const path=(o,close=true)=>{let s='M';for(let i=0;i<o.length;i+=2)s+=tx(o[i])+','+tz(o[i+1])+'L';return s.slice(0,-1)+(close?'Z':'');};
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#9cc2dc;font:10px sans-serif">`;
for(let gx=Math.ceil(x0/50)*50;gx<x1;gx+=50) svg+=`<line x1="${tx(gx)}" y1="0" x2="${tx(gx)}" y2="${H}" stroke="#fff" stroke-opacity=".35"/><text x="${tx(gx)}" y="10">${gx}</text>`;
for(let gz=Math.ceil(z0/50)*50;gz<z1;gz+=50) svg+=`<line x1="0" y1="${tz(gz)}" x2="${W}" y2="${tz(gz)}" stroke="#fff" stroke-opacity=".35"/><text x="2" y="${tz(gz)-2}">${gz}</text>`;
for(const p of isl.petrovsky) svg+=`<path d="${path(p.o.flat())}" fill="#d9e6c0" stroke="#365"/>`;
for(const w of D.WATER) for(const q of w.polys) svg+=`<path d="${path(q.o)}" fill="#7fb0d0" fill-opacity=".6" stroke="#237"/>`;
for(const r of D.ROADS){ if(!r.pts&&!r.o) continue; }
for(const g of D.PITCHES) for(const q of g.polys) svg+=`<path d="${path(q.o)}" fill="${g.kind==='track'?'#c66':g.kind==='pitch'?'#6c6':'#ddd'}" fill-opacity=".5" stroke="#400" stroke-width=".7"/><text x="${tx(g.x)}" y="${tz(g.z)}" fill="#400">${g.id}</text>`;
const inb=(flat)=>{for(let i=0;i<flat.length;i+=2)if(flat[i]>x0&&flat[i]<x1&&flat[i+1]>z0&&flat[i+1]<z1)return true;return false;};
for(const b of D.BUILDINGS) if(b.polys.some(p=>inb(p.o))) for(const q of b.polys){svg+=`<path d="${path(q.o)}${q.h.map(h=>path(h)).join('')}" fill="#ccc" fill-opacity=".7" fill-rule="evenodd" stroke="#333" stroke-width=".7"/>`; const o=q.o; svg+=`<text x="${tx(o[0])}" y="${tz(o[1])}" fill="#222" font-size="9">${b.id}</text>`;}
for(const [x,z,n] of [[-3530.5,-2189.9,'M0'],[-3656.5,-2279.1,'M1'],[-3744.1,-2160.0,'M2'],[-3617.5,-2067.5,'M3'],[-3850,-2333,'m4'],[-3869,-2187,'m5'],[-3786,-2240,'m6'],[-3705,-2380,'chim']]) svg+=`<circle cx="${tx(x)}" cy="${tz(z)}" r="4" fill="#f0c"/><text x="${tx(x)}" y="${tz(z)}" fill="#a06">${n}</text>`;
svg+='</svg>';
const exe=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const b=await puppeteer.launch({executablePath:exe,headless:true,args:['--disable-gpu'],defaultViewport:{width:W,height:H}});
const pg=await b.newPage();await pg.setContent('<body style="margin:0">'+svg);await pg.screenshot({path:out});await b.close();console.log('wrote',out,W,H);
