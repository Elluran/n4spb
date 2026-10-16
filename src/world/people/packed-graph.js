// Navigation keeps its baked numeric columns and ordered CSR adjacency instead
// of allocating an edge object and several small arrays for every graph node.
// Numeric indexing remains available to diagnostics; routing reads columns.
const KEYS = ['a', 'b', 'len', 'kind', 'cid', 'cost'];
const indexOf = key => typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key) ? Number(key) : -1;

export class PackedEdges {
  constructor(columns = null) {
    this.length = columns?.a.length || 0;
    this.capacity = this.length;
    this.columns = Object.fromEntries(KEYS.map(k => [k, columns?.[k] || new Float64Array(0)]));
    return new Proxy(this, { get(target, key, receiver) {
      const index = indexOf(key);
      return index >= 0 ? target.at(index) : Reflect.get(target, key, receiver);
    } });
  }
  at(index) {
    if (index < 0 || index >= this.length) return undefined;
    const c = this.columns;
    return { a: c.a[index], b: c.b[index], len: c.len[index], kind: c.kind[index], cid: c.cid[index], cost: c.cost[index] };
  }
  push(e) {
    if (this.length === this.capacity) {
      this.capacity = Math.max(64, this.capacity + Math.max(64, Math.ceil(this.capacity / 8)));
      for (const k of KEYS) { const a = new Float64Array(this.capacity); a.set(this.columns[k]); this.columns[k] = a; }
    }
    for (const k of KEYS) this.columns[k][this.length] = e[k];
    return ++this.length;
  }
  map(fn) { return Array.from({ length: this.length }, (_, i) => fn(this.at(i), i, this)); }
  *[Symbol.iterator]() { for (let i = 0; i < this.length; i++) yield this.at(i); }
}

export class PackedAdjacency {
  constructor(nodes, edges) {
    this.length = nodes;
    this.edges = edges;
    this.extra = new Map();
    this.rebuild();
    return new Proxy(this, { get(target, key, receiver) {
      const index = indexOf(key);
      return index >= 0 ? target.at(index) : Reflect.get(target, key, receiver);
    } });
  }
  rebuild() {
    const offsets = new Uint32Array(this.length + 1), c = this.edges.columns, n = this.edges.length;
    for (let i = 0; i < n; i++) { offsets[c.a[i] + 1]++; offsets[c.b[i] + 1]++; }
    for (let i = 1; i < offsets.length; i++) offsets[i] += offsets[i - 1];
    const values = new Uint32Array(n * 2), cursor = offsets.slice();
    for (let i = 0; i < n; i++) { values[cursor[c.a[i]]++] = i; values[cursor[c.b[i]]++] = i; }
    this.offsets = offsets; this.values = values; this.extra.clear(); this.dirty = false;
  }
  push() { this.dirty = true; return ++this.length; }
  append(node, edge) {
    let list = this.extra.get(node);
    if (!list) this.extra.set(node, list = []);
    list.push(edge); this.dirty = true;
  }
  at(node) {
    if (node < 0 || node >= this.length) return undefined;
    const from = this.offsets[node] || 0, to = this.offsets[node + 1] || from;
    const base = this.values.subarray(from, to), extra = this.extra.get(node);
    return extra ? [...base, ...extra] : base;
  }
  map(fn) { return Array.from({ length: this.length }, (_, i) => fn(this.at(i), i, this)); }
  *[Symbol.iterator]() { for (let i = 0; i < this.length; i++) yield this.at(i); }
}
