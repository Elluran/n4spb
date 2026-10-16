// tools/workflow-stall-report.mjs - diagnoses Claude Code Workflow runs that retry / fail agents (docs/WORKFLOW-RELIABILITY.md).
//   node tools/workflow-stall-report.mjs [workflowsDir] [--since 2026-10-14T00:00] [--buckets]
// workflowsDir defaults to the newest <project>/<session>/subagents/workflows folder under ~/.claude/projects/ whose project name matches this repo.
// For every run it prints agents, attempts per agent, how many finished / ended without a result, and CLASSIFIES every aborted attempt:
//   STALL   the attempt ends with "[Request interrupted by user]" ~180 s (the default stall window) after the previous transcript event = the runtime restarted a silent agent
//   STOP    interrupted within ~30 s of the last event: somebody paused / stopped the workflow
//   PAUSE   interrupted after a very long gap (> 1 h): the run was paused and resumed later
// With --buckets it also prints, per 10 minutes, the number of ACTIVE agents against the number of STALLs: the stalls track concurrency (see the doc).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const since = val('--since') || '0000';
const root = path.join(os.homedir(), '.claude', 'projects');

function findDir() {
  const pos = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--since');
  if (pos) return pos;
  const out = [];
  for (const p of fs.readdirSync(root)) {
    if (!/agi-fun-tests/i.test(p)) continue;
    for (const s of fs.readdirSync(path.join(root, p))) {
      const d = path.join(root, p, s, 'subagents', 'workflows');
      if (fs.existsSync(d)) out.push([fs.statSync(d).mtimeMs, d]);
    }
  }
  out.sort((a, b) => b[0] - a[0]);
  if (!out.length) throw new Error('no workflows dir found under ' + root);
  return out[0][1];
}
const dir = findDir();
const T = (s) => Date.parse(s);
const lines = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const textOf = (m) => (Array.isArray(m?.content) ? m.content.filter((b) => b && b.type === 'text').map((b) => b.text).join('') : typeof m?.content === 'string' ? m.content : '');

const kinds = { STALL: 0, STOP: 0, PAUSE: 0, OTHER: 0 };
const buckets = new Map(), stallBuckets = new Map();
let wastedCalls = 0, wastedOut = 0, okCalls = 0, okOut = 0;
console.log('workflows dir:', dir);
for (const w of fs.readdirSync(dir).filter((n) => n.startsWith('wf_')).sort()) {
  const jp = path.join(dir, w, 'journal.jsonl');
  if (!fs.existsSync(jp)) continue;
  const j = lines(jp);
  const first = j.find((e) => e.type === 'started');
  const lab = new Map(), per = new Map(), done = new Set(), failed = new Set();
  for (const e of j) {
    if (e.type === 'started') { lab.set(e.agentId, e.label); (per.get(e.label) || per.set(e.label, []).get(e.label)).push(e.agentId); }
    if (e.type === 'result') done.add(e.agentId);
    if (e.type === 'failed') failed.add(e.agentId);
  }
  const rows = [];
  for (const [label, ids] of per) {
    let stalls = 0, stops = 0, pauses = 0;
    for (const id of ids) {
      const p = path.join(dir, w, 'agent-' + id + '.jsonl');
      if (!fs.existsSync(p)) continue;
      const ev = lines(p); let prev = null, calls = 0, outT = 0, interrupted = false;
      for (const d of ev) {
        const t = d.timestamp; if (!t) continue;
        const b = new Date(T(t) - (T(t) % 600000)).toISOString().slice(0, 16);
        if (b >= since) { if (!buckets.has(b)) buckets.set(b, new Set()); buckets.get(b).add(id); }
        const m = d.message && typeof d.message === 'object' ? d.message : {};
        if (m.role === 'assistant') { calls++; outT += (m.usage && m.usage.output_tokens) || 0; }
        if (d.type === 'user' && /Request interrupted/.test(textOf(m)) && prev) {
          const gap = (T(t) - T(prev)) / 1000; interrupted = true;
          let k = gap > 3600 ? 'PAUSE' : gap < 30 ? 'STOP' : (gap > 150 && gap < 300) ? 'STALL' : 'OTHER';
          kinds[k]++; if (k === 'STALL') { stalls++; stallBuckets.set(b, (stallBuckets.get(b) || 0) + 1); } else if (k === 'STOP') stops++; else if (k === 'PAUSE') pauses++;
        } else prev = t;
      }
      if (interrupted) { wastedCalls += calls; wastedOut += outT; } else { okCalls += calls; okOut += outT; }
    }
    const fin = ids.some((i) => done.has(i));
    rows.push({ label, attempts: ids.length, fin, stalls, stops, pauses });
  }
  const bad = rows.filter((r) => !r.fin);
  console.log(`\n${w}  agents ${rows.length}  attempts ${rows.reduce((s, r) => s + r.attempts, 0)}  finished ${rows.filter((r) => r.fin).length}  NO RESULT ${bad.length}`);
  for (const r of rows.filter((r) => r.attempts > 1 || !r.fin)) console.log(`   ${r.fin ? 'ok      ' : 'NO RESULT'} ${r.label.padEnd(44)} attempts ${r.attempts}  stall ${r.stalls} stop ${r.stops} pause ${r.pauses}`);
}
console.log('\naborted attempts by kind:', kinds);
console.log(`model calls: aborted attempts ${wastedCalls} (${wastedOut} output tokens) vs completed attempts ${okCalls} (${okOut} output tokens)`);
if (flag('--buckets')) {
  console.log('\n10-minute bucket (UTC)  active agents  STALLs');
  for (const b of [...buckets.keys()].sort()) if (b >= since) console.log(`${b}      ${String(buckets.get(b).size).padStart(3)}           ${stallBuckets.get(b) || 0}`);
}
