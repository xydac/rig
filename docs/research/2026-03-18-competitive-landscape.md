# Rig Competitive Landscape — GitHub Orchestrator Research

**Date:** 2026-03-18
**Goal:** Find similar orchestrator projects on GitHub for inspiration and differentiation.

---

## Closest Competitors & Inspirations

### 1. OpenSwarm (Intrect-io) — Most similar in spirit
**GitHub:** https://github.com/Intrect-io/OpenSwarm | 218 stars

Autonomous AI dev team orchestrator powered by Claude Code CLI. Fetches tasks from Linear, runs Worker/Reviewer pair pipelines, reports to Discord.

**Architecture:** 9-layer system: Linear → Autonomous Runner → Decision Engine → Task Scheduler → Pair Pipeline (Worker→Reviewer→Tester→Documenter) → Memory Layer (LanceDB) → Knowledge Graph → Discord → Dashboard.

**Key innovation:** Cognitive memory with weighted scoring: `0.55 * similarity + 0.20 * importance + 0.15 * recency + 0.10 * frequency`. Memory types: beliefs, strategies, user models, system patterns, constraints. Background processes handle decay, consolidation, contradiction detection.

**Lesson:** Their Worker/Reviewer pair pipeline and memory system are far ahead of our approach. We should consider a verification step after PM agents execute.

---

### 2. APM — Agentic Project Management (Most architecturally similar)
**GitHub:** https://github.com/sdi2200262/agentic-project-management | 2,113 stars

Framework for managing complex projects with AI. Works with Cursor, Claude Code, Copilot.

**Architecture:** Setup Agent (discovery, planning) → Manager Agent (coordinates, assigns, reviews) → Implementation Agents (execute, log to Memory Banks). Uses "Handover Protocols" for context transfer between agents.

**Key innovation:** "Memory Banks" solve context window limitations — structured context retention across agent handovers.

**Lesson:** Their Manager/Worker hierarchy mirrors our Rig/PM agent design. Memory Banks and Handover Protocols solve the cross-session context problem we'll face.

---

### 3. oh-my-claudecode — Teams-first multi-agent
**GitHub:** https://github.com/Yeachan-Heo/oh-my-claudecode | 10,330 stars

32 specialized agents. Pipeline: plan → PRD → exec → verify → fix (loop). Spawns real tmux CLI workers.

**Architecture:** Mixed runtimes (Codex for security, Gemini for UI). Smart model routing saves 30-50% tokens. Persistent execution loop that won't stop until verification confirms completion.

**Key innovation:** The verify→fix loop. "Magic keywords" for common patterns (similar to our "DONE").

**Lesson:** We lack a verification loop. After PM agents execute, we don't verify output quality. Their mixed-model routing for cost savings is also smart.

---

### 4. agent-orchestrator (Composio)
**GitHub:** https://github.com/ComposioHQ/agent-orchestrator | 4,807 stars

Agent-agnostic orchestrator supporting Claude Code, Codex, Aider. Each agent gets its own git worktree, branch, and PR.

**Architecture:** 8 swappable plugin layers (Runtime, Agent, Workspace, Tracker, SCM, Notifier, Terminal, Lifecycle). Supports tmux, Docker, Kubernetes.

**Key innovation:** "Reactions" system — when CI fails, agents automatically receive failure logs and retry. Integrates with GitHub Issues and Linear.

**Lesson:** Plugin architecture is more flexible than our hardcoded approach. Auto-retry on CI failure is worth considering.

---

### 5. wshobson/agents — Largest community
**GitHub:** https://github.com/wshobson/agents | 31,623 stars

112 specialized agents in 72 plugins with 146 skills. Plugin-based — each plugin loads only its specific agents.

**Architecture:** Three-tier model (Opus/Sonnet/Haiku). "Conductor" plugin for plan-spec-implement. Progressive disclosure — skills activate only when needed.

**Key innovation:** Context loading on demand, not upfront. Minimizes token usage.

**Lesson:** We load all agent context at startup. On-demand loading would reduce token cost significantly.

---

### 6. ruflo — Enterprise-scale swarms
**GitHub:** https://github.com/ruvnet/ruflo | 21,635 stars

Coordinates 60+ agents. Topologies: mesh, hierarchical, ring, star. "Queen agents" coordinate 8 worker types.

