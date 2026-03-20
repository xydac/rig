# Idea: Social Content Business Plan — Instagram & YouTube

**Date:** 2026-03-19
**Source:** standup
**Product:** videogen
**Status:** inbox

## Description

Build a social media content business using AI-generated video to generate revenue via YouTube ad revenue, Instagram monetization, and affiliate marketing. Starting with 2-3 targeted niches, producing 3 video types at scale, and hitting monetization thresholds within 3-6 months.

## Problem it solves

Video content production is expensive and time-consuming. This system can produce monetizable content at near-zero marginal cost using AI pipelines already built (edge-tts, Pexels, FLUX.2, Qwen3-TTS, SadTalker, Remotion, ffmpeg).

---

> **Revision 2026-03-19:** Supplement Science niche dropped — liability risk (health claims, FDA, affiliate product risk) not acceptable for a bootstrapped operation. Plan revised below.

## 1. Content Strategy — Niche Selection

### Evaluation criteria
- Zero liability risk (no health claims, financial advice, legal advice)
- High CPM audience (tech, developers, knowledge workers)
- Affiliate monetization via software/SaaS (no physical products)
- Content quality gap is closeable with AI video tools
- Works in both short and long format

### Selected Niches

#### Niche A: AI Tools Explained ⭐ Primary
**Why:**
- Explosive, evergreen demand. New tools launch weekly — the content machine never runs dry.
- YouTube-first: people research tools before adopting them. Long-form wins here.
- Short-form: "ChatGPT vs Claude in 60 seconds", "5 AI tools developers don't know about"
- Long-form: "Complete guide to Claude for developers", "Best AI coding tools in 2026" (10-15 min)
- Self-referential advantage: content about AI, produced by AI — authentic alignment
- **Zero liability risk.** Reviewing software is protected commentary. No health/financial claims.
- Affiliate: Cursor ($20 referral), Notion ($10), Jasper ($85/sale), Claude API, GitHub Copilot, Perplexity Pro — all SaaS, clean affiliate programs
- Pipelines: `ai-tools-explained`, `ai-versus`, `tool-reviews`, `how-to-tutorials`, `dev-workflow-tips`
- **High CPM:** Developer/tech audience = $15-25 CPM vs $3-8 for general audiences

**Monetization density:** High. Software affiliate commissions ($10-100 CPA), sponsorships from dev tools (very common), high ad CPM.

#### Niche B: Indie Hacking / Developer Productivity ⭐ Secondary
**Why:**
- Underserved on short-form. "I built X in a weekend" content performs extremely well with no production overhead.
- Audience is highly engaged, shares content within communities (HN, Reddit, Twitter/X)
- Content types: "How I automated my job with Claude", "Building a SaaS in 30 days", "Developer workflow I wish I knew earlier"
- Short-form: process clips, tool reveals, before/after automation demos — naturally viral
- Long-form: tutorials, teardowns, build-in-public logs
- **Zero liability.** Pure how-to and commentary.
- Affiliate: Same stack as AI Tools + hosting (Railway, Fly.io, Vercel referrals), domain registrars, dev tools
- Audience crossover with AI Tools channel is near-total — same viewer, complimentary content
- Can syndicate Oddinks' own product work as case studies (authentic content, builds brand for other products)

**Monetization density:** Medium-high. Lower CPM than pure AI tools ($10-18) but sponsorship potential is excellent — dev tools pay well to reach builders.

#### Niche C: Held
Sleep Science and similar lifestyle niches: hold indefinitely. Adjacent to health claims territory even without explicit supplement angles. Not worth the surface area.

### Format split per niche
| Niche | Instagram Reels | YouTube Shorts | YouTube Long |
|-------|----------------|----------------|--------------|
| AI Tools Explained | 2/week | 2/week | 2/week |
| Indie Hacking / Dev Productivity | 2/week | 1/week | 1/week |

---

## 2. Video Generation Approaches — 3 Types to Test

### Type A: Stock Footage + AI Voiceover + Subtitles (Working Today)
**What it looks like:**
Pexels stock clips stitched together, edge-tts or Qwen3-TTS voiceover, burned-in subtitles. Text-on-screen callouts for key stats. Already proven in `pipeline.py`.

