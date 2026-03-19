# Milestone 2 Sprint 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add meeting type support (`./scripts/rig meeting <type>`), metrics capture in pre-meeting, and autonomous idea evaluation.

**Architecture:** New `meetings/` folder with prompt templates per meeting type. Pre-meeting script extended to pull metrics based on product stage. Idea evaluation runs as a post-DONE autonomous task via agent prompt instructions. All KISS — bash + markdown + yq.

**Tech Stack:** Bash, yq, markdown, gh CLI

---

## File Map

| File | Responsibility |
|------|---------------|
| `meetings/daily-standup.md` | **Create** — Meeting template (wraps current rig-agent.md behavior) |
| `meetings/deep-review.md` | **Create** — Single-product deep dive template |
| `meetings/idea-evaluation.md` | **Create** — Autonomous idea scoring template |
| `meetings/launch-readiness.md` | **Create** — Go/no-go checklist template |
| `meetings/competitive-scan.md` | **Create** — Competitor monitoring template |
| `scripts/rig` | **Modify** — Add `meeting` subcommand |
| `scripts/pre-meeting.sh` | **Modify** — Add metrics pulling based on product stage |
| `CLAUDE.md` | **Modify** — Add idea evaluation to post-DONE autonomous tasks |
| `rig-agent.md` | **Modify** — Add post-DONE autonomous tasks (idea eval, competitive scan) |
| `products/*/metrics/.gitkeep` | **Create** — Metrics folder per product |

---

### Task 1: Create meeting prompt templates

**Files:**
- Create: `meetings/daily-standup.md`
- Create: `meetings/deep-review.md`
- Create: `meetings/idea-evaluation.md`
- Create: `meetings/launch-readiness.md`
- Create: `meetings/competitive-scan.md`

- [ ] **Step 1: Create meetings directory**

```bash
mkdir -p meetings
```

- [ ] **Step 2: Create daily-standup.md**

Create `meetings/daily-standup.md`:

```markdown
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
```

- [ ] **Step 3: Create deep-review.md**

Create `meetings/deep-review.md`:

```markdown
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
```

- [ ] **Step 4: Create idea-evaluation.md**

Create `meetings/idea-evaluation.md`:

```markdown
# Meeting: Idea Evaluation

**Type:** company (runs across all products)
**Human:** autonomous
**Trigger:** post-DONE (runs after standup execution completes)

## Purpose
Score and evaluate all ideas in inbox across all products. Move them to evaluated/ with ROI scores. Update prioritized.md.

## Instructions

For each product, check `products/<name>/ideas/inbox/` for new ideas.

For each idea found:

1. Read the idea file
2. Score it:
   - **Impact:** Low=1, Medium=2, High=3, Critical=5
   - **Confidence:** Low=0.5, Medium=0.75, High=1.0
   - **Reach:** fraction of users affected (0.1 to 1.0)
   - **Effort:** S=1, M=2, L=4, XL=8
   - **ROI = (Impact × Confidence × Reach) / Effort**
3. Add the evaluation section to the idea file:
   ```
   ## Evaluation
   - **Impact:** <score> — <reasoning>
   - **Confidence:** <score> — <reasoning>
   - **Reach:** <score> — <reasoning>
   - **Effort:** <score> — <reasoning>
   - **ROI Score:** <calculated>
   ```
4. Move the file from `inbox/` to `evaluated/`
5. Update `products/<name>/ideas/prioritized.md` with the new ranking

## Scoring Guidelines
- Use product context (roadmap, backlog, metrics, competitive data) to inform scores
- High impact = solves a top user pain or unlocks revenue
- High confidence = strong evidence (user requests, competitive validation, data)
- Low confidence = gut feeling, no validation yet
- Consider the product's lifecycle stage when scoring effort (building stage = smaller effort for new features)

## Outputs
- Ideas moved from `inbox/` to `evaluated/`
- `products/<name>/ideas/prioritized.md` updated with current rankings
```

