// Ordered, immutable spatial buckets. Keep cell lookup O(1), but store IDs in
// one numeric buffer instead of a growable JavaScript array for every cell.
// Construction consumes the map; runtime queries allocate nothing.
export class PackedCellIndex {
  constructor(buckets) {
    this.rows = buckets;
    const offsets = new Uint32Array(buckets.size + 1);
    let row = 0, count = 0;
    for (const ids of buckets.values()) { offsets[row++] = count; count += ids.length; }
    if (count > 0xffffffff) throw new Error('Spatial index exceeds Uint32 capacity');
    offsets[row] = count;
    const values = new Uint32Array(count);
    row = 0;
    for (const [key, ids] of buckets) { values.set(ids, offsets[row]); buckets.set(key, row++); }
    this.offsets = offsets; this.values = values;
  }
  row(key) { return this.rows.get(key) ?? -1; }
}
