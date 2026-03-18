# Validation Swarm Research

**Date:** 2026-03-17
**Goal:** Research how to create a group of AI agents that can use products (via simulator or browser), provide expert feedback, and create a development feedback loop.

---

## The Problem

AI can write code, but "AI doing everything doesn't scale." We need agents that can:
- Actually **use** the products (not just read code)
- Have different **expertise** (UX, accessibility, performance, domain)
- Provide **structured feedback** that feeds back into development
- Be **smart about cost** — not burn tokens on things that don't matter

---

## What's Available Today

### Browser Automation (for Postcall web app)

| Tool | How it works | Best for |
|------|-------------|----------|
| **Playwright MCP** (Microsoft) | Accessibility snapshots + actions, no screenshots needed | Fast, reliable web testing |
| **Claude Code + Chrome** (`claude --chrome`) | Direct browser control via Chrome extension | Authenticated app testing, visual checks |
| **Computer Use API** | Screenshot → analyze → click/type | Complex visual interactions |

**Recommendation:** Playwright MCP for automated validation, Claude Code Chrome for interactive sessions. Playwright is faster and cheaper (accessibility snapshots = 10-50 tokens vs screenshots = 1,600-6,300 tokens).

### iOS Simulator Automation (for BulkHead, Health)

| Tool | How it works | Best for |
|------|-------------|----------|
| **iOS Simulator MCP** (joshuayoes) | Screenshots + accessibility tree + tap/type/swipe via IDB | Development/debugging |
| **iOS Simulator Skill** (conorluddy) | 21 Python scripts, semantic navigation, 96% token reduction | Token-efficient validation |
| **Maestro** | YAML-based declarative test flows | Structured QA, CI/CD |
| **xcrun simctl** | Apple's native CLI for simulator control | Foundation layer for everything |

**Recommendation:** iOS Simulator Skill for Claude Code agents (most token-efficient). Maestro for repeatable QA flows that run in CI.

**The full loop works today:**
```
Build (xcodebuild) → Install (simctl) → Launch → Screenshot → Parse accessibility tree → Tap/type → Verify → Iterate
```

---

## The Screening Funnel — Being Smart About Scale

Research strongly supports a **tiered model**, not "AI validates everything":

### Tier 1: Full Automation (80% of issues, 10% of cost)
- WCAG accessibility rule checks
- Security vulnerability scanning
- Performance regression detection
- Style/lint enforcement
- API contract validation
- Broken links, missing assets, 404s

### Tier 2: AI First Pass, Human Confirms (15% of issues, 40% of cost)
- UX heuristic evaluation (AI flags, human confirms)
- Architecture drift detection
- Design critique (spacing, hierarchy, visual consistency)
- Complex accessibility (screen reader flows)
- Competitive feature gap analysis

### Tier 3: Human-Led, AI-Assisted (5% of issues, 50% of cost)
- Business requirement validation
- Novel interaction patterns
- Brand and voice consistency
- Strategic product decisions

**Key finding:** AI heuristic UX evaluations achieve 50-75% accuracy. At 75% accuracy, they miss 81% of what human experts find. Use AI to screen for obvious problems, not to replace expert review.

---

## Proposed Agent Roles

For Oddinks products, these roles map to real validation needs:

### 1. QA Agent (per product)
- Runs the app, follows user flows, reports bugs
- Uses simulator (iOS) or browser (web) to interact
- Captures screenshots at each step for evidence
- **Tools:** iOS Simulator Skill / Playwright MCP

### 2. Accessibility Agent
- WCAG 2.1 AA compliance checks
- Screen reader navigation testing
- Color contrast, text sizing, touch target sizes
- **Tools:** axe-core (web), accessibility tree parsing (iOS)

### 3. UX Reviewer Agent
- First-time user flow evaluation
- Friction point identification
- Navigation consistency across screens
- **Tools:** Screenshot analysis + accessibility tree

### 4. Performance Agent
- App launch time, screen transition speed
- Network request analysis
- Memory/battery impact (via Instruments CLI)
- **Tools:** Xcode Instruments CLI, Lighthouse (web)

### 5. Domain Expert Agent (per product)
- BulkHead: file manager UX, protocol-specific testing (SFTP, SMB, S3)
- Postcall: meeting flow, transcription quality, privacy compliance
- Health: nutrition data accuracy, exercise tracking UX
- **Tools:** Product-specific knowledge + general testing tools