- [ ] **Step 5: Create launch-readiness.md**

Create `meetings/launch-readiness.md`:

```markdown
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
```

- [ ] **Step 6: Create competitive-scan.md**

Create `meetings/competitive-scan.md`:

```markdown
# Meeting: Competitive Scan

**Type:** company (runs across all products)
**Human:** autonomous
**Trigger:** post-DONE (runs after standup execution completes)

## Purpose
Quick scan of competitor activity across all products. Check for notable updates, new features, pricing changes.

## Instructions

For each product in config.yaml that has competitors defined (check `products/<name>/competitive/landscape.md` if it exists):

1. Read the product's competitive landscape file
2. For each competitor listed:
   - Check their website/changelog for recent updates (use `gh` or web tools if available)
   - Note any significant changes
3. If notable changes found, write to `products/<name>/competitive/<date>-<iter>-scan.md`:
   ```
   # Competitive Scan — <date>

   ## <Competitor Name>
   - **Change:** <what changed>
   - **Impact:** <how does this affect us>
   - **Action:** <suggested response or "monitor">
   ```
4. If no notable changes, skip (don't create empty files)

## Outputs
- `products/<name>/competitive/<date>-<iter>-scan.md` (only if changes found)
```

- [ ] **Step 7: Commit**

```bash
git add meetings/
git commit -m "feat: add meeting prompt templates (standup, deep-review, idea-eval, launch, competitive)"
```

---

### Task 2: Add meeting subcommand to scripts/rig

**Files:**
- Modify: `scripts/rig`

- [ ] **Step 1: Add meeting command to the case statement**

Read current `scripts/rig`. In the case statement, add a `meeting)` case before `add-product)`:

```bash
  meeting)
    MEETING_TYPE="${ARGS[1]}"
    if [ -z "$MEETING_TYPE" ]; then
      echo "Usage: rig meeting <type> [--product <name>]"
      echo ""
      echo "Meeting types:"
      ls -1 "$ROOT_DIR/meetings/" | sed 's/\.md$//'
      exit 1
    fi
    MEETING_FILE="$ROOT_DIR/meetings/${MEETING_TYPE}.md"
    if [ ! -f "$MEETING_FILE" ]; then
      echo "ERROR: Unknown meeting type: $MEETING_TYPE"
      echo "Available types:"
      ls -1 "$ROOT_DIR/meetings/" | sed 's/\.md$//'
      exit 1
    fi
    echo "=== Rig Meeting: $MEETING_TYPE ==="
    if [ -n "$PRODUCT_FILTER" ]; then
      echo "Focus: $PRODUCT_FILTER"
    fi
    echo ""
    PRODUCT_FILTER="$PRODUCT_FILTER" "$SCRIPT_DIR/pre-meeting.sh"
    echo ""
    echo "=== Launching $MEETING_TYPE session... ==="
    echo ""
    if [ -n "$PRODUCT_FILTER" ]; then
      cd "$ROOT_DIR" && PRODUCT_FILTER="$PRODUCT_FILTER" MEETING_TYPE="$MEETING_TYPE" claude
    else
      cd "$ROOT_DIR" && MEETING_TYPE="$MEETING_TYPE" claude
    fi
    echo ""
    "$SCRIPT_DIR/post-meeting.sh"
    ;;
```

Also update the help text to include the meeting command:

```
echo "  meeting <type> Run a specific meeting type"
```

- [ ] **Step 2: Test meeting list**

Run: `./scripts/rig meeting`
Expected: Lists available meeting types

- [ ] **Step 3: Commit**

```bash
git add scripts/rig
git commit -m "feat: add meeting subcommand to rig entry point"
```

---

### Task 3: Scaffold metrics folders

**Files:**
- Create: `products/*/metrics/.gitkeep`

- [ ] **Step 1: Create metrics folders**

