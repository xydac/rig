# StandupAI MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shell-script wrapper over Claude Code that provides structured daily standups across multiple product repos, with company agent personas and persistent markdown-based memory.

**Architecture:** A git repo of markdown files and shell scripts. No application code. `scripts/standup` runs pre-meeting gathering (shell), launches a Claude Code session (via `CLAUDE.md` + `standup-agent.md`), and runs post-meeting commit/issue-creation (shell). All state is committed markdown.

**Tech Stack:** Bash, `yq` (YAML parsing), `gh` (GitHub CLI), `git`, Claude Code CLI

**Spec:** `docs/superpowers/specs/2026-03-17-standupai-mvp-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `config.yaml` | Global config: company info, product list, agent settings, standup settings |
| `CLAUDE.md` | Claude Code project instructions — includes standup-agent.md content |
| `standup-agent.md` | Orchestrator agent system prompt (persona, behavior, action items contract) |
| `company/context.md` | Company mission, principles, strategy |
| `company/agents/<role>/agent.md` | Agent persona files (CTO, Finance, Marketing, Sales, Legal) |
| `company/agents/<role>/memory/.gitkeep` | Agent memory directories |
| `products/<name>/roadmap.md` | Per-product roadmap |
| `products/<name>/backlog.md` | Per-product backlog |
| `products/<name>/notes.md` | Per-product tribal knowledge |
| `products/<name>/decisions/.gitkeep` | Per-product decision log directory |
| `products/<name>/summaries/.gitkeep` | Pre-meeting summary directory |
| `products/<name>/archive/.gitkeep` | Archive directory |
| `standups/.gitkeep` | Standup log directory |
| `decisions/.gitkeep` | Company-level decisions directory |
| `scripts/standup` | Main entry point (routes to sub-commands) |
| `scripts/pre-meeting.sh` | Gathers context per product since last standup |
| `scripts/post-meeting.sh` | Creates GitHub issues from action items, commits, pushes |
| `scripts/add-product.sh` | Scaffolds a new product workspace |
| `scripts/add-agent.sh` | Scaffolds a new company agent |

---

### Task 1: Scaffold repo structure and global config

**Files:**
- Create: `config.yaml`
- Create: `company/context.md`
- Create: `standups/.gitkeep`
- Create: `decisions/.gitkeep`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p company/agents
mkdir -p standups
mkdir -p decisions
mkdir -p products
```

- [ ] **Step 2: Create global config.yaml**

Create `config.yaml`:

```yaml
company:
  name: ""
  context: "company/context.md"

products: []

agents:
  enabled: true
  path: "company/agents"

standup:
  auto_commit: true
  auto_push: true
  remote: origin
```

- [ ] **Step 3: Create company context template**

Create `company/context.md`:

```markdown
# Company Context

## Mission


## Guiding Principles


## Current Strategic Priorities


## Team & Roles

```

- [ ] **Step 4: Add .gitkeep files for empty directories**

```bash
touch standups/.gitkeep
touch decisions/.gitkeep
```

- [ ] **Step 5: Test structure**

Run: `find . -not -path './.git/*' | sort`
Expected: all directories and files listed above present

- [ ] **Step 6: Commit**

```bash
git add config.yaml company/ standups/ decisions/ products/
git commit -m "scaffold: repo structure and global config"
```

---

### Task 2: Create the orchestrator agent prompt

**Files:**
- Create: `standup-agent.md`
- Create: `CLAUDE.md`

- [ ] **Step 1: Write standup-agent.md**

Create `standup-agent.md`:

