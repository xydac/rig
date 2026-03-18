# Marketing Agent Swarm Research

**Date:** 2026-03-17
**Source:** @thewizeai content marketing agent framework (8 agents)
**Goal:** Evaluate whether these marketing AI agent roles can be adapted as Rig company agents to automate content marketing across Oddinks products.

---

## The 8 Agent Roles

### 1. Strategy Audit Agent
**Role:** Social media growth strategist for B2B solopreneurs
**Outputs:**
- Brand positioning (what makes you distinctly different from 10 competitors)
- Platform pick (which 1-2 platforms fit your offer, audience, and time)
- Content direction (3 angles that resonate most with your audience)
- 90-day roadmap (follower milestones, content volume, engagement benchmarks)
- Monetization path (how content converts to leads or sales)

**Context needed:** Niche description, offer, follower counts per platform, monthly revenue, time available per week.

**Rig fit:** Run quarterly or when launching a new product. Stores output in `company/agents/strategy/memory/`.

---

### 2. Audience ICP Builder Agent
**Role:** Consumer psychologist using Jobs-to-be-Done framework
**Outputs:**
- Functional job (the specific problem they solve by consuming your content)
- Emotional job (how they want to feel after seeing your posts)
- Social job (how they want others to see them for following you)
- Their exact language to describe their problem (their words, not yours)
- 3 content topics that stop their scroll
- 1 belief they hold that you can correct publicly to build authority

**Context needed:** Audience demographics, niche/topic, offer, biggest complaint about your niche.

**Rig fit:** Run once per product, update quarterly. The ICP doc becomes a reference for all other marketing agents. Store in `products/<name>/marketing/icp.md`.

---

### 3. Competitor Gap Analysis Agent
**Role:** Content strategist finding whitespace in crowded niches
**Outputs:**
- Topic gaps (5 angles competitors skip but audience wants)
- Format gaps (content types competitors underuse on your platform)
- Tone gap (emotional register they miss — too polished, not human)
- Positioning gap (a claim you can own that no one in your niche is making)
- Quick win (one post this week that outperforms your niche)

**Context needed:** Niche description, 3-5 main competitors + their positioning, your positioning.

**Rig fit:** Run monthly or before major content pushes. Pairs naturally with the Product Scout agent from validation swarm — same competitors, different lens (product vs. content). Store in `products/<name>/marketing/competitive-content.md`.

---

### 4. Content Pillar Matrix Agent
**Role:** Content architect building sustainable publishing systems
**Outputs:**
- 4 pillars mapped to funnel stages: Awareness, Trust, Authority, Conversion
- 3 specific post topics per pillar for your platform
- Content ratio (what % of content should be each pillar)
- Which pillar to lead with this month based on current stage
- Repurposing strategy (one piece across all 4 pillars)

**Context needed:** Platform, offer, stage (new/growing/monetizing), posting frequency.

**Rig fit:** Run once, update monthly. This is the structural backbone for the calendar agent. Store in `products/<name>/marketing/pillars.md`.

---

### 5. 30-Day Platform Calendar Agent
**Role:** Content strategist who understands algorithm behavior and audience psychology
**Outputs:**
- 30-day calendar (date, content type, topic, opening hook, post goal)
- Optimal posting frequency for platform and audience size
- Best days and times for niche audience
- 3 evergreen posts to reuse every 90 days
- Week 1 post to prioritize for maximum early momentum

**Context needed:** Platform, niche, offer, frequency commitment.

**Rig fit:** Run monthly. Output goes to `products/<name>/marketing/calendar-<month>.md`. This is the most actionable output — directly feeds what you publish.

---

### 6. Hook Formula Generator Agent
**Role:** Direct response copywriter specializing in scroll-stopping hooks
**Outputs:**
- 10 hooks using 5 formulas:
  - Pattern interrupt ("Everyone says X. They're wrong.")
  - Specific number ("I analyzed 200 posts.")
  - Counterintuitive ("Post less to grow faster.")
  - Credibility + result ("0 to 40K followers in 6 months.")
  - Direct address ("If you're a [person] with [problem], read this.")
- Psychological trigger each hook uses
- Top 2 ranked by scroll-stopping power for specific audience

**Context needed:** Post topic, audience description, platform.

**Rig fit:** Run on-demand when creating content. Could be triggered by the calendar agent — "generate hooks for this week's posts." Ephemeral output, doesn't need persistent storage.

---

### 7. Follower-to-Client System Agent
**Role:** Social media sales strategist for service-based solopreneurs
**Outputs:**
- 3 post types that generate inbound DMs from buyers (not just followers)
- CTA language that converts engagement to conversations without feeling salesy
- DM opener (first message when someone engages, natural not scripted)
- 5-post warming sequence (cold follower → ready buyer)
- Benchmark: what ratio of engaged followers converts to DMs at your stage

**Context needed:** Offer + price, platform, engagement rate, buyer timeline.

**Rig fit:** Run once per product that has a conversion funnel, update quarterly. Store in `products/<name>/marketing/conversion-playbook.md`.

---