```bash
for product in bulkhead health postcall videogen rig; do
  mkdir -p "products/$product/metrics"
  touch "products/$product/metrics/.gitkeep"
done
```

- [ ] **Step 2: Commit**

```bash
git add products/
git commit -m "feat: scaffold metrics folders for all products"
```

---

### Task 4: Add metrics to pre-meeting.sh

**Files:**
- Modify: `scripts/pre-meeting.sh`

- [ ] **Step 1: Add stage-aware metrics section**

Read current `scripts/pre-meeting.sh`. After the "No changes note" section (around line 127, after the `fi` that closes the commit count check), add a metrics section before the `echo "  Summary written to:"` line:

```bash

  # Stage-aware metrics (if stage is configured)
  STAGE=$(yq ".products[$i].stage" "$CONFIG" 2>/dev/null)
  if [ -n "$STAGE" ] && [ "$STAGE" != "null" ]; then
    echo "## Product Stage" >> "$SUMMARY_FILE"
    echo "**Stage:** $STAGE" >> "$SUMMARY_FILE"

    # Launch countdown
    LAUNCH_DATE=$(yq ".products[$i].launch_date" "$CONFIG" 2>/dev/null)
    if [ -n "$LAUNCH_DATE" ] && [ "$LAUNCH_DATE" != "null" ]; then
      DAYS_LEFT=$(( ( $(date -d "$LAUNCH_DATE" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$LAUNCH_DATE" +%s 2>/dev/null) - $(date +%s) ) / 86400 ))
      echo "**Launch date:** $LAUNCH_DATE (**${DAYS_LEFT} days**)" >> "$SUMMARY_FILE"
      if [ "$DAYS_LEFT" -le 7 ]; then
        echo "⚠️ **LAUNCH IMMINENT** — consider running launch-readiness meeting" >> "$SUMMARY_FILE"
      fi
    fi
    echo "" >> "$SUMMARY_FILE"

    # GitHub metrics (issues by state)
    if [ -n "$REPO" ] && [ "$REPO" != "null" ] && [ "$REPO" != '""' ] && [ "$REPO" != "" ]; then
      OPEN_ISSUES=$(gh issue list --repo "$REPO" --state open --json number 2>/dev/null | yq '. | length' 2>/dev/null || echo "?")
      CLOSED_WEEK=$(gh issue list --repo "$REPO" --state closed --json closedAt --jq "[.[] | select(.closedAt > \"${SINCE}\")] | length" 2>/dev/null || echo "?")
      echo "## Metrics" >> "$SUMMARY_FILE"
      echo "- Open issues: $OPEN_ISSUES" >> "$SUMMARY_FILE"
      echo "- Issues closed since last standup: $CLOSED_WEEK" >> "$SUMMARY_FILE"
      echo "" >> "$SUMMARY_FILE"
    fi
  fi
```

- [ ] **Step 2: Write metrics summary to metrics folder**

After writing to the summary file, also write a standalone metrics file. Add this before the `echo "  Summary written to:"` line:

```bash

  # Write standalone metrics file
  METRICS_DIR="$ROOT_DIR/products/$NAME/metrics"
  mkdir -p "$METRICS_DIR"
  METRICS_FILE="$METRICS_DIR/$RUN_ID.md"
  if [ -n "$STAGE" ] && [ "$STAGE" != "null" ]; then
    cat > "$METRICS_FILE" << METRICS
# $NAME — Metrics ($RUN_ID)
**Stage:** $STAGE
METRICS
    if [ -n "$LAUNCH_DATE" ] && [ "$LAUNCH_DATE" != "null" ]; then
      echo "**Launch:** $LAUNCH_DATE (${DAYS_LEFT} days)" >> "$METRICS_FILE"
    fi
    if [ -n "$REPO" ] && [ "$REPO" != "null" ] && [ "$REPO" != '""' ] && [ "$REPO" != "" ]; then
      echo "" >> "$METRICS_FILE"
      echo "## GitHub" >> "$METRICS_FILE"
      echo "- Open issues: $OPEN_ISSUES" >> "$METRICS_FILE"
      echo "- Closed since last standup: $CLOSED_WEEK" >> "$METRICS_FILE"
    fi
    echo "" >> "$METRICS_FILE"
  fi
```

