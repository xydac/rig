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

### AI-Native Cadence (Not Human-Week Cadence)

AI agents don't need weekly schedules. They can run "a week's worth" of analysis in minutes. The cadence model should be:

**Every standup cycle (after DONE):**
- Competitive scan (autonomous) — runs alongside PM agent execution
- Idea evaluation (autonomous) — scores any new inbox ideas
- Validation run (autonomous) — if PM agents changed code
- Metrics pull (autonomous) — updates product metrics
- Content/marketing tasks (autonomous) — if assigned

**Human-initiated (on-demand):**
- Deep review — when you want to focus on one product
- Launch readiness — when approaching a launch date
- Pivot-or-persevere — when you need to make a strategic call
- Strategy review — monthly, when you want the big picture

**What a standup day looks like:**

```
You run ./scripts/rig
  → Pre-meeting: git activity + metrics pulled (2 min)
  → Talk mode: standup conversation (15-30 min human)
  → You say DONE
  → PM agents execute coding tasks         ┐
  → Competitive scan runs in background     │ all parallel,
  → Idea evaluation runs in background      │ all autonomous
  → Validation runs after code changes      ┘
  → Everything commits and pushes
  → You're done. Come back tomorrow.
```

**Human time: 15-30 min/day.** Everything else is autonomous and runs in parallel after DONE.

The bottleneck is **your attention**, not agent capacity. Agents should do as much as possible every cycle, not wait for arbitrary calendar dates.

---

## Product Lifecycle Stages

Different products need different meeting intensities AND different metrics. The stage determines what you measure, what meetings you run, and what signals trigger stage transitions.

### Stage Overview

| Stage | Example | Meeting Focus | Key Question |
|-------|---------|---------------|-------------|
| **Exploration** | Videogen | Pivot-or-persevere monthly, light standups | Should we build this? |
| **Building** | Health | Daily standups, sprint planning, validation runs | Are we shipping fast enough? |
| **Pre-Launch** | Postcall | Launch readiness (escalating), QA blitz, marketing prep | Is it ready for real users? |
| **Growth** | BulkHead | Weekly metrics, competitive scans, content planning | Is growth sustainable? |
| **Maintenance** | — | Light standups, autonomous validation, quarterly reviews | Is it still worth maintaining? |

### Exploration Stage Metrics

**Goal:** Determine if a real market exists before writing code.

| Metric | Kill / Continue Threshold | How to Capture |
|--------|--------------------------|----------------|
| Landing page conversion (email signup) | < 5% = weak; > 10% = strong | Plausible goals |
| Landing page "buy" click | < 2% = kill; > 5% = build | Plausible / PostHog |
| "Very disappointed" survey | < 20% = kill; > 40% = PMF signal | Email survey (manual) |
| Pre-sales / waitlist | Any pre-sale = strong signal | Stripe / Gumroad |
| Problem interview hit rate | < 30% "real problem" = kill | Manual (20-30 conversations) |
| Competitor revenue signals | Competitors at $10K+ MRR = market exists | IndieHackers / SimilarWeb (manual) |

**Transition to Building:** At least ONE of: 50+ waitlist, 5+ pre-sales, or > 40% "very disappointed." Budget: $50-200 and 2-4 weeks max.

### Building Stage Metrics

**Goal:** Ship efficiently without over-engineering.

| Metric | Healthy Range | How to Capture |
|--------|--------------|----------------|
| Weekly commit frequency | Consistent > 0 every week | `git log --since="1 week ago" --oneline \| wc -l` |
| Time to first working prototype | < 4 weeks for MVP | Calendar |
| MVP feature completion | Track % of milestone issues closed | GitHub Milestones API |
| Build success rate | > 95% green | GitHub Actions |
| Scope creep ratio | > 1.5x original scope = red flag | GitHub Issues API (new vs original) |
| Days since last deploy | > 14 days = stalling | GitHub Releases API |
| Test coverage (core paths) | 60-80% | CI coverage reports |

**Transition to Pre-Launch:** Core user flow works end-to-end. All MVP issues closed. Time to get it in front of real users.

### Pre-Launch Stage Metrics

**Goal:** Validate real users can use it and get value.

| Metric | Go/No-Go Threshold | How to Capture |
|--------|-------------------|----------------|
| Crash-free session rate | < 99.0% = don't launch; > 99.5% = go | App Store Connect API / Sentry |
| Beta Day 1 retention | > 40% | PostHog |
| Beta Day 7 retention | > 25% | PostHog |
| Core action completion | > 60% of users complete primary action | PostHog custom events |
| NPS from beta testers | < 20 = major issues; > 30 = healthy | In-app survey (manual) |
| Bug report rate | Decreasing trend over beta | GitHub Issues API |
| Time to first value | < 2 min simple apps; < 5 min complex | PostHog funnel |

**Go/No-Go Checklist:**
- [ ] Crash-free sessions > 99.5%
- [ ] No P0/P1 bugs open
- [ ] Core flow works without confusion
- [ ] 5+ beta users independently completed core action
- [ ] NPS > 20
- [ ] App Store metadata ready

**Transition to Launch:** All go/no-go items checked.

### Launch Stage Metrics (First 30 Days)

**Goal:** Determine if the product has real traction.

