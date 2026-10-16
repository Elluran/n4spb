// drive/cars/lada2106/parts.js - small canvas textures of the Lada 2106 model: the Russian number plate (no flag, region only), the soft glow and the head lamp pool on the road.
// Same recipes as drive/model.js (plateTexture / glowTexture / beamTexture), copied so that this folder has no import from the red car's file (other sessions edit it).
import * as THREE from 'three';

/** a Russian-style plate: letter, three digits, two letters + the region number on the right; no flag, no country field */
export function plateTexture(text, region) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 112;
  const g = cv.getContext('2d');
  g.fillStyle = '#f1f0e8'; g.fillRect(0, 0, 512, 112);                          // a little yellowed: an old plate
  g.strokeStyle = '#15171a'; g.lineWidth = 6; g.strokeRect(5, 5, 502, 102);
  g.fillStyle = '#15171a'; g.textBaseline = 'middle';
  g.font = '700 74px "Noto Sans", Arial, sans-serif'; g.textAlign = 'center'; g.fillText(text, 188, 60);
  g.fillRect(372, 12, 3, 88);
  g.font = '700 54px "Noto Sans", Arial, sans-serif'; g.fillText(region, 442, 50);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

export function glowTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

/** the pool of light of the head lamps on the road (additive, night only): bright at the car, widening and fading ahead; canvas row 0 = near the car.
 *  A warmer, narrower pool than the coupe's: the four old round lamps are yellowish. */
export function beamTexture() {
  const W = 128, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), im = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1), half = 0.16 + 0.78 * Math.pow(t, 0.7), fall = Math.pow(1 - t, 1.6);
    for (let x = 0; x < W; x++) {
      const u = (x / (W - 1) - 0.5) * 2, a = Math.max(0, 1 - Math.pow(Math.abs(u) / half, 2.2)) * fall * (0.55 + 0.45 * Math.max(0, 1 - Math.abs(u) / 0.5));
      const i = (y * W + x) * 4; im.data[i] = 255; im.data[i + 1] = 236; im.data[i + 2] = 190; im.data[i + 3] = Math.round(255 * Math.min(1, a));
    }
  }
  g.putImageData(im, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
