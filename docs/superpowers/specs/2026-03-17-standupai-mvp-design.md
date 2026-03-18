# StandupAI MVP Design Spec

**Date:** 2026-03-17 | **Status:** Draft

---

## Prerequisites

Required tools (must be installed and configured):

- `git` — version control
- `gh` — GitHub CLI, authenticated (`gh auth status` must pass)
- `claude` — Claude Code CLI
- `yq` — YAML parser for shell scripts

Optional:
- A GitHub remote for the standupai repo (required for `auto_push`)

---

## Overview

StandupAI is a thin shell wrapper over Claude Code that provides a structured daily standup experience across multiple products. It is a git repo of markdown files and shell scripts — no application code.

One command (`./standup`) runs the full flow: pre-meeting context gathering, a Claude Code agent session, and post-meeting commit of all artifacts.

---

## Architecture

StandupAI is not an application. It is:

- A **structured git repository** of markdown files (standups, decisions, roadmaps, backlogs, agent personas)
- A **Claude Code custom agent** (`standup-agent.md`) that knows how to operate within this structure
- **Shell scripts** that handle the pre/post lifecycle around the agent session

Everything is committed to git. Conversations, decisions, roadmap changes, persona updates — all durable, searchable, and diffable.

---

## Repo Structure

```
standupai/
├── company/
│   ├── context.md                        # mission, principles, strategy, quarter focus
│   └── agents/
│       ├── cto/
│       │   ├── agent.md                  # system prompt / persona
│       │   └── memory/                   # agent's persistent context
│       ├── finance/
│       │   └── (same structure)
│       ├── marketing/
│       │   └── (same structure)
│       ├── sales/
│       │   └── (same structure)
│       └── legal/
│           └── (same structure)
├── products/
│   ├── bulkhead/
│   │   ├── roadmap.md                    # planned, in-progress, shipped
│   │   ├── backlog.md                    # ideas, feature requests, prioritized
│   │   ├── decisions/                    # product-level decision log
│   │   ├── summaries/                    # pre-meeting generated summaries
│   │   ├── notes.md                      # running context, gotchas, tribal knowledge
│   │   └── archive/                      # archived items
│   ├── health/
│   │   └── (same structure)
│   ├── postcall/
│   │   └── (same structure)
│   ├── videogen/
│   │   └── (same structure)
│   └── standupai/                         # self-monitoring
│       └── (same structure)
├── standups/                              # cross-product standup logs
│   └── 2026-03-17.md
├── decisions/                             # cross-product / company-level decisions
├── config.yaml                            # global configuration
├── standup-agent.md                       # orchestrator agent system prompt
├── CLAUDE.md                              # minimal, points to standup-agent.md
└── scripts/
    ├── standup                            # main entry point
    ├── pre-meeting.sh                     # gathers context per product
    ├── post-meeting.sh                    # commits everything, creates issues
    ├── add-product.sh                     # onboard a new product
    └── add-agent.sh                       # onboard a new company agent
```

---

## Standup Flow

### Pre-meeting (`scripts/pre-meeting.sh`)

1. Reads `config.yaml` for all registered products
2. Finds the last standup date from `standups/` directory
3. For each product:
   - Runs `git log --since=<last-standup>` against the product repo
   - Runs `gh issue list` for open issues
   - Runs `gh pr list` for open PRs
   - Writes a structured summary to `products/<name>/summaries/<date>.md`
4. Loads company context and agent personas into session context

### Standup session

1. Launches `claude` from the standupai repo directory (uses `CLAUDE.md` which loads the standup agent context)
2. Agent presents cross-product highlights summary
3. Freeform conversation — user steers, agent follows
4. Orchestrator pulls in company agent perspectives when relevant (role-played inline, e.g., *"[CTO]: This adds a third database — worth considering consolidation"*)
5. Agent writes to files during the session:
   - New decisions to `decisions/` (product-level or company-level)
   - Roadmap and backlog updates
   - Company agent persona updates
   - Action items written to `standups/.action-items-<date>.md` (structured file for post-meeting script to parse)
6. Agent can check alignment on request — compares past standup decisions and action items against current repo state, flags drift
7. Agent can spawn research tasks — creates GitHub issues in the relevant product repo or company-level, tracked and surfaced in future standups
8. Before session ends, agent writes a standup summary to `standups/<date>.md` (what was discussed, decisions made, action items)

### Post-meeting (`scripts/post-meeting.sh`)

