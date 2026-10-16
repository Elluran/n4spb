// Offline desktop/mobile interaction check for the generated project atlas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('../',import.meta.url));
const exe=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
// Pure 2D UI check; keep it off the GPU used by city baking/benchmarks.
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:['--disable-gpu'],defaultViewport:{width:1280,height:900}});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setOfflineMode(true);
 await page.goto(pathToFileURL(path.join(root,'coverage.html')).href);
 const count=await page.$eval('#count',e=>e.textContent);assert(new RegExp('^76 ').test(count)&&new RegExp('[0-9]+ групп').test(count),count);   // 57 regions + the 19 of the islands round 2 (YE1..PE6); the number of authored sight groups grows with every sight module
 const initial=await page.$eval('#atlas',e=>e.getAttribute('viewBox'));await page.click('#plus');assert.notEqual(await page.$eval('#atlas',e=>e.getAttribute('viewBox')),initial);
 assert.equal(await page.$$eval('[data-island]',e=>e.length),8,'Missing exact island outlines');
 for(const n of ['Елагин остров','Каменный остров','Аптекарский остров','Петровский остров','Серный остров']){const b=(await page.$$('#islandList button'));const t=await Promise.all(b.map(e=>e.evaluate(x=>x.textContent)));const i=t.indexOf(n);assert(i>=0,'No button '+n);await b[i].click();assert((await page.$eval('#info',e=>e.textContent)).includes(n),'Info '+n);}
 await page.click('#focusIslands');assert.equal(await page.$eval('#atlas',e=>e.getAttribute('viewBox')),'-10100 -6000 9700 8000');
 fs.mkdirSync(path.join(root,'shots/islands-2026'),{recursive:true});await page.screenshot({path:path.join(root,'shots/islands-2026/coverage-islands-desktop.png')});
 await page.click('#reset');assert.equal(await page.$eval('#atlas',e=>e.getAttribute('viewBox')),initial);
 const k=await page.$$('#list button');const labels=await Promise.all(k.map(e=>e.evaluate(n=>n.textContent)));const i=labels.findIndex(t=>t.startsWith('K1'));
 assert(i>=0&&labels[i].includes('Крестовский'));await k[i].click();assert((await page.$eval('#info',e=>e.textContent)).includes('Крестовский'));
 await page.click('#showRoads');assert.equal(await page.$eval('#roads',e=>e.style.display),'none');await page.click('#showRoads');
 await page.click('#reset');await page.$eval('[aria-label="Метро «Крестовский остров»: павильон"]',e=>e.focus());await page.keyboard.press('Enter');assert((await page.$eval('#info',e=>e.textContent)).includes('Крестовский'));
 await page.setViewport({width:390,height:844});await page.click('#focusIslands');assert(await page.$eval('body',e=>e.scrollWidth<=innerWidth),'Mobile horizontal overflow');
 fs.mkdirSync(path.join(root,'shots/islands-2026'),{recursive:true});await page.screenshot({path:path.join(root,'shots/islands-2026/coverage-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('RESULT: OK (offline counts, Krestovsky region, zoom/reset, layer toggle, sight keyboard, mobile layout)');
}finally{await browser.close();}
