// The acceptance overlay of the Tauride Garden remake: a plan raster of the MODEL (water, path centrelines, canopy polygons) at 0.5 m per pixel laid over a USER-SUPPLIED aerial image, and the three
// acceptance metrics of the plan. NO imagery is bundled: the third-party Yandex screenshot of the strip (docs/reference/yandex-center.png, which the old overlay.mjs of the source repository was
// hard-wired to) is of no use here, and no orthophoto of the garden is in the repository. The user supplies ONE screenshot of the garden (a PNG, north up, any satellite / map viewer) and two
// points that are known in both the picture and the world (or the world coordinates of two corners).
//   node tools/tauride-overlay.mjs <aerial.png> (--geo x0,z0,x1,z1 | --ref1 u,v,x,z --ref2 u,v,x,z) [options]
//   node tools/tauride-overlay.mjs --selftest                 synthetic images generated from the data itself (needs no image): the metrics must come out perfect
// GEOREFERENCING (north up, uniform scale, no rotation): --geo = the world coordinates (x east, z SOUTH, metres, the frame of the project) of the TOP-LEFT and BOTTOM-RIGHT corners of the image;
//   or two reference points: pixel (u, v) of the picture = world (x, z), twice (--ref1 / --ref2). Pixel (u, v): u to the right, v down, the centre of the top-left pixel is (0, 0).
// METRICS (thresholds of the plan, section 5 "Acceptance"; each runs only when its input is given, else it says what it needs):
//   water IoU          model water (the union outline of src/world/landmarksTauride/data/water.js) vs the water in the image: --water-mask <png, same size as the aerial, white = water; traced by the user
//                      or exported from an editor) or --water-color r,g,b [--water-tol 40] (colour segmentation of the aerial).  >= 0.90. Also the best shift (+-6 cells) as a registration check.
//   path P90           the 90th percentile of the distance from the model's way centrelines (every metre, non-bridge ways) to the nearest path pixel of the image: --path-mask or --path-color r,g,b
//                      [--path-tol 30].  <= 3 m. (Against the OSM-built model this is only meaningful for a path mask made from the IMAGE; the model ways ARE the OSM ways.)
//   canopy per quadrant the share of canopy in each quadrant (NW NE SW SE of the garden box) in the image (--canopy-mask or --canopy-color r,g,b [--canopy-tol 40]) vs the model canopy polygons.
//                      Each quadrant within +-10 percentage points.
// MODEL: by default the data modules (water union, the 120 ways with their class width, the 23 wood polygons as the canopy proxy); --model-json <file> overrides any of
//   { "water": [{ "o": [..], "h": [[..]] }], "paths": [{ "pts": [..], "w": 2.4 }], "canopy": [{ "o": [..], "h": [] }] } (the garden team's own terrain / vegetation zones).
// OUTPUT (--out, default shots/tauride/overlay; shots/ is git-ignored): <out>-overlay.png (aerial with the model drawn over it), <out>-model.png, <out>-water.png (green = both, red = model only,
//   blue = image only), <out>.json (the numbers). Exit 0 = every metric that ran passed; 1 = one failed; 2 = usage; 3 = nothing could be measured (no mask / colour given).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, DATA_DIR, parseArgs, loadFacade, writeText, bbox, polyLen, rel } from './tauride/lib/common.mjs';
import { decodeImage, encodePng } from './tauride/lib/png.mjs';
import { makeGrid, fillPolys, strokePolyline, distanceTo, iou, bestShift, percentile, quadrantFractions } from './tauride/lib/raster.mjs';

const args = parseArgs();
const THRESH = { waterIoU: 0.9, pathP90: 3, canopyPoints: 10 };

