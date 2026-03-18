# Product Lifecycle Metrics for Indie/Bootstrapped Software

Research date: 2026-03-18

Practical, specific metrics for each stage of a product lifecycle — calibrated for solo founders and bootstrapped products, not VC-backed startups.

---

## 1. Exploration Stage (Idea Validation, Research Phase)

**Goal:** Determine if a real market exists and if people will pay, before writing code.

### Key Metrics

| Metric | How to Measure | Kill / Continue Threshold |
|---|---|---|
| Landing page conversion (visitor -> email signup) | Landing page + analytics | < 5% = weak signal; > 10% = strong signal |
| Landing page conversion (visitor -> "buy/preorder" click) | Fake door test / pricing page click | < 2% = kill; > 5% = build |
| Survey: "very disappointed" if product gone | Sean Ellis PMF survey (ask target users) | < 20% = kill; > 40% = PMF signal |
| Pre-sales / waitlist signups | Gumroad preorder, Stripe payment link | Any pre-sale = strong signal |
| Problem interview hit rate | Manual outreach (aim for 20-30 conversations) | < 30% say "yes this is a real problem" = kill |
| Competitor revenue signals | IndieHackers, BuiltWith, SimilarWeb | Competitors doing $10K+ MRR = market exists |
| Search volume for problem keywords | Google Trends, Ahrefs free tier | < 100 monthly searches = niche (fine for B2B); 1K+ = consumer viable |
| Reddit/forum post engagement | Post about the problem, measure responses | < 5 replies = low interest; 20+ = signal |

### Minimum Signal to Move to Building
- At least ONE of: 50+ waitlist signups, 5+ pre-sales, or > 40% "very disappointed" survey result
- Clear articulation of who the customer is (not "everyone")
- Estimated willingness-to-pay matches your revenue target

### Cost to Validate
- Landing page test: $50-200 (domain + hosting + $50-100 ad spend)
- Time budget: 2-4 weeks max before deciding

---

## 2. Building Stage (Actively Developing, Pre-Users)

**Goal:** Ship a usable product efficiently without over-engineering.

### Key Metrics

| Metric | How to Measure | Healthy Range |
|---|---|---|
| Weekly commit frequency | GitHub API / git log | Consistent > 0 every week; spikes fine |
| Time to first working prototype | Calendar | < 4 weeks for MVP |
| Feature completion vs. MVP scope | GitHub issues/milestones | Track % of MVP issues closed |
| Build success rate | CI/CD (GitHub Actions) | > 95% green builds |
| Test coverage (if applicable) | CI coverage reports | 60-80% for core paths; don't chase 100% |
| Days since last deploy/build | GitHub releases/tags | > 14 days = stalling |
| Scope creep ratio | New issues added / original scope | > 1.5x original scope = red flag |
| Technical debt markers | TODO count, known bug count | Track trend, not absolute number |

### What Actually Matters at This Stage
- **Shipping cadence** over code quality perfection
- **Working software** over comprehensive tests
- Are you building what you validated, or drifting into features nobody asked for?

### Automated Capture
- GitHub Actions: track build times, success rates, test coverage per commit
- `git log --oneline --since="1 week ago" | wc -l` for weekly commit count
- GitHub milestones API for feature completion percentage
- GitHub Issues API for scope tracking (count issues added after milestone creation)

---

## 3. Pre-Launch Stage (Beta/TestFlight, Preparing for Public Release)

**Goal:** Validate that real users can use the product and get value from it.

### Key Metrics

| Metric | Source | Go/No-Go Threshold |
|---|---|---|
| Crash-free session rate | Xcode Organizer / App Store Connect API / Sentry | < 99.0% = do not launch; > 99.5% = go |
| Crash-free user rate | Same | > 99.9% = production-ready target |
| Beta user retention (Day 1) | PostHog / manual tracking | > 40% (higher bar than public, since these are motivated testers) |
| Beta user retention (Day 7) | PostHog / manual tracking | > 25% |
| Session length | PostHog / analytics | Depends on app type; track trend, not absolute |
| Core action completion rate | Custom event tracking | > 60% of users complete the primary action |
| NPS from beta testers | In-app survey or email | < 20 = major issues; 30-50 = healthy; > 50 = strong |
| Bug report rate | TestFlight feedback / GitHub issues | Decreasing trend over beta period |
| Time to first value | Custom event (signup -> first meaningful action) | < 2 minutes for simple apps; < 5 min for complex |
| Beta tester organic referrals | Ask "how did you hear about this?" | Any organic referral = strong signal |