| Metric | Average / Good / Great | How to Capture |
|--------|----------------------|----------------|
| Day 1 retention | 26% / 35% / 45% | PostHog |
| Day 7 retention | 13% / 20% / 30% | PostHog |
| Day 30 retention | 8% / 12% / 20% | PostHog |
| Trial → paid conversion | > 8% monthly; > 15% annual | Stripe |
| App Store rating | > 4.0 = viable; < 3.5 = fix quality | App Store Connect API |
| Organic vs paid ratio | > 50% organic = strong signal | Attribution tracking |
| Support ticket rate | < 5% of users | Help desk / email |

**Red flags:** Retention drops to zero by Day 7. Zero organic signups after launch spike. Downloads but zero engagement.

**Transition to Growth:** Retention curves flatten (even at 5%). Some users convert to paid unprompted. Positive reviews appear organically.

### Growth Stage Metrics

**Goal:** Sustainable revenue growth.

| Metric | Healthy Benchmark | How to Capture |
|--------|------------------|----------------|
| MRR growth | 5-15% MoM early; 20-25% YoY at scale | Stripe |
| Monthly churn | < 5% SMB; < 3% prosumer | Stripe |
| Net Revenue Retention (NRR) | > 100% = expanding; 104% median bootstrapped | Stripe |
| LTV:CAC ratio | > 3x minimum; > 5x = healthy | Stripe + ad spend |
| DAU/MAU (stickiness) | 13% SaaS avg; > 20% good; > 25% excellent | PostHog |
| Feature adoption | > 20% of users use new feature within 30 days | PostHog |

**Sustainable vs vanity growth:**
- Sustainable: Revenue growing, churn flat, NRR > 100%, organic > 30%
- Vanity: Downloads up but revenue flat, DAU/MAU declining, growth from single channel

**Transition to Maintenance:** Growth flattens, product stable, your time better spent elsewhere.

### Maintenance Stage Metrics

**Goal:** Detect decline early, decide when to reinvest.

| Metric | Warning Signal | How to Capture |
|--------|---------------|----------------|
| MRR trend | 3+ months flat or declining | Stripe |
| Churn trend | Increasing > 0.5% per quarter | Stripe |
| NRR | Dropping below 95% | Stripe |
| App Store rating trend | Below 4.0 | App Store Connect API |
| Crash rate trend | Increasing after OS updates | Sentry |

**Decision framework:**
- **Invest more:** NRR > 100%, users asking for features, adjacent market exists
- **Autopilot:** NRR 95-100%, churn stable, profit positive, time better elsewhere
- **Sunset/sell:** NRR < 90% for 6+ months, maintenance > profit, no turnaround path

---

## Metrics Capture Infrastructure

### The Pre-Meeting Metrics Pull

Extend `scripts/pre-meeting.sh` to pull metrics alongside git/GitHub data:

```bash
# Per product, based on stage:
# GitHub: commits, issues closed, PRs
gh api repos/OWNER/REPO/issues --jq '[.[] | select(.closed_at > "DATE")] | length'

# Stripe: MRR, churn (for products with payments)
stripe billing meters list 2>/dev/null

# App Store Connect: downloads, crashes, ratings (for iOS products)
# via App-Store-Connect-CLI or API

# PostHog: retention, DAU (for products with analytics)
# curl PostHog API → write to summary
```

Results written to `products/<name>/metrics/<date>.md` — agents read this during meetings.

### Recommended Stack (Solo Founder)

| Tool | What it captures | Cost |
|------|-----------------|------|
| **PostHog** | Retention, funnels, DAU/MAU, feature adoption | Free (1M events/mo) |
| **Plausible** | Web analytics, referrers, goals | $9/mo or self-host |
| **Stripe** | MRR, churn, NRR, LTV, trial conversion | Free (built-in) |
| **App Store Connect** | Downloads, crashes, ratings, sessions | Free (built-in) |
| **Sentry** | Crash rates, error tracking | Free tier |
| **GitHub** | Commits, issues, PRs, build status | Free |
| **RevenueCat** | In-app purchase analytics | Free < $2.5K MRR |

### Automated vs Manual

**Automated (cron/script):** GitHub metrics, Stripe MRR/churn, App Store crashes/downloads, PostHog retention, Sentry crash rates

**Semi-automated (periodic script):** App Store reviews/ratings, social media followers, search rankings

**Manual (no automation path):** Customer interviews, NPS surveys, competitor deep dives, CAC calculation, "very disappointed" PMF survey

---

## Config with Lifecycle Stages

```yaml
products:
  - name: postcall
    stage: pre-launch
    launch_date: 2026-03-25
    metrics:
      posthog_project: postcall
      stripe_product: prod_xxx
      app_store_id: 123456
  - name: health
    stage: building
    launch_date: 2026-03-31
    metrics:
      posthog_project: health
  - name: bulkhead
    stage: growth
    metrics:
      app_store_id: 789012
      stripe_product: prod_yyy
  - name: videogen
    stage: exploration
```

Rig reads the stage and adjusts:
- Which metrics to pull in pre-meeting
- Which meetings the product participates in
- What thresholds to flag (e.g., pre-launch product with crash rate < 99% = alert)

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
