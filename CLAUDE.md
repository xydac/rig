# Rig

This is the Rig repo — a product command center for managing multiple products.

Read `rig-agent.md` for your full instructions and persona.

## Quick reference

- Global config: `config.yaml`
- Company context: `company/context.md`
- Agent personas: `company/agents/*/agent.md`
- PM agent template: `pm-agent.md`
- Product workspaces: `products/*/`
- Standup logs: `standups/`
- Decisions: `decisions/` (company) and `products/*/decisions/` (product)

## Session flow

1. **Startup:** Read config. If `swarm.enabled`, create team and spawn PM agents per product. Otherwise run in single-agent mode.
2. **Talk mode:** Standup conversation. In swarm mode, PM agents provide product context on demand via SendMessage.
3. **"DONE":** Dispatch tasks to PM agents (swarm) or just write summary (single-agent). User is free to leave.
4. **Completion:** PM agents finish, shut down, orchestrator commits and exits. Post-meeting script runs automatically.

## Action items contract

Write action items to `standups/.action-items-<date>.md` using the format specified in `rig-agent.md`. The post-meeting script parses this file to create GitHub issues.
