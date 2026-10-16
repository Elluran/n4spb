// Party-wall checks already reject neighbours whose edge start is more than
// 90 m from the sample point. Index that same predicate, without changing the
// distance, normal, height or ownership tests in the landmark builders.
export function edgeStartLookup(edges, radius = 90, cell = 96) {
  const grid = new Map();
  for (const edge of edges) {
    const key = `${Math.floor(edge.e.a[0] / cell)},${Math.floor(edge.e.a[1] / cell)}`;
    let bucket = grid.get(key);
    if (!bucket) grid.set(key, bucket = []);
    bucket.push(edge);
  }
  return (x, z) => {
    const out = [];
    for (let iz = Math.floor((z - radius) / cell); iz <= Math.floor((z + radius) / cell); iz++) {
      for (let ix = Math.floor((x - radius) / cell); ix <= Math.floor((x + radius) / cell); ix++) {
        const bucket = grid.get(`${ix},${iz}`);
        if (bucket) for (const edge of bucket) {
          if (Math.abs(x - edge.e.a[0]) <= radius && Math.abs(z - edge.e.a[1]) <= radius) out.push(edge);
        }
      }
    }
    return out;
  };
}