### Go/No-Go Checklist
- [ ] Crash-free sessions > 99.5%
- [ ] No P0/P1 bugs open
- [ ] Core user flow works end-to-end without confusion
- [ ] At least 5 beta users independently completed the core action
- [ ] NPS > 20 (ideally > 30)
- [ ] App Store / Play Store metadata ready (screenshots, description, keywords)

### Automated Capture
- **App Store Connect API**: crash rates, beta tester count, build metrics
- **App-Store-Connect-CLI** (github.com/rudrankriyam/App-Store-Connect-CLI): scriptable access to TestFlight, analytics, builds
- **PostHog**: free tier covers 1M events/month — retention, funnels, session replay
- **Sentry**: crash reporting with API access

---

## 4. Launch Stage (First 30 Days Public)

**Goal:** Determine if the product has real traction or is a dud.

### Key Metrics

| Metric | Benchmark (Indie/Bootstrapped) | Source |
|---|---|---|
| **Day 1 retention** | > 26% average; > 35% = good; > 45% = great | PostHog / analytics |
| **Day 7 retention** | > 13% average; > 20% = good; > 30% = great | PostHog / analytics |
| **Day 30 retention** | > 8% average; > 12% = good; > 20% = great | PostHog / analytics |
| Daily downloads/signups (Week 1) | Context-dependent; track velocity trend | App Store Connect / Stripe |
| Download -> signup conversion | > 30% = healthy | Analytics |
| Signup -> paid conversion | > 2% = okay; > 5% = good; > 10% = great | Stripe |
| Trial -> paid conversion | > 15% = healthy for annual; > 8% for monthly | Stripe |
| App Store rating | > 4.0 stars = viable; < 3.5 = fix quality first | App Store Connect API |
| First review velocity | First 5-star review within 48 hours = good sign | App Store Connect API |
| Organic vs. paid ratio | > 50% organic = strong product signal | Attribution tracking |
| Support ticket rate | < 5% of users = healthy | Email / help desk |

### Platform-Specific Benchmarks

**iOS App Store (based on 2025 data):**
- Day 1 retention: 27% average (iOS tends higher than Android)
- Day 7 retention: 14% average
- Day 30 retention: 8% average

**Android:**
- Day 1 retention: 24% average
- Day 7 retention: 11% average
- Day 30 retention: 6% average

### What "Working" Looks Like at 30 Days
- Retention curves flatten (stop dropping) somewhere — even if it's at 5%, that's a base
- At least some users convert to paid without being asked twice
- Positive reviews appear organically
- You get inbound "how do I do X?" questions (means people are trying to use it)

### Red Flags
- Retention curve drops to near-zero by Day 7
- Zero organic signups after initial launch spike
- Only downloads from Product Hunt / launch day, then nothing
- Lots of downloads, zero engagement

---

## 5. Growth Stage (Product-Market Fit Achieved, Scaling)

**Goal:** Sustainable revenue growth without burning out as a solo founder.

### Revenue Metrics

| Metric | Healthy Benchmark (Bootstrapped) | Source |
|---|---|---|
| MRR growth rate | 5-15% month-over-month early; 20-25% YoY at scale | Stripe |
| Monthly churn (logo) | < 5% for SMB; < 3% for prosumer; < 1% for enterprise | Stripe |
| Monthly revenue churn | < 3-5% gross; net negative churn = best case | Stripe |
| Annual churn | < 10% for SMB-focused; < 5% for mid-market | Stripe |
| Net Revenue Retention (NRR) | > 100% = expanding; 104% median for bootstrapped | Stripe |
| LTV | > 3x CAC minimum; > 5x = healthy | Stripe + ad spend data |
| CAC payback period | < 12 months; < 6 months = great | Stripe + ad spend |
| ARPU | Track trend; increasing = good (upsells working) | Stripe |
| Rule of 40 | Growth % + Profit % >= 40 | Accounting |

### Engagement Metrics