// ---------------------------------------------------------------- the model
async function loadModel(file) {
  const imp = (n) => import(pathToFileURL(path.join(DATA_DIR, n + '.js')).href);
  const [W, P, Fo] = await Promise.all([imp('water'), imp('paths'), imp('footprints')]);
  const F = await loadFacade(), green = new Map(F.GREEN.map((g) => [g.id, g]));
  const model = {
    water: W.WATER_UNION,
    paths: P.PATHS.map((p) => ({ id: p.id, pts: p.pts, w: p.w, bridge: !!p.bridge })),
    canopy: Fo.GARDEN_GREEN.woods.flatMap((w) => green.get(w.id).polys),
    garden: Fo.GARDEN,
  };
  if (file) { const j = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8')); for (const k of ['water', 'paths', 'canopy']) if (j[k]) model[k] = j[k]; }
  return model;
}
function modelRasters(model, g) {
  const water = fillPolys(g, model.water), canopy = fillPolys(g, model.canopy), pathMask = new Uint8Array(g.w * g.h);
  for (const p of model.paths) strokePolyline(g, p.pts, p.w || 2.4, pathMask);
  const centre = new Uint8Array(g.w * g.h);
  for (const p of model.paths) strokePolyline(g, p.pts, g.res * 1.5, centre);
  return { water, canopy, pathMask, centre };
}
/** points every metre along the non-bridge ways (the samples of the P90) */
function centreSamples(model) {
  const out = [];
  for (const p of model.paths) { if (p.bridge) continue; for (let i = 0; i + 3 < p.pts.length; i += 2) { const L = Math.hypot(p.pts[i + 2] - p.pts[i], p.pts[i + 3] - p.pts[i + 1]); for (let t = 0; t < L; t += 1) out.push([p.pts[i] + (p.pts[i + 2] - p.pts[i]) * t / (L || 1), p.pts[i + 1] + (p.pts[i + 3] - p.pts[i + 1]) * t / (L || 1)]); } }
  return out;
}

// ---------------------------------------------------------------- the image on the grid
/** the world <-> pixel map of an image from --geo or two reference points */
export function parseGeo(a, w, h) {
  if (a.geo) {
    const [x0, z0, x1, z1] = String(a.geo).split(',').map(Number);
    if (![x0, z0, x1, z1].every(Number.isFinite) || x1 === x0 || z1 === z0) throw new Error('--geo needs x0,z0,x1,z1 (top-left and bottom-right corner in world metres)');
    return { x0, z0, mx: (x1 - x0) / w, mz: (z1 - z0) / h };
  }
  if (a.ref1 && a.ref2) {
    const [u1, v1, x1, z1] = String(a.ref1).split(',').map(Number), [u2, v2, x2, z2] = String(a.ref2).split(',').map(Number);
    if (![u1, v1, x1, z1, u2, v2, x2, z2].every(Number.isFinite) || u1 === u2 || v1 === v2) throw new Error('--ref1 / --ref2 need u,v,x,z each, with different u and different v');
    const mx = (x2 - x1) / (u2 - u1), mz = (z2 - z1) / (v2 - v1);
    if (Math.abs(Math.abs(mx) / Math.abs(mz) - 1) > 0.03) console.warn(`warning: the two reference points give ${Math.abs(mx).toFixed(3)} m/px in x and ${Math.abs(mz).toFixed(3)} m/px in z: the picture is not uniformly scaled (rotated, or a perspective view)`);
    return { x0: x1 - (u1 + 0.5) * mx, z0: z1 - (v1 + 0.5) * mz, mx, mz };
  }
  throw new Error('give the georeference: --geo x0,z0,x1,z1 or --ref1 u,v,x,z --ref2 u,v,x,z');
}
/** the image resampled (nearest pixel) onto the grid: { rgb: Uint8Array(3 n), valid } */
function sampleToGrid(img, geo, g) {
  const rgb = new Uint8Array(g.w * g.h * 3), valid = new Uint8Array(g.w * g.h);
  for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
    const u = Math.floor((g.cx(i) - geo.x0) / geo.mx), v = Math.floor((g.cz(j) - geo.z0) / geo.mz);
    if (u < 0 || v < 0 || u >= img.w || v >= img.h) continue;
    const o = (v * img.w + u) * 4, k = j * g.w + i;
    if (img.data[o + 3] < 8) continue;
    rgb[k * 3] = img.data[o]; rgb[k * 3 + 1] = img.data[o + 1]; rgb[k * 3 + 2] = img.data[o + 2]; valid[k] = 1;
  }
  return { rgb, valid };
}
const classify = (s, g, color, tol) => { const m = new Uint8Array(g.w * g.h); for (let k = 0; k < m.length; k++) if (s.valid[k]) { const dr = s.rgb[k * 3] - color[0], dg = s.rgb[k * 3 + 1] - color[1], db = s.rgb[k * 3 + 2] - color[2]; if (dr * dr + dg * dg + db * db <= tol * tol) m[k] = 1; } return m; };
const maskFromImage = (s) => { const m = new Uint8Array(s.valid.length); for (let k = 0; k < m.length; k++) if (s.valid[k] && (s.rgb[k * 3] + s.rgb[k * 3 + 1] + s.rgb[k * 3 + 2]) / 3 > 127) m[k] = 1; return m; };
const parseColor = (v) => { const c = String(v).split(',').map(Number); if (c.length !== 3 || c.some((q) => !Number.isFinite(q))) throw new Error(`a colour is r,g,b (got ${v})`); return c; };

