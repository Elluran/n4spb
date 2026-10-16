// Signal plans use integer-second offsets/edges; only pedestrian flashing adds half-second edges.
// This clock skips repeated display work inside those intervals without changing the queried time.
// Fractional-offset plans and ?signalcache=0 retain per-frame updates.
export function createSignalDisplayClock(graph, hz) {
  const signals = graph.signals;
  const cache = Array.isArray(signals) && signals.every(s => Number.isSafeInteger(s.ofs)) &&
    !(typeof location !== 'undefined' && new URLSearchParams(location.search).get('signalcache') === '0');
  let largestOffset = 0, last = NaN;
  if (cache) for (const s of signals) largestOffset = Math.max(largestOffset, Math.abs(s.ofs));
  return t => {
    if (!cache || !Number.isFinite(t)) return true;
    const scaled = t * hz, tick = Math.floor(scaled);
    // Modulo/ceil in lanegraph can round a value just below an edge onto that edge. Query directly
    // there (and just after it), so arbitrary screenshot times retain the original floating-point result.
    const epsilon = (Math.abs(t) + largestOffset + 220) * Number.EPSILON * 8 * hz;
    if (epsilon >= 0.125 || Math.min(scaled - tick, tick + 1 - scaled) <= epsilon) { last = NaN; return true; }
    if (tick === last) return false;
    last = tick; return true;
  };
}
