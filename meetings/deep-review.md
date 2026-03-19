# Meeting: Deep Review

**Type:** product
**Human:** required
**Trigger:** on-demand (./scripts/rig --product <name> meeting deep-review)

## Purpose
Deep dive into a single product. Review metrics, roadmap alignment, backlog priorities, competitive position, and idea pipeline.

## Agents
- PM agent for the focused product
- Company advisor personas (all — this is a strategic review)

## Pre-Meeting Context
Read ALL of these for the focused product:
- `products/<name>/summaries/` (latest)
- `products/<name>/roadmap.md`
- `products/<name>/backlog.md`
- `products/<name>/notes.md`
- `products/<name>/metrics/` (latest)
- `products/<name>/ideas/prioritized.md`
- `products/<name>/decisions/` (last 5)
- `products/<name>/competitive/` (if exists)

## Agenda
1. **State of the product** — where are we? Lifecycle stage, days to launch, key metrics
2. **Roadmap check** — are we building what we committed to? Any drift?
3. **Metrics review** — what do the numbers say? Any flags?
4. **Idea pipeline** — top 3 ideas by ROI. Should any move to backlog?
5. **Competitive landscape** — any competitor moves we should respond to?
6. **Backlog grooming** — reprioritize based on all of the above
7. **Decisions** — what needs to be decided today?

## Outputs
- `standups/<run-id>.md` — deep review summary (noted as focused session)
- Updated `products/<name>/roadmap.md` if priorities changed
- Updated `products/<name>/backlog.md` if reprioritized
- Decisions written to `products/<name>/decisions/`
