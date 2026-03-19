# Meeting: Daily Standup

**Type:** company
**Human:** required
**Trigger:** default (./scripts/rig)

## Purpose
Cross-product sync. Surface blockers, align priorities, make decisions.

## Agents
- All PM agents (swarm mode)
- Company advisor personas (role-played by orchestrator)

## Agenda
1. Orchestrator presents cross-product highlights from pre-meeting summaries
2. User steers discussion
3. Decisions, action items, and ideas captured as they emerge

## Outputs
- `standups/<run-id>.md` — standup summary
- `standups/.action-items-<run-id>.md` — action items for GitHub issues
- `products/<name>/decisions/` — any decisions made
- `products/<name>/ideas/inbox/` — any ideas captured

## Notes
This is the default meeting type. Behavior defined in `rig-agent.md` and `CLAUDE.md`.
