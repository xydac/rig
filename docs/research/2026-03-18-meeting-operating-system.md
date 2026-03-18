# Rig as a Meeting Operating System

**Date:** 2026-03-18
**Goal:** Evolve Rig from a "daily standup tool" into a meeting operating system where different meeting types trigger different agent configurations at different cadences, with or without a human present.

---

## Core Insight

A standup is just one type of meeting. A multi-product company needs many types of meetings at different rhythms. Instead of building separate tools for each, Rig becomes the **scheduler and orchestrator** for all of them — each meeting type is a configuration that specifies:

- **What** gets discussed (scope, agenda)
- **Who** participates (which agents, human required or not)
- **When** it runs (cadence, trigger)
- **Where** it runs (company-level or product-level)

---

## The Three Axes

Every meeting varies on:

| Axis | Options |
|------|---------|
| **Scope** | Company-wide, product-level, cross-product |
| **Cadence** | Daily, weekly, monthly, quarterly, ad-hoc, event-triggered |
| **Human involvement** | Required, optional (review output later), fully autonomous |

---

## Meeting Types for Oddinks

### Company-Level Meetings

| Meeting | Cadence | Human | Agents Involved | Purpose |
|---------|---------|-------|-----------------|---------|
| **Daily Standup** | Daily | Required | All PM agents, company advisors | Cross-product sync, blockers, priorities |
| **Weekly Review** | Weekly | Required | All PM agents | What shipped, what's next, metrics check |
| **Portfolio Review** | Monthly | Required | All PM agents, CTO, Finance | Are products aligned? Resource conflicts? Strategic drift? |
| **Strategy Review** | Quarterly | Required | All PM agents, all company agents | Big picture direction, OKR setting, pivot-or-persevere per product |
| **Competitive Scan** | Weekly | Autonomous | Product Scout, Marketing | Monitor competitor changes, content gaps |
| **Content Planning** | Monthly | Optional | Marketing | Generate content calendars, pillars, hooks per product |
| **Performance Audit** | Monthly | Optional | Marketing, Finance | Metrics review across all products |

### Product-Level Meetings

| Meeting | Cadence | Human | Agents Involved | Purpose |
|---------|---------|-------|-----------------|---------|
| **Sprint Planning** | Weekly | Optional | PM agent for that product | Prioritize backlog, set weekly goals |
| **Launch Readiness** | Ad-hoc (ramps up) | Required | PM, QA, Marketing, CTO | Go/no-go checklist before release |
| **Market Fit Check** | Monthly | Required | PM, Audience ICP, Marketing | Are we solving the right problem? Retention, engagement, willingness to pay |
| **Post-Mortem** | Ad-hoc | Required | PM, CTO | What went wrong, what to fix |
| **Validation Run** | After code changes | Autonomous | QA, Accessibility, Performance | Test the product, report issues |
| **Customer Feedback Sync** | Bi-weekly | Required | PM, Sales | Synthesize support tickets, reviews, feedback |
| **Pivot or Persevere** | Monthly | Required | PM, Finance, CTO, Marketing | Explicit decision: scale, persevere, pivot, or kill |

### Event-Triggered Meetings

| Trigger | Meeting | Human | Agents |
|---------|---------|-------|--------|
| Launch date T-14 days | Launch War Room (daily) | Required | PM, QA, Marketing, CTO |
| Launch date T-2 days | Go/No-Go Decision | Required | All relevant agents |
| Post-launch day 1-7 | Monitoring Standup (daily) | Optional | PM, QA |
| Critical bug reported | Incident Response | Required | PM, CTO |
| Competitor ships major update | Competitive Alert | Autonomous | Product Scout |
| Monthly metrics available | Performance Review | Optional | Marketing, Finance |

---

## Human Involvement Matrix

**Rule: Automate the information-gathering, keep humans for the sense-making and deciding.**

### Human Required (decisions, judgment, creativity)
- Strategy and direction-setting
- Pivot-or-persevere decisions
- Launch go/no-go
- Customer discovery calls
- Post-mortems with sensitive context
- Brainstorming with many unknowns
- Any meeting where the outcome is a commitment

