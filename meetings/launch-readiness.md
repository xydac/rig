# Meeting: Launch Readiness

**Type:** product
**Human:** required
**Trigger:** on-demand (./scripts/rig --product <name> meeting launch-readiness)

## Purpose
Go/no-go decision for a product launch. Systematic checklist review.

## Agents
- PM agent for the product
- CTO advisor (technical readiness)
- Marketing advisor (go-to-market readiness)
- Legal advisor (compliance)

## Pre-Meeting Context
Read:
- `products/<name>/metrics/` (latest — crash rates, beta retention)
- `products/<name>/roadmap.md` (what was supposed to ship)
- `products/<name>/backlog.md` (what's still open)
- Product's GitHub issues: `gh issue list --repo <repo>`
- Product's open PRs: `gh pr list --repo <repo>`

## Go/No-Go Checklist

### Technical
- [ ] Crash-free sessions > 99.5%
- [ ] No P0/P1 bugs open
- [ ] Core user flow works end-to-end
- [ ] All blocking issues closed
- [ ] Performance acceptable

### Product
- [ ] Beta users completed core action (> 60%)
- [ ] NPS > 20 from beta testers (if available)
- [ ] App Store metadata ready (screenshots, description, keywords)

### Marketing
- [ ] Landing page updated
- [ ] Launch content ready (social, blog, changelog)
- [ ] Analytics/tracking in place

### Legal/Compliance
- [ ] Privacy policy current
- [ ] Terms of service current
- [ ] Data handling compliant

## Outputs
- `products/<name>/decisions/<date>-launch-go-nogo.md` with decision and rationale
- If GO: update stage to "launch" in notes, set action items for launch day
- If NO-GO: list blockers that must be resolved, set next review date
