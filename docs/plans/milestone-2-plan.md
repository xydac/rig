# Rig Milestone 2 — Command Center Evolution

**Date:** 2026-03-18
**Status:** Draft
**Builds on:** Milestone 1 (MVP standup + agent swarm)

---

## Vision

Rig evolves from a daily standup tool into a full product command center. It gains the ability to focus on a single product, run different meeting types on different cadences, capture and surface metrics, generate and prioritize ideas by expected ROI, verify agent output quality, and present everything through a lightweight dashboard.

---

## Features (Priority Order)

### 1. Single-Product Focus Mode

**Problem:** Sometimes you want to deep-dive one product, not do a cross-portfolio standup.

**Solution:** `./scripts/rig --product postcall` launches a focused session:
- Pre-meeting gathers only that product's data
- Only that product's PM agent spawns (or single-agent mode for that repo)
- Company agents still available but context is product-specific
- Standup summary scoped to that product

**Implementation:**
- `scripts/rig` accepts `--product <name>` flag
- `scripts/pre-meeting.sh` accepts optional product filter
- `rig-agent.md` instructions handle single-product mode
- PM agent gets deeper context (full issue list, recent PRs, commit details — not just summaries)

**Config:**
```bash
./scripts/rig                          # full portfolio standup (default)
./scripts/rig --product postcall       # focus on postcall only
./scripts/rig --product health         # focus on health only
```

---

### 2. Idea Pipeline

**Problem:** Ideas come up during standups, from competitive research, from customer feedback — but there's no structured way to capture, evaluate, and prioritize them.

**Solution:** An idea lifecycle that flows through: capture → evaluate → validate → prioritize by expected ROI.

**Structure:**
```
products/<name>/ideas/
├── inbox/                    # raw ideas, unprocessed
│   └── 2026-03-18-voice-notes.md
├── evaluated/                # scored and analyzed
│   └── 2026-03-18-voice-notes.md
├── validated/                # tested against market/user data
│   └── 2026-03-18-voice-notes.md
├── prioritized.md            # ranked by expected ROI
└── rejected/                 # ideas that didn't pass evaluation
    └── 2026-03-18-social-login.md
```

**Idea format:**
```markdown
# Idea: <Title>

**Date:** 2026-03-18
**Source:** standup / competitive-scan / customer-feedback / brainstorm
**Product:** postcall
**Status:** inbox | evaluated | validated | prioritized | rejected

## Description
<What is it?>

## Problem it solves
<What user pain does this address?>

## Evaluation (filled during evaluate stage)
- **Effort:** S / M / L / XL
- **Impact:** Low / Medium / High / Critical
- **Confidence:** Low / Medium / High (how sure are we this matters?)
- **Reach:** <how many users affected?>
- **Expected ROI score:** (Impact × Confidence × Reach) / Effort

## Validation (filled during validate stage)
- **Competitive evidence:** <do competitors have this? how does it perform for them?>
- **User evidence:** <have users asked for this? support tickets? app store reviews?>
- **Market evidence:** <search volume, trend data, market size?>

## Decision
- **Outcome:** build / defer / reject
- **Rationale:** <why?>
- **Assigned to sprint:** <date or "backlog">
```

**Agent roles:**
- **During standup:** Ideas captured to `inbox/` as they come up
- **Idea Evaluation meeting (weekly, autonomous):** AI evaluates inbox ideas — scores effort/impact/confidence, moves to `evaluated/`
- **Idea Validation meeting (weekly, autonomous):** AI cross-references with competitive data, user feedback, market data — moves to `validated/`
- **During standup:** Prioritized ideas surfaced for human decision (build/defer/reject)

**ROI scoring:**
```
ROI = (Impact × Confidence × Reach) / Effort

Where:
  Impact:     Low=1, Medium=2, High=3, Critical=5
  Confidence: Low=0.5, Medium=0.75, High=1.0
  Reach:      fraction of users (0.1 to 1.0)
  Effort:     S=1, M=2, L=4, XL=8
```

Ideas are auto-ranked by ROI score in `prioritized.md`. Humans make the final build/defer/reject call.

---

### 3. Worker→Reviewer Pipeline (Agent Output Verification)

