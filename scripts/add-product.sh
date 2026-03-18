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
