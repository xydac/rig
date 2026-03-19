# Milestone 2 Sprint 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add single-product focus mode, idea pipeline structure, and idea capture to the orchestrator agent prompts.

**Architecture:** Shell script modifications for `--product` flag, new folder scaffolding for ideas, and agent prompt updates. No new dependencies. All KISS — bash + markdown.

**Tech Stack:** Bash, yq, markdown

**Spec:** `docs/plans/milestone-2-plan.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `scripts/rig` | **Modify** — Add `--product` flag parsing, pass to pre-meeting and claude |
| `scripts/pre-meeting.sh` | **Modify** — Accept optional `PRODUCT_FILTER` env var to gather single product |
| `CLAUDE.md` | **Modify** — Add single-product mode instructions, idea capture behavior |
| `rig-agent.md` | **Modify** — Add single-product mode, idea capture during talk mode |
| `config.yaml` | **Modify** — Add `stage` and `launch_date` fields to products |
| `products/*/ideas/inbox/.gitkeep` | **Create** — Idea pipeline folders for all products |
| `products/*/ideas/evaluated/.gitkeep` | **Create** — Evaluated ideas folder |
| `products/*/ideas/validated/.gitkeep` | **Create** — Validated ideas folder |
| `products/*/ideas/rejected/.gitkeep` | **Create** — Rejected ideas folder |
| `products/*/ideas/prioritized.md` | **Create** — Ranked ideas by ROI |

---

### Task 1: Add --product flag to scripts/rig

**Files:**
- Modify: `scripts/rig`

- [ ] **Step 1: Rewrite scripts/rig with --product support**

Replace entire contents of `scripts/rig` with:

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Check prerequisites
if ! command -v claude &> /dev/null; then
  echo "ERROR: claude (Claude Code CLI) is required but not installed."
  echo "Install from: https://docs.anthropic.com/en/docs/claude-code"
  exit 1
fi

# Parse flags
PRODUCT_FILTER=""
COMMAND=""
ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --product)
      PRODUCT_FILTER="$2"
      shift 2
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

COMMAND="${ARGS[0]:-run}"

case "$COMMAND" in
  run)
    echo "=== Starting Rig ==="
    if [ -n "$PRODUCT_FILTER" ]; then
      echo "Focus: $PRODUCT_FILTER"
    fi
    echo ""
    PRODUCT_FILTER="$PRODUCT_FILTER" "$SCRIPT_DIR/pre-meeting.sh"
    echo ""
    echo "=== Launching standup session... ==="
    echo ""
    if [ -n "$PRODUCT_FILTER" ]; then
      cd "$ROOT_DIR" && PRODUCT_FILTER="$PRODUCT_FILTER" claude
    else
      cd "$ROOT_DIR" && claude
    fi
    echo ""
    "$SCRIPT_DIR/post-meeting.sh"
    ;;
  add-product)
    "$SCRIPT_DIR/add-product.sh"
    ;;
  add-agent)
    "$SCRIPT_DIR/add-agent.sh"
    ;;
  pre)
    PRODUCT_FILTER="$PRODUCT_FILTER" "$SCRIPT_DIR/pre-meeting.sh"
    ;;
  post)
    "$SCRIPT_DIR/post-meeting.sh"
    ;;
  help)
    echo "Rig — AI-powered product command center"
    echo ""
    echo "Usage: rig [--product <name>] [command]"
    echo ""
    echo "Commands:"
    echo "  (none)        Run full standup flow (pre-meeting → session → post-meeting)"
    echo "  add-product   Onboard a new product"
    echo "  add-agent     Onboard a new company agent"
    echo "  pre           Run pre-meeting only"
    echo "  post          Run post-meeting only"
    echo "  help          Show this help"
    echo ""
    echo "Flags:"
    echo "  --product <name>   Focus on a single product (e.g., --product postcall)"
    ;;
  *)
    echo "Unknown command: $COMMAND"
    echo "Run 'rig help' for usage."
    exit 1
    ;;
esac
```

- [ ] **Step 2: Test help output**

Run: `./scripts/rig help`
Expected: Help text includes `--product` flag

- [ ] **Step 3: Commit**

```bash
git add scripts/rig
git commit -m "feat: add --product flag for single-product focus mode"
```

---

### Task 2: Add product filter to pre-meeting.sh

**Files:**
- Modify: `scripts/pre-meeting.sh`

- [ ] **Step 1: Add product filter logic**

After the `PRODUCT_COUNT` line (line 64 area), add a filter check inside the loop. Replace the for-loop section (from `for i in` through `done`) with:

Insert this line right after `PRODUCT_COUNT=$(yq '.products | length' "$CONFIG")`:

```bash
# Optional product filter (from env var)
FILTER="${PRODUCT_FILTER:-}"
```

Then inside the loop, right after `NAME=$(yq ".products[$i].name" "$CONFIG")`, add:

```bash
  # Skip if product filter is set and doesn't match
  if [ -n "$FILTER" ] && [ "$NAME" != "$FILTER" ]; then
    continue
  fi
```

- [ ] **Step 2: Test with filter**

Run: `PRODUCT_FILTER=postcall ./scripts/pre-meeting.sh`
Expected: Only gathers data for postcall, skips others

- [ ] **Step 3: Test without filter**

Run: `./scripts/pre-meeting.sh`
Expected: Gathers all products (existing behavior unchanged)

- [ ] **Step 4: Commit**

```bash
git add scripts/pre-meeting.sh
git commit -m "feat: add product filter support to pre-meeting script"
```

---

### Task 3: Scaffold idea pipeline folders for all products

**Files:**
- Create: `products/*/ideas/{inbox,evaluated,validated,rejected}/.gitkeep`
- Create: `products/*/ideas/prioritized.md`

- [ ] **Step 1: Create idea folders for all products**

```bash
for product in bulkhead health postcall videogen rig; do
  mkdir -p "products/$product/ideas/inbox"
  mkdir -p "products/$product/ideas/evaluated"
  mkdir -p "products/$product/ideas/validated"
  mkdir -p "products/$product/ideas/rejected"
  touch "products/$product/ideas/inbox/.gitkeep"
  touch "products/$product/ideas/evaluated/.gitkeep"
  touch "products/$product/ideas/validated/.gitkeep"
  touch "products/$product/ideas/rejected/.gitkeep"
done
```

- [ ] **Step 2: Create prioritized.md for each product**

For each product, create `products/<name>/ideas/prioritized.md`:

```markdown
# <Name> — Prioritized Ideas

Ranked by ROI score: (Impact × Confidence × Reach) / Effort

| Rank | Idea | ROI Score | Status |
|------|------|-----------|--------|
| — | No ideas evaluated yet | — | — |
```

- [ ] **Step 3: Verify structure**

Run: `find products -path "*/ideas/*" -type f | sort`
Expected: gitkeep files and prioritized.md for all 5 products

- [ ] **Step 4: Commit**

```bash
git add products/
git commit -m "feat: scaffold idea pipeline folders for all products"
```

---

### Task 4: Add lifecycle stages to config.yaml

**Files:**
- Modify: `config.yaml`

- [ ] **Step 1: Add stage and launch_date to products**

Update the products section of `config.yaml`. Add `stage` to each product and `launch_date` where applicable:

```yaml
products:
  - name: bulkhead
    repo: "oddinks/bulkhead"
    local_path: "/home/x/working/bulkhead"
    description: "Remote file manager and code editor for iOS/macOS — SFTP, SMB, WebDAV, S3"
    stage: growth
  - name: health
    repo: "oddinks/health"
    local_path: "/home/x/working/health"
    description: "Nutrition and exercise app — unnamed, work in progress"
    stage: building
    launch_date: "2026-03-31"
  - name: postcall
    repo: "xydac/postcall"
    local_path: "/home/x/working/postcall"
    description: "Privacy-focused AI meeting summaries and action items"
    stage: pre-launch
    launch_date: "2026-03-25"
  - name: videogen
    repo: ""
    local_path: "/home/x/working/videogen"
    description: "Research project — evaluating video generation with LLMs"
    stage: exploration
  - name: rig
    repo: "xydac/rig"
    local_path: "/home/x/working/standupai"
    description: "Rig itself — self-monitoring"
    stage: growth
```

- [ ] **Step 2: Verify YAML is valid**

Run: `yq '.products[] | .name + " → " + .stage' config.yaml`
Expected: Each product shows its stage

- [ ] **Step 3: Commit**

```bash
git add config.yaml
git commit -m "feat: add lifecycle stages and launch dates to product config"
```

---

### Task 5: Update CLAUDE.md with single-product mode and idea capture

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add single-product mode and idea capture to CLAUDE.md**

Add the following sections. After the `### If swarm.enabled is false` section and before `## Talk Mode`, add:

```markdown
### Single-Product Focus Mode

If the `PRODUCT_FILTER` env var is set (via `./scripts/rig --product <name>`):
- Only spawn the PM agent for that product (skip others)
- Pre-meeting summaries are only for that product
- Go deeper: read the product's full roadmap, backlog, notes, ideas, and decisions — not just the summary
- Still load company context and advisor personas
```

Then in the `### During talk mode` section, add a new bullet:

```markdown
- Ideas → write to `products/<name>/ideas/inbox/<date>-<iter>-<slug>.md` using the idea template (see rig-agent.md)
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "feat: add single-product mode and idea capture to CLAUDE.md"
```

---

### Task 6: Update rig-agent.md with single-product mode and idea pipeline

**Files:**
- Modify: `rig-agent.md`

- [ ] **Step 1: Add single-product mode section**

After the `### Single-Agent Mode Startup` section, add:

```markdown
### Single-Product Focus Mode

If the `PRODUCT_FILTER` env var is set (passed via `./scripts/rig --product <name>`):

- In swarm mode: only spawn the PM agent for that product
- In single-agent mode: only read that product's summaries
- Go deeper on the focused product: read its full roadmap, backlog, notes, ideas/prioritized.md, and recent decisions
- Still load company context and advisor personas for cross-cutting perspectives
- Standup summary should note it was a focused session: `# Standup — <date>-<iter> (postcall focus)`
```

- [ ] **Step 2: Add idea capture section**

After the `### Roadmap and backlog updates` line in the "During talk mode" section, add:

```markdown
### Idea capture
When an idea comes up during discussion (new feature, improvement, research direction):
- Write it to `products/<name>/ideas/inbox/<date>-<iter>-<slug>.md`
- Use this template:

```
# Idea: <Title>

**Date:** <date>
**Source:** standup
**Product:** <name>
**Status:** inbox

## Description
<What is it?>

## Problem it solves
<What user pain does this address?>
```

Keep it lightweight — just capture the idea. Evaluation and scoring happen later in the autonomous idea-evaluation cycle.
```

- [ ] **Step 3: Commit**

```bash
git add rig-agent.md
git commit -m "feat: add single-product mode and idea capture to orchestrator"
```

---

### Task 7: End-to-end verification

- [ ] **Step 1: Test single-product pre-meeting**

Run: `./scripts/rig --product postcall pre`
Expected: Only gathers postcall data, skips other products

- [ ] **Step 2: Test full pre-meeting still works**

Run: `./scripts/rig pre`
Expected: Gathers all 5 products

- [ ] **Step 3: Verify idea pipeline structure**

Run: `find products -path "*/ideas/*" | head -20`
Expected: Idea folders for all products

- [ ] **Step 4: Verify config stages**

Run: `yq '.products[] | .name + " → " + .stage' config.yaml`
Expected: All 5 products with stages

- [ ] **Step 5: Verify agent prompts are consistent**

Run: `grep -c "Single-Product Focus" CLAUDE.md rig-agent.md`
Expected: Both files contain the section

- [ ] **Step 6: Push**

```bash
git push origin master
```
