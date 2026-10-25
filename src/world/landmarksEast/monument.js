// landmarksEast/monument - the Alexander Nevsky monument: copied from 102_3d_piter commit 0568f7af (src/world/landmarksEast/monument.js); the n4spb edits are marked 'n4spb:'.
// Alexander Nevsky, 2002. Photo-derived sculpture, not a scan.
// Reference: https://peterburg.center/sites/default/files/an_1.jpg
// Site 59.9236 N, 30.3853 E; granite pedestal 3.74m. No banner.
import * as THREE from 'three';

export function monument(K) {
  const P = K.P, T = K.ctx.mat.toon;
  const bronze = T('#46534b', { paint: 0.035, name: 'nevsky-bronze' });
  const worn = T('#687168', { paint: 0.025, name: 'nevsky-bronze-highlights' });
  const dark = T('#303e37', { paint: 0.03, name: 'nevsky-bronze-recesses' });
  const stone = T('#aaa09a', { paint: 0.06, name: 'nevsky-granite' });
  const joint = T('#827b74', { paint: 0.03 });
  const sphere = new THREE.SphereGeometry(1, 24, 16);
  const detail = new THREE.SphereGeometry(1, 10, 8);
  const ell = (x, y, z, sx, sy, sz, m = bronze, rx = 0) => P.geo(m, Math.max(sx,sy,sz)<0.3 ? detail : sphere, x, y, z, rx, 0, 0, sx, sy, sz);
  const limb = (a, b, r0, r1 = r0, m = bronze) => P.cyl(m, a, b, r0, r1, 16);
  const curve = (pts, radius, m = bronze) => {
    const path = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    const g = new THREE.TubeGeometry(path, Math.max(16, pts.length * 7), radius, 6, false);
    P.geo(m, g); g.dispose();
  };
  P.push(1902.24, 0, 982.76, -2.19);
  // Contiguous profile with closed ledge undersides, no floating boxes or
  // coincident caps between courses. Counter-clockwise rings face outward.
  const profile = [[0.04,2.8,3.6],[0.22,2.8,3.6],[0.22,2.55,3.35],
    [0.4,2.55,3.35],[0.4,2.3,3.1],[0.57,2.3,3.1],
    [0.57,1.95,2.75],[1.35,1.72,2.52],[3.37,1.72,2.52],
    [3.62,1.82,2.62],[3.74,1.82,2.62]];
  const ring = ([y,x,z]) => [[-x,y,-z],[x,y,-z],[x,y,z],[-x,y,z]];
  for (let i = 1; i < profile.length; i++) {
    const a = ring(profile[i-1]), b = ring(profile[i]);
    for (let j = 0; j < 4; j++) P.quad(stone,a[j],b[j],b[(j+1)%4],a[(j+1)%4]);
  }
  P.fan(stone,ring(profile[0]),[0,-1,0]);
  P.fan(stone,ring(profile.at(-1)),[0,1,0]);
  for (const angle of [0,Math.PI]) {
    P.push(0,0,0,angle);
    P.box(worn,-0.045,0.045,1.48,2.98,2.526,2.57);
    P.box(worn,-0.43,0.43,2.43,2.52,2.526,2.57);
    P.box(worn,-0.23,0.23,2.77,2.84,2.526,2.57);
    curve([[-0.25,1.88,2.56],[0.25,1.72,2.56]],0.035,worn);
    for (const x of [-1.12,1.12]) P.box(joint,x,x+0.009,1.36,3.34,2.523,2.529);
    P.pop();
  }
  for (let side = 0; side < 4; side++) {
    P.push(0,0,0,side*Math.PI/2);
    const half = side%2 ? 2.52 : 1.72, depth = side%2 ? 1.72 : 2.52;
    for (let x = -half+0.16; x < half-0.1; x += 0.24) {
      P.box(joint,x,x+0.12,3.40,3.43,depth+0.03,depth+0.054);
      P.box(joint,x+0.09,x+0.12,3.43,3.52,depth+0.07,depth+0.09);
    }
    P.pop();
  }
  // Shallow cast processions and architectural relief backgrounds on the sides.
  // These are sculpted interpretations of the panels, not exact reproductions.
  for (const angle of [-Math.PI/2,Math.PI/2]) {
    P.push(0,0,0,angle); P.push(0,0,1.726);
    P.box(dark,-1.94,1.94,1.53,3.03,0,0.055);
    for (const y of [1.55,2.99]) P.box(worn,-1.91,1.91,y,y+0.025,0.055,0.08);
    for (let j = 0; j < 9; j++) {
      const x = -1.65+j*0.41, y = 2.22+Math.sin(j*1.7)*0.09;
      ell(x,y+0.25,0.065,0.085,0.10,0.048,worn);
      ell(x,y-0.12,0.063,0.12,0.29,0.048);
      limb([x-0.06,y-0.31,0.09],[x-0.12,1.67,0.09],0.025);
      limb([x+0.06,y-0.31,0.09],[x+0.1,1.67,0.09],0.025);
      limb([x+0.09,y+0.06,0.08],[x+0.2,y-0.10,0.08],0.025);
    }
    for (const x of [-1.2,0,1.2]) {
      P.box(bronze,x-0.1,x+0.1,2.4,2.8,0.057,0.074);
      ell(x,2.82,0.064,0.14,0.1,0.028,worn);
    }
    P.pop(); P.pop();
  }
  P.push(0,3.74,0);
  // Horse: collected walk, articulated hocks, one raised foreleg, arched neck.
  ell(0,0.045,0,1.02,0.08,2.22,dark);
  ell(0,2.04,-0.10,0.64,0.72,1.32);
  ell(0,2.07,-0.99,0.61,0.67,0.62);
  ell(0,2.16,0.84,0.54,0.79,0.65);
  ell(0,2.85,1.10,0.40,0.95,0.52,bronze,-0.28);
  ell(0,3.40,1.39,0.30,0.44,0.40,bronze,-0.3);
  ell(0,3.13,1.71,0.23,0.46,0.30,bronze,-0.56);
  ell(0,2.91,1.94,0.255,0.20,0.27);
  for (const s of [-1,1]) {
    ell(s*0.269,3.39,1.55,0.027,0.051,0.067,dark);
    curve([[s*0.27,3.43,1.48],[s*0.29,3.45,1.54],[s*0.27,3.42,1.61]],0.018,worn);
    ell(s*0.222,2.96,2.01,0.03,0.055,0.07,dark);
    ell(s*0.19,3.86,1.25,0.09,0.26,0.11,bronze,-0.2);
    ell(s*0.19,3.87,1.32,0.047,0.17,0.024,dark);
    const back = [[s*0.41,2.10,-0.96],[s*0.48,1.37,-0.88],[s*0.45,0.73,-1.39],[s*0.45,0.17,-1.18]];
    ell(s*0.43,1.85,-0.93,0.31,0.52,0.36);
    for (let j = 0; j < 3; j++) limb(back[j],back[j+1],[0.23,0.15,0.09][j],[0.15,0.09,0.075][j]);
    const leg = s > 0 ? [[s*0.4,2.12,0.91],[s*0.44,1.48,1.53],[s*0.44,1.10,1.25]]
      : [[s*0.4,2.12,0.91],[s*0.43,1.0,1.03],[s*0.43,0.17,1.17]];
    limb(leg[0],leg[1],0.21,0.115); limb(leg[1],leg[2],0.10,0.075);
    ell(...leg[1],0.13,0.14,0.14);
    for (const p of [back[3],leg[2]]) ell(p[0],p[1]-0.04,p[2]+0.045,0.135,0.12,0.20,dark);
    // Bridle, reins, breast collar, bit buckles.
    curve([[s*0.28,3.62,1.36],[s*0.30,3.29,1.65],[s*0.25,2.91,1.98]],0.031,dark);
    curve([[s*0.25,2.99,1.97],[s*0.6,2.93,0.95],[s*0.36,3.32,0.63]],0.022,dark);
    curve([[s*0.41,2.86,0.83],[s*0.56,2.25,1.10],[s*0.35,1.92,1.38]],0.045,dark);
    ell(s*0.29,3.27,1.64,0.028,0.065,0.065,worn);
  }
  curve([[-0.23,3.0,2.03],[0,3.07,2.14],[0.23,3.0,2.03]],0.03,dark);
  for (let i = 0; i < 17; i++) {
    const t = i/16;
    curve([[0,3.75-t*1.30,1.08-t*0.61],[0.09,3.64-t*1.27,0.98-t*0.67],[0.22,3.40-t*1.20,0.95-t*0.7]],0.055,i%3 ? bronze : dark);
  }
  curve([[0,2.38,-1.31],[0.12,1.94,-1.68],[0.21,0.99,-1.87],[0.12,0.49,-1.72]],0.19);
  for (let i = 0; i < 7; i++) curve([[(i-3)*0.042,2.25,-1.49],[0.10+(i-3)*0.045,1.48,-1.87],[0.13+(i-3)*0.03,0.53,-1.80]],0.021,dark);
  // Saddle, rider's seated thighs, greaves, boots and stirrups.
  ell(0,2.63,-0.16,0.69,0.22,0.75,dark);
  for (const s of [-1,1]) {
    limb([s*0.22,3.05,-0.17],[s*0.68,2.52,0.42],0.25,0.18);
    ell(s*0.69,2.51,0.4,0.19,0.2,0.2,worn);
    limb([s*0.69,2.47,0.4],[s*0.70,1.85,0.16],0.145,0.10,dark);
    ell(s*0.7,1.83,0.29,0.13,0.12,0.27,dark);
    curve([[s*0.72,2.21,0.27],[s*0.85,1.74,0.32],[s*0.55,1.74,0.32],[s*0.72,2.21,0.27]],0.024,worn);
  }
  ell(0,3.08,-0.15,0.42,0.36,0.38);
  ell(0,3.65,-0.10,0.45,0.66,0.33);
  // Cast lamellar plates curve around the chest.
  for (let row = 0; row < 7; row++) for (let col = 0; col < 14; col++) {
    const a = col/14*Math.PI*2, y = 3.23+row*0.12;
    const r = Math.sqrt(Math.max(0.15,1-((y-3.65)/0.68)**2));
    ell(Math.cos(a)*0.45*r,y,-0.1+Math.sin(a)*0.34*r,0.075,0.079,0.035,row%2 ? bronze : worn);
  }
  ell(0,4.23,-0.07,0.15,0.22,0.15);
  ell(0,4.50,-0.035,0.235,0.30,0.23);
  ell(0,4.51,0.185,0.062,0.10,0.095,worn);
  for (const s of [-1,1]) {
    ell(s*0.10,4.57,0.183,0.05,0.022,0.025,dark);
    curve([[s*0.04,4.615,0.192],[s*0.11,4.625,0.186],[s*0.17,4.60,0.164]],0.018,worn);
    ell(s*0.235,4.48,-0.045,0.035,0.074,0.055);
    curve([[s*0.2,4.49,-0.15],[s*0.23,4.23,-0.18],[s*0.18,4.10,-0.18]],0.058,dark);
  }
  ell(0,4.32,0.14,0.16,0.14,0.10,dark);
  limb([0,4.68,-0.05],[0,5.04,-0.06],0.258,0.015);
  curve([[-0.24,4.68,-0.03],[0,4.72,0.20],[0.24,4.68,-0.03]],0.03,worn);
  // Left hand gathers the reins; right arm holds the vertical lance.
  for (const s of [-1,1]) ell(s*0.4,4.05,-0.06,0.24,0.22,0.25);
  limb([-0.42,4.0,0],[-0.60,3.55,0.22],0.17,0.12);
  limb([-0.60,3.55,0.22],[-0.34,3.32,0.67],0.12,0.085);
  ell(-0.34,3.32,0.67,0.11,0.10,0.13);
  limb([0.44,4.0,0],[0.65,3.63,0.12],0.17,0.12);
  limb([0.65,3.63,0.12],[0.73,3.88,0.48],0.12,0.085);
  ell(0.73,3.9,0.48,0.11,0.12,0.10);
  limb([0.73,0.36,0.48],[0.73,5.02,0.48],0.025,0.021,dark);
  limb([0.73,5.02,0.48],[0.73,5.30,0.48],0.065,0.001,worn);
  // Folded CLOSED cloak: front, back, hem and shoulder edges have thickness.
  const cloak = (i,j,back) => {
    const u = i/16*2-1, v = j/12;
    return [u*(0.38+v*0.34),4.13-v*1.84+Math.sin(u*3)*v*0.09,
      -0.38-v*1.04+Math.cos(u*6*Math.PI)*(0.025+v*0.08)+(back ? -0.07 : 0)];
  };
  for (let i = 0; i < 16; i++) for (let j = 0; j < 12; j++) {
    const a=cloak(i,j,false), b=cloak(i+1,j,false), c=cloak(i+1,j+1,false), d=cloak(i,j+1,false);
    const A=cloak(i,j,true), B=cloak(i+1,j,true), C=cloak(i+1,j+1,true), D=cloak(i,j+1,true);
    P.quad(bronze,a,b,c,d,[0,0,1]); P.quad(bronze,A,B,C,D,[0,0,-1]);
    if (i===0) P.quad(bronze,a,d,D,A,[-1,0,0]);
    if (i===15) P.quad(bronze,b,B,C,c,[1,0,0]);
    if (j===0) P.quad(bronze,a,A,B,b,[0,1,0]);
    if (j===11) P.quad(bronze,d,c,C,D,[0,-1,0]);
  }
  P.pop(); P.pop(); sphere.dispose(); detail.dispose();
  for (const [w,d,y] of [[5.6,7.2,0.22],[5.1,6.7,0.4],[4.6,6.2,0.57]]) K.ctx.physics.addWalkBox(1902.24,982.76,w,d,-2.19,y,0);
  K.ctx.physics.addBox(1902.24,982.76,3.9,5.5,-2.19,0.57,3.74);
  K.ctx.physics.addWalkBox(1902.24,982.76,3.64,5.24,-2.19,3.74,0.57);
}