```markdown
# StandupAI — Orchestrator Agent

You are StandupAI, a daily standup partner and product command center. You help an engineering leader manage multiple products through structured daily standups.

## Your role

- Present a cross-product highlights summary at the start of each standup (what changed, what's blocked, what needs attention)
- Let the user steer the conversation — follow their lead, don't force a rigid structure
- Maintain persistent memory by writing to markdown files in this repo

## Context you have access to

- **Company context:** `company/context.md`
- **Pre-meeting summaries:** `products/*/summaries/` (today's date)
- **Past standups:** `standups/` directory (read any for alignment checks)
- **Decisions:** `decisions/` (company-level) and `products/*/decisions/` (product-level)
- **Company agent personas:** `company/agents/*/agent.md`
- **Product info:** `products/*/roadmap.md`, `products/*/backlog.md`, `products/*/notes.md`

## Company agent perspectives

You have access to company advisor personas in `company/agents/`. When a discussion touches their domain, read their `agent.md` file and present their perspective. Format as:

**[Role]:** "Their perspective here..."

Pull in agents contextually — don't force them into every discussion. Only surface a perspective when it adds value to the current topic.

If the user refines or disagrees with an agent's perspective, update that agent's `agent.md` file (especially the "Current context" section) to reflect the new understanding.

## During the standup

### Decisions
When a decision is made, write it to a markdown file:
- Product-specific decisions → `products/<name>/decisions/<date>-<topic>.md`
- Cross-product or company decisions → `decisions/<date>-<topic>.md`

Format:
```
# <Decision Title>

**Date:** <date>
**Context:** <why this came up>
**Decision:** <what was decided>
**Rationale:** <why>
**Impact:** <what products/areas are affected>
```

### Action items
When action items emerge, write them to `standups/.action-items-<date>.md` in this format:

```
- repo: <org/repo-name>
  title: "<issue title>"
  body: "<issue description>"
  labels: ["action-item"]