// ---------------------------------------------------------------- the evaluation
/**
 * inputs: { model, grid, aerial: sampled { rgb, valid }, masks: { water?, path?, canopy? } (Uint8Array on the grid, from a mask image or a colour) } -> { metrics, rasters }
 */
export function evaluate({ model, grid: g, valid, masks, shiftCells = 6, modelCanopy = null }) {
  const R = modelRasters(model, g); if (modelCanopy) R.canopy = modelCanopy;
  const out = { metrics: {}, thresholds: THRESH }, cellsValid = valid.reduce((s, v) => s + v, 0);
  out.coverage = { cells: g.w * g.h, valid: cellsValid, areaM2: Math.round(cellsValid * g.res * g.res) };
  const gb = bbox(model.garden.o);
  // keep the metrics to the garden outline (+ 5 m): the image outside it is the city
  const inside = fillPolys(g, [{ o: model.garden.o, h: model.garden.h || [] }]); const near = distanceTo(g, inside); const evalMask = new Uint8Array(g.w * g.h); for (let k = 0; k < evalMask.length; k++) evalMask[k] = valid[k] && near[k] <= 5 ? 1 : 0;
  if (masks.water) {
    const r0 = iou(g, R.water, masks.water, evalMask, 0, 0), b = bestShift(g, R.water, masks.water, evalMask, shiftCells);
    out.metrics.waterIoU = { value: +r0.iou.toFixed(4), pass: r0.iou >= THRESH.waterIoU, bestShift: { dxM: b.dx * g.res, dzM: b.dy * g.res, iou: +b.iou.toFixed(4) }, modelM2: Math.round(R.water.reduce((s, v, k) => s + (v && evalMask[k] ? 1 : 0), 0) * g.res * g.res), imageM2: Math.round(masks.water.reduce((s, v, k) => s + (v && evalMask[k] ? 1 : 0), 0) * g.res * g.res) };
  }
  if (masks.path) {
    const d = distanceTo(g, masks.path), offs = [];
    for (const [x, z] of centreSamples(model)) { const i = Math.floor((x - g.x0) / g.res), j = Math.floor((z - g.z0) / g.res); if (i < 0 || j < 0 || i >= g.w || j >= g.h || !evalMask[j * g.w + i]) continue; offs.push(d[j * g.w + i]); }
    const fin = offs.filter(Number.isFinite), p90 = offs.length ? percentile(offs.map((v) => (Number.isFinite(v) ? v : 1e6)), 0.9) : NaN;
    // the guard against a mask that covers everything (it would pass the P90 trivially): the share of image path pixels that lie within 3 m of a model way must be at least 0.5
    const dm = distanceTo(g, R.centre); let np = 0, near3 = 0; for (let k = 0; k < masks.path.length; k++) if (masks.path[k] && evalMask[k]) { np++; if (dm[k] <= 3) near3++; }
    const precision = np ? near3 / np : 0;
    out.metrics.pathP90 = { value: Number.isFinite(p90) ? +p90.toFixed(2) : null, pass: Number.isFinite(p90) && p90 <= THRESH.pathP90 && precision >= 0.5, precision3m: +precision.toFixed(3), samples: offs.length, p50: fin.length ? +percentile(fin, 0.5).toFixed(2) : null, within3m: offs.length ? +(offs.filter((v) => v <= 3).length / offs.length).toFixed(3) : null };
  }
  if (masks.canopy) {
    const qm = quadrantFractions(g, R.canopy, evalMask, gb), qi = quadrantFractions(g, masks.canopy, evalMask, gb), rows = {};
    let ok = true; for (const q of ['NW', 'NE', 'SW', 'SE']) { const diff = (qi[q] - qm[q]) * 100; rows[q] = { model: +(qm[q] * 100).toFixed(1), image: +(qi[q] * 100).toFixed(1), diffPoints: +diff.toFixed(1) }; if (!(Math.abs(diff) <= THRESH.canopyPoints)) ok = false; }
    out.metrics.canopy = { pass: ok, quadrants: rows };
  }
  return { ...out, rasters: R, evalMask };
}