### 8. Monthly Performance Audit Agent
**Role:** Social media analyst focused on revenue-predicting metrics
**Outputs:**
- 5 metrics to track monthly (not likes/impressions — ones that predict growth and sales)
- How to diagnose why a post flopped (hook, topic, format, or CTA?)
- What a healthy engagement rate looks like for platform and audience size
- Top 3 content angles from last month to double down on
- One change to make next month based on results

**Context needed:** Platform, followers, avg likes, avg comments, leads from content, revenue from content.

**Rig fit:** Run monthly after collecting metrics. Output goes to `products/<name>/marketing/performance-<month>.md`. Feeds into next month's strategy and calendar.

---

## How These Map to Rig

### Option A: Expand the existing Marketing company agent
Currently `company/agents/marketing/agent.md` is a lightweight advisor. Expand it into a marketing agent with sub-workflows:

```
company/agents/marketing/
├── agent.md                    # orchestrator for marketing tasks
├── memory/                     # persistent context
├── workflows/
│   ├── strategy-audit.md       # quarterly
│   ├── icp-builder.md          # per product, quarterly refresh
│   ├── competitor-gap.md       # monthly
│   ├── content-pillars.md      # monthly refresh
│   ├── calendar.md             # monthly
│   ├── hook-generator.md       # on-demand
│   ├── conversion-system.md    # quarterly
│   └── performance-audit.md    # monthly
└── research/
```

Each workflow is a prompt template the marketing agent can execute. This keeps it as one company agent with multiple capabilities.

### Option B: Split into multiple company agents
Create separate agents for distinct concerns:

```
company/agents/content-strategist/    # strategy, pillars, calendar
company/agents/copywriter/            # hooks, CTAs, copy
company/agents/growth-analyst/        # performance audits, metrics
company/agents/audience-researcher/   # ICP, competitor gaps
```

### Recommendation: Option A
These 8 roles are tightly coupled — the ICP feeds the pillars, pillars feed the calendar, calendar needs hooks, performance audits inform next month's strategy. Splitting them creates coordination overhead. One marketing agent with workflow templates is simpler and matches the KISS philosophy.

---

## Per-Product Marketing Structure

```
products/
└── postcall/
    ├── marketing/
    │   ├── icp.md                    # ideal customer profile
    │   ├── pillars.md                # content pillar matrix
    │   ├── competitive-content.md    # competitor content gaps
    │   ├── conversion-playbook.md    # follower-to-client system
    │   ├── calendar-2026-04.md       # monthly calendar
    │   └── performance-2026-03.md    # monthly performance audit
    ├── roadmap.md
    └── backlog.md
```

---

## Integration with Rig Standup Flow

### During standups (talk mode)
- Marketing agent chimes in when product discussion touches go-to-market, launches, or content
- Can reference latest ICP, content gaps, or performance data
- Example: "Postcall is ready for TestFlight" → Marketing: "Before launch, we should have the content pillars and a 2-week launch calendar ready"

### Execution (post-DONE)
- Marketing agent workflows can be assigned as tasks
- Example: "Generate April content calendar for Postcall" → marketing agent runs the calendar workflow, outputs to `products/postcall/marketing/calendar-2026-04.md`

### Monthly rhythm
- Week 1: Performance audit (previous month)
- Week 1: Competitor gap analysis (refresh)
- Week 2: Update content pillars if needed
- Week 2: Generate next month's calendar
- Ongoing: Hook generation as needed

---

## Practical Considerations

### What works well with AI
- **ICP building** — AI is good at synthesizing audience research into structured profiles
- **Content calendars** — AI generates solid first drafts, human refines
- **Hook formulas** — AI can produce volume; quality requires human curation (pick best 2-3 from 10)
- **Competitor content analysis** — AI can browse competitor profiles and identify patterns
- **Performance analysis** — AI is good at reading metrics and identifying trends

### What needs human judgment
- **Brand voice** — AI can approximate but you need to calibrate and correct
- **Platform nuance** — algorithm changes faster than AI's training data
- **Conversion copy** — high-stakes CTAs need human review before publishing
- **Authenticity** — AI-generated content needs your personal perspective injected
- **Strategic bets** — "should we be on TikTok?" is a business decision, not an AI decision

### Token cost estimate
| Workflow | Frequency | Est. tokens |
|----------|-----------|-------------|
| Strategy Audit | Quarterly | 5-10k |
| ICP Builder | Quarterly per product | 5-10k |
| Competitor Gap | Monthly | 10-20k |
| Content Pillars | Monthly | 5-10k |
| 30-Day Calendar | Monthly | 10-15k |
| Hook Generator | On-demand | 3-5k |
| Conversion System | Quarterly | 5-10k |
| Performance Audit | Monthly | 5-10k |

Monthly cost for one product: ~30-55k tokens. For 4 products: ~120-220k tokens. Manageable.

---

## Next Steps

1. Expand `company/agents/marketing/agent.md` with awareness of these workflows
2. Create workflow templates in `company/agents/marketing/workflows/`
3. Add `marketing/` folder to product workspace structure
4. Wire monthly marketing tasks into the standup rhythm
5. Start with ICP + Content Pillars for Postcall (closest to launch)