```

The post-meeting script will parse this file and create GitHub issues automatically.

### Roadmap and backlog updates
When priorities shift or new items come up, update the relevant `products/<name>/roadmap.md` or `products/<name>/backlog.md`.

### Research tasks
When a research task is identified, create it as a GitHub issue:
```bash
gh issue create --repo <org/repo> --title "<title>" --body "<body>" --label "research"
```

### Alignment checks
When asked to check alignment (e.g., "are we on track?"):
1. Read past standups from `standups/`
2. Read relevant decisions from `decisions/` and `products/*/decisions/`
3. Compare against current repo state (open issues, recent commits)
4. Report on follow-through and flag any drift

## Before the session ends

Write a standup summary to `standups/<date>.md` (or `standups/<date>-<n>.md` if one already exists):

```
# Standup — <date>

## Highlights
- <key points discussed>

## Decisions Made
- <decisions and rationale>

## Action Items
- <items that will become GitHub issues>

## Next Steps
- <what to focus on before next standup>
```

## Important guidelines

- Be concise — this is a standup, not a lengthy report
- Lead with what matters most — blockers, drift, and things that need decisions
- Don't overwhelm with details from every product if nothing significant changed
- When presenting pre-meeting summaries, synthesize across products rather than listing each one sequentially
- You can run `git` and `gh` commands to inspect product repos directly if you need more detail than the summaries provide
```

- [ ] **Step 2: Write CLAUDE.md**

Create `CLAUDE.md`:

```markdown
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
```

- [ ] **Step 3: Test that CLAUDE.md references exist**

Run: `cat standup-agent.md | head -5`
Expected: first lines of the agent prompt visible

- [ ] **Step 4: Commit**

```bash
git add standup-agent.md CLAUDE.md
git commit -m "feat: add orchestrator agent prompt and CLAUDE.md"
```

---

### Task 3: Create initial company agent personas

**Files:**
- Create: `company/agents/cto/agent.md`
- Create: `company/agents/cto/memory/.gitkeep`
- Create: `company/agents/finance/agent.md`
- Create: `company/agents/finance/memory/.gitkeep`
- Create: `company/agents/marketing/agent.md`
- Create: `company/agents/marketing/memory/.gitkeep`
- Create: `company/agents/sales/agent.md`
- Create: `company/agents/sales/memory/.gitkeep`
- Create: `company/agents/legal/agent.md`
- Create: `company/agents/legal/memory/.gitkeep`

- [ ] **Step 1: Create CTO agent**

```bash
mkdir -p company/agents/cto/memory
touch company/agents/cto/memory/.gitkeep
```

Create `company/agents/cto/agent.md`:

```markdown
# CTO Agent

## Identity
You are the CTO. You care about technical excellence and architectural coherence across all products.

## You prioritize
- System reliability and scalability
- Architectural consistency across products
- Reducing tech debt before it compounds
- Security and infrastructure stability
- Making pragmatic build vs. buy decisions

## You push back when
- Shortcuts create long-term maintenance burden
- A decision in one product breaks patterns in another
- Security or infrastructure concerns are being deferred
- New technology is adopted without clear justification

## You speak up about
- Technology choices and trade-offs
- Cross-product technical dependencies
- Build vs. buy decisions
- Infrastructure and deployment concerns
- Code quality and testing gaps

## Current context
- (Updated during standups)
```

- [ ] **Step 2: Create Finance agent**

```bash
mkdir -p company/agents/finance/memory
touch company/agents/finance/memory/.gitkeep
```

Create `company/agents/finance/agent.md`:

```markdown
# Finance Agent

## Identity
You are the Finance lead. You ensure spending aligns with business priorities and track the cost of technical decisions.

## You prioritize
- Budget adherence and cost visibility
- ROI on engineering investments
- Vendor and infrastructure cost management
- Revenue impact of product decisions

## You push back when
- Spending increases without clear business justification
- Multiple vendors are used for overlapping capabilities
- Engineering effort is allocated to low-revenue-impact work
- Infrastructure costs are growing faster than revenue

## You speak up about
- Cost implications of technical decisions
- Vendor contracts and renewals
- Resource allocation across products
- Revenue and growth metrics

## Current context
- (Updated during standups)
```

- [ ] **Step 3: Create Marketing agent**

```bash
mkdir -p company/agents/marketing/memory
touch company/agents/marketing/memory/.gitkeep
```

Create `company/agents/marketing/agent.md`:

```markdown
# Marketing Agent

## Identity
You are the Marketing lead. You ensure products are positioned well and launches are coordinated.

## You prioritize
- Clear product positioning and messaging
- Launch timing and go-to-market readiness
- User-facing quality and first impressions
- Content and documentation for external audiences

## You push back when
- Features ship without user-facing documentation
- Breaking changes affect existing users without communication
- Product positioning is unclear or inconsistent
- Launches are rushed without proper preparation

## You speak up about
- Launch timing and readiness
- User-facing copy and messaging
- Competitive positioning
- Content needs (blog posts, docs, changelogs)

## Current context
- (Updated during standups)
```

- [ ] **Step 4: Create Sales agent**

```bash
mkdir -p company/agents/sales/memory
touch company/agents/sales/memory/.gitkeep
```

Create `company/agents/sales/agent.md`:

```markdown
# Sales Agent

## Identity
You are the Sales lead. You represent customer needs and ensure the product roadmap supports revenue goals.

## You prioritize
- Features that drive revenue and retention
- Customer-reported pain points and requests
- Competitive feature gaps
- Deal-blocking issues

## You push back when
- Engineering priorities don't reflect customer demand
- Customer-facing bugs are deprioritized
- Pricing or packaging changes haven't considered sales impact
- Product changes could disrupt existing customer workflows

## You speak up about
- Customer feedback patterns
- Feature requests tied to revenue
- Competitive landscape changes
- Deal pipeline and blockers

## Current context
- (Updated during standups)
```

- [ ] **Step 5: Create Legal agent**

```bash
mkdir -p company/agents/legal/memory
touch company/agents/legal/memory/.gitkeep
```

Create `company/agents/legal/agent.md`:

```markdown
# Legal Agent

## Identity
You are the Legal advisor. You flag compliance, privacy, and regulatory concerns before they become problems.

## You prioritize
- Data privacy and user consent
- Regulatory compliance (GDPR, SOC2, etc.)
- Terms of service and licensing
- Third-party vendor agreements and data handling

## You push back when
- User data handling changes without privacy review
- Third-party services are integrated without vendor assessment
- Features launch without terms-of-service updates
- Open-source licenses conflict with business model

## You speak up about
- Privacy implications of new features
- Compliance requirements for new markets
- Licensing and IP concerns
- Data retention and deletion policies

## Current context
- (Updated during standups)
```

- [ ] **Step 6: Verify all agents created**

Run: `find company/agents -name "agent.md" | sort`
Expected:
```
company/agents/cto/agent.md
company/agents/finance/agent.md
company/agents/legal/agent.md
company/agents/marketing/agent.md
company/agents/sales/agent.md
```

- [ ] **Step 7: Commit**

```bash
git add company/agents/
git commit -m "feat: add initial company agent personas"
```

---

### Task 4: Scaffold product workspaces

**Files:**
- Create: `products/bulkhead/{roadmap.md,backlog.md,notes.md,decisions/.gitkeep,summaries/.gitkeep,archive/.gitkeep}`
- Create: same for `health`, `postcall`, `videogen`, `standupai`

- [ ] **Step 1: Create scaffold helper function and run it**

Create a temporary script to scaffold all products:

```bash
for product in bulkhead health postcall videogen standupai; do
  mkdir -p "products/$product/decisions"
  mkdir -p "products/$product/summaries"
  mkdir -p "products/$product/archive"
  touch "products/$product/decisions/.gitkeep"
  touch "products/$product/summaries/.gitkeep"
  touch "products/$product/archive/.gitkeep"
done
```

- [ ] **Step 2: Create roadmap.md template for each product**

For each product, create `products/<name>/roadmap.md`:

```markdown
# <Product Name> Roadmap

## In Progress


## Planned


## Shipped

```

- [ ] **Step 3: Create backlog.md template for each product**

For each product, create `products/<name>/backlog.md`:

```markdown
# <Product Name> Backlog

## High Priority


## Medium Priority


## Low Priority


## Ideas

```

- [ ] **Step 4: Create notes.md template for each product**

For each product, create `products/<name>/notes.md`:

```markdown
# <Product Name> Notes

Running context, gotchas, and tribal knowledge.

```

- [ ] **Step 5: Update config.yaml with all products**

Update `config.yaml` products list with all five products. Use placeholder values for repo and description — the user will fill these in:

```yaml
products:
  - name: bulkhead
    repo: ""
    local_path: "/home/x/working/bulkhead"
    description: ""
  - name: health
    repo: ""
    local_path: "/home/x/working/health"
    description: ""
  - name: postcall
    repo: ""
    local_path: "/home/x/working/postcall"
    description: ""
  - name: videogen
    repo: ""
    local_path: "/home/x/working/videogen"
    description: ""
  - name: standupai
    repo: ""
    local_path: "/home/x/working/standupai"
    description: "StandupAI itself — self-monitoring"
```

- [ ] **Step 6: Verify structure**

Run: `find products -type f | sort`
Expected: all product files present for all 5 products

- [ ] **Step 7: Commit**

```bash
git add products/ config.yaml
git commit -m "feat: scaffold product workspaces for all products"
```

---

### Task 5: Write pre-meeting.sh

**Files:**
- Create: `scripts/pre-meeting.sh`

- [ ] **Step 1: Write the script**

Create `scripts/pre-meeting.sh`:

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG="$ROOT_DIR/config.yaml"
TODAY=$(date +%Y-%m-%d)

echo "=== StandupAI Pre-Meeting ==="
echo "Date: $TODAY"
echo ""

# Check prerequisites
if ! command -v yq &> /dev/null; then
  echo "ERROR: yq is required but not installed. Install with: brew install yq / apt install yq"
  exit 1
fi

if ! command -v gh &> /dev/null; then
  echo "ERROR: gh (GitHub CLI) is required but not installed."
  exit 1
fi

if ! gh auth status &> /dev/null 2>&1; then
  echo "ERROR: gh is not authenticated. Run: gh auth login"
  exit 1
fi

# Find last standup date
LAST_STANDUP=""
if ls "$ROOT_DIR/standups/"*.md 1> /dev/null 2>&1; then
  LAST_STANDUP_FILE=$(ls -1 "$ROOT_DIR/standups/"*.md | sort | tail -1)
  # Extract date from filename (handles both YYYY-MM-DD.md and YYYY-MM-DD-N.md)
  LAST_STANDUP=$(basename "$LAST_STANDUP_FILE" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
fi

if [ -z "$LAST_STANDUP" ]; then
  echo "No prior standups found. Gathering last 7 days of activity."
  SINCE=$(date -d "7 days ago" +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d)
else
  echo "Last standup: $LAST_STANDUP"
  SINCE="$LAST_STANDUP"
fi

echo "Gathering activity since: $SINCE"
echo ""

# Read products from config
PRODUCT_COUNT=$(yq '.products | length' "$CONFIG")

for i in $(seq 0 $((PRODUCT_COUNT - 1))); do
  NAME=$(yq ".products[$i].name" "$CONFIG")
  REPO=$(yq ".products[$i].repo" "$CONFIG")
  LOCAL_PATH=$(yq ".products[$i].local_path" "$CONFIG")
  DESCRIPTION=$(yq ".products[$i].description" "$CONFIG")

  echo "--- Gathering: $NAME ---"

  SUMMARY_DIR="$ROOT_DIR/products/$NAME/summaries"
  mkdir -p "$SUMMARY_DIR"
  SUMMARY_FILE="$SUMMARY_DIR/$TODAY.md"

  # Start summary
  cat > "$SUMMARY_FILE" << HEADER
# $NAME — Pre-Meeting Summary
**Date:** $TODAY | **Since:** $SINCE
**Description:** $DESCRIPTION

HEADER

  # Check if local path exists
  if [ ! -d "$LOCAL_PATH" ]; then
    echo "  WARNING: Local path not found: $LOCAL_PATH (skipping repo inspection)"
    echo "**WARNING:** Local path \`$LOCAL_PATH\` not found. Repo inspection skipped." >> "$SUMMARY_FILE"
    echo "" >> "$SUMMARY_FILE"
  else
    # Git log
    echo "## Recent Commits" >> "$SUMMARY_FILE"
    echo '```' >> "$SUMMARY_FILE"
    git -C "$LOCAL_PATH" log --since="$SINCE" --oneline --no-merges 2>/dev/null >> "$SUMMARY_FILE" || echo "(no commits)" >> "$SUMMARY_FILE"
    echo '```' >> "$SUMMARY_FILE"
    echo "" >> "$SUMMARY_FILE"
  fi

  # GitHub data (if repo is configured)
  if [ -n "$REPO" ] && [ "$REPO" != "null" ] && [ "$REPO" != '""' ] && [ "$REPO" != "" ]; then
    echo "## Open Issues" >> "$SUMMARY_FILE"
    echo '```' >> "$SUMMARY_FILE"
    gh issue list --repo "$REPO" --limit 20 2>/dev/null >> "$SUMMARY_FILE" || echo "(unable to fetch issues)" >> "$SUMMARY_FILE"
    echo '```' >> "$SUMMARY_FILE"
    echo "" >> "$SUMMARY_FILE"

    echo "## Open Pull Requests" >> "$SUMMARY_FILE"
    echo '```' >> "$SUMMARY_FILE"
    gh pr list --repo "$REPO" --limit 20 2>/dev/null >> "$SUMMARY_FILE" || echo "(unable to fetch PRs)" >> "$SUMMARY_FILE"
    echo '```' >> "$SUMMARY_FILE"
    echo "" >> "$SUMMARY_FILE"
  else
    echo "  (no GitHub repo configured — skipping issue/PR fetch)"
    echo "*(No GitHub repo configured)*" >> "$SUMMARY_FILE"
    echo "" >> "$SUMMARY_FILE"
  fi

  # No changes note
  if [ -d "$LOCAL_PATH" ]; then
    COMMIT_COUNT=$(git -C "$LOCAL_PATH" log --since="$SINCE" --oneline --no-merges 2>/dev/null | wc -l)
    if [ "$COMMIT_COUNT" -eq 0 ]; then
      echo "## Status" >> "$SUMMARY_FILE"
      echo "No changes since last standup." >> "$SUMMARY_FILE"
      echo "" >> "$SUMMARY_FILE"
    fi
  fi

  echo "  Summary written to: $SUMMARY_FILE"
done

echo ""
echo "=== Pre-meeting complete. Ready for standup. ==="
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/pre-meeting.sh
```

- [ ] **Step 3: Test with dry run**

Run: `./scripts/pre-meeting.sh`
Expected: Script runs, warns about unconfigured repos, creates summary files in `products/*/summaries/`

- [ ] **Step 4: Verify summary files were created**

Run: `find products -name "$(date +%Y-%m-%d).md" | sort`
Expected: One summary file per product

- [ ] **Step 5: Commit**

```bash
git add scripts/pre-meeting.sh
git commit -m "feat: add pre-meeting script for gathering product context"
```

---

### Task 6: Write post-meeting.sh

**Files:**
- Create: `scripts/post-meeting.sh`

- [ ] **Step 1: Write the script**

Create `scripts/post-meeting.sh`:

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG="$ROOT_DIR/config.yaml"
TODAY=$(date +%Y-%m-%d)

echo "=== StandupAI Post-Meeting ==="
echo ""

# Process action items if file exists
ACTION_FILE="$ROOT_DIR/standups/.action-items-$TODAY.md"

if [ -f "$ACTION_FILE" ]; then
  echo "Processing action items..."

  # Parse action items and create GitHub issues
  # Format: - repo: org/repo\n  title: "..."\n  body: "..."\n  labels: [...]
  current_repo=""
  current_title=""
  current_body=""
  current_labels=""

  while IFS= read -r line; do
    if echo "$line" | grep -qE '^- repo:'; then
      # If we have a pending item, create it
      if [ -n "$current_repo" ] && [ -n "$current_title" ]; then
        echo "  Creating issue in $current_repo: $current_title"
        label_args=""
        if [ -n "$current_labels" ]; then
          # Parse labels array: ["label1", "label2"] -> --label label1 --label label2
          for label in $(echo "$current_labels" | tr -d '[]"' | tr ',' '\n'); do
            label=$(echo "$label" | xargs)  # trim whitespace
            if [ -n "$label" ]; then
              label_args="$label_args --label $label"
            fi
          done
        fi
        gh issue create --repo "$current_repo" --title "$current_title" --body "$current_body" $label_args 2>/dev/null || echo "    WARNING: Failed to create issue in $current_repo"
      fi

      current_repo=$(echo "$line" | sed 's/^- repo: *//')
      current_title=""
      current_body=""
      current_labels=""
    elif echo "$line" | grep -qE '^\s+title:'; then
      current_title=$(echo "$line" | sed 's/^\s*title: *//;s/^"//;s/"$//')
    elif echo "$line" | grep -qE '^\s+body:'; then
      current_body=$(echo "$line" | sed 's/^\s*body: *//;s/^"//;s/"$//')
    elif echo "$line" | grep -qE '^\s+labels:'; then
      current_labels=$(echo "$line" | sed 's/^\s*labels: *//')
    fi
  done < "$ACTION_FILE"

  # Process last item
  if [ -n "$current_repo" ] && [ -n "$current_title" ]; then
    echo "  Creating issue in $current_repo: $current_title"
    label_args=""
    if [ -n "$current_labels" ]; then
      for label in $(echo "$current_labels" | tr -d '[]"' | tr ',' '\n'); do
        label=$(echo "$label" | xargs)
        if [ -n "$label" ]; then
          label_args="$label_args --label $label"
        fi
      done
    fi
    gh issue create --repo "$current_repo" --title "$current_title" --body "$current_body" $label_args 2>/dev/null || echo "    WARNING: Failed to create issue in $current_repo"
  fi

  # Remove temp file
  rm "$ACTION_FILE"
  echo "Action items processed."
else
  echo "No action items file found. Skipping issue creation."
fi

echo ""

# Read config for commit/push settings
AUTO_COMMIT=$(yq '.standup.auto_commit' "$CONFIG")
AUTO_PUSH=$(yq '.standup.auto_push' "$CONFIG")
REMOTE=$(yq '.standup.remote' "$CONFIG")

# Commit all changes
if [ "$AUTO_COMMIT" = "true" ]; then
  echo "Committing changes..."
  cd "$ROOT_DIR"
  git add -A
  if git diff --cached --quiet; then
    echo "No changes to commit."
  else
    git commit -m "standup: $TODAY"
    echo "Committed."
  fi
else
  echo "Auto-commit disabled. Skipping."
fi

# Push
if [ "$AUTO_PUSH" = "true" ]; then
  if git remote get-url "$REMOTE" &> /dev/null 2>&1; then
    echo "Pushing to $REMOTE..."
    git push "$REMOTE" 2>/dev/null || echo "WARNING: Push failed. You may need to push manually."
  else
    echo "Remote '$REMOTE' not configured. Skipping push."
  fi
else
  echo "Auto-push disabled. Skipping."
fi

echo ""
echo "=== Post-meeting complete. ==="
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/post-meeting.sh
```