1. Standup summary already written by the agent during the session to `standups/<date>.md`
2. Parses `standups/.action-items-<date>.md` and creates GitHub issues via `gh issue create` in the appropriate repos
3. Removes the temporary action items file after processing
4. Commits all changed files with message `standup: <date>`
5. Pushes to remote (if `auto_push` is enabled)

---

## Orchestrator Agent (`standup-agent.md`)

### Identity

- StandupAI, a daily standup partner and product command center
- Has context on all products via pre-meeting summaries
- Maintains persistent memory through committed markdown files

### Behavior

- Opens with a cross-product highlights summary (what changed, what's blocked, what needs attention)
- Lets the user steer the conversation (freeform, not structured per-product)
- When discussion touches a company agent's domain, reads their persona file and presents their perspective prefixed with role name
- When decisions are made, writes them to the appropriate `decisions/` folder
- When action items emerge, writes them to `standups/.action-items-<date>.md` in a structured format (see Action Items Contract below)
- When roadmap or backlog changes, updates the relevant markdown files
- When a company agent persona should evolve based on the conversation, updates that persona file
- On request, checks alignment — reads past standups from `standups/` and decisions from `decisions/`, compares against current repo state, and reports on follow-through and drift
- Can spawn research tasks as GitHub issues via `gh issue create` with a `research` label
- Before the session ends, writes a standup summary to `standups/<date>.md`

### Tools available

- Standard Claude Code file read/write (for all markdown files)
- `gh` CLI (for creating issues, checking PR status)
- `git` (for repo inspection)

### Context loaded at session start

- `company/context.md`
- All pre-meeting summaries from `products/*/summaries/<today>.md`
- Last standup from `standups/` (most recent)
- All company agent persona files from `company/agents/*/agent.md`
- Access to all historical standups and decisions via file read (for alignment checks)

### Action Items Contract

The agent writes action items to `standups/.action-items-<date>.md` in this format:

```markdown
- repo: org/bulkhead
  title: "Refactor auth middleware"
  body: "Discussed during standup — current impl has session token issues"
  labels: ["action-item"]

- repo: org/postcall
  title: "Research WebRTC alternatives"
  body: "Need to evaluate options for lower-latency voice"
  labels: ["action-item", "research"]
```

The post-meeting script parses this file and runs `gh issue create` for each entry.

---

## Company Agent Personas

### File format (`company/agents/<role>/agent.md`)

```markdown
# [Role] Agent

## Identity
You are the [Role] for [Company]. [Core responsibility.]

## You prioritize
- [3-5 bullets on what matters most]

## You push back when
- [Conditions that trigger concern]

## You speak up about
- [Topics this role proactively raises]

## Current context
- [Evolving section — updated from standup conversations]
```

### How they participate (MVP)

- Orchestrator reads all persona files at session start
- When a topic overlaps with an agent's domain, orchestrator presents their perspective inline
- If the user refines or disagrees with a perspective, orchestrator updates the persona file
- Company agents can influence GitHub issues by having their opinions noted in issue comments

### Agent workspace

For MVP, each agent has `agent.md` and `memory/`. Additional directories (`research/`, `workflows/`) will be added in Phase 3 when agents become autonomous sub-agents.

### Note on PRD divergence

The PRD describes future "product owner" agents (one per product). This spec introduces company-level *functional role* agents (CTO, Finance, etc.) instead. This is a deliberate design choice — functional roles provide cross-product perspective during standups, while per-product agents are a Phase 3 concern when products need autonomous representation.

---

## Configuration

### Global `config.yaml`

```yaml
company:
  name: ""
  context: "company/context.md"

products:
  - name: bulkhead
    repo: "org/bulkhead"
    local_path: "/home/x/working/bulkhead"
    description: ""
  - name: health
    repo: "org/health"
    local_path: "/home/x/working/health"
    description: ""
  - name: postcall
    repo: "org/postcall"
    local_path: "/home/x/working/postcall"
    description: ""
  - name: videogen
    repo: "org/videogen"
    local_path: "/home/x/working/videogen"
    description: ""
  - name: standupai
    repo: "org/standupai"
    local_path: "/home/x/working/standupai"
    description: "StandupAI itself — self-monitoring"

agents:
  enabled: true
  path: "company/agents"

standup:
  auto_commit: true
  auto_push: true
  remote: origin
```

Product-specific settings (repo, local_path, description) are defined in the global config under the `products` list. No separate per-product config file is needed — keeps the source of truth in one place.

---

## Scripts

### `scripts/standup` (main entry point)

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

case "${1:-run}" in
  run)
    "$SCRIPT_DIR/pre-meeting.sh"
    cd "$ROOT_DIR" && claude
    "$SCRIPT_DIR/post-meeting.sh"
    ;;
  add-product)
    "$SCRIPT_DIR/add-product.sh"
    ;;
  add-agent)
    "$SCRIPT_DIR/add-agent.sh"
    ;;
  pre)
    "$SCRIPT_DIR/pre-meeting.sh"
    ;;
  post)
    "$SCRIPT_DIR/post-meeting.sh"
    ;;
