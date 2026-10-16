// Project-only, offline coverage atlas. Source of truth: baked OSM regions and
// the scene's claims, not a manually maintained picture. Run after data/claims.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as D from '../src/world/data/city.js';
import * as L from '../src/world/layout.js';
import { OWNS_TABLE } from '../src/world/lib/owns-table.js';
import { EAST_WATER } from '../src/world/data/east-water.js';
import { KRESTOVSKY_WATER, KRESTOVSKY_ISLAND } from '../src/world/environment/krestovsky-context.js';
import { PETRO_WATER } from '../src/world/environment/petro-water.js';
import { VO_SEA } from '../src/world/environment/vo-water.js';
import { SOUTH_PONDS } from '../src/world/environment/south-ponds.js';
import { simplify, proj, elementPolys, centroid } from './osm-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const points = f => Array.from({ length: f.length / 2 }, (_, i) => [f[2*i], f[2*i+1]]);
const coastReference=JSON.parse(fs.readFileSync(path.join(root,'docs/reference/coverage-islands-osm.json'),'utf8'));
const voReference=JSON.parse(fs.readFileSync(path.join(root,'docs/reference/vo-island-polygon.json'),'utf8'));
const voWater=JSON.parse(fs.readFileSync(path.join(root,'docs/reference/vo-water-osm.json'),'utf8'));
const petroPolys=elementPolys(coastReference.elements.find(e=>e.id===1312631));
if(petroPolys.length!==1)throw Error('Incomplete Petrogradsky island outline');
// islands round 2 (2026-10-13): the other five islands of the north-west archipelago, exact OSM outlines from docs/reference/islands2-island-polys.json
const islands2=JSON.parse(fs.readFileSync(path.join(root,'docs/reference/islands2-island-polys.json'),'utf8'));
const islands=[
 {key:'vasilievsky',name:'Васильевский остров',o:simplify(voReference.points,3),h:[]},
 {key:'petrogradsky',name:'Петроградский остров',o:simplify(petroPolys[0].o,3),h:petroPolys[0].h},
 {key:'krestovsky',name:'Крестовский остров',o:simplify(points(KRESTOVSKY_ISLAND),3),h:[]},
 ...[['yelagin','Елагин остров'],['kamenny','Каменный остров'],['aptekarsky','Аптекарский остров'],['petrovsky','Петровский остров'],['serny','Серный остров']].map(([key,name])=>({key,name,o:simplify(islands2[key][0].o,3),h:(islands2[key][0].h||[]).map(h=>simplify(h,3))})),
].map(p=>({...p,at:centroid(p.o),bounds:{x0:Math.min(...p.o.map(q=>q[0])),x1:Math.max(...p.o.map(q=>q[0])),z0:Math.min(...p.o.map(q=>q[1])),z1:Math.max(...p.o.map(q=>q[1]))}}));
const fullNevka=elementPolys(coastReference.elements.find(e=>e.id===1312674)).map(p=>p.o.flat());
const water = [...D.RIVER.filter(r=>!KRESTOVSKY_WATER.some(w=>w.name===r.name)).flatMap(r => r.polys.map(p => p.o)), ...EAST_WATER.map(p => p.o), ...KRESTOVSKY_WATER.map(p=>p.o), ...SOUTH_PONDS.flatMap(w=>w.polys.map(p=>p.o)), ...PETRO_WATER.filter(p=>p.id==='r1312629').map(p=>p.o), ...fullNevka, voWater.malayaNevaOuter.flat(),voWater.bolshayaNevaOuter.flat(),...VO_SEA.map(p=>p.o)]
  .filter(p => p?.length >= 6).map(p => simplify(points(p), 8));
