# OpenSwarm Deep Dive

**Date:** 2026-03-18
**Repo:** https://github.com/Intrect-io/OpenSwarm | 218 stars | TypeScript | MIT

---

## What It Is

Autonomous AI dev team orchestrator powered by Claude Code CLI. Fetches tasks from Linear, runs a Worker→Reviewer→Tester→Documenter pipeline, stores memories in LanceDB, reports via Discord. Node.js 22+, TypeScript strict ESM.

---

## Architecture (4 Tiers)

```
Input:     Linear API (issue ingestion, state tracking)
Decision:  AutonomousRunner → DecisionEngine → TaskScheduler
Execution: PairPipeline (Worker → Reviewer → Tester → Documenter)
Output:    Discord bot, LanceDB memory, Git tracker
```

Codebase: 9 domain directories under `src/`: core, agents, orchestration, automation, memory, knowledge, discord, linear, github.

---

## Memory System (The Standout Feature)

### Storage
LanceDB vector database at `~/.openswarm/memory/`. Xenova/multilingual-e5-base embeddings (768 dim, runs locally, ~500MB RAM).

### Memory Types

| Type | Base Importance | Example |
|------|----------------|---------|
| `constraint` | 0.9 | Hard rules, MUSTs/NEVERs |
| `user_model` | 0.85 | User preferences, style |
| `strategy` | 0.8 | Approaches, best practices |
| `system_pattern` | 0.75 | Architecture, design patterns |
| `belief` | 0.7 | Verified insights, discoveries |
| `decision` | 0.8 | (legacy) |
| `fact` | 0.85 | (legacy) |
| `repomap` | 0.6 | (legacy, 30-day TTL) |
| `journal` | 0.4 | (legacy, 14-day TTL) |

### Hybrid Retrieval Scoring

```
final_score = 0.55 * similarity + 0.20 * importance + 0.15 * recency + 0.10 * frequency
```

- Recency: exponential decay, 7-day half-life
- Frequency: normalized to max 10 accesses

### Semantic Distillation (Pre-Storage Filter)

Before storing, content is classified:
- **Reject:** chit-chat, ephemeral emotions, test data, content < 20 chars
- **Extract:** constraints (MUST/NEVER patterns), user preferences, strategies, system patterns, beliefs
- **Fallback:** Content > 100 chars without pattern match → low-importance belief (0.5)

### Background Cognition (Every 6-12 Hours)

- **Decay:** 0.03 weekly decay on unused memories. Above 0.7 decay → candidate for removal
- **Consolidation:** Cosine similarity > 0.85 → merge duplicates, keep higher importance
- **Contradiction detection:** Keyword-based pattern matching across similar memories. Reconciliation boosts one, archives the other
- **Stability levels:** low (new/revised), medium (1-7 days), high (> 7 days, no revisions)

### Known Issues
- 5+ call sites save memories independently → duplicates
- `cleanupExpired()` identifies but doesn't actually delete
- Table recreation during consolidation → race conditions
- No in-place updates in LanceDB → destructive rebuilds

---

## Pair Pipeline

Sequential 4-stage chain with iterative retry:

### 1. Worker
- Spawns `claude -p` with task prompt via temp file
- Takes git snapshot before, runs diff after
- Parses JSON output for success/summary/files/commands

### 2. Reviewer (2-phase)
- **Pre-check** (Haiku, 30s timeout): syntax/completeness
- **Full review** (Sonnet, 180s timeout): correctness, quality, tests, security
- Returns: APPROVE / REVISE / REJECT

### 3. Tester (Optional)
- Runs tests, reports pass/fail/coverage

### 4. Documenter (Optional)
- Generates documentation artifacts

### Iteration Logic
- On REVISE: reviewer feedback injected into new worker prompt
- Max iterations configurable (default 3)
- Model escalation: e.g., Haiku → Sonnet after 3 fails
- **Stuck detection:** same error 2x, 4 consecutive revisions, 3 identical outputs, or 6 iterations → abort

### Communication
Stages pass a `PipelineContext` object — in-process sequential, no inter-process messaging.

---

## Task Management (Linear)

### Flow
1. Heartbeat fetches issues from Linear (Todo/In Progress/Backlog, filtered by team + agent label)
2. DecisionEngine filters and prioritizes
3. `projectMapper` resolves Linear project → filesystem path (Levenshtein fuzzy match, 5-min cache)
4. Pipeline executes in a git worktree (`{repo}/worktree/{issueId}`)
5. Success → issue marked Done, comment posted
6. Failure → exponential backoff (max 4), then blocked

### Safety
- 10 issue creations per day
- Rate limiting via `withRateLimit()`
- 60-second issue cache

---

## Claude Code Integration

```bash
echo "" | claude -p "$(cat {promptFile})" --output-format stream-json --permission-mode bypassPermissions
```

