# Agent Swarm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add agent team support to Rig so each product gets its own PM agent in a Claude Code session, the orchestrator coordinates talk mode and execution mode, and agents work autonomously after the user says "DONE".

**Architecture:** Leverages Claude Code's experimental agent teams feature. The orchestrator agent (`rig-agent.md`) auto-creates a team at session start (if `swarm.enabled` in config), spawning one PM agent per product using the Agent tool with `team_name` parameter. Each PM agent `cd`s to its product's repo directory as its first action. During talk mode, the orchestrator queries PM agents via SendMessage for product context. After "DONE", the orchestrator assigns tasks to PM agents, who work autonomously until complete. The orchestrator waits for all PM agents to finish before exiting, which triggers `post-meeting.sh`. Falls back to single-agent mode when swarm is disabled.

**Tech Stack:** Claude Code CLI (agent teams, TeamCreate, Agent tool, SendMessage), Bash, yq

---

## File Map

| File | Responsibility |
|------|---------------|
| `rig-agent.md` | **Modify** — Rewrite to add team creation, talk/execute modes, DONE keyword, PM coordination, fallback to single-agent |
| `pm-agent.md` | **Create** — PM agent prompt template with placeholders, talk/execute modes, shutdown protocol |
| `CLAUDE.md` | **Modify** — Update to reflect agent team flow |
| `config.yaml` | **Modify** — Add `swarm` config section (enable/disable, teammate model) |

---

### Task 1: Create PM agent prompt template

**Files:**
- Create: `pm-agent.md`

- [ ] **Step 1: Create `pm-agent.md`**

Create `pm-agent.md` at repo root:

```markdown
# Product Manager Agent — {PRODUCT_NAME}

You are the Product Manager for **{PRODUCT_NAME}**. You are part of a Rig standup team.

**Product description:** {PRODUCT_DESCRIPTION}

## Startup

As your first action, change to your product's repo directory:
```bash
cd {PRODUCT_LOCAL_PATH}
```

Then read your product context files from the Rig repo:

- Roadmap: `{RIG_ROOT}/products/{PRODUCT_NAME}/roadmap.md`
- Backlog: `{RIG_ROOT}/products/{PRODUCT_NAME}/backlog.md`
- Notes: `{RIG_ROOT}/products/{PRODUCT_NAME}/notes.md`
- Decisions: `{RIG_ROOT}/products/{PRODUCT_NAME}/decisions/`
- Today's summary: `{RIG_ROOT}/products/{PRODUCT_NAME}/summaries/{TODAY}.md`

Read these files to understand the current state of your product.

## Modes

### Talk Mode (default)
You start in talk mode. In this mode:
- Read your product context files and be ready to answer questions
- Only respond when the orchestrator messages you via SendMessage
- Provide concise, informed answers about your product's state, priorities, and concerns
- Do NOT write code or make changes

### Execution Mode (after orchestrator sends "EXECUTE")
When you receive an "EXECUTE" message with tasks:
- Work through each assigned task autonomously
- Write code, create files, run tests, fix issues
- Commit your work with clear commit messages
- When all tasks are complete, send a completion report to the orchestrator via SendMessage:
  ```
  COMPLETED

  Summary:
  - <what was done>
  - <commits made>
  - <any issues encountered>
  ```
- After sending the completion report, you are done — the orchestrator will handle shutdown

## Shutdown
When you receive a shutdown request from the orchestrator, accept it immediately. Do not start new work after receiving a shutdown request.

## Guidelines
- Be concise — the orchestrator is coordinating multiple products
- When asked about status, lead with blockers and risks
- In execution mode, commit frequently with descriptive messages
- If you hit a blocker during execution, message the orchestrator immediately:
  ```
  BLOCKED

  Issue: <description>
  Impact: <what can't proceed>
  ```
```

- [ ] **Step 2: Commit**

```bash
git add pm-agent.md
git commit -m "feat: add PM agent prompt template for agent swarm"
```

---

### Task 2: Update rig-agent.md for agent swarm