**Production stack:**
- Script: Claude API (30 seconds)
- Voiceover: Qwen3-TTS via RunPod (~$0.02/episode)
- Stock footage: Pexels API (free tier: 200 req/hour)
- Compositing: ffmpeg (local, free)
- Subtitles: edge-tts SRT → ffmpeg burn

**Quality:** 6/10. Looks like a basic "did you know" channel. Works well for short-form Indie Hacking/dev tip content where the insight carries the video. Not competitive for AI tools tutorials (viewers expect screen recordings).

**Time to produce:** ~3 minutes pipeline run time. 15 minutes total with script review.

**Cost:** ~$0.03-0.05/episode (RunPod TTS + negligible compute)

**Best for:** Indie Hacking short-form reels, dev tips, "X things about Y tool" listicles

---

### Type B: AI Talking Head + Voiceover (Character System)
**What it looks like:**
FLUX.2 generates a consistent host character portrait → SadTalker animates it to match the voiceover → composited over a simple background or stock footage with subtitles. Creates a "faceless channel with a face" — more parasocial than stock clips.

**Production stack:**
- Host portrait: FLUX.2 via RunPod (one-time generation, reuse per episode) ~$0.10
- Script: Claude API
- Voiceover: Qwen3-TTS via RunPod (~$0.02/episode)
- Talking head animation: SadTalker via RunPod (~$0.15-0.25/episode, ~30-60s video)
- Background: stock footage or solid gradient
- Compositing: ffmpeg

**Quality:** 7.5/10 for short-form. SadTalker output is good enough for Reels/Shorts where viewers don't scrutinize for long. Less convincing for 10-minute YouTube videos. The "consistent character" builds brand recognition.

**Time to produce:** ~15-20 minutes (SadTalker RunPod job takes 5-10 min)

**Cost:** ~$0.20-0.30/episode for short-form

**Best for:** AI Tools and Indie Hacking short-form. Builds channel identity/persona.

**Risk:** Platform detection of AI-generated faces is evolving. Instagram/YouTube currently allow it with disclosure; label content as AI-generated.

---

### Type C: Screen Recording + AI Voiceover (Demo/Tutorial Style)
**What it looks like:**
For the AI Tools niche specifically: actual screen recordings of using tools, with AI voiceover narrating. Not fully AI-generated video — uses real screenshots/recordings — but the script, voiceover, and editing automation are AI. Playwright (already in the toolkit) can automate browser recordings.

**Production stack:**
- Script: Claude API (with real tool usage notes)
- Screen recording: Playwright automated browser session → video capture
- Voiceover: Qwen3-TTS or ElevenLabs (higher quality for longer content)
- Editing: ffmpeg (trim, add subtitles, zoom effects)
- Optional: cursor highlight effects, annotation overlays

**Quality:** 9/10 for AI Tools niche. This matches what top YouTube channels produce. Viewers expect screen recordings for tool tutorials — stock footage would look wrong.

**Time to produce:** 30-45 minutes (Playwright script + review + render)

**Cost:** ~$0.10-0.50/episode depending on ElevenLabs vs RunPod TTS

**Best for:** AI Tools Explained — YouTube long-form and Shorts. This is the highest-quality, highest-CPM format.

---

### Summary Comparison
| | Type A: Stock+TTS | Type B: Talking Head | Type C: Screen+TTS |
|--|--|--|--|
| Quality | 6/10 | 7.5/10 | 9/10 |
| Cost/ep | $0.05 | $0.25 | $0.30 |
| Time/ep | 15 min | 25 min | 45 min |
| Best niche | Indie Hacking short-form | AI Tools + Indie Hacking | AI Tools YouTube |
| Scalability | Very high | High | Medium |
| Platform risk | Low | Medium (disclosure) | Low |

---

## 3. Quality Assessment — Honest Evaluation

### Can we compete?

**AI Tools niche (Type C):** Yes, for informational and tutorial content. The gap vs. top YouTubers (charisma, insider access, studio production) is real but not the deciding factor for most searches. The long tail of "how to use [specific tool]" is enormous and lightly served. A competent screen recording with accurate, clear narration outperforms a polished video with stale or wrong information. We have a genuine edge: Claude can produce technically accurate scripts about AI tools faster than a human researcher.

**Indie Hacking niche (Type A/B):** Yes, for short-form. This audience values authenticity over polish. A 60-second "I automated X with Claude" reel with stock B-roll and a decent voiceover performs alongside human-made equivalents. The content insight is the product — not the production value. We can source content angles from Oddinks' own build-in-public work, which is a free authentic differentiation.