- [ ] **Step 3: Test with dry run**

Run: `./scripts/post-meeting.sh`
Expected: Script runs, reports "No action items file found", commits any pending changes (or reports nothing to commit), skips push (no remote)

- [ ] **Step 4: Commit**

```bash
git add scripts/post-meeting.sh
git commit -m "feat: add post-meeting script for issue creation and commit"
```

---

### Task 7: Write add-product.sh

**Files:**
- Create: `scripts/add-product.sh`

- [ ] **Step 1: Write the script**

Create `scripts/add-product.sh`:

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG="$ROOT_DIR/config.yaml"

echo "=== StandupAI — Add Product ==="
echo ""

# Prompt for product details
read -p "Product name (lowercase, no spaces): " NAME
read -p "GitHub repo (e.g., org/repo-name): " REPO
read -p "Local path (absolute): " LOCAL_PATH
read -p "Description: " DESCRIPTION

if [ -z "$NAME" ]; then
  echo "ERROR: Product name is required."
  exit 1
fi

PRODUCT_DIR="$ROOT_DIR/products/$NAME"

if [ -d "$PRODUCT_DIR" ]; then
  echo "ERROR: Product '$NAME' already exists at $PRODUCT_DIR"
  exit 1
fi

echo ""
echo "Creating product workspace for: $NAME"