const inlandWater=D.WATER.filter(w=>w.kind==='pond'||/пруд|Галерная гавань|Ковш|Шкиперский/i.test(w.name||'')).flatMap(w=>w.polys.map(p=>simplify(points(p.o),3)));
const roads = D.ROADS.filter(r => /^(primary|secondary|trunk)$/.test(r.hw) && !r.tunnel).map(r => points(r.pts));
// Visitor-facing descriptions; the source group notes retain survey/OSM detail.
const MAP_NOTES = {
  'petro-red-banner':'Восстановленная силовая станция: округлая светлая башня, кирпичные корпуса и большие фабричные окна.',
  'petro-sytny':'Исторический зал рынка с розовыми рустованными опорами, арочным входом и световым фонарём на крыше.',
  'petro-printworks':'Кирпичные корпуса Печатного двора и пятиэтажный фасад с большими наборными окнами.',
  'krestovsky-arena':'Созданы экстерьер стадиона, серебристая крыша, восемь опор с вантами, чаша и соседние корпуса. Интерьеры для посетителей пока не созданы.',
  'krestovsky-metro':'Стеклянный павильон с каменной аркадой и наружными лестницами. Этот этап посвящён наземному облику станции.',
  'krestovsky-park-details':'Начат парк: скамейки у Центральной аллеи. Дорожки, пруды, газоны и деревья следуют реальной карте.',
};
const sights = Object.entries(L.GROUPS).flatMap(([owner, groups]) => groups
  .filter(g => OWNS_TABLE[owner] === true || OWNS_TABLE[owner]?.includes?.(g.key))
  .map(g => ({ name: g.name, key: g.key, owner, at: g.at, note: MAP_NOTES[g.key] || g.note, buildings: g.ids.length })))
  .filter(g => Array.isArray(g.at) && g.at.every(Number.isFinite));
