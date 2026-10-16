// Summarise a .cpuprofile (tools/load-test.mjs --profile): self time per function and per file, top N.
//   node tools/cpuprofile-top.mjs shots/perf/load-base.cpuprofile [--n 40] [--file src/world/streets]
import fs from 'node:fs';
const args = {}; const pos = [];
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[++i]; else pos.push(a); }
const p = JSON.parse(fs.readFileSync(pos[0], 'utf8'));
const N = Number(args.n || 40);
const byId = new Map(p.nodes.map(n => [n.id, n]));
const parent = new Map(); for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
const self = new Map(), total = new Map(), file = new Map();
const dt = p.timeDeltas; let sum = 0;
const keyOf = n => { const cf = n.callFrame; const u = (cf.url || '').replace(/^https?:\/\/[^/]+/, ''); return `${cf.functionName || '(anon)'} ${u}:${cf.lineNumber + 1}`; };
for (let i = 0; i < p.samples.length; i++) {
  const d = (dt[i] || 0) / 1000; sum += d;
  const n = byId.get(p.samples[i]); if (!n) continue;
  const k = keyOf(n); self.set(k, (self.get(k) || 0) + d);
  const u = (n.callFrame.url || '').replace(/^https?:\/\/[^/]+/, '') || n.callFrame.functionName; file.set(u, (file.get(u) || 0) + d);
  const seen = new Set(); for (let id = n.id; id !== undefined; id = parent.get(id)) { const m = byId.get(id); const kk = keyOf(m); if (seen.has(kk)) continue; seen.add(kk); total.set(kk, (total.get(kk) || 0) + d); }
}
const filt = args.file ? ([k]) => k.includes(args.file) : () => true;
const show = (title, m) => { console.log(`\n== ${title} (ms)`); for (const [k, v] of [...m].filter(filt).sort((a, b) => b[1] - a[1]).slice(0, N)) console.log(String(Math.round(v)).padStart(7), k.slice(0, 150)); };
console.log(`profile: ${Math.round(sum)} ms sampled`);
show('self time by file', file);
show('self time by function', self);
show('total (inclusive) time by function', total);