---

## Architecture: How It Fits Into Rig

```
Standup (Talk Mode)
    │
    ▼
"DONE" → PM Agents execute development tasks
    │
    ▼
Development complete → Trigger validation swarm
    │
    ├── QA Agent: runs app, follows flows, reports bugs
    ├── Accessibility Agent: WCAG checks
    ├── UX Agent: friction analysis
    ├── Performance Agent: benchmarks
    └── Domain Agent: product-specific validation
    │
    ▼
Results → Structured findings (pass/fail + details)
    │
    ▼
Findings → GitHub issues (auto-created for failures)
         → Fed back into next standup summary
```

### Integration with existing Rig flow

1. PM agents finish coding → trigger validation
2. Validation agents run in the product repo (same as PM agents)
3. Each validation agent produces a structured report in `products/<name>/validations/<date>.md`
4. Critical failures → auto-create GitHub issues
5. Next standup's pre-meeting script includes validation results in the summary

### When to run validation

- **After PM agent execution** (post-DONE, before post-meeting)
- **On-demand** during talk mode ("validate postcall")
- **Scheduled** (future: nightly validation runs via cron)

---

## Cost Considerations

| Agent Type | Tokens per run (est.) | Frequency |
|-----------|----------------------|-----------|
| QA (screenshot-heavy) | 50-100k | Per standup with code changes |
| Accessibility | 10-30k | Per standup with UI changes |
| UX Review | 30-50k | Weekly or on major changes |
| Performance | 5-10k | Per standup with code changes |
| Domain Expert | 20-40k | Per standup with code changes |

**Smart scheduling:** Only run validation agents for products that had code changes. Skip products with no PM agent tasks.

**Token efficiency:** Use accessibility trees over screenshots where possible (10-50 tokens vs 1,600-6,300 per screenshot). Reserve screenshots for visual validation only.

---

## Competitive Intelligence — Beyond Validation

These agents shouldn't just test your products — they should **use competitor products too** and feed insights back into product decisions.

### How it works

The same tools (Playwright MCP for web, iOS Simulator for mobile, Claude Code Chrome for authenticated apps) can interact with competitor products:

- **Web competitors:** Playwright or Chrome extension navigates competitor sites, captures flows, analyzes UX patterns
- **iOS competitors:** Install competitor apps from TestFlight or App Store into the simulator, run through flows, capture screenshots
- **Public APIs:** Hit competitor APIs to understand capabilities, pricing, rate limits

### Competitive Agent Roles

#### Product Scout Agent
- Uses competitor products periodically (weekly or on-demand)
- Documents their UX flows, onboarding, pricing, and key features
- Captures screenshots and writes structured comparison reports
- Stores findings in `products/<name>/competitive/`

#### Benchmark Agent
- Runs the same user flow in your product AND a competitor's product
- Side-by-side comparison: speed, steps to complete, friction points
- Example: "Creating a meeting summary takes 3 taps in Postcall vs 5 in Otter.ai"
- Tracks benchmarks over time — are you gaining or losing ground?

#### Feature Gap Analyst
- Maintains a feature matrix per product (yours vs competitors)
- After each competitor review, updates the gap analysis
- Flags when a competitor ships something relevant to your roadmap
- Feeds into backlog prioritization during standups

### Competitive data structure

```
products/
└── postcall/
    ├── competitive/
    │   ├── landscape.md              # feature matrix, positioning
    │   ├── otter-ai/
    │   │   ├── 2026-03-17.md         # dated review
    │   │   └── screenshots/
    │   ├── fireflies/
    │   │   └── ...
    │   └── granola/
    │       └── ...
    ├── roadmap.md
    └── backlog.md
```

### How it feeds back into Rig

1. **Pre-meeting:** Competitive agent's latest findings appear in product summaries
2. **Talk mode:** "How does our onboarding compare to Otter?" → orchestrator asks the competitive agent or reads the latest report
3. **Decisions:** Competitive insights inform roadmap/backlog prioritization
4. **Post-DONE:** PM agents can reference competitive findings when implementing features ("match Otter's 3-tap flow")

### When to run competitive reviews

