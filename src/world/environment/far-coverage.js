// Far scenery follows the complete coverage union, including future extensions.
// Distances use rectangles individually: a large empty bounding box is not city.
export const HORIZON_MARGIN = 2100;
export const HORIZON_JITTER = 120;
export function coverageDistance(rects, x, z) {
  let d = Infinity;
  for (const r of rects) d = Math.min(d, Math.hypot(Math.max(r.x0-x,0,x-r.x1),Math.max(r.z0-z,0,z-r.z1)));
  return d;
}
export function horizonRadii(rects, center, n = 1100) {
  let limit = 4700;
  for (const r of rects) for (const x of [r.x0,r.x1]) for (const z of [r.z0,r.z1])
    limit = Math.max(limit,Math.hypot(x-center.x,z-center.z)+HORIZON_MARGIN+100);
  const raw = new Float32Array(n), radii = new Float32Array(n+1);
  for(let i=0;i<n;i++) {
    const a=i/n*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);let radius=4700;
    for(let t=4700;t<limit;t+=100)
      if(coverageDistance(rects,center.x+ca*t,center.z+sa*t)<HORIZON_MARGIN)radius=t+100;
    raw[i]=radius;
  }
  // Outward max, rather than averaging, protects corners and chord interiors.
  // The 2.1 km margin also absorbs the final +/-120 m silhouette jitter.
  for(let i=0;i<n;i++)for(let k=-9;k<=9;k++)radii[i]=Math.max(radii[i],raw[(i+k+n)%n]);
  radii[n]=radii[0];
  return radii;
}