### Quality gaps and what closes them

| Gap | Closer |
|-----|--------|
| Voiceover sounds synthetic | Qwen3-TTS (now available via RunPod) is very good; ElevenLabs for long-form if needed |
| Stock footage feels generic | Curate Pexels terms tightly per script; use code editor / terminal footage for dev content |
| No channel authority | Consistency + niche depth. 50 videos before judging. |
| Script accuracy on fast-moving tools | Human review gate before publish — 5 min fact-check per video |
| SadTalker artifacts in close-up | Medium/far framing; cut to screen recording frequently |
| AI-generated feel | Occasional genuine POV in scripts ("I tested this and found…") makes it feel less generic |

**Honest ceiling:** $1-5K/month per channel at current AI quality. $10K+/month requires either volume (multiple channels) or genuine domain expertise shaping the scripts — which the founder already has for AI tools and indie hacking.

---

## 4. Monetization Path

### YouTube Partner Program (YPP)
- **Requirements:** 1,000 subscribers + 4,000 watch hours (long-form) OR 1,000 subs + 10M Shorts views (90 days)
- **Realistic timeline:** 3-4 months at 3 long-form + 4 Shorts per week
- **CPM estimates:** AI Tools / Dev niche $15-25 (one of the highest CPM categories on YouTube)
- **Revenue at 100K views/month:** $1,500-2,500

### Instagram Monetization
- **Reels Bonus Program:** Invite-only, inconsistent. Don't count on it.
- **Reliable from day 1:** Affiliate links in bio (Linktree). No follower threshold required.
- **Timeline to affiliate revenue:** 2-4 weeks after first videos go live

### Affiliate Opportunities (start immediately, zero risk)
- **AI/Dev tools:** Cursor ($20 referral), GitHub Copilot ($10), Notion ($10/referral), Perplexity Pro ($20), Jasper ($85/sale), Railway/Fly.io/Vercel hosting referrals
- **Productivity SaaS:** Obsidian Catalyst, Linear, Raycast Pro
- **Strategy:** 1 primary affiliate link per video in description. Linktree in bio for Instagram. Short tracking URLs.
- No physical products, no health claims, no financial advice — pure software referrals.

### Sponsorship (Month 4+)
- Dev tool companies sponsor small channels aggressively (they want developer eyeballs)
- Rate at 1K subs with engaged dev audience: $300-800 per dedicated video
- Rate at 5K subs: $1,000-3,000
- Inbound via: direct DM, Passionfroot, Sponsorkit

### Revenue Timeline
| Timeline | Channel State | Revenue |
|----------|--------------|---------|
| Week 1-2 | Setup + first 3 videos | $0 |
| Month 1 | 15-20 videos live | $0-100 (affiliate clicks) |
| Month 2 | 30-40 videos, ~300 subs | $100-400/month affiliate |
| Month 3 | 50+ videos, ~700 subs | $400-800/month |
| Month 4 | YPP eligible, 1K subs | $800-2,000/month (ads + affiliate) |
| Month 6 | 2K+ subs, first sponsorships | $2,000-5,000/month |

**First dollar:** Week 3-4 via affiliate click-through (someone signs up for Cursor or Notion via our link).

---

## 5. Execution Plan

### This Week: Foundation + 3 Test Videos

#### Day 1-2: Account Setup
- [ ] Create YouTube channel: AI Tools / developer focus (name TBD — e.g. "DevStack", "AIToolbox", "Build with AI")
- [ ] Create Instagram account: matching handle
- [ ] Create TikTok account: same handle (cross-post, zero extra work)
- [ ] Set up Linktree with affiliate links (Cursor, Notion, Perplexity, Railway)
- [ ] Apply to affiliate programs: Cursor, Notion, Jasper (all self-serve, fast approval)
- [ ] Channel art: generate with FLUX.2 (tech aesthetic — dark mode, code motifs)

#### Day 3-4: RunPod Endpoint Setup
- [ ] Run `python3 toolkit/tools/qwen3_tts.py --setup` → creates RunPod Qwen3-TTS endpoint
- [ ] Run `python3 toolkit/tools/flux2.py --setup` → creates FLUX.2 endpoint
- [ ] Run `python3 toolkit/tools/sadtalker.py --setup` → creates SadTalker endpoint
- [ ] Generate 2-3 host character portraits (tech presenter look) with FLUX.2
- [ ] Test Qwen3-TTS on 30-second script