### Human Optional (review output later)
- Weekly sprint planning (agents draft, you review and adjust)
- Content calendar generation (agents draft, you approve)
- Performance audits (agents analyze, you read the report)
- Launch readiness checklists (agents check items, you review gaps)

### Fully Autonomous (no human needed)
- Daily code activity summaries
- Competitive scans (monitor, report, file to markdown)
- Validation runs (QA, accessibility, performance)
- Metrics collection and dashboarding
- Content hook generation (bulk produce, human curates later)

---

## How Rig Orchestrates This

### Meeting Configuration

Each meeting type is defined in a config file:

```yaml
# config.yaml (extended)
meetings:
  daily-standup:
    type: company
    cadence: daily
    human: required
    agents:
      - all-pm-agents
      - company-advisors
    pre_meeting: scripts/pre-meeting.sh
    post_meeting: scripts/post-meeting.sh

  weekly-review:
    type: company
    cadence: weekly  # monday
    human: required
    agents:
      - all-pm-agents

  competitive-scan:
    type: company
    cadence: weekly  # sunday night
    human: autonomous
    agents:
      - product-scout
      - marketing
    outputs:
      - products/*/competitive/weekly-<date>.md

  validation-run:
    type: product
    cadence: on-change  # triggered by PM agent commits
    human: autonomous
    agents:
      - qa
      - accessibility
      - performance
    outputs:
      - products/<name>/validations/<date>.md

  content-planning:
    type: company
    cadence: monthly  # first week
    human: optional
    agents:
      - marketing
    outputs:
      - products/*/marketing/calendar-<month>.md

  launch-readiness:
    type: product
    cadence: event-triggered  # T-14 days from launch date
    human: required
    agents:
      - pm
      - qa
      - marketing
      - cto
    trigger: launch_date - 14 days

  market-fit-check:
    type: product
    cadence: monthly
    human: required
    agents:
      - pm
      - marketing
      - finance

  pivot-or-persevere:
    type: product
    cadence: monthly
    human: required
    agents:
      - pm
      - finance
      - cto
      - marketing

  portfolio-review:
    type: company
    cadence: monthly
    human: required
    agents:
      - all-pm-agents
      - cto
      - finance

  strategy-review:
    type: company
    cadence: quarterly
    human: required
    agents:
      - all-pm-agents
      - all-company-agents
```

### Running a Meeting

```bash
# Daily standup (current behavior)
./scripts/rig

# Specific meeting type
./scripts/rig meeting weekly-review
./scripts/rig meeting competitive-scan
./scripts/rig meeting launch-readiness --product postcall

# List upcoming meetings
./scripts/rig schedule

# Run all autonomous meetings that are due
./scripts/rig auto
```

### The `rig auto` Command

This is the big unlock. Autonomous meetings run on a schedule (via cron or manual trigger):

```bash
# In crontab:
# Weekly competitive scan, Sunday 8pm
0 20 * * 0  /path/to/scripts/rig auto competitive-scan

# Daily validation after business hours
0 18 * * *  /path/to/scripts/rig auto validation-run

# Monthly content planning, 1st of month
0 9 1 * *   /path/to/scripts/rig auto content-planning
```

Autonomous meetings:
1. Run pre-meeting to gather context
2. Launch Claude Code with the meeting-specific agent config
3. Agents do their work, write outputs to markdown
4. Post-meeting commits and pushes
5. (Future) ntfy notification with summary

---

## Meeting Prompt Templates

Each meeting type gets a prompt template (like `pm-agent.md` but for meetings):

```
meetings/
├── daily-standup.md         # current rig-agent.md behavior
├── weekly-review.md         # deeper review, metrics-focused
├── competitive-scan.md      # Product Scout instructions
├── validation-run.md        # QA/accessibility agent instructions
├── content-planning.md      # Marketing calendar workflow
├── launch-readiness.md      # Go/no-go checklist
├── market-fit-check.md      # PMF evaluation framework
├── pivot-or-persevere.md    # Decision framework
├── portfolio-review.md      # Cross-product alignment
└── strategy-review.md       # Quarterly big picture
```