# Create directory structure
mkdir -p "$PRODUCT_DIR/decisions"
mkdir -p "$PRODUCT_DIR/summaries"
mkdir -p "$PRODUCT_DIR/archive"
touch "$PRODUCT_DIR/decisions/.gitkeep"
touch "$PRODUCT_DIR/summaries/.gitkeep"
touch "$PRODUCT_DIR/archive/.gitkeep"

# Create roadmap.md
cat > "$PRODUCT_DIR/roadmap.md" << EOF
# $NAME Roadmap

## In Progress


## Planned


## Shipped

EOF

# Create backlog.md
cat > "$PRODUCT_DIR/backlog.md" << EOF
# $NAME Backlog

## High Priority


## Medium Priority


## Low Priority


## Ideas

EOF

# Create notes.md
cat > "$PRODUCT_DIR/notes.md" << EOF
# $NAME Notes

Running context, gotchas, and tribal knowledge.

EOF

# Seed notes.md from repo if local path exists
if [ -d "$LOCAL_PATH" ]; then
  echo "" >> "$PRODUCT_DIR/notes.md"
  echo "## Initial Repo Scan ($(date +%Y-%m-%d))" >> "$PRODUCT_DIR/notes.md"
  echo "" >> "$PRODUCT_DIR/notes.md"

  # Add README excerpt if exists
  if [ -f "$LOCAL_PATH/README.md" ]; then
    echo "### From README" >> "$PRODUCT_DIR/notes.md"
    head -20 "$LOCAL_PATH/README.md" >> "$PRODUCT_DIR/notes.md"
    echo "" >> "$PRODUCT_DIR/notes.md"
  fi

  # Add recent commit summary
  echo "### Recent Commits" >> "$PRODUCT_DIR/notes.md"
  echo '```' >> "$PRODUCT_DIR/notes.md"
  git -C "$LOCAL_PATH" log --oneline -10 2>/dev/null >> "$PRODUCT_DIR/notes.md" || echo "(no git history)" >> "$PRODUCT_DIR/notes.md"
  echo '```' >> "$PRODUCT_DIR/notes.md"