**Problem:** PM agents execute tasks autonomously but nobody verifies their output. Errors compound.

**Source:** OpenSwarm's Pair Pipeline pattern.

**Solution:** After PM agent completes a task, a reviewer agent checks the output before the orchestrator accepts it.

**Flow:**
```
PM Agent executes task
    → Commits to worktree branch
    → Sends COMPLETED to orchestrator
    → Orchestrator spawns Reviewer agent
        → Reviews: code quality, test pass, matches task description
        → Returns: APPROVE / REVISE / REJECT
    → If REVISE: feedback sent back to PM agent (max 3 iterations)
    → If APPROVE: merge to main branch
    → If REJECT: flag in standup summary, create GitHub issue
```

**Stuck detection (from OpenSwarm):**
- Same error 2x → abort
- 4 consecutive revisions → abort
- 3 identical outputs → abort
- Abort → flag as blocker in standup summary

**Model escalation:**
- PM agents start on `sonnet` (cheap, fast)
- If stuck after 3 iterations, escalate to `opus`
- Reviewer always runs on `sonnet` (fast, critical eye)

**Config:**
```yaml
swarm:
  enabled: true
  teammate_model: "sonnet"
  review:
    enabled: true
    reviewer_model: "sonnet"
    max_iterations: 3
    escalate_to: "opus"
    escalate_after: 3
```

---

### 4. Meeting Types Beyond Standup

**Problem:** Rig only runs daily standups. Research identified 10+ meeting types at different cadences.

**Solution:** Add meeting templates and a `./scripts/rig meeting <type>` command.

**Phase 1 meetings (highest value):**

| Meeting | Cadence | Human | What it does |
|---------|---------|-------|-------------|
| `daily-standup` | Daily | Required | Cross-product sync, priorities, decisions |
| `deep-review` | On-demand | Required | Metrics deep dive, strategy for one product |
| `competitive-scan` | Every standup (autonomous) | Autonomous | Monitor competitors, runs as post-DONE task |
| `idea-evaluation` | Every standup (autonomous) | Autonomous | Score inbox ideas, runs as post-DONE task |
| `launch-readiness` | Event-triggered | Required | Go/no-go checklist for a product |

**Key shift:** AI agents don't need weekly cadences. Autonomous meetings run **every standup cycle** as background tasks after DONE. Competitive scans, idea evaluation, and metrics pulls happen every time PM agents spin up — not once a week. The bottleneck is human attention, not agent capacity.

**Cadence model:**
- **Every standup:** Autonomous tasks (competitive scan, idea evaluation, metrics pull, validation) run in background after DONE alongside PM agent execution
- **Every standup (human):** You decide what to discuss, what to prioritize, what to build
- **On-demand:** Deep reviews, launch readiness, pivot-or-persevere — triggered when you need them
- **Monthly:** Strategy review, portfolio rebalancing — these need reflection time, not speed

**Commands:**
```bash
./scripts/rig                              # daily standup (default)
./scripts/rig meeting weekly-review        # weekly review
./scripts/rig meeting competitive-scan     # autonomous, no human
./scripts/rig meeting launch-readiness --product postcall
./scripts/rig schedule                     # show upcoming meetings
```

**Template structure:**
```
meetings/
├── daily-standup.md         # current rig-agent.md behavior
├── weekly-review.md         # metrics-focused, deeper
├── competitive-scan.md      # Product Scout instructions
├── idea-evaluation.md       # score and evaluate ideas
└── launch-readiness.md      # go/no-go checklist
```

Each template defines: purpose, agents needed, outputs, agenda.

---

### 5. Metrics Capture in Pre-Meeting

**Problem:** Pre-meeting only pulls git activity and GitHub issues. No product metrics (retention, revenue, crashes).

**Solution:** Extend `pre-meeting.sh` to pull metrics based on product stage and configured integrations.

**Metrics by stage:**