// ---------------------------------------------------------------- the pictures
function paint(g, layers) {
  const out = new Uint8Array(g.w * g.h * 4);
  for (let k = 0; k < g.w * g.h; k++) { out[k * 4] = out[k * 4 + 1] = out[k * 4 + 2] = 235; out[k * 4 + 3] = 255; }
  for (const { mask, color, alpha } of layers) for (let k = 0; k < mask.length; k++) if (mask[k]) for (let c = 0; c < 3; c++) out[k * 4 + c] = Math.round(out[k * 4 + c] * (1 - alpha) + color[c] * alpha);
  return out;
}
const outlineOf = (g, m) => { const o = new Uint8Array(m.length); for (let j = 1; j < g.h - 1; j++) for (let i = 1; i < g.w - 1; i++) { const k = j * g.w + i; if (m[k] && (!m[k - 1] || !m[k + 1] || !m[k - g.w] || !m[k + g.w])) o[k] = 1; } return o; };
function writePictures(prefix, g, res, aerial, masks) {
  const R = res.rasters, base = new Uint8Array(g.w * g.h * 4);
  for (let k = 0; k < g.w * g.h; k++) { const ok = aerial.valid[k]; base[k * 4] = ok ? aerial.rgb[k * 3] : 60; base[k * 4 + 1] = ok ? aerial.rgb[k * 3 + 1] : 60; base[k * 4 + 2] = ok ? aerial.rgb[k * 3 + 2] : 60; base[k * 4 + 3] = 255; }
  const over = (arr, mask, color, a) => { for (let k = 0; k < mask.length; k++) if (mask[k]) for (let c = 0; c < 3; c++) arr[k * 4 + c] = Math.round(arr[k * 4 + c] * (1 - a) + color[c] * a); };
  over(base, R.water, [40, 110, 255], 0.35); over(base, outlineOf(g, R.water), [0, 60, 200], 1); over(base, outlineOf(g, R.canopy), [0, 170, 40], 0.9); over(base, R.centre, [255, 230, 0], 1);
  const w = (n, buf) => { fs.mkdirSync(path.dirname(prefix), { recursive: true }); fs.writeFileSync(`${prefix}-${n}.png`, encodePng(g.w, g.h, buf)); };
  w('overlay', base);
  w('model', paint(g, [{ mask: R.canopy, color: [60, 160, 60], alpha: 0.5 }, { mask: R.water, color: [60, 120, 255], alpha: 0.8 }, { mask: R.pathMask, color: [200, 140, 60], alpha: 1 }]));
  if (masks.water) { const d = new Uint8Array(g.w * g.h * 4); for (let k = 0; k < g.w * g.h; k++) { const a = R.water[k], b = masks.water[k]; const c = a && b ? [40, 180, 60] : a ? [220, 50, 50] : b ? [50, 80, 230] : [235, 235, 235]; d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = 255; } w('water', d); }
}
function report(res, prefix) {
  const M = res.metrics, lines = [];
  lines.push(`evaluated ${res.coverage.areaM2} m2 of the image on the model grid (${res.coverage.valid} of ${res.coverage.cells} cells)`);
  const need = [];
  if (M.waterIoU) lines.push(`water IoU      ${M.waterIoU.value}  (>= ${THRESH.waterIoU})  ${M.waterIoU.pass ? 'PASS' : 'FAIL'}   model ${M.waterIoU.modelM2} m2, image ${M.waterIoU.imageM2} m2; registration: the image content sits ${M.waterIoU.bestShift.dxM} m east and ${M.waterIoU.bestShift.dzM} m south of the model (best IoU ${M.waterIoU.bestShift.iou} at that offset)`); else need.push('water IoU: needs --water-mask <png> or --water-color r,g,b');
  if (M.pathP90) lines.push(`path P90       ${M.pathP90.value} m  (<= ${THRESH.pathP90} m)  ${M.pathP90.pass ? 'PASS' : 'FAIL'}   median ${M.pathP90.p50} m, ${(M.pathP90.within3m * 100).toFixed(0)} % of ${M.pathP90.samples} samples within 3 m; ${(M.pathP90.precision3m * 100).toFixed(0)} % of the image path pixels lie within 3 m of a model way (must be >= 50 %, else the mask is too full to mean anything)`); else need.push('path P90: needs --path-mask <png> or --path-color r,g,b');
  if (M.canopy) { lines.push(`canopy         ${M.canopy.pass ? 'PASS' : 'FAIL'}  (each quadrant within +-${THRESH.canopyPoints} points)   ` + Object.entries(M.canopy.quadrants).map(([q, r]) => `${q} model ${r.model} % image ${r.image} % (${r.diffPoints >= 0 ? '+' : ''}${r.diffPoints})`).join('; ')); } else need.push('canopy: needs --canopy-mask <png> or --canopy-color r,g,b');
  for (const n of need) lines.push('NOT RUN        ' + n);
  return { lines, ran: Object.keys(M).length, failed: Object.values(M).filter((m) => !m.pass).length };
}

