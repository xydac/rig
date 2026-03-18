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
  current_repo=""
  current_title=""
  current_body=""
  current_labels=""

  create_issue() {
    if [ -n "$1" ] && [ -n "$2" ]; then
      echo "  Creating issue in $1: $2"
      local label_args=""
      if [ -n "$4" ]; then
        for label in $(echo "$4" | tr -d '[]"' | tr ',' '\n'); do
          label=$(echo "$label" | xargs)
          if [ -n "$label" ]; then
            label_args="$label_args --label $label"
          fi
        done
      fi
      gh issue create --repo "$1" --title "$2" --body "$3" $label_args 2>/dev/null || echo "    WARNING: Failed to create issue in $1"
    fi
  }

  while IFS= read -r line; do
    if echo "$line" | grep -qE '^- repo:'; then
      # Process previous item if exists
      create_issue "$current_repo" "$current_title" "$current_body" "$current_labels"

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
  create_issue "$current_repo" "$current_title" "$current_body" "$current_labels"

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