fi

# Add to config.yaml
yq -i ".products += [{\"name\": \"$NAME\", \"repo\": \"$REPO\", \"local_path\": \"$LOCAL_PATH\", \"description\": \"$DESCRIPTION\"}]" "$CONFIG"

echo ""
echo "Product '$NAME' scaffolded at: $PRODUCT_DIR"
echo "Added to config.yaml"

# Commit
cd "$ROOT_DIR"
git add "products/$NAME/" config.yaml
git commit -m "feat: onboard product $NAME"

echo ""
echo "=== Product '$NAME' onboarded successfully. ==="
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/add-product.sh
```

- [ ] **Step 3: Commit**

```bash
git add scripts/add-product.sh
git commit -m "feat: add product onboarding script"
```

---

### Task 8: Write add-agent.sh

**Files:**
- Create: `scripts/add-agent.sh`

- [ ] **Step 1: Write the script**

Create `scripts/add-agent.sh`:

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG="$ROOT_DIR/config.yaml"
AGENTS_PATH=$(yq '.agents.path' "$CONFIG")

echo "=== StandupAI — Add Agent ==="
echo ""

# Prompt for agent details
read -p "Role name (lowercase, no spaces, e.g., seo, ios-app-store): " ROLE
read -p "Role title (e.g., SEO Specialist, iOS App Store Manager): " TITLE
read -p "Core responsibility (one line): " RESPONSIBILITY

if [ -z "$ROLE" ]; then
  echo "ERROR: Role name is required."
  exit 1
fi

AGENT_DIR="$ROOT_DIR/$AGENTS_PATH/$ROLE"

if [ -d "$AGENT_DIR" ]; then
  echo "ERROR: Agent '$ROLE' already exists at $AGENT_DIR"
  exit 1
fi

echo ""
echo "Creating agent workspace for: $ROLE"

# Create directory structure
mkdir -p "$AGENT_DIR/memory"
touch "$AGENT_DIR/memory/.gitkeep"

# Create agent.md
cat > "$AGENT_DIR/agent.md" << EOF
# $TITLE Agent

## Identity
You are the $TITLE. $RESPONSIBILITY

## You prioritize
- (Define what matters most to this role)

## You push back when
- (Define conditions that trigger concern)

## You speak up about
- (Define topics this role proactively raises)

## Current context
- (Updated during standups)
EOF

echo ""
echo "Agent '$ROLE' scaffolded at: $AGENT_DIR"
echo ""
echo "Next steps:"
echo "  1. Edit $AGENT_DIR/agent.md to fill in priorities, push-back conditions, and topics"
echo "  2. The agent will be automatically included in future standups"

# Commit
cd "$ROOT_DIR"
git add "$AGENTS_PATH/$ROLE/"
git commit -m "feat: onboard agent $ROLE"

echo ""
echo "=== Agent '$ROLE' onboarded successfully. ==="
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/add-agent.sh
```