| Metric | Benchmark | Source |
|---|---|---|
| DAU/MAU ratio (stickiness) | 13% = SaaS average; > 20% = good; > 25% = excellent | PostHog |
| Feature adoption rate | > 20% of users use a new feature within 30 days | PostHog |
| Session frequency | Depends on product type — track trend | PostHog |
| Time to value for new users | Decreasing over time = good (onboarding improving) | PostHog |

### Sustainable vs. Vanity Growth Signals

**Sustainable growth:**
- Revenue growing while churn stays flat or decreases
- NRR > 100% (existing customers paying you more over time)
- Organic/word-of-mouth signups > 30% of total
- Support ticket rate stays flat as user base grows
- LTV:CAC ratio improving or stable

**Vanity growth (warning signs):**
- Downloads/signups growing but revenue flat
- DAU growing but DAU/MAU ratio declining (lots of one-time visitors)
- Revenue growing only because of new customers (high churn masked by acquisition)
- CAC increasing faster than LTV
- Growth dependent on a single channel

---

## 6. Maintenance/Mature Stage (Stable, Not Growing Fast)

**Goal:** Maximize profit, detect decline early, decide when to reinvest.

### Health Monitoring Metrics

| Metric | Warning Signal | Source |
|---|---|---|
| MRR trend | 3+ months of flat or declining | Stripe |
| Churn trend | Monthly churn increasing by > 0.5% per quarter | Stripe |
| NRR | Dropping below 95% | Stripe |
| DAU/MAU trend | Declining stickiness over 3+ months | PostHog |
| Support ticket trend | Increasing volume = product decay | Help desk |
| App Store rating trend | Dropping below 4.0 | App Store Connect API |
| Competitor landscape | New entrants eating your niche | Manual review |
| Feature request velocity | Slowing = either satisfied or disengaged | GitHub issues |
| Crash rate trend | Increasing after OS updates = tech debt | Sentry / App Store Connect |

### Decision Framework

**Invest more if:**
- NRR > 100% and users are asking for more features
- A clear adjacent market exists (new platform, new audience)
- Competitors are entering but your retention is still strong
- You have cash reserves to fund 3-6 months of focused work

**Autopilot if:**
- NRR 95-100%, churn stable, revenue covering costs + profit
- No obvious growth lever you haven't tried
- Your time is better spent on another product
- The product "just works" with minimal support burden

**Consider sunsetting/selling if:**
- NRR < 90% for 6+ months
- Churn accelerating despite retention efforts
- Technical platform risk (API dependency being deprecated, etc.)
- Revenue declining and no clear turnaround path
- Maintenance burden exceeds profit

---

## How to Capture These Metrics Practically

### Fully Automatable (API-driven, set up once)

| Data Source | What You Get | API / Tool | Cost |
|---|---|---|---|
| **GitHub API** | Commits, PRs, issues, milestones, build status | REST API + Actions | Free |
| **GitHub Actions** | Build success rate, test coverage, deploy frequency | Built-in | Free (2000 min/mo) |
| **App Store Connect API** | Downloads, crashes, ratings, sessions, retention | REST API + CLI tool | Free |
| **Stripe API** | MRR, churn, LTV, ARPU, subscriber count, trial conversions | REST API + Dashboard | Free (built-in) |
| **Stripe Billing Analytics** | MRR, churn, NRR — built into dashboard | Dashboard + CSV export | Free with Billing |
| **PostHog** | Retention, funnels, DAU/MAU, session replay, feature flags | JS SDK + API | Free up to 1M events/mo |
| **Sentry** | Crash rates, error tracking, performance | SDK + API | Free tier |
| **Plausible** | Page views, visitors, referrers, goals | Lightweight JS + API | $9/mo or self-host free |
| **RevenueCat** | In-app purchase analytics, trial conversion, churn | SDK + API + Dashboard | Free < $2.5K MRR |

### Semi-Automated (needs periodic script runs)

| Data Source | What You Get | How |
|---|---|---|
| **git log analysis** | Commit frequency, lines changed, active days | Shell script + cron |
| **App Store reviews** | Rating trends, sentiment | App Store Connect API (poll daily) |
| **Social media followers** | Audience growth | Twitter/X API, Bluesky API |
| **Waitlist/email list size** | Pre-launch interest | Buttondown/Mailchimp API |
| **Search rankings** | SEO visibility | Google Search Console API |

### Manual (no good automation path)

