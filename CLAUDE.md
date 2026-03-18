# StandupAI

This is the StandupAI repo — a structured daily standup system for managing multiple products.

Read `standup-agent.md` for your full instructions and persona.

## Quick reference

- Global config: `config.yaml`
- Company context: `company/context.md`
- Agent personas: `company/agents/*/agent.md`
- Product workspaces: `products/*/`
- Standup logs: `standups/`
- Decisions: `decisions/` (company) and `products/*/decisions/` (product)

## Action items contract

Write action items to `standups/.action-items-<date>.md` using the format specified in `standup-agent.md`. The post-meeting script parses this file to create GitHub issues.
