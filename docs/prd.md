# StandupAI — Product Requirements Document

**Version:** 0.1 (MVP) | **Date:** March 16, 2026 | **Status:** Draft

---

## Problem Statement

Engineering leaders and technical founders managing multiple products often maintain separate repositories for each product, plus a central company website. Keeping context synchronized across these projects is a constant, manual burden. There's no single source of truth that understands the full picture—what changed, what's blocked, what needs attention, and whether current work aligns with past decisions.

Daily standups solve part of this in team settings, but for solo operators or small teams managing multiple products, there's no equivalent. You end up context-switching between repos, losing track of commitments, and letting things drift out of alignment without realizing it.

**Core frustrations:**
- No holistic view across all products and their current state
- Action items from past discussions get lost or forgotten
- No persistent memory of strategic decisions and their rationale
- Checking in on each product requires manually inspecting each repo
- Driving time and other hands-free moments are wasted when they could be productive

---

## Product Vision

StandupAI is an AI-powered command center that acts as your daily standup partner. It monitors your product repositories, synthesizes updates into a coherent picture, tracks action items, and maintains a persistent memory of all past conversations and decisions. Over time, it becomes an accountability partner that can tell you whether what you're building aligns with what you committed to.

In later phases, individual "product owner" agents will represent each product, capable of surfacing concerns, asking for direction, and reporting on roadmap progress—turning your standup into a rich, multi-agent conversation.

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│           You (Chat Interface)      │
└──────────────┬──────────────────────┘
               │
                      ┌───────▼────────┐
                             │  Orchestrator   │
                                    │  Agent (Claude) │
                                           └───────┬────────┘
                                                          │
                                                              ┌──────────┼──────────────┐
                                                                  │          │              │
                                                                      ▼          ▼              ▼
                                                                      ┌────────┐ ┌────────┐  ┌──────────────┐
                                                                      │Product │ │Product │  │   Central    │
                                                                      │Repo A  │ │Repo B  │  │  Memory Repo │
                                                                      │(GitHub)│ │(GitHub)│  │  (GitHub)    │
                                                                      └────────┘ └────────┘  └──────────────┘
                                                                      ```

                                                                      **Key components:**

                                                                      - **Orchestrator Agent** — The main agent you interact with. Built on Claude (Anthropic SDK). It has tool access to GitHub and local repos, synthesizes updates, and manages the standup flow.
                                                                      - **Product Repositories** — Your existing repos. Action items and issues are tracked here as GitHub Issues, close to the code they relate to.
                                                                      - **Central Memory Repository** — A dedicated GitHub repo the agent uses to store conversation history, standup summaries, strategic decisions, research tasks, and anything that doesn't belong to a specific product.

                                                                      ---

## MVP Scope

### In Scope

1. **Chat Interface** — Text-based conversational UI to interact with the orchestrator agent.
2. **Project Configuration** — A config file (YAML) that defines all monitored repos and their local paths.
3. **Repo Monitoring** — Agent can inspect recent commits, open PRs, open issues, and README/changelog across configured repos.
4. **Daily Standup Synthesis** — On request, the agent pulls the latest from all repos and presents a unified standup summary: what changed, what's blocked, what needs attention.
5. **Action Item Creation** — From the standup conversation, the agent creates GitHub Issues in the appropriate product repo.
6. **Persistent Memory** — Conversation history, decisions, and standup summaries are stored in the central memory repo on GitHub.
7. **Historical Context** — The agent can reference past standups and action items to check alignment and follow-through.
8. **Research Tasks** — You can ask the agent to spawn research tasks, tracked as issues in the central repo (or a product repo if relevant).
9. **Built on Claude Code** — Uses the Anthropic SDK with tool use for GitHub API interactions and local repo access.

### Out of Scope (Future Phases)

- Multi-agent product owner agents
- Voice interface
- Notification system (agent-initiated alerts on discoveries)
- Dashboard / health overview UI
- Dependency tracking across products
- Customizable alert severity thresholds

---

## User Flows

### Flow 1: Daily Standup

1. User opens chat and says "Let's do our standup."
2. Agent pulls latest from all configured repos (commits, PRs, issues).
3. Agent presents a synthesized summary per product.
4. User discusses priorities, makes decisions, flags concerns.
5. Agent creates action items as GitHub Issues in the relevant product repos.
6. Agent logs the standup summary and decisions to the central memory repo.

### Flow 2: Check Alignment

1. User asks "Are we on track with what we discussed last week?"
2. Agent retrieves past standup summaries and action items from central memory.
3. Agent compares against current repo state (closed issues, new commits, open work).
4. Agent reports on alignment and flags any drift.

### Flow 3: Spawn Research Task

1. User says "I need to research X for Product B."
2. Agent creates a research issue — in Product B's repo if product-specific, or in the central repo if exploratory.
3. Research task is tracked and surfaced in future standups.

---

## Central Memory Repo Structure

```
standup-memory/
├── standups/
│   ├── 2026-03-16.md
│   ├── 2026-03-15.md
│   └── ...
├── decisions/
│   ├── 2026-03-16-pricing-strategy.md
│   └── ...
├── research/
│   └── (tracked via GitHub Issues)
├── config.yaml
└── README.md
```

**config.yaml example:**

```yaml
products:
  - name: "Product Alpha"
      repo: "org/product-alpha"
          local_path: "/home/user/projects/product-alpha"
              description: "Core analytics platform"

                - name: "Product Beta"
                    repo: "org/product-beta"
                        local_path: "/home/user/projects/product-beta"
                            description: "Customer-facing dashboard"

                              - name: "Company Website"
                                  repo: "org/company-website"
                                      local_path: "/home/user/projects/company-website"
                                          description: "Marketing site and docs"

                                          memory_repo: "org/standup-memory"
                                          ```

                                          ---

## Tech Stack

| Component | Technology |
|---|---|
| LLM | Claude (Anthropic SDK) |
| Agent Framework | Claude Code with tool use |
| Chat Interface | Terminal-based (MVP), web UI (future) |
| Version Control | GitHub API |
| Memory Store | GitHub repo (markdown + issues) |
| Configuration | YAML |
| Voice (future) | TBD |

---

## Roadmap

| Phase | Features | Priority |
|---|---|---|
| **MVP** | Chat interface, repo monitoring, standup synthesis, action items, persistent memory, research tasks | P0 |
| **Phase 1** | Notification queue (agent surfaces concerns after completing work) | P1 |
| **Phase 2** | Dashboard — bird's eye view of product health, blockers, activity, roadmap drift | P1 |
| **Phase 3** | Multi-agent product owners — each product gets its own agent that can talk to you | P2 |
| **Phase 4** | Voice interface — hands-free standup conversations (e.g., during commute) | P2 |
| **Phase 5** | Dependency tracking, cross-product impact analysis | P3 |

---

## Open Questions

1. How should the agent handle conflicts between products competing for priority?
2. What's the right granularity for standup summaries — commit-level, PR-level, or issue-level?
3. Should the central memory repo be private by default?
4. How do we handle repos that aren't on GitHub (e.g., GitLab, local-only)?
5. What does the agent do when it detects significant roadmap drift — flag it or suggest corrections?


