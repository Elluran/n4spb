# Workflow reliability: why agents were restarted and failed, and how to avoid it (2026-10-14)

Read this before launching a Workflow with more than a handful of agents. It records what was measured on 2026-10-13/14 (the islands round 2, ~100 workflow agents, up to 25 at once), what causes the retries, what was changed, and the rules to follow. Diagnostic tool: `node tools/workflow-stall-report.mjs --buckets`.

## 1. Symptom

In the Workflow progress view some agents show several attempts and a "failed" state; a workflow ends with messages such as `agent stalled on all 6 attempts (no progress for 180000ms each)`. In the agent transcripts the last line of every aborted attempt is a user-role message `[Request interrupted by user]` (nobody pressed anything), and the journal (`subagents/workflows/<run>/journal.jsonl`) holds one `started` line per attempt, a `failed` line when the attempt was given up, and a `result` line only for the attempt that finished.

## 2. Mechanism (documented behaviour of Claude Code, https://code.claude.com/docs/en/workflows.md "When an agent stalls and restarts")

* The workflow runtime watches every agent. If **no output arrives for the stall window (default 180 s = 180000 ms)** the attempt is aborted (`[Request interrupted by user]`) and the agent is started AGAIN FROM SCRATCH under a new agent id, with the same prompt. After **5 restarts** (6 attempts) the agent is failed; its pipeline stage returns `null`, and everything downstream of it in `pipeline()` is dropped (that is how both statue modules lost their review stage).
* Files an aborted attempt wrote stay in the tree; the next attempt starts with an EMPTY context and has to re-read the briefs and its own files, so a retry is expensive but not a total loss.
* Related documented knobs (network-config.md / errors.md): first-byte deadline 180 s (+1 s per 32 KB of request), byte-level idle watchdog 180 s, event watchdog 300 s; API retries default 10; workflow concurrency default 16 agents per workflow (`CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`), 20 concurrent subagents (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`). What the docs do not say: the exact wording `[Request interrupted by user]` and what makes a model request slow.

## 3. What we measured (tool output, all workflows of the session)

* 83 aborted attempts: **73 STALL** (aborted 150-300 s after the previous transcript event), 8 STOP (aborted within seconds: somebody paused or stopped a workflow), 7 PAUSE (aborted after a gap of hours: the run was paused overnight and resumed), 2 other.
* Model response latency over 27,218 responses of all agents: median 2.8 s, p90 29 s, p99 113 s, **p99.9 182 s**; 1,023 responses took more than 60 s, 106 more than 150 s, 52 more than 170 s. The latency is a heavy tail: a stall is not "a stuck agent", it is one slow answer. An attempt makes 100-400 model calls, so with ~0.27 % of calls beyond 180 s the chance that a long attempt survives is only about 35-45 %, and the agents that need the most steps (builders, reviewers with screenshots) are the ones that exhausted all six attempts.
* Stalls track the load. Active agents per 10 minutes against STALLs: 5-12 agents: 0-1; 15-17 agents: 0-2; 20-25 agents (14:40-16:10 UTC on 2026-10-14, when 8 builders + the integration wave + the bridge reviews + the statue wave ran together): 2-10 per 10 minutes. They did not depend on context size (108 k - 750 k tokens) or on the last tool (Bash 33, Read 26, Write 5).
* Cost: aborted attempts used 10,235 model calls / 5.24 M output tokens against 16,972 calls / 7.95 M for attempts that completed. Workflows that ended without a result for some agents: the 8 next-sight builders (45 attempts, 0 results), the two statue reviews, two bridge reviews, `integ:water-banks`.

Conclusion: the restarts are caused by the **180 s stall window being shorter than the tail of model latency under heavy concurrency**, not by errors in the agents' code or prompts.

## 4. What was changed (2026-10-14)

User-level `~/.claude/settings.json` `env` (takes effect in a NEW session; restart Claude Code):

| variable | value | why |
|---|---|---|
| `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` | 600000 | the workflow stall window: 10 min instead of 3 min (the key fix) |
| `CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS` | 600000 | do not abort a request the API is slow to start |
| `CLAUDE_STREAM_IDLE_TIMEOUT_MS` | 600000 | byte / event watchdogs |
| `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` | 12 | cap per workflow (it does NOT cap the sum over several workflows) |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | 12 | cap for Agent-tool subagents |

Every saved script in `docs/workflows/` passes `stallMs: 900000` per `agent()` call (documented as a per-agent override of the window; it is harmless if the installed version ignores it). If a future version renames these variables, run `node tools/workflow-stall-report.mjs` after a heavy wave: STALL should be near zero.

## 5. Rules for launching work (follow them)

1. **At most ~12 agents active at the same time in total**, across all running workflows and Agent-tool subagents. Check first (`node tools/workflow-stall-report.mjs --buckets`, last lines; or the /workflows view). The sum of workflows is what counts, not each cap.
2. **Do not start a wave while another wave is more than half running.** Prefer finishing a stage (build -> review) over opening new fronts. Stagger the launch of agents that start together (do not start 8 builders in the same second).
3. Give every `agent()` a `stallMs` (>= 600000 for builders and reviewers) and keep the settings of section 4 in `settings.json`.
4. Make retries cheap: every builder / reviewer prompt starts with "a previous attempt may have left files: read `git status`, your dossier BUILD LOG and your own files first and CONTINUE, do not start over", keeps the module loadable at all times, and writes its progress (what is done, what is next) into its dossier BUILD LOG after each milestone. The runtime restarts from the same prompt, so the state must live in files.
5. Split long agents: research, build and review are separate agents (already the pattern); a builder that needs more than ~300 model calls should be two agents (for example geometry first, then detail / verification).
6. Heavy jobs are slow when many agents share the machine (a full scene load took 4-20 minutes): tell agents to use `--load-timeout` / `--protocol-timeout`, to run ONE heavy job at a time and to kill what they started. Slow tools are not the stall (a running tool call does not stop the agent's output clock in the data we saw) but they make the next model call slower because the machine is busy.
7. A failed stage returns `null` and drops downstream stages in `pipeline()`: after a workflow ends, read `journal.jsonl` / the stall report for `NO RESULT` agents and RESUME them (section 6), do not assume the module is reviewed.
8. Do not `SendMessage` a working workflow agent (a duplicate instance appears and races on the same files); pausing / stopping a workflow aborts its running attempts (they show as STOP / PAUSE and are restarted from scratch when resumed): pause only when really necessary, preferably between stages.
9. Budget awareness: a retry storm burns tokens (5.2 M output tokens were spent in aborted attempts). If the report shows more than ~10 % of calls in aborted attempts, stop launching and fix the cause first.

## 6. Recovery

* Find the damage: `node tools/workflow-stall-report.mjs --since <UTC time> --buckets`.
* Resume a workflow with its cached results: `Workflow({ scriptPath, resumeFromRunId: '<wf_...>', args })` (same `args` as at launch; completed agents with unchanged prompts replay instantly, the rest re-run). Edit the script first if the prompts must change (changed prompts invalidate the cache of those agents only).
* For one failed stage, a single `Agent` call with the stage's prompt is cheaper than relaunching the whole pipeline.
* Verify partial work before committing: `git status`, `node tools/layout-test.mjs`, `node tools/check.mjs <module> city`; a half-written module must stay loadable (the build briefs require it).
* State on 2026-10-14 evening and the list of unfinished stages: `docs/HANDOFF-ISLANDS2.md`.