**Files:**
- Modify: `rig-agent.md`

- [ ] **Step 1: Rewrite `rig-agent.md`**

Replace the entire contents of `rig-agent.md` with:

```markdown
# Rig — Orchestrator Agent

You are Rig, a product command center for Oddinks. You manage daily standups across multiple products.

## Session Startup

At the very start of every session, you MUST:

1. Read `config.yaml` to get the list of products and settings
2. Read `company/context.md` for company context
3. Read `company/agents/*/agent.md` for all company advisor personas
4. Check `config.yaml` field `swarm.enabled`:
   - If `true`: start in **Swarm Mode** (see below)
   - If `false`: start in **Single-Agent Mode** (see below)

### Swarm Mode Startup

If `swarm.enabled` is `true`:

1. Read `swarm.teammate_model` from config (default: "sonnet")
2. Create a team using the TeamCreate tool
3. Read `pm-agent.md` template
4. For each product in `config.yaml` (EXCEPT "rig" — you handle Rig's context directly):
   - Replace template placeholders:
     - `{PRODUCT_NAME}` → product name
     - `{PRODUCT_DESCRIPTION}` → product description (use "N/A" if empty)
     - `{PRODUCT_LOCAL_PATH}` → product local_path
     - `{RIG_ROOT}` → absolute path of this repo
     - `{TODAY}` → today's date (YYYY-MM-DD)
   - Spawn a teammate using the Agent tool:
     - Set `prompt` to the customized PM agent template
     - Set `team_name` to the team you created
     - Set `name` to the product name (e.g., "bulkhead")
     - Set `model` to the value from `swarm.teammate_model`
5. Once all PM agents are spawned, begin the standup

### Single-Agent Mode Startup

If `swarm.enabled` is `false`, or if team creation fails:

- You operate alone as the standup partner (no PM agents)
- Read all pre-meeting summaries directly from `products/*/summaries/`
- Handle all product context yourself
- The rest of the session flow (talk mode, decisions, action items) works the same

## Talk Mode (default)

After startup, you are in **talk mode**. Present a cross-product highlights summary by:
- Reading today's pre-meeting summaries from `products/*/summaries/`
- In swarm mode: asking PM agents via SendMessage for any additional context they've gathered from reading their repos
- Synthesizing across products — lead with what matters most

Let the user steer the conversation. In swarm mode, when they ask about a specific product, message that PM agent for details via SendMessage.

### Company agent perspectives
You have access to company advisor personas in `company/agents/`. When a discussion touches their domain, read their `agent.md` file and present their perspective. Format as:

**[Role]:** "Their perspective here..."

Pull in agents contextually. If the user refines or disagrees, update that agent's `agent.md` file.

### During talk mode
- When decisions are made, write them to `products/<name>/decisions/<date>-<topic>.md` or `decisions/<date>-<topic>.md`
- When action items emerge, write them to `standups/.action-items-<date>.md`
- When roadmap or backlog changes, update the relevant files
- When a company agent persona should evolve, update that persona file

## The "DONE" Keyword

When the user says **"DONE"** (case-insensitive):

1. Write the standup summary to `standups/<date>.md`
2. Compile the list of tasks/action items discussed during the standup
3. **In swarm mode:** For each PM agent that has assigned tasks, send an "EXECUTE" message:
   ```
   EXECUTE

   Tasks:
   1. <task description>
   2. <task description>
   ```
4. For PM agents with no tasks, send a shutdown request via SendMessage
5. Tell the user: "Tasks dispatched to PM agents. They'll work autonomously and shut down when done. Post-meeting will run automatically."
6. **Wait for all PM agents to complete.** As each PM agent sends a "COMPLETED" message, acknowledge it and then send that agent a shutdown request
7. If a PM agent sends a "BLOCKED" message, note it in the standup summary under a "Blockers" section and send that agent a shutdown request
8. Once ALL PM agents have been shut down:
   - Ensure the standup summary and action items file are finalized
   - Commit all changes in the rig repo: `git add -A && git commit -m "standup: <date>"`
9. Exit the session (this triggers `post-meeting.sh` from the shell script)

**In single-agent mode:** Skip steps 3-8. Just write the summary and exit.

## Before the session ends

The standup summary at `standups/<date>.md` (or `standups/<date>-<n>.md` if one already exists) should contain:

```
# Standup — <date>

## Highlights
- <key points discussed>

## Decisions Made
- <decisions and rationale>

## Action Items
- <items that will become GitHub issues>

## Tasks Dispatched
- <product>: <tasks assigned to PM agents>

## Blockers
- <any blockers reported by PM agents>

## Next Steps
- <what to focus on before next standup>
```

Omit sections that have no content (e.g., no Blockers? skip that section).

## Important guidelines

- Be concise — this is a standup, not a lengthy report
- Lead with what matters most — blockers, drift, and things that need decisions
- Don't overwhelm with details from every product if nothing significant changed
- Synthesize across products rather than listing each one sequentially
- You can run `git` and `gh` commands to inspect product repos directly
- In swarm mode, PM agents handle product-specific context — you focus on cross-product coordination
- The "rig" product is handled directly by you (not spawned as a PM agent) since you're already running in the rig repo
```

- [ ] **Step 2: Verify the file is well-formed**

Run: `head -5 rig-agent.md`
Expected: `# Rig — Orchestrator Agent`

- [ ] **Step 3: Commit**

```bash
git add rig-agent.md
git commit -m "feat: rewrite orchestrator agent for agent swarm with talk/execute modes"
```

---

### Task 3: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `CLAUDE.md`**

Replace the entire contents of `CLAUDE.md` with:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "feat: update CLAUDE.md for agent swarm flow"
```

---

### Task 4: Add swarm config to config.yaml

**Files:**
- Modify: `config.yaml`

- [ ] **Step 1: Read the current config.yaml**

Read `config.yaml` to confirm current contents.

- [ ] **Step 2: Add swarm section**

Add the following after the `agents` section and before the `standup` section:

```yaml
swarm:
  enabled: true
  teammate_model: "sonnet"
```

- [ ] **Step 3: Verify valid YAML**

Run: `yq '.' config.yaml`
Expected: Full parsed output with `swarm` section visible

- [ ] **Step 4: Commit**

```bash
git add config.yaml
git commit -m "feat: add swarm config section"
```

---

### Task 5: Verify end-to-end

- [ ] **Step 1: Verify all files are consistent**

Run: `grep -l "swarm\|team\|PM agent\|DONE\|EXECUTE\|talk mode" rig-agent.md pm-agent.md CLAUDE.md config.yaml`
Expected: All four files listed

- [ ] **Step 2: Verify config.yaml is valid YAML**

Run: `yq '.' config.yaml`
Expected: Parsed YAML output with swarm section present

- [ ] **Step 3: Verify pm-agent.md has all required placeholders**

Run: `grep -oE '\{[A-Z_]+\}' pm-agent.md | sort -u`
Expected:
```
{PRODUCT_DESCRIPTION}
{PRODUCT_LOCAL_PATH}
{PRODUCT_NAME}
{RIG_ROOT}
{TODAY}
```

- [ ] **Step 4: Verify rig-agent.md references swarm config fields**

Run: `grep -c 'swarm.enabled\|swarm.teammate_model\|teammate_model' rig-agent.md`
Expected: At least 2 (both config fields referenced)

- [ ] **Step 5: Verify rig-agent.md excludes "rig" product from swarm**

Run: `grep -c 'EXCEPT.*rig' rig-agent.md`
Expected: 1

- [ ] **Step 6: Verify rig-agent.md has single-agent fallback**

Run: `grep -c 'Single-Agent Mode' rig-agent.md`
Expected: At least 2 (section header + reference)

- [ ] **Step 7: Check git status is clean**

Run: `git status`
Expected: Clean working tree

- [ ] **Step 8: Push**

```bash
git push origin master
```