- Prompts written to temp files
- `bypassPermissions` — fully autonomous, zero guardrails
- Stream-json output parsed event by event
- Each pipeline stage = separate `child_process.spawn`
- Process Registry tracks all PIDs, monitors activity, graceful shutdown (SIGTERM → SIGKILL after 5s)
- Health checks every 30s (signal 0)

### Concurrency
- `TaskScheduler.maxConcurrent` (default 4)
- Each task gets its own git worktree from `origin/main`
- `--force-with-lease` for safe concurrent pushes

---

## Decision Engine

Scope guard determining what gets executed:

- **Allowlist:** only configured projects
- **Source validation:** only Linear-sourced tasks with issue IDs
- **Rate limiting:** 300s cooldown between tasks, max 3 consecutive
- **Time windows:** can block specific hours
- **Priority:** Linear priority → due date → creation timestamp
- **Dependency blocking:** skip tasks with unresolved deps
- **State persistence:** `~/.openswarm/decision-engine-state.json`

---

## Knowledge Graph

In-memory directed graph: nodes (files, directories, modules) + edges (imports, contains, depends_on, tests).

- Scanner walks project dirs, parses imports (TS/JS/Python regex)
- Maps test files to source by import analysis and naming conventions
- Tracks LOC, exports/imports, language
- **Analysis:** transitive deps (BFS), hot modules (top 5 by churn), untested modules, impact analysis
- **Query:** programmatic API, no query language. Serializable to JSON.

---

## Discord Bot

25+ commands (`!auto start/stop`, `!pair run`, `!dev <repo> "<task>"`, `!memory search`, etc.)

- Color-coded embeds (red=failure, green=success)
- Pipeline completion reports: iterations, duration, files, summary, feedback, tests
- Per-channel conversation history (30 messages, LRU at 100 channels)
- Access control via `DISCORD_ALLOWED_USERS` env var

---

## Configuration (YAML)

Key sections:
```yaml
discord: { token, channelId, webhookUrl }
linear: { apiKey, teamId }
github: { repos[] }
agents[]: { name, projectPath, heartbeatInterval, linearLabel, enabled }
autonomous:
  enabled: true
  pairMode: true
  maxConcurrentTasks: 4
  allowedProjects: []
  defaultRoles:
    worker: { model: sonnet, timeout: 300000 }
    reviewer: { model: sonnet, escalateModel: opus, escalateAfterIteration: 3 }
    tester: { model: haiku }
    documenter: { model: haiku }
```

**Hardcoded:** Memory weights (0.55/0.20/0.15/0.10), decay rate (0.03/week), consolidation threshold (0.85), stuck detection thresholds, daily issue limit (10).

---

## What Rig Can Learn

### Steal These

| Pattern | How to adapt for Rig |
|---------|---------------------|
| **Pair Pipeline (Worker→Reviewer)** | After PM agent executes, spawn a reviewer agent to verify output before committing |
| **Stuck detection** | If PM agent produces same error 2x or revises 4+ times, abort and flag in standup |
| **Model escalation** | Start PM agents on Haiku/Sonnet, escalate to Opus if they struggle |
| **Memory scoring weights** | Evolve our flat markdown memory into weighted, decaying memory over time |
| **Semantic distillation** | Filter what gets stored — reject ephemeral content, extract constraints and patterns |
| **Git worktree isolation** | Each PM agent works in its own worktree — no conflicts between agents |
| **Process Registry** | Track spawned agent PIDs, health check, graceful shutdown |

### Avoid These

| Anti-pattern | Why |
|-------------|-----|
| **LanceDB for memory** | No in-place updates, destructive table rebuilds. Markdown files are simpler for our scale |
| **500MB embedding model** | Overkill for 4 products. Text search on markdown is fine |
| **bypassPermissions everywhere** | Dangerous. Use selectively per agent role |
| **Fragmented project mapping** | We already have clean config.yaml → local_path mapping |
| **No integration tests** | Their orchestration layer is untested. We should test our scripts |
| **Discord as primary UI** | Works for teams, but for a solo founder CLI + committed markdown is better |

### Consider Later

| Pattern | When |
|---------|------|
| **Knowledge Graph** | When we need impact analysis ("what breaks if I change this file?") |
| **Background cognition** | When memory files grow large enough to need consolidation |
| **Heartbeat-based task polling** | When Rig runs as a daemon rather than on-demand |

---

## Bottom Line

OpenSwarm is well-structured but operationally complex. The memory system is genuinely novel (hybrid retrieval, semantic distillation, background cognition). The Pair Pipeline with stuck detection and model escalation is solid engineering. Main weaknesses: LanceDB's mutation limitations, fragmented project mapping, memory duplication, and fully-permissive Claude execution. Single-machine only.

**For Rig:** The highest-value patterns to adopt are the Worker→Reviewer pipeline and stuck detection. The memory system is inspiring but over-engineered for our scale — our markdown files + git history approach is simpler and sufficient for 4 products. If we grow to 10+ products, revisiting their weighted memory approach would make sense.
