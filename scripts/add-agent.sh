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