- **Weekly:** Quick scan of competitor landing pages, app store listings, changelogs
- **On-demand:** Deep dive before a major feature decision ("should we add speaker diarization?")
- **Triggered:** When a competitor ships a notable update (monitor via RSS, app store version tracking, or changelog pages)

### Practical limitations

- **App Store apps:** Can install on simulator but some features require real device / account
- **Authenticated competitors:** Need test accounts — some competitors block automation
- **Token cost:** Full competitive review is expensive (many screenshots). Use targeted reviews, not exhaustive crawls
- **Freshness:** Competitor products change — reviews decay. Date everything, re-run periodically

---

## Unified Agent Taxonomy

Combining validation + competitive intelligence, here's the full roster:

| Agent | Purpose | Inward (your product) | Outward (competitors) |
|-------|---------|----------------------|----------------------|
| **QA Agent** | Functional testing | Run flows, report bugs | — |
| **Accessibility Agent** | WCAG compliance | Audit your app | Audit competitor apps |
| **UX Reviewer** | Friction analysis | Evaluate your UX | Compare UX patterns |
| **Performance Agent** | Speed benchmarks | Measure your app | Benchmark vs competitors |
| **Domain Expert** | Product-specific | Deep product knowledge | Feature gap analysis |
| **Product Scout** | Market intelligence | — | Monitor competitors |
| **Benchmark Agent** | Side-by-side comparison | Your flow | Competitor flow |

Not every agent runs every time. Smart scheduling:
- **Every standup with code changes:** QA, Accessibility
- **Weekly:** UX Reviewer, Product Scout
- **On-demand:** Benchmark Agent, Domain Expert deep dives
- **Before major decisions:** Full competitive sweep

---

## Implementation Phases

### Phase 1: Foundation (do first)
- Install iOS Simulator MCP + Playwright MCP
- Create validation agent prompt templates (like pm-agent.md)
- Add `products/<name>/validations/` folder structure
- Wire validation into post-DONE flow

### Phase 2: Core Agents
- QA Agent — can launch app, navigate flows, report bugs
- Accessibility Agent — WCAG automated checks
- Wire findings into GitHub issues

### Phase 3: Competitive Intelligence
- Product Scout — monitor competitor products, capture flows
- Benchmark Agent — side-by-side flow comparisons
- Add `products/<name>/competitive/` structure
- Feature gap matrix per product

### Phase 4: Advanced Agents
- UX Reviewer — screenshot-based friction analysis
- Performance Agent — benchmark tracking
- Domain Expert — product-specific deep dives

### Phase 5: Feedback Loop
- Validation + competitive results appear in pre-meeting summaries
- Trends tracked across standups
- ntfy notifications for critical failures
- Competitive alerts when competitors ship notable updates

---

## Key Takeaways

1. **The tools exist today** — Playwright MCP, iOS Simulator Skill, Claude Code Chrome integration all work
2. **Use the screening funnel** — automate Tier 1, AI-assist Tier 2, human-lead Tier 3
3. **Accessibility trees > screenshots** for most validation (96% token savings)
4. **Only validate what changed** — skip products with no code changes
5. **Structured findings, not opinions** — pass/fail + evidence, routed to GitHub issues
6. **Start with QA + Accessibility** — highest ROI, most deterministic results
7. **Same tools work for competitive analysis** — Playwright and iOS Simulator can interact with competitor products too
8. **Competitive intel feeds into standups** — not a separate process, it's part of the Rig flow
9. **Date everything** — competitive findings decay fast, re-run periodically

---

## Sources

- [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [iOS Simulator Skill for Claude Code](https://github.com/conorluddy/ios-simulator-skill)
- [iOS Simulator MCP Server](https://github.com/joshuayoes/ios-simulator-mcp)
- [Claude Code Chrome Integration](https://code.claude.com/docs/en/chrome)
- [Closing the Loop on iOS with Claude Code](https://twocentstudios.com/2025/12/27/closing-the-loop-on-ios-with-claude-code/)
- [Maestro Mobile Testing](https://docs.maestro.dev)
- [Baymard: AI Heuristic UX Evaluations](https://baymard.com/blog/ai-heuristic-evaluations)
- [Anthropic: Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [Qodo: Multi-Agent Code Review](https://www.qodo.ai/blog/single-agent-vs-multi-agent-code-review/)
