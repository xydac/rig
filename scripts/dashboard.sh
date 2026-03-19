#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

case "${1:-start}" in
  start)
    # Kill existing dashboard if running
    pkill -f "node.*dashboard/server.js" 2>/dev/null || true
    cd "$ROOT_DIR" && node dashboard/server.js &
    DASH_PID=$!
    echo "$DASH_PID" > "$ROOT_DIR/.dashboard.pid"
    echo "Dashboard running at http://localhost:${PORT:-3847} (pid $DASH_PID)"
    ;;
  stop)
    if [ -f "$ROOT_DIR/.dashboard.pid" ]; then
      kill "$(cat "$ROOT_DIR/.dashboard.pid")" 2>/dev/null || true
      rm "$ROOT_DIR/.dashboard.pid"
      echo "Dashboard stopped."
    else
      pkill -f "node.*dashboard/server.js" 2>/dev/null || true
      echo "Dashboard stopped."
    fi
    ;;
  status)
    if [ -f "$ROOT_DIR/.dashboard.pid" ] && kill -0 "$(cat "$ROOT_DIR/.dashboard.pid")" 2>/dev/null; then
      echo "Dashboard running (pid $(cat "$ROOT_DIR/.dashboard.pid"))"
    else
      echo "Dashboard not running"
    fi
    ;;
  *)
    echo "Usage: dashboard.sh [start|stop|status]"
    ;;
esac