| Stage | Metrics pulled | Source |
|-------|---------------|--------|
| Exploration | Landing page visits, waitlist signups | Plausible API |
| Building | Commits, issues closed, build status | GitHub API (already have) |
| Pre-Launch | Crash rate, beta retention, NPS | App Store Connect, PostHog |
| Launch | Day 1/7/30 retention, downloads, trial→paid | PostHog, Stripe, App Store |
| Growth | MRR, churn, NRR, DAU/MAU | Stripe, PostHog |
| Maintenance | Churn trend, rating trend, crash trend | Stripe, App Store, Sentry |

**Config per product:**
```yaml
products:
  - name: postcall
    stage: pre-launch
    launch_date: 2026-03-25
    metrics:
      posthog_project: postcall
      stripe_product: prod_xxx
      app_store_id: 123456
```

**Script:** `scripts/pull-metrics.sh` runs per product, writes to `products/<name>/metrics/<date>.md`. Called by `pre-meeting.sh`.

**Metrics summary format:**
```markdown
# postcall — Metrics (2026-03-18)
**Stage:** pre-launch

## App Store Connect
- Crash-free sessions: 99.7%
- Beta testers: 23
- TestFlight builds: 12

## PostHog
- Beta Day 1 retention: 45%
- Beta Day 7 retention: 28%
- Core action completion: 67%

## Flags
- ✅ Crash-free > 99.5% (go threshold)
- ✅ Day 7 retention > 25% (go threshold)
- ⚠️ Core action completion 67% (target > 70%)
```

Flags auto-generated based on stage-specific thresholds from the lifecycle metrics research.

---

### 6. Dashboard

**Problem:** Everything is in markdown files. Hard to get a bird's-eye view across products.

**Inspiration:** OpenSwarm's dashboard aesthetic.

**Solution:** Lightweight web dashboard that reads from the git repo. No database — markdown is the source of truth.

**Stack:** Single HTML file + vanilla JS (or simple static site generator). Reads repo files via local server or GitHub API.

**Views:**

#### Portfolio Overview
```
┌─────────────────────────────────────────────────────────────┐
│ Rig Dashboard                                    2026-03-18 │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ postcall │  health  │ bulkhead │ videogen │      rig       │
│ PRE-LNCH │ BUILDING │  GROWTH  │ EXPLORE  │    GROWTH      │
│ 🟢 Ready │ 🟡 13d   │ 🟢 Stable│ 🔵 R&D  │ 🟢 Stable      │
│ 5 issues │ 5 issues │ 0 issues │ 0 issues │ 3 issues       │
│ T-7 days │ T-13 days│          │          │                │
├──────────┴──────────┴──────────┴──────────┴────────────────┤
│ Last standup: 2026-03-17                                    │
│ Decisions: 3 | Action items: 2 | Tasks dispatched: 13      │
│ Next: Weekly Review (Monday)                                │
└─────────────────────────────────────────────────────────────┘
```

#### Product Detail
- Roadmap status (in progress / planned / shipped)
- Recent metrics with threshold flags
- Open ideas ranked by ROI
- Last 5 standup mentions
- Competitive landscape summary

#### Meeting History
- Timeline of all meetings with summaries
- Decisions log across all meetings
- Action items status (open / closed)

**Implementation approach:** Static HTML generated by a script (`scripts/dashboard.sh`) that parses markdown files and outputs an `index.html` to `dashboard/`. Serve locally with `python -m http.server` or push to GitHub Pages.

---

## Implementation Order

Based on effort vs impact:

| # | Feature | Effort | Impact | Depends on |
|---|---------|--------|--------|-----------|
| 1 | Single-product focus | S | High | Nothing |
| 2 | Idea pipeline (structure + capture) | M | High | Nothing |
| 3 | Worker→Reviewer pipeline | M | High | Swarm working |
| 4 | Meeting types (Phase 1: 3 types) | M | Medium | Nothing |
| 5 | Metrics capture | M | Medium | Product stages in config |
| 6 | Idea evaluation + prioritization | M | Medium | Idea pipeline |
| 7 | Dashboard (v1: static HTML) | L | Medium | Metrics, ideas, meetings |

**Sprint 1 (today):** Features 1-3 (single-product focus, idea pipeline, worker→reviewer)
**Sprint 2 (tomorrow):** Features 4-6 (meeting types, metrics, idea evaluation)
**Sprint 3 (day after):** Feature 7 (dashboard)