- [ ] **Step 3: Test**

Run: `./scripts/rig pre`
Expected: Summaries now include "Product Stage" section with stage, launch countdown, and issue metrics.

- [ ] **Step 4: Commit**

```bash
git add scripts/pre-meeting.sh
git commit -m "feat: add stage-aware metrics to pre-meeting script"
```

---

### Task 5: Update agent prompts for post-DONE autonomous tasks

**Files:**
- Modify: `rig-agent.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update rig-agent.md DONE section**

Read current `rig-agent.md`. In the "DONE" keyword section, after step 4 (sending shutdown to PM agents with no tasks), add steps for autonomous background tasks. Replace steps 5-9 with:

Find the text starting from `5. Tell the user:` through `9. Exit the session` and replace with:

```markdown
5. Tell the user: "Tasks dispatched to PM agents. Post-meeting will run automatically."
6. **Launch autonomous background tasks:**
   - Read `meetings/idea-evaluation.md` and execute its instructions (score any inbox ideas across all products)
   - If any product has a `competitive/landscape.md`, read `meetings/competitive-scan.md` and execute its instructions
7. **Wait for all PM agents to complete.** As each PM agent sends a "COMPLETED" message, acknowledge it and then send that agent a shutdown request
8. If a PM agent sends a "BLOCKED" message, note it in the standup summary under a "Blockers" section and send that agent a shutdown request
9. Once ALL PM agents have been shut down and autonomous tasks are done:
   - Ensure the standup summary and action items file are finalized
   - Commit all changes in the rig repo: `git add -A && git commit -m "standup: <date>-<iter>"`
10. Exit the session (this triggers `post-meeting.sh` from the shell script)
```

- [ ] **Step 2: Update CLAUDE.md DONE section**

Read current CLAUDE.md. In the "DONE" keyword section, after step 3 (shutdown to no-task agents), add:

Before the line `4. Tell user:`, insert:

```markdown
4. Run autonomous tasks: evaluate ideas in inbox (per `meetings/idea-evaluation.md`), competitive scan if landscape files exist
```

And renumber the remaining steps (old 4→5, old 5→6, etc. through old 8→9).

- [ ] **Step 3: Commit**

```bash
git add rig-agent.md CLAUDE.md
git commit -m "feat: add post-DONE autonomous tasks (idea evaluation, competitive scan)"
```

---

### Task 6: End-to-end verification

- [ ] **Step 1: Verify meeting templates exist**

Run: `ls meetings/`
Expected: 5 .md files (competitive-scan, daily-standup, deep-review, idea-evaluation, launch-readiness)

- [ ] **Step 2: Verify meeting subcommand lists types**

Run: `./scripts/rig meeting`
Expected: Lists available meeting types

- [ ] **Step 3: Verify metrics in pre-meeting output**

Run: `./scripts/rig --product postcall pre`
Expected: Output includes "Product Stage" with "pre-launch" and launch countdown

- [ ] **Step 4: Verify metrics files created**

Run: `find products -path "*/metrics/*.md" | sort`
Expected: Metrics files for products that have stages

- [ ] **Step 5: Verify agent prompts reference autonomous tasks**

Run: `grep -c "idea-evaluation\|competitive-scan\|autonomous" rig-agent.md CLAUDE.md`
Expected: Both files reference the autonomous tasks

- [ ] **Step 6: Git log**

Run: `git log --oneline -6`
Expected: Clean commits for all tasks

- [ ] **Step 7: Push**

```bash
git push origin master
```