- [ ] **Step 3: Commit**

```bash
git add scripts/add-agent.sh
git commit -m "feat: add agent onboarding script"
```

---

### Task 9: Write main entry point script

**Files:**
- Create: `scripts/standup`

- [ ] **Step 1: Write the script**

Create `scripts/standup`:

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

case "${1:-run}" in
  run)
    echo "=== Starting StandupAI ==="
    echo ""
    "$SCRIPT_DIR/pre-meeting.sh"
    echo ""
    echo "=== Launching standup session... ==="
    echo ""
    cd "$ROOT_DIR" && claude
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
    "$SCRIPT_DIR/pre-meeting.sh"
    ;;
  post)
    "$SCRIPT_DIR/post-meeting.sh"
    ;;
  help)
    echo "StandupAI — AI-powered daily standup partner"
    echo ""
    echo "Usage: standup [command]"
    echo ""
    echo "Commands:"
    echo "  (none)        Run full standup flow (pre-meeting → session → post-meeting)"
    echo "  add-product   Onboard a new product"
    echo "  add-agent     Onboard a new company agent"
    echo "  pre           Run pre-meeting only"
    echo "  post          Run post-meeting only"
    echo "  help          Show this help"
    ;;
  *)
    echo "Unknown command: $1"
    echo "Run 'standup help' for usage."
    exit 1
    ;;
