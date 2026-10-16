// cars/cybertruck/textures.js - the small canvas textures of the taxi Cybertruck: Russian plate (no flag), the roof lamp "ТАКСИ" (plain wordmark, no company logo),
// the soft under-glow and the head-lamp pool on the road (same look as drive/model.js).
import * as THREE from 'three';

const sRGB = (cv, aniso = 4) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };

/** a Russian-style plate: letter, three digits, two letters + the region block (no flag, no "RUS") */
export function plateTexture(text, region) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 112;
  const g = cv.getContext('2d');
  g.fillStyle = '#f4f4ef'; g.fillRect(0, 0, 512, 112);
  g.strokeStyle = '#15171a'; g.lineWidth = 6; g.strokeRect(5, 5, 502, 102);
  g.fillStyle = '#15171a'; g.textBaseline = 'middle';
  g.font = '700 74px "Noto Sans", Arial, sans-serif'; g.textAlign = 'center'; g.fillText(text, 188, 60);
  g.fillRect(372, 12, 3, 88);
  g.font = '700 54px "Noto Sans", Arial, sans-serif'; g.fillText(region, 442, 50);
  return sRGB(cv);
}

/** the roof lamp: warm white face, black ТАКСИ between two thin black-and-white checker rows; the left 6 % is plain (the box ends and top map there) */
export function roofLampTexture() {
  const W = 512, H = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffe9b0'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff6d6'; g.fillRect(0, 0, 32, H);
  const x0 = 40, cell = 12;
  g.fillStyle = '#17191d';
  for (let i = 0; i * cell < W - x0; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) { g.fillRect(x0 + i * cell, j * cell + 3, cell, cell); g.fillRect(x0 + i * cell, H - 3 - (j + 1) * cell, cell, cell); }
  g.font = '900 78px "Rubik", "Noto Sans", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('ТАКСИ', x0 + (W - x0) / 2, H / 2 + 4);
  return sRGB(cv, 8);
}

export function glowTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** the pool of light of the head lamps on the road (additive, night only): bright at the car, widening and fading ahead; canvas row 0 = near the car */
export function beamTexture() {
  const W = 128, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), im = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1), half = 0.16 + 0.84 * Math.pow(t, 0.7), fall = Math.pow(1 - t, 1.5);
    for (let x = 0; x < W; x++) {
      const u = (x / (W - 1) - 0.5) * 2, a = Math.max(0, 1 - Math.pow(Math.abs(u) / half, 2.2)) * fall * (0.55 + 0.45 * Math.max(0, 1 - Math.abs(u) / 0.5));
      const i = (y * W + x) * 4; im.data[i] = 255; im.data[i + 1] = 244; im.data[i + 2] = 214; im.data[i + 3] = Math.round(255 * Math.min(1, a));
    }
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
