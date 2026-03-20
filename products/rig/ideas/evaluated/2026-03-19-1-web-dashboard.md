# Idea: Web-Based Rig Dashboard

**Date:** 2026-03-19
**Product:** Rig
**Status:** Inbox

## Problem

Running standups in the terminal is not intuitive. The current CLI-based flow works but:
- Hard to scan cross-product status at a glance
- No persistent view of milestones, timelines, or blockers
- Can't easily share standup state with others
- Terminal output is ephemeral — context lost between sessions

## Proposal

Build a web-based dashboard for Rig that replaces or supplements the terminal standup flow.

### Core Features
- **Cross-product overview** — status cards for each product showing stage, launch countdown, open issues, recent activity
- **Milestone tracker** — visual timeline of upcoming launches (Postcall Mar 25, Keel Mar 31, Bulkhead PH Apr 8)
- **Blocker board** — surface blockers and decisions needed across all products
- **Standup history** — browse past standup summaries, decisions, action items
- **Advisor perspectives** — CTO/Finance/Marketing/Legal/Sales viewpoints accessible per topic

### Stretch Goals
- Live PM agent status during swarm standups
- Decision log with search
- Action item tracking across standups
- Metrics dashboard (issues opened/closed, commit velocity, launch readiness scores)

## Technical Considerations
- Could be a simple Next.js app reading from the existing markdown/yaml files in the Rig repo
- Or a local dev server that renders the standup data
- Keep it simple — the data layer already exists in git, just needs a visual layer

## Priority
Post-launch gauntlet (after April 8). Current terminal flow works — this is a quality-of-life upgrade.

## Evaluation
- **Impact:** 3 (High) — Significantly improves daily standup UX and cross-product visibility for the founder
- **Confidence:** 0.75 (Medium) — Clear pain point expressed by founder, but scope is fuzzy until designed
- **Reach:** 1.0 — Used every standup session
- **Effort:** 4 (L) — Full web app, even if simple Next.js reading markdown/yaml
- **ROI Score:** 0.56

## Related
- Existing dashboard work: commit `0d3e521` (green ops center rebuild)
- Current standup data: `standups/`, `products/*/summaries/`, `config.yaml`