**Key innovation:** Anti-drift safeguards — hierarchical coordination prevents multi-agent goal divergence. Self-learning router.

**Lesson:** Goal drift is a real risk with autonomous PM agents. We need safeguards.

---

### 7. ccswarm — Quality gates
**GitHub:** https://github.com/nwiizo/ccswarm | 126 stars

Rust CLI coordinating Claude Code agents with git worktree isolation. Master coordinates specialized agents.

**Key innovation:** LLM Quality Judge — a separate LLM evaluates agent output with multi-dimensional scoring before merging.

**Lesson:** Quality gate on PM agent output would catch drift and errors.

---

### 8. overstory — Structured messaging
**GitHub:** https://github.com/jayminwest/overstory | 1,054 stars

Multi-agent orchestration with pluggable runtime adapters. SQLite mail system for inter-agent messaging.

**Key innovation:** 8 typed message protocols (~1-5ms queries). Explicit STEELMAN.md warning about compounding errors.

**Lesson:** Our EXECUTE/COMPLETED/BLOCKED messaging could be more structured with typed protocols.

---

## Standup-Specific Tools

### AutoStand-UP-Agent
**GitHub:** https://github.com/emanalytic/AutoStand-UP-Agent | 6 stars

Async agent pulling GitHub + Notion activity, LLM summarization, Slack delivery. GitHub Actions cron-driven.

**Lesson:** Pre-meeting summaries should be auto-generated from git activity, not manually written.

### Gitmore (Commercial)
**URL:** https://gitmore.io

SaaS connecting to GitHub/GitLab, AI-categorizes activity (features, bugs, refactoring, docs, DevOps). Claims 5+ hours saved weekly.

**Lesson:** Auto-categorization of git activity would make our pre-meeting summaries more useful.

---

## What Makes Rig Unique

After reviewing 20+ projects, the landscape splits into:

1. **Code orchestrators** (agents, ruflo, oh-my-claudecode) — parallelize coding, no product management
2. **Standup generators** (AutoStand-UP-Agent, Gitmore) — summarize git, no decisions or roadmaps
3. **PM frameworks** (APM) — single project, no cross-product portfolio view

**Nobody is building what Rig is:** A daily operating cadence spanning multiple products, combining company-level context (advisors, strategy), dispatching autonomous PM agents per product, with different meeting types at different cadences. A product command center for a solo founder managing a portfolio.

---

## Patterns to Steal

| Pattern | From | Priority | What it gives us |
|---------|------|----------|-----------------|
| **Verify→Fix loop** | oh-my-claudecode | High | Quality gate after PM agent execution |
| **Worker/Reviewer pairs** | OpenSwarm | High | Don't trust single-agent output |
| **Memory with weighted scoring** | OpenSwarm | Medium | Smarter context across standups |
| **On-demand context loading** | wshobson/agents | Medium | Token savings at session start |
| **Auto-retry on CI failure** | Composio | Medium | PM agents self-heal on test failures |
| **Anti-drift safeguards** | ruflo | Medium | Prevent PM agents from going off-track |
| **Quality Judge** | ccswarm | Medium | LLM evaluates agent output before merge |
| **Typed message protocols** | overstory | Low | More robust inter-agent communication |
| **Git activity auto-categorization** | Gitmore | Low | Better pre-meeting summaries |
| **Visual dashboard** | AgentBase | Future | Bird's-eye view of all products |

---

## Sources

- https://github.com/wshobson/agents
- https://github.com/Yeachan-Heo/oh-my-claudecode
- https://github.com/ComposioHQ/agent-orchestrator
- https://github.com/Intrect-io/OpenSwarm
- https://github.com/ruvnet/ruflo
- https://github.com/jayminwest/overstory
- https://github.com/nwiizo/ccswarm
- https://github.com/emanalytic/AutoStand-UP-Agent
- https://github.com/sdi2200262/agentic-project-management
- https://github.com/AgentOrchestrator/AgentBase
- https://maecapozzi.com/blog/building-a-multi-agent-orchestrator
- https://shipyard.build/blog/claude-code-multi-agent/
- https://github.blog/ai-and-ml/automate-repository-tasks-with-github-agentic-workflows/
- https://gitmore.io