| Metric | Frequency | Method |
|---|---|---|
| Customer interviews | Monthly or quarterly | Calendly + Zoom |
| NPS surveys | Quarterly | In-app prompt or email |
| Competitor analysis | Monthly | Manual research |
| Feature request prioritization | Weekly | Read GitHub issues + support emails |
| "Very disappointed" PMF survey | After significant changes | Email survey |
| CAC calculation | Monthly | Sum ad spend / new customers |

### Recommended Solo Founder Stack

**Minimal (free, < 1 hour setup):**
- Plausible (web analytics) or PostHog (product analytics)
- Stripe Dashboard (revenue metrics, built-in)
- App Store Connect (app metrics, built-in)
- GitHub (development metrics, built-in)

**Optimal (< $20/mo, 2-4 hour setup):**
- PostHog free tier (product analytics, retention, funnels)
- Plausible $9/mo (clean web analytics, privacy-friendly)
- Stripe Billing (revenue, churn, MRR — built into Stripe)
- RevenueCat free tier (if doing in-app purchases)
- Sentry free tier (crash/error tracking)
- App Store Connect CLI (automated app metrics)

**Overkill but nice:**
- Baremetrics ($129/mo) — one-click Stripe dashboards, but you can build the same with Stripe's built-in analytics for free

### CLI/Script Approach for a Metrics Dashboard

A solo founder can build a lightweight daily metrics pull with:

```bash
# GitHub: issues closed this week
gh api repos/OWNER/REPO/issues --jq '[.[] | select(.closed_at > "DATE")] | length'

# Stripe: current MRR (via stripe CLI)
stripe billing meters list  # or use the API directly

# App Store Connect: use the CLI tool
asc analytics reports generate --app-id YOUR_APP_ID

# PostHog: query API for retention
curl -X POST 'https://app.posthog.com/api/projects/PROJECT_ID/insights/retention/' \
  -H 'Authorization: Bearer YOUR_KEY'
```

This can run as a cron job or GitHub Action that writes results to a file in your repo — which Rig could then read during standups.

---

## Sources

- [SaaS Capital - Benchmarking Metrics for Bootstrapped SaaS Companies (2025)](https://www.saas-capital.com/blog-posts/benchmarking-metrics-for-bootstrapped-saas-companies/)
- [MicroConf - State of Independent SaaS Report](https://microconf.com/state-of-indie-saas)
- [Calmops - How to Measure Product-Market Fit (Indie Hacker's Guide)](https://calmops.com/indie-hackers/measure-product-market-fit/)
- [Growth-onomics - Mobile App Retention Benchmarks 2025](https://growth-onomics.com/mobile-app-retention-benchmarks-by-industry-2025/)
- [Enable3 - App Retention Benchmarks for 2026](https://enable3.io/blog/app-retention-benchmarks-2025)
- [GetStream - 2026 Guide to App Retention](https://getstream.io/blog/app-retention-guide/)
- [Vitally - B2B SaaS Churn Rate Benchmarks 2025](https://www.vitally.io/post/saas-churn-benchmarks)
- [Instabug - Beta Testing Metrics](https://www.instabug.com/blog/beta-test-metrics)
- [Apple - App Store Connect API](https://developer.apple.com/app-store-connect/api/)
- [App-Store-Connect-CLI](https://github.com/rudrankriyam/App-Store-Connect-CLI)
- [Stripe - Subscription Analytics](https://docs.stripe.com/billing/subscriptions/analytics)
- [PostHog vs Plausible](https://posthog.com/blog/posthog-vs-plausible)
- [F3 Fund - Solopreneur Analytics Stack 2026](https://f3fundit.com/the-solopreneur-analytics-stack-2026-posthog-vs-plausible-vs-fathom-analytics-and-why-you-should-ditch-google-analytics/)
- [CleverTap - DAU vs MAU Stickiness Metrics](https://clevertap.com/blog/dau-vs-mau-app-stickiness-metrics/)
- [PayProGlobal - DAU/MAU Ratio in SaaS](https://payproglobal.com/answers/what-is-dau-mau-ratio-in-saas/)
- [UXCam - Mobile App Engagement Benchmarks 2025](https://uxcam.com/blog/mobile-app-engagement-benchmarks/)
- [GitHub - Issue Metrics Action](https://github.com/github/issue-metrics)
- [Graphite - GitHub PR Metrics](https://graphite.com/guides/github-pr-metrics)