esac
```

The `CLAUDE.md` file at the repo root includes the standup agent system prompt (from `standup-agent.md`) so that launching `claude` from the repo directory automatically loads the standup persona and context.

### `scripts/pre-meeting.sh`

- Reads global `config.yaml` (using `yq` or simple parsing)
- Finds last standup date from `standups/` folder
- For each product: gathers git log, gh issues, gh PRs since last standup
- Writes structured summary to `products/<name>/summaries/<date>.md`

### `scripts/post-meeting.sh`

- Parses `standups/.action-items-<date>.md` and creates GitHub issues via `gh issue create`
- Removes the temporary action items file after processing
- `git add` all changed files in the standupai repo
- Commits with message `standup: <date>`
- Pushes to remote (if `auto_push` is enabled)

### `scripts/add-product.sh`

- Prompts for name, repo URL, local path, description
- Creates product folder with standard structure (roadmap.md, backlog.md, decisions/, summaries/, notes.md, archive/)
- Adds entry to global `config.yaml`
- Runs initial repo scan to seed `notes.md` with baseline context
- Commits the scaffolded product

### `scripts/add-agent.sh`

- Prompts for role name and a brief description of the role's responsibility
- Creates `company/agents/<role>/` with:
  - `agent.md` — pre-filled template with the standard persona format (Identity, You prioritize, You push back when, You speak up about, Current context)
  - `memory/` — empty directory for the agent's persistent context
- Commits the scaffolded agent

---

## Self-monitoring

StandupAI is registered as a product in its own `config.yaml`, so it monitors itself during standups. The pre-meeting script gathers commits, issues, and PRs for the standupai repo just like any other product. This means:

- New agents, config changes, and script improvements show up in standup summaries
- Action items for improving StandupAI itself are tracked the same way
- The roadmap and backlog for StandupAI live in `products/standupai/`

---

## Data Flow

```
Product Repos (GitHub)
        │
        ▼
  pre-meeting.sh ──→ products/*/summaries/<date>.md
        │
        ▼
  Claude Code Session (standup-agent.md)
   │  reads: summaries, company context, agent personas, last standup
   │  writes: decisions, roadmap updates, backlog items, persona updates
        │
        ▼
  post-meeting.sh ──→ git commit + push
                   ──→ gh issue create (action items)
```

---

## Edge Cases

- **First run (no prior standups):** Pre-meeting script defaults to gathering the last 7 days of activity when no prior standup exists in `standups/`.
- **Multiple standups per day:** Standup files use `<date>-<sequence>.md` format (e.g., `2026-03-17-1.md`, `2026-03-17-2.md`). The pre-meeting script always uses the most recent file regardless of naming.
- **Product repo not found:** Pre-meeting script warns and skips products whose `local_path` does not exist. The standup summary notes which products were skipped.
- **gh CLI not authenticated:** Pre-meeting script checks `gh auth status` at start and exits with a clear error if not authenticated.
- **No changes since last standup:** Products with no new commits, issues, or PRs get a brief "no changes" note in their summary rather than being omitted.

---

## Strategic separation

| Layer | Where it lives | Managed by |
|---|---|---|
| Strategic (roadmap, decisions, backlogs) | StandupAI repo | Standup conversations |
| Tactical (bugs, tasks, features) | GitHub Issues in product repos | GitHub + standup action items |
| Execution (code, PRs, commits) | Product repos | Developer workflow |

---

## MVP vs Future

### MVP (this spec)
- Shell scripts + Claude Code custom agent
- Freeform standup flow with highlights
- Company agents role-played by orchestrator
- Markdown files committed to git
- Product onboarding via `add-product`

### Future phases
- **Phase 1:** Agent-driven standup flow (prioritizes what to discuss)
- **Phase 2:** Dashboard — reader on top of the markdown structure
- **Phase 3:** Autonomous company agent sub-agents with own workstreams
- **Phase 4:** Voice interface for hands-free standups
- **Phase 5:** Cross-product dependency tracking