---

## Config Evolution

```yaml
company:
  name: "Oddinks"
  context: "company/context.md"

products:
  - name: postcall
    stage: pre-launch
    launch_date: 2026-03-25
    repo: "xydac/postcall"
    local_path: "/home/x/working/postcall"
    description: "Privacy-focused AI meeting summaries and action items"
    metrics:
      posthog_project: postcall
      stripe_product: prod_xxx
      app_store_id: 123456
  - name: health
    stage: building
    launch_date: 2026-03-31
    repo: "oddinks/health"
    local_path: "/home/x/working/health"
    description: "Nutrition and exercise app — unnamed, work in progress"
    metrics:
      posthog_project: health
  - name: bulkhead
    stage: growth
    repo: "oddinks/bulkhead"
    local_path: "/home/x/working/bulkhead"
    description: "Remote file manager and code editor for iOS/macOS"
    metrics:
      app_store_id: 789012
  - name: videogen
    stage: exploration
    repo: ""
    local_path: "/home/x/working/videogen"
    description: "Research project — evaluating video generation with LLMs"
  - name: rig
    stage: growth
    repo: "xydac/rig"
    local_path: "/home/x/working/standupai"
    description: "Rig itself — self-monitoring"

agents:
  enabled: true
  path: "company/agents"

swarm:
  enabled: true
  teammate_model: "sonnet"
  review:
    enabled: true
    reviewer_model: "sonnet"
    max_iterations: 3
    escalate_to: "opus"
    escalate_after: 3

meetings:
  # These run autonomously every standup cycle (post-DONE)
  competitive-scan:
    trigger: post-done
    human: autonomous
  idea-evaluation:
    trigger: post-done
    human: autonomous
  validation-run:
    trigger: post-done
    human: autonomous
    only_if: code_changed
  # These are human-initiated
  deep-review:
    trigger: on-demand
    human: required
  launch-readiness:
    trigger: on-demand
    human: required
  strategy-review:
    trigger: on-demand  # monthly recommended
    human: required

standup:
  auto_commit: true
  auto_push: true
  remote: origin
```

---

## Repo Structure Evolution

```
rig/
├── company/
│   ├── context.md
│   └── agents/
│       ├── cto/
│       ├── finance/
│       ├── marketing/
│       ├── sales/
│       └── legal/
├── products/
│   └── <name>/
│       ├── roadmap.md
│       ├── backlog.md
│       ├── notes.md
│       ├── decisions/
│       ├── summaries/
│       ├── metrics/                  # NEW — daily metrics pulls
│       ├── ideas/                    # NEW — idea pipeline
│       │   ├── inbox/
│       │   ├── evaluated/
│       │   ├── validated/
│       │   ├── prioritized.md
│       │   └── rejected/
│       ├── competitive/              # NEW — competitive intel
│       └── archive/
├── meetings/                         # NEW — meeting templates
│   ├── daily-standup.md
│   ├── weekly-review.md
│   ├── competitive-scan.md
│   ├── idea-evaluation.md
│   └── launch-readiness.md
├── standups/
├── decisions/
├── dashboard/                        # NEW — generated static site
├── config.yaml
├── rig-agent.md
├── pm-agent.md
├── CLAUDE.md
└── scripts/
    ├── rig                           # MODIFIED — add --product, meeting
    ├── pre-meeting.sh                # MODIFIED — add metrics, product filter
    ├── post-meeting.sh
    ├── pull-metrics.sh               # NEW — per-product metrics
    ├── dashboard.sh                  # NEW — generate dashboard HTML
    ├── add-product.sh
    └── add-agent.sh
```

---

## Principles Carried Forward

1. **Meetings are configurations, not code** — YAML + markdown templates
2. **Human time is the scarcest resource** — automate everything possible
3. **Products have lifecycles** — stage determines metrics, meetings, intensity
4. **Everything is committed markdown** — git is the database
5. **KISS** — shell scripts, Claude Code, markdown files. No custom application code.
6. **Ideas have a lifecycle too** — capture → evaluate → validate → prioritize → build/reject
7. **Trust but verify** — Worker→Reviewer pipeline for agent output