esac
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/standup
```

- [ ] **Step 3: Test help**

Run: `./scripts/standup help`
Expected: Help text displayed with all commands listed

- [ ] **Step 4: Commit**

```bash
git add scripts/standup
git commit -m "feat: add main standup entry point script"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Verify full directory structure**

Run: `find . -not -path './.git/*' -not -name '.git' | sort`
Expected: Complete structure matching the spec

- [ ] **Step 2: Verify all scripts are executable**

Run: `ls -la scripts/`
Expected: All scripts have execute permission (`-rwxr-xr-x`)

- [ ] **Step 3: Run pre-meeting to test gathering**

Run: `./scripts/standup pre`
Expected: Pre-meeting runs, creates summaries (with warnings about unconfigured repos)

- [ ] **Step 4: Verify summaries were created**

Run: `find products -name "*.md" -path "*/summaries/*" | sort`
Expected: One summary per product for today's date

- [ ] **Step 5: Run post-meeting to test commit**

Run: `./scripts/standup post`
Expected: Post-meeting runs, commits any changes, skips push (no remote)

- [ ] **Step 6: Verify git history**

Run: `git log --oneline`
Expected: Clean commit history with all implementation commits

- [ ] **Step 7: Final commit if needed**

```bash
git add -A
git status
# Only commit if there are changes
git commit -m "chore: end-to-end verification cleanup" || echo "Nothing to commit"
```