const context = [
  ['Крестовский остров',30.256,59.973],
  ['Выборгская сторона',30.365,59.972],
  ['Охта',30.423,59.950],['Ржевка',30.485,59.960],['Невский район',30.446,59.891],
  ['Кировский район',30.264,59.879],['Купчино',30.394,59.837],['Пулково',30.318,59.805],
  ['Васильевский остров',30.247,59.938],['Петроградская сторона',30.307,59.960],
  ['Невский проспект',30.351,59.933],['Обводный канал',30.364,59.910],
  ['Московский проспект',30.343,59.883],['Парк Победы',30.365,59.866],['Московская',30.355,59.852],
].map(([name, lon, lat]) => ({name, at:proj(lon,lat)}));
const payload = { regions:D.REGIONS, water, islands, inlandWater, roads, sights, context, buildings:D.BUILDINGS.length, origin:D.ORIGIN };
const html = `<!doctype html>
<html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Петербург — карта покрытия проекта</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3f1e9;color:#203630;font:15px system-ui,sans-serif}
header{padding:22px 28px 15px;border-bottom:1px solid #cdd5c9;display:flex;gap:20px;justify-content:space-between;align-items:center}
h1{font-size:24px;margin:0 0 5px;font-weight:650}p{margin:0;line-height:1.5;color:#5a6962}a{color:#23604e}
main{display:grid;grid-template-columns:1fr 310px;height:calc(100dvh - 110px);min-height:480px}
.map{position:relative;overflow:hidden;background:#e9e7de}svg{width:100%;height:100%;touch-action:none;cursor:grab}svg:active{cursor:grabbing}
aside{padding:20px;border-left:1px solid #cdd5c9;background:#faf9f4;overflow:auto}h2{font-size:17px;margin:0 0 12px}.legend{display:grid;gap:12px;margin-bottom:22px}
.swatch{display:inline-block;width:16px;height:16px;vertical-align:middle;margin-right:8px;border-radius:3px}.covered{background:#b9d2bf;border:1px solid #598a69}.detail{background:#b57c36;border-radius:50%}.empty{background:#e9e7de;border:1px dashed #8b948b}
button,input{font:inherit}button{cursor:pointer;background:#fffef9;color:#294e40;border:1px solid #b9c7b9;border-radius:7px;padding:7px 12px}button:hover,button:focus-visible{background:#e5efdf;outline:2px solid #598a69}
.toolbar{position:absolute;left:18px;top:18px;display:flex;gap:5px}.caption{position:absolute;left:18px;bottom:16px;background:#faf9f4e8;padding:8px 12px;border-radius:6px;font-size:12px;color:#58675e}
.filters{display:flex;gap:9px;flex-wrap:wrap;margin:15px 0}.filters label{display:flex;gap:5px;align-items:center;font-size:13px}.list{display:grid;gap:6px}.list button{text-align:left;font-size:13px;padding:8px}.muted{font-size:12px;color:#66746a;margin-top:15px}.info{line-height:1.55;font-size:13px;padding:14px 0;border-top:1px solid #dce1d5;min-height:90px}
.context{font-size:240px;fill:#828d83;text-anchor:middle;pointer-events:none}.region{fill:#b9d2bf;fill-opacity:.35;stroke:#688d70;stroke-width:9}.water{fill:#a9c8d2;stroke:#8aafbd;stroke-width:8}.island{fill:#d3dfc9;stroke:#376b55;stroke-width:22;cursor:pointer;fill-rule:evenodd}.island-label{font-size:235px;font-weight:600;fill:#315747;stroke:#f7f5e9;stroke-width:18;paint-order:stroke;text-anchor:middle;pointer-events:none}.road{fill:none;stroke:#faf8ed;stroke-width:22}.sight{fill:#ae762b;stroke:#fff9e8;stroke-width:9;cursor:pointer}.sight:hover,.sight:focus{fill:#794b11;stroke-width:18;outline:none}
@media(max-width:760px){header{padding:16px;display:block}header a{display:inline-block;margin-top:8px}h1{font-size:20px}main{height:auto;display:block}.map{height:65dvh;min-height:400px}aside{border-left:0;border-top:1px solid #cdd5c9}.list{grid-template-columns:1fr 1fr}}
</style>
<header><div><h1>Петербург · покрытие проекта</h1><p>Где уже можно гулять и ездить, какие места созданы вручную и куда город ещё предстоит расширить.</p></div><a href="index.html">Открыть сцену ↗</a></header>
<main><div class="map"><div class="toolbar"><button id="plus" aria-label="Приблизить">＋</button><button id="minus" aria-label="Отдалить">−</button><button id="reset">Весь проект</button><button id="focusIslands">Острова</button></div>
<svg id="atlas" viewBox="-10800 -7000 17000 18300" aria-label="Схематическая карта покрытия Санкт-Петербурга" role="img"><g id="context"></g><g id="regions"></g><g id="water"></g><g id="islands"></g><g id="inlandWater"></g><g id="roads"></g><g id="islandLabels"></g><g id="sights"></g></svg>
<div class="caption">Север ↑ · сетка 1 км · перетащите карту / используйте колесо</div></div>
<aside><h2>Что обозначено</h2><div class="legend"><span><i class="swatch covered"></i>Игровая территория с OSM-кварталами</span><span><i class="swatch detail"></i>Индивидуально созданные достопримечательности</span><span><i class="swatch empty"></i>Вне покрытия проекта</span></div>
<p id="count"></p><p class="muted">Контуры островов показывают настоящую береговую линию. Прямоугольники обозначают игровые области; зелёное покрытие не означает, что каждый дом создан вручную.</p><div id="islandList" class="filters"></div>
<div class="filters"><label><input id="showSights" type="checkbox" checked>Достопримечательности</label><label><input id="showRoads" type="checkbox" checked>Главные дороги</label></div>
<div id="info" class="info" aria-live="polite">Выберите точку достопримечательности или район.</div><h2>Области проекта</h2><div id="list" class="list"></div><p class="muted">Данные © OpenStreetMap contributors, ODbL. Карта схематическая, в координатах сцены. Автономный HTML; обновление: <code>node tools/coverage-map.mjs</code>.</p></aside></main>
<script id="data" type="application/json">${JSON.stringify(payload).replaceAll('<','\\u003c')}</script>
<script>
const D=JSON.parse(document.getElementById('data').textContent),svg=document.getElementById('atlas'),NS='http://www.w3.org/2000/svg';
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);parent.appendChild(e);return e}
const groups=Object.fromEntries(['context','regions','water','islands','inlandWater','roads','islandLabels','sights'].map(k=>[k,document.getElementById(k)]));
for(let x=-11000;x<8000;x+=1000)el('path',{d:'M'+x+' -14000V13000',stroke:'#d6d8cd','stroke-width':5},groups.context);
for(let z=-14000;z<13000;z+=1000)el('path',{d:'M-11000 '+z+'H8000',stroke:'#d6d8cd','stroke-width':5},groups.context);
for(const c of D.context)el('text',{x:c.at[0],y:c.at[1],class:'context'},groups.context).textContent=c.name;
function show(name,note){const info=document.getElementById('info');info.replaceChildren();const b=document.createElement('strong');b.textContent=name;info.append(b,document.createElement('br'),document.createTextNode(note||''))}
for(const r of D.regions){const b=r.playRect,e=el('rect',{x:b.x0,y:b.z0,width:b.x1-b.x0,height:b.z1-b.z0,class:'region'},groups.regions);el('title',{},e).textContent=r.name+' · '+r.file;e.addEventListener('click',()=>show(r.name,'Игровая область. Данные: '+r.file));const btn=document.createElement('button');btn.textContent=r.name+' · '+(r.name==='VP'?'Парк Победы':r.name==='MS'?'Московская':r.name.startsWith('MP')?'Московский проспект':r.name.startsWith('C')?'Центр до Обводного':r.name.startsWith('K')?'Крестовский остров':r.name.startsWith('V')?'Васильевский остров':r.name.startsWith('P')?'Петроградская сторона':'Центр');btn.onclick=()=>{view([b.x0-250,b.z0-250,b.x1-b.x0+500,b.z1-b.z0+500]);show(btn.textContent,r.file)};document.getElementById('list').append(btn)}
for(const p of D.water)el('polygon',{points:p.map(q=>q.join(',')).join(' '),class:'water'},groups.water);
for(const island of D.islands){const rings=[island.o,...island.h],shape=el('path',{d:rings.map(p=>'M'+p.map(q=>q.join(',')).join('L')+'Z').join(' '),class:'island','data-island':island.key},groups.islands);el('title',{},shape).textContent=island.name+' · полный контур';shape.onclick=()=>show(island.name,'Полная береговая линия острова. Игровые области показаны отдельно прямоугольниками.');el('text',{x:island.at[0],y:island.at[1],class:'island-label'},groups.islandLabels).textContent=island.name;const b=document.createElement('button');b.textContent=island.name;b.onclick=()=>{const r=island.bounds;view([r.x0-400,r.z0-400,r.x1-r.x0+800,r.z1-r.z0+800]);shape.onclick()};document.getElementById('islandList').append(b)}
for(const p of D.inlandWater)el('polygon',{points:p.map(q=>q.join(',')).join(' '),class:'water'},groups.inlandWater);
for(const p of D.roads)el('polyline',{points:p.map(q=>q.join(',')).join(' '),class:'road'},groups.roads);
for(const s of D.sights){const e=el('circle',{cx:s.at[0],cy:s.at[1],r:43,class:'sight',tabindex:0,role:'button','aria-label':s.name},groups.sights);el('title',{},e).textContent=s.name;e.onclick=()=>show(s.name,s.note||'');e.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();e.onclick()}}}
document.getElementById('count').textContent=D.regions.length+' областей · '+D.sights.length+' групп достопримечательностей · '+D.buildings.toLocaleString('ru')+' зданий и частей.';
let box=[-10800,-7000,17000,18300];function view(b){box=b;svg.setAttribute('viewBox',b.join(' '))}function zoom(k){view([box[0]+box[2]*(1-k)/2,box[1]+box[3]*(1-k)/2,Math.max(250,box[2]*k),Math.max(250,box[3]*k)])}
document.getElementById('plus').onclick=()=>zoom(.7);document.getElementById('minus').onclick=()=>zoom(1.4);document.getElementById('reset').onclick=()=>view([-10800,-7000,17000,18300]);
document.getElementById('focusIslands').onclick=()=>view([-10100,-6000,9700,8000]);if(location.hash==='#islands')document.getElementById('focusIslands').click();
svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.12:.88)},{passive:false});let drag=null;
svg.onpointerdown=e=>{if(e.target.classList.contains('sight'))return;drag={x:e.clientX,y:e.clientY,box:box.slice()};svg.setPointerCapture(e.pointerId)};
svg.onpointermove=e=>{if(!drag)return;const m=svg.getScreenCTM().inverse(),a=new DOMPoint(drag.x,drag.y).matrixTransform(m),b=new DOMPoint(e.clientX,e.clientY).matrixTransform(m);view([drag.box[0]+a.x-b.x,drag.box[1]+a.y-b.y,drag.box[2],drag.box[3]])};svg.onpointerup=svg.onpointercancel=()=>drag=null;
for(const [control,group]of [['showSights','sights'],['showRoads','roads']])document.getElementById(control).onchange=e=>groups[group].style.display=e.target.checked?'':'none';
</script></html>`;
new vm.Script(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1], { filename: 'coverage-inline.js' });
fs.writeFileSync(path.join(root, 'coverage.html'), html);
console.log(`coverage.html: ${D.REGIONS.length} regions, ${sights.length} authored groups, ${(Buffer.byteLength(html)/1024).toFixed(0)} KiB`);