The orchestrator reads the meeting template and configures agents accordingly. Each template defines:
- Meeting purpose and agenda
- Which agents to spawn and their roles for this meeting
- What outputs to produce
- Decision framework (if applicable)

---

## Solo Founder's Recommended Rhythm

Adapted from research on startup cadences:

### Daily
- **Daily Standup** (human required, 15-20 min) — already built

### Weekly
- **Weekly Review** (human required, 30 min, Monday) — deeper than standup, set week's priorities
- **Competitive Scan** (autonomous, Sunday night) — agents monitor competitors, write report

### Monthly
- **Portfolio Review** (human required, 1-2 hours, 1st week) — are products aligned? Resource conflicts?
- **Market Fit Check** (human required, per product with active users) — retention, engagement, PMF signals
- **Content Planning** (human optional) — agents generate calendars, you approve
- **Performance Audit** (human optional) — agents analyze metrics, you read report
- **Pivot or Persevere** (human required, per product) — explicit decision: scale, persevere, pivot, or kill

### Quarterly
- **Strategy Review** (human required, half day) — big picture direction, OKR setting

### Event-Triggered
- **Launch Readiness** (T-14 days, escalating cadence)
- **Validation Run** (after PM agents commit code)
- **Post-Mortem** (after incidents)
- **Competitive Alert** (when competitor ships notable update)

### What this looks like in a week

```
Monday:    Weekly Review (30 min, human)
Tuesday:   Daily Standup (15 min, human)
Wednesday: Daily Standup (15 min, human)
Thursday:  Daily Standup (15 min, human)
Friday:    Daily Standup (15 min, human)
Sunday:    Competitive Scan (autonomous, overnight)

Background: Validation runs after any code changes (autonomous)
```

**Total human time: ~2 hours/week** for 4 products. Everything else runs autonomously.

---

## Product Lifecycle Stages

Different products need different meeting intensities:

| Stage | Example | Meeting Focus |
|-------|---------|---------------|
| **Exploration** | Videogen | Market fit checks, pivot-or-persevere monthly, light standups |
| **Building** | Health | Daily standups, sprint planning, validation runs after changes |
| **Pre-Launch** | Postcall | Launch readiness (escalating), QA blitz, marketing prep |
| **Growth** | BulkHead | Weekly metrics, competitive scans, content planning, performance audits |
| **Maintenance** | — | Light standups, autonomous validation, quarterly reviews |

Rig could track each product's lifecycle stage in `config.yaml` and adjust default meeting participation accordingly:

```yaml
products:
  - name: postcall
    stage: pre-launch
    launch_date: 2026-03-25
  - name: health
    stage: building
    launch_date: 2026-03-31
  - name: bulkhead
    stage: growth
  - name: videogen
    stage: exploration
```

Products in `exploration` stage get fewer meetings. Products approaching `launch_date` automatically trigger launch readiness cadence.

---

## Implementation Path

### Phase 1: Meeting Types (next)
- Add `meetings/` folder with prompt templates
- Extend `config.yaml` with meetings config
- Add `./scripts/rig meeting <type>` command
- Daily standup remains the default `./scripts/rig`

### Phase 2: Autonomous Meetings
- Add `./scripts/rig auto` command
- Cron integration for scheduled autonomous meetings
- Competitive scan and validation run as first autonomous meetings

### Phase 3: Smart Scheduling
- Product lifecycle stages in config
- Launch date triggers
- `./scripts/rig schedule` shows upcoming meetings
- Automatic cadence adjustment based on product stage

### Phase 4: Meeting Memory
- Each meeting type has its own log folder (`meetings/logs/<type>/`)
- Agents reference past meetings of the same type for continuity
- "Last month's portfolio review decided X — are we on track?"

---

## Key Principles

1. **Meetings are configurations, not code** — adding a new meeting type is writing a markdown template and a YAML block, not programming
2. **Human time is the scarcest resource** — minimize it by making most meetings autonomous or optional
3. **Products have lifecycles** — meeting intensity should match the product's stage
4. **Every meeting produces artifacts** — decisions, action items, reports. All committed to git.
5. **The daily standup is just the default meeting** — Rig runs many meeting types, standup is the most frequent one that requires a human
