#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG="$ROOT_DIR/config.yaml"
TODAY=$(date +%Y-%m-%d)

# Determine iteration number for today
# Counts existing files for today to find next iteration
next_iteration() {
  local dir="$1"
  local prefix="$2"
  local count=0
  if ls "$dir/${prefix}${TODAY}"* 1> /dev/null 2>&1; then
    count=$(ls -1 "$dir/${prefix}${TODAY}"* | wc -l)
  fi
  echo $((count + 1))
}

ITER=$(next_iteration "$ROOT_DIR/standups" "")
RUN_ID="${TODAY}-${ITER}"

echo "=== Rig Pre-Meeting ==="
echo "Run: $RUN_ID"
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

# Optional product filter (from env var)
FILTER="${PRODUCT_FILTER:-}"

for i in $(seq 0 $((PRODUCT_COUNT - 1))); do
  NAME=$(yq ".products[$i].name" "$CONFIG")

  # Skip if product filter is set and doesn't match
  if [ -n "$FILTER" ] && [ "$NAME" != "$FILTER" ]; then
    continue
  fi
  REPO=$(yq ".products[$i].repo" "$CONFIG")
  LOCAL_PATH=$(yq ".products[$i].local_path" "$CONFIG")
  DESCRIPTION=$(yq ".products[$i].description" "$CONFIG")

  echo "--- Gathering: $NAME ---"

  SUMMARY_DIR="$ROOT_DIR/products/$NAME/summaries"
  mkdir -p "$SUMMARY_DIR"
  SUMMARY_FILE="$SUMMARY_DIR/$RUN_ID.md"

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

    # GitHub issue metrics
    if [ -n "$REPO" ] && [ "$REPO" != "null" ] && [ "$REPO" != '""' ] && [ "$REPO" != "" ]; then
      OPEN_ISSUES=$(gh issue list --repo "$REPO" --state open --json number 2>/dev/null | yq '. | length' 2>/dev/null || echo "?")
      CLOSED_WEEK=$(gh issue list --repo "$REPO" --state closed --json closedAt --jq "[.[] | select(.closedAt > \"${SINCE}\")] | length" 2>/dev/null || echo "?")
      echo "## Metrics" >> "$SUMMARY_FILE"
      echo "- Open issues: $OPEN_ISSUES" >> "$SUMMARY_FILE"
      echo "- Issues closed since last standup: $CLOSED_WEEK" >> "$SUMMARY_FILE"
      echo "" >> "$SUMMARY_FILE"
    fi

    # Write standalone metrics file
    METRICS_DIR="$ROOT_DIR/products/$NAME/metrics"
    mkdir -p "$METRICS_DIR"
    METRICS_FILE="$METRICS_DIR/$RUN_ID.md"
    {
      echo "# $NAME — Metrics ($RUN_ID)"
      echo "**Stage:** $STAGE"
      if [ -n "$LAUNCH_DATE" ] && [ "$LAUNCH_DATE" != "null" ]; then
        echo "**Launch:** $LAUNCH_DATE (${DAYS_LEFT} days)"
      fi
      if [ -n "$REPO" ] && [ "$REPO" != "null" ] && [ "$REPO" != '""' ] && [ "$REPO" != "" ]; then
        echo ""
        echo "## GitHub"
        echo "- Open issues: $OPEN_ISSUES"
        echo "- Closed since last standup: $CLOSED_WEEK"
      fi
      echo ""
    } > "$METRICS_FILE"
  fi

  echo "  Summary written to: $SUMMARY_FILE"
done

echo ""
echo "=== Pre-meeting complete. Ready for Rig. ==="