// ---------------------------------------------------------------- the self-test: synthetic images made from the data
async function selftest() {
  const model = await loadModel(null), gb = bbox(model.garden.o), box = { x0: gb.x0 - 10, x1: gb.x1 + 10, z0: gb.z0 - 10, z1: gb.z1 + 10 };
  const COL = { bg: [205, 195, 165], water: [30, 70, 200], path: [250, 210, 60], canopy: [25, 120, 30] };
  const g = makeGrid(box, args.res ? Number(args.res) : 0.5);
  let fails = 0; const check = (ok, name, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`); };
  const maskPng = (m, gg) => { const d = new Uint8Array(gg.w * gg.h * 4); for (let k = 0; k < m.length; k++) { const v = m[k] ? 255 : 0; d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = v; d[k * 4 + 3] = 255; } return { w: gg.w, h: gg.h, data: d }; };
  const R = modelRasters(model, g);
  // A. exact masks on the model grid: everything must be perfect
  const geoA = { x0: g.x0, z0: g.z0, mx: g.res, mz: g.res };
  const sa = (m) => maskFromImage(sampleToGrid(maskPng(m, g), geoA, g));
  const valid = new Uint8Array(g.w * g.h).fill(1);
  let r = evaluate({ model, grid: g, valid, masks: { water: sa(R.water), path: sa(R.centre), canopy: sa(R.canopy) } });
  console.log('A. masks exported from the model (the image == the model):'); report(r).lines.forEach((l) => console.log('   ' + l));
  check(r.metrics.waterIoU.value === 1 && r.metrics.pathP90.value === 0 && r.metrics.canopy.pass && Object.values(r.metrics.canopy.quadrants).every((q) => q.diffPoints === 0), 'A: IoU 1.0, P90 0 m, canopy diff 0 points in every quadrant');
  // B. a composite aerial at 0.75 m/px with another origin, colour segmentation (resampling + overlap errors only)
  const gB = makeGrid({ x0: box.x0 - 40, x1: box.x1 + 25, z0: box.z0 - 17, z1: box.z1 + 31 }, 0.75), RB = modelRasters(model, gB);
  const imgB = { w: gB.w, h: gB.h, data: new Uint8Array(gB.w * gB.h * 4) };
  for (let k = 0; k < gB.w * gB.h; k++) { const c = RB.water[k] ? COL.water : RB.pathMask[k] ? COL.path : RB.canopy[k] ? COL.canopy : COL.bg; imgB.data.set([c[0], c[1], c[2], 255], k * 4); }
  const pngB = path.join(ROOT, 'tools/tauride/raw/selftest-aerial.png'); fs.mkdirSync(path.dirname(pngB), { recursive: true }); fs.writeFileSync(pngB, encodePng(imgB.w, imgB.h, imgB.data));
  const back = decodeImage(fs.readFileSync(pngB)); check(back.w === imgB.w && back.h === imgB.h && Buffer.from(back.data).equals(Buffer.from(imgB.data)), 'the PNG writer and reader round-trip an image', `${back.w} x ${back.h}`);
  const geoB = parseGeo({ geo: [gB.x0, gB.z0, gB.x0 + gB.w * gB.res, gB.z0 + gB.h * gB.res].join(',') }, back.w, back.h), sB = sampleToGrid(back, geoB, g);
  r = evaluate({ model, grid: g, valid: sB.valid, masks: { water: classify(sB, g, COL.water, 30), path: classify(sB, g, COL.path, 30), canopy: classify(sB, g, COL.canopy, 30) } });
  console.log('B. synthetic aerial, 0.75 m/px, shifted origin, colour segmentation (water drawn over the bridges, canopy under the paths):'); report(r).lines.forEach((l) => console.log('   ' + l));
  check(r.metrics.waterIoU.value >= 0.97 && r.metrics.waterIoU.bestShift.dxM === 0 && r.metrics.waterIoU.bestShift.dzM === 0, 'B: water IoU >= 0.97 with no shift found', String(r.metrics.waterIoU.value));
  check(r.metrics.pathP90.value <= 1, 'B: path P90 <= 1 m', String(r.metrics.pathP90.value));
  check(Object.values(r.metrics.canopy.quadrants).every((q) => Math.abs(q.diffPoints) <= 8), 'B: canopy within 8 points in every quadrant (the colour image loses the canopy under the paths and the water: 1-8 points)', JSON.stringify(Object.values(r.metrics.canopy.quadrants).map((q) => q.diffPoints)));
  const visible = new Uint8Array(g.w * g.h), Rm = modelRasters(model, g); for (let k = 0; k < visible.length; k++) visible[k] = Rm.canopy[k] && !Rm.water[k] && !Rm.pathMask[k] ? 1 : 0;
  const rv = evaluate({ model, grid: g, valid: sB.valid, masks: { canopy: classify(sB, g, COL.canopy, 30) }, modelCanopy: visible });
  check(Object.values(rv.metrics.canopy.quadrants).every((q) => Math.abs(q.diffPoints) <= 1.5), 'B: against the canopy the picture can show (canopy minus paths and water) the quadrants agree within 1.5 points (resampling only)', JSON.stringify(Object.values(rv.metrics.canopy.quadrants).map((q) => q.diffPoints)));
  // the same through the two-reference-point georeference
  const u1 = 100, v1 = 120, u2 = back.w - 60, v2 = back.h - 80;
  const geoR = parseGeo({ ref1: `${u1},${v1},${gB.x0 + (u1 + 0.5) * gB.res},${gB.z0 + (v1 + 0.5) * gB.res}`, ref2: `${u2},${v2},${gB.x0 + (u2 + 0.5) * gB.res},${gB.z0 + (v2 + 0.5) * gB.res}` }, back.w, back.h);
  check(Math.abs(geoR.x0 - geoB.x0) < 1e-6 && Math.abs(geoR.mx - geoB.mx) < 1e-9 && Math.abs(geoR.z0 - geoB.z0) < 1e-6, 'the two-reference-point georeference gives the same map as --geo');
  // C. the same image shifted by 3 m east: the shift search must find it
  const geoC = { ...geoB, x0: geoB.x0 + 3 }, sC = sampleToGrid(back, geoC, g);
  r = evaluate({ model, grid: g, valid: sC.valid, masks: { water: classify(sC, g, COL.water, 30) } });
  console.log('C. the aerial registered 3 m off to the east:'); report(r).lines.forEach((l) => console.log('   ' + l));
  check(r.metrics.waterIoU.value < r.metrics.waterIoU.bestShift.iou && Math.abs(r.metrics.waterIoU.bestShift.dxM - 3) <= 0.5 && Math.abs(r.metrics.waterIoU.bestShift.dzM) <= 0.5, 'C: the registration search finds the 3 m error (the image sits 3 m east of the model)', JSON.stringify(r.metrics.waterIoU.bestShift));
  // D. an image that is not the garden: every metric must fail
  const rnd = new Uint8Array(g.w * g.h); let s = 12345; for (let k = 0; k < rnd.length; k++) { s = (s * 1103515245 + 12345) & 0x7fffffff; rnd[k] = (s >> 16) % 5 === 0 ? 1 : 0; }
  r = evaluate({ model, grid: g, valid, masks: { water: rnd, path: rnd, canopy: rnd } });
  check(!r.metrics.waterIoU.pass && !r.metrics.pathP90.pass && !r.metrics.canopy.pass, 'D: random masks FAIL all three metrics', `IoU ${r.metrics.waterIoU.value}, P90 ${r.metrics.pathP90.value} m, precision ${r.metrics.pathP90.precision3m}`);
  // E. the pictures
  const prefix = path.join(ROOT, 'tools/tauride/raw/selftest-overlay');
  writePictures(prefix, g, evaluate({ model, grid: g, valid: sB.valid, masks: { water: classify(sB, g, COL.water, 30) } }), sB, { water: classify(sB, g, COL.water, 30) });
  check(['overlay', 'model', 'water'].every((n) => fs.existsSync(`${prefix}-${n}.png`) && decodeImage(fs.readFileSync(`${prefix}-${n}.png`)).w === g.w), 'the overlay pictures are written and readable', rel(prefix) + '-{overlay,model,water}.png');
  console.log(fails ? 'RESULT: FAIL' : 'RESULT: OK (the metrics of the exact case are perfect; the part that needs YOUR image is the aerial, its georeference and the masks / colours)');
  process.exit(fails ? 1 : 0);
}

// ---------------------------------------------------------------- main
if (args.selftest) await selftest();
const imgFile = args._[0];
if (!imgFile) { console.error('usage: node tools/tauride-overlay.mjs <aerial.png> (--geo x0,z0,x1,z1 | --ref1 u,v,x,z --ref2 u,v,x,z) [--water-mask f | --water-color r,g,b] [--path-mask f | --path-color r,g,b] [--canopy-mask f | --canopy-color r,g,b] [--model-json f] [--out prefix]\n       node tools/tauride-overlay.mjs --selftest'); process.exit(2); }
try {
  const model = await loadModel(args['model-json']), gb = bbox(model.garden.o), g = makeGrid({ x0: gb.x0 - 10, x1: gb.x1 + 10, z0: gb.z0 - 10, z1: gb.z1 + 10 }, Number(args.res || 0.5));
  const img = decodeImage(fs.readFileSync(path.resolve(imgFile))), geo = parseGeo(args, img.w, img.h), aerial = sampleToGrid(img, geo, g);
  const fromMask = (f) => { const m = decodeImage(fs.readFileSync(path.resolve(f))); if (m.w !== img.w || m.h !== img.h) throw new Error(`${f} is ${m.w} x ${m.h}, the aerial ${img.w} x ${img.h}: a mask must have the size of the aerial`); return maskFromImage(sampleToGrid(m, geo, g)); };
  const masks = {};
  for (const [k, t] of [['water', 40], ['path', 30], ['canopy', 40]]) {
    if (args[`${k}-mask`]) masks[k] = fromMask(args[`${k}-mask`]);
    else if (args[`${k}-color`]) masks[k] = classify(aerial, g, parseColor(args[`${k}-color`]), Number(args[`${k}-tol`] || t));
  }
  const res = evaluate({ model, grid: g, valid: aerial.valid, masks, shiftCells: Number(args.shift || 6) });
  const prefix = path.resolve(ROOT, args.out || 'shots/tauride/overlay');
  writePictures(prefix, g, res, aerial, masks);
  const rep = report(res, prefix); rep.lines.forEach((l) => console.log(l));
  const json = { image: path.basename(imgFile), geo, grid: { res: g.res, w: g.w, h: g.h, x0: g.x0, z0: g.z0 }, coverage: res.coverage, thresholds: THRESH, metrics: res.metrics };
  writeText(prefix + '.json', JSON.stringify(json, null, 1) + '\n');
  console.log(`pictures: ${rel(prefix)}-overlay.png, -model.png${masks.water ? ', -water.png' : ''}; numbers: ${rel(prefix)}.json`);
  process.exit(rep.ran === 0 ? 3 : rep.failed ? 1 : 0);
} catch (e) { console.error('tauride-overlay: ' + e.message); process.exit(2); }