#### Day 5-7: Produce 3 Test Videos

**Test Video 1 (Type A):** "5 AI Tools Developers Are Sleeping On"
- Format: 60-second Instagram Reel + YouTube Short
- Stack: Claude script → Qwen3-TTS → Pexels stock (code/laptop footage) → ffmpeg subtitles
- Topic: Lesser-known tools (v0.dev, Aider, Perplexity, Warp, Raycast AI)
- Publish: Instagram + YouTube Shorts + TikTok
- Affiliate: link each tool in description

**Test Video 2 (Type B):** "I Asked 3 AI Assistants to Debug This Code — Here's What Happened"
- Format: 90-second Reel with AI talking head host
- Stack: FLUX.2 character → Qwen3-TTS → SadTalker → B-roll of code screens → ffmpeg
- Topic: Comparative test framing — high curiosity hook, naturally shareable
- Publish: Instagram Reel + YouTube Short

**Test Video 3 (Type C):** "Claude vs ChatGPT for Coding: Real Tests, Honest Results (2026)"
- Format: 8-10 minute YouTube video
- Stack: Playwright screen recording both tools live → Qwen3-TTS narration → ffmpeg edit
- Topic: Head-to-head on 5 real coding tasks (debug, refactor, explain, generate, review)
- Publish: YouTube long-form; cut 60s highlight for Shorts
- Affiliate: Cursor + Claude API in description

#### Week 1 Content Calendar (after test videos)
| Day | Format | Topic | Platform |
|-----|--------|-------|----------|
| Mon | Short (Type A) | "AI tools that replace $500/month of SaaS" | IG + YT Short + TT |
| Tue | Long (Type C) | "Best AI coding assistants ranked (I tested them all)" | YouTube |
| Wed | Short (Type B) | "How I use Claude to 10x my code reviews" | IG + YT Short |
| Thu | Long (Type C) | "Cursor AI: complete setup guide for developers" | YouTube |
| Fri | Short (Type A) | "3 things AI still can't do in code" | IG + YT Short + TT |
| Sat | Short (Type B) | "My full AI dev stack in 60 seconds" | IG |
| Sun | Batch produce next week | — | — |

### Metrics to Track

**Week 1-4 (early signal):**
- Views per video (target: 500+ on Shorts, 200+ on long-form)
- Watch time % (target: >40% retention on Shorts, >30% long-form)
- Follower growth rate
- Affiliate link clicks (linktree analytics)

**Month 2+ (monetization signal):**
- Revenue per 1,000 views (RPM)
- Affiliate conversion rate
- Best-performing video topics (double down)
- Comment sentiment (are people asking follow-up questions? = engaged)

**Kill criteria (Month 2):** If best video is under 1K views with good thumbnails and titles, reassess niche. Don't pivot early — 30 videos minimum before judging.

---

## Evaluation
- **Impact:** 5 (Critical) — New revenue stream with compounding returns, doubles as ad/creative production pipeline
- **Confidence:** 0.75 (Medium) — Pipeline proven working, monetization path clear but unvalidated
- **Reach:** 1.0 — Directly generates revenue
- **Effort:** 4 (L) — Ongoing content production, account setup, RunPod endpoints, quality iteration
- **ROI Score:** 0.94

## Open Questions

1. **Channel name / branding:** What persona/brand name? Anonymous tech channel or named host?
2. **ElevenLabs key:** Do we want higher-quality TTS for long-form? (~$22/month Creator plan)
3. **Disclosure:** How explicitly to label AI-generated content? (Platform policies vary; full disclosure is safer and builds trust with a tech-savvy audience who'll figure it out anyway)
4. **Multiple channels:** Run AI Tools + Indie Hacking as one combined channel or two separate from day 1?
5. **Authentic POV:** How much founder voice/opinion goes into scripts? More = more differentiated, requires more review time.

## Recommendation

Start with **AI Tools Explained** channel only. Zero liability risk, highest CPM, affiliate programs are self-serve and pay well, and the screen recording format (Type C) genuinely competes with established channels.

Produce **Type C first** (highest quality, best fit for the niche), then add **Type A** for short-form volume, then **Type B** as the channel persona grows. Add Indie Hacking content to the same channel in Month 2 — the audience overlap is near-total.
