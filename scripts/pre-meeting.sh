#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG="$ROOT_DIR/config.yaml"
TODAY=$(date +%Y-%m-%d)

echo "=== Rig Pre-Meeting ==="
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
echo "=== Pre-meeting complete. Ready for Rig. ==="
