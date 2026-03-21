# Rig Web Standup Interface — Design Spec

**Date:** 2026-03-21
**Status:** Draft
**Priority:** Non-priority (backlog)

## Problem

Rig standups run entirely in the terminal via the `claude` CLI. This works but limits accessibility:
- Can't run standups from a phone, tablet, or remote browser
- No visibility into PM agent activity during swarm standups
- The existing web dashboard is read-only — no interactive control

## Solution

Extend the existing `dashboard/` Node.js server to support interactive standup sessions with a chat interface and live PM agent panels, accessible from any device on the network.

## Decisions

- **Approach:** Extend existing dashboard (not a rewrite or new framework)
- **CLI bridging:** Wrap the `claude` CLI as a PTY subprocess via `node-pty`, pipe over WebSocket
- **Agent monitoring:** Watch `~/.claude/teams/rig-standup/` and `~/.claude/tasks/` for structured data (team config, message inboxes, task progress)
- **Agent panel depth:** Read-only with structured status and task progress (not interactive)
- **Auth:** None — local network trust model
- **Network:** Server binds `0.0.0.0`, accessible over LAN
- **Responsive:** Must work on desktop, tablet, and phone

## Architecture

```
Browser (any device, any screen size)
  |  WebSocket
Node.js Server (dashboard/server.js)
  |-- File watcher (existing) --> products/, standups/, config.yaml
  |-- Claude home watcher (new) --> ~/.claude/teams/, ~/.claude/tasks/, ~/.claude/sessions/
  |-- Session manager (new) --> spawns/manages claude CLI subprocess via node-pty
  |
  claude CLI (PTY subprocess)
    |-- Reads CLAUDE.md, spawns PM agents via Claude Code teams
    |-- PM agents run as in-process backends within claude
```

### Session Lifecycle

```
Server state machine:
  IDLE --> STARTING --> RUNNING --> SHUTTING_DOWN --> IDLE
                            |
                            +--> ERROR --> IDLE (on unexpected crash)

IDLE:           No claude process. Dashboard in passive mode. "Start Standup" button visible.
STARTING:       Running scripts/pre-meeting.sh, output streamed to browser.
RUNNING:        claude process active. Chat streaming. PM agents may be active.
SHUTTING_DOWN:  DONE received, agents completing, scripts/post-meeting.sh running.
ERROR:          claude process crashed or was killed. Error broadcast to clients. No post-meeting.sh.
```

**Error handling:** If the claude PTY process exits unexpectedly (non-zero exit, signal kill, crash) during RUNNING state, the server transitions to ERROR, broadcasts `{ type: 'session-error', data: { message, exitCode } }`, then transitions to IDLE. `post-meeting.sh` does NOT run on crash.

1. User opens browser, sees dashboard (existing behavior)
2. User clicks "Start Standup" (optionally selects product filter)
3. Server runs `pre-meeting.sh`, streams output as loading state
4. Server spawns `claude` via node-pty in rig working directory
5. Chat input/output streams over WebSocket
6. Server watches `~/.claude/teams/rig-standup/` for agent activity
7. User says "DONE" in chat
8. Normal DONE flow executes (agents complete, post-meeting.sh runs)
9. Server transitions back to IDLE

### Constraint: One Session at a Time

Only one active standup session. If a session is running, the "Start Standup" button is replaced with a "Session Active" indicator. If someone connects from another device while a session is running, they see the live chat stream (read-only spectator) and agent panels.

## CLI Subprocess Management

### PTY Wrapper

Use `node-pty` to spawn `claude` in a pseudo-terminal:

```js
import pty from 'node-pty';
const proc = pty.spawn('claude', [], {
  name: 'xterm-256color',
  cols: 120,
  rows: 40,
  cwd: rigRoot,
  env: { ...process.env, PRODUCT_FILTER: filter || '' }
});
```

**Why node-pty:** The `claude` CLI uses terminal features (colors, spinners, interactive prompts). Raw `child_process.spawn` breaks on escape sequences. node-pty gives a real PTY.

### Output Processing

- Strip ANSI escape codes before sending to browser (use a lightweight strip-ansi function or regex)
- Buffer output, send chunks over WebSocket: `{ type: 'chat-output', data: '...' }`
- Detect special patterns in output for status transitions (agent spawning, DONE acknowledgment)

### Input Handling

- Receive `{ type: 'chat-input', data: '...' }` from browser
- Write to PTY stdin with newline: `proc.write(text + '\n')`

### Pre/Post Meeting

- "Start Standup" triggers `pre-meeting.sh` first as a child process
- Its stdout/stderr streamed as `{ type: 'pre-meeting-output', data: '...' }`
- On exit, spawn `claude` PTY
- When claude exits, run `post-meeting.sh`
- Stream post-meeting output, then transition to IDLE

## PM Agent Monitoring

### Data Sources in `~/.claude/`

| Path | Content | Update Pattern |
|------|---------|----------------|
| `~/.claude/teams/rig-standup/config.json` | Team roster: agent names, models, colors, join times | Updated when agents join/leave |
| `~/.claude/teams/rig-standup/inboxes/<name>.json` | Message history per agent: from, text, timestamp, read | Appended on each SendMessage |
| `~/.claude/sessions/<pid>.json` | Maps PID to session ID | Written once at session start |
| `~/.claude/tasks/<sessionId>/*.json` | Task list: subject, description, status | Updated as tasks progress |

### Agent Data Model

```js
{
  name: "bulkhead",
  color: "blue",        // from team config
  model: "sonnet",      // from team config
  status: "executing",  // derived (see below)
  messages: [           // from inbox
    { from: "team-lead", text: "...", timestamp: "...", read: true }
  ],
  tasks: [              // from tasks directory
    { id: "1", subject: "Update roadmap", status: "completed" }
  ]
}
```

### Status Derivation

Derive agent status from message content and timing:

| Condition | Status |
|-----------|--------|
| Agent in config but no messages yet | `spawning` |
| Has messages, none contain "EXECUTE" | `ready` (talk mode) |
| Last team-lead message contains "EXECUTE" | `executing` |
| Last agent message contains "COMPLETED" | `completed` |
| Last agent message contains "BLOCKED" | `blocked` |
| No message activity for >5 minutes during execution | `stale` (warning) |

### PID-to-Session Lookup

To watch the correct task directory for the active standup session:

1. Server spawns `claude` via node-pty, captures its PID
2. Read `~/.claude/sessions/<pid>.json` to get the `sessionId`
3. Watch only `~/.claude/tasks/<sessionId>/` for task updates (not the entire tasks directory)

This avoids noise from other Claude sessions' task directories.

### Watcher Setup

```js
// Watch team data (always — independent of session)
chokidar.watch([
  join(CLAUDE_HOME, 'teams', 'rig-standup'),
], { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 300 } });

// Watch session-specific tasks (started after PID-to-sessionId lookup)
// join(CLAUDE_HOME, 'tasks', sessionId)
```

Use `stabilityThreshold: 300` for the claude-home watcher (vs 500 in the existing product watcher) because agent files are written atomically and need faster reaction time.

On change: re-read affected files, diff against cached state, broadcast updates.

## WebSocket Protocol

### Client to Server

```js
// Start a new standup session
{ type: 'start-session', data: { productFilter?: string } }

// Send chat input to claude
{ type: 'chat-input', data: { text: string } }

// Request session stop (graceful — writes "DONE" to PTY stdin to trigger normal shutdown)
// If claude doesn't exit within 30 seconds, send SIGTERM. If still alive after 10 more seconds, SIGKILL.
{ type: 'stop-session' }
```

### Server to Client

```js
// Session state change
{ type: 'session-state', data: { status: 'idle'|'starting'|'running'|'shutting_down'|'error' } }

// Pre-meeting script output
{ type: 'pre-meeting-output', data: { text: string } }

// Chat output from claude
{ type: 'chat-output', data: { text: string } }

// PM agent state update (sent per-agent on change)
{ type: 'agent-update', data: {
    name: string,
    color: string,
    model: string,
    status: string,
    messages: Array<{ from, text, timestamp, read }>,
    tasks: Array<{ id, subject, status }>
  }
}

// Full dashboard state (existing, unchanged)
{ type: 'full-state', data: { products, standups, config, lastUpdate } }
```

### Connection Behavior

- On connect: server sends `session-state` + `full-state`
- If session is running: also sends chat history buffer (capped at last 500 messages / 1MB, oldest evicted first) and current agent states
- Reconnect: client auto-reconnects (existing behavior), receives full state catch-up
- Agent updates send the full message array per agent on each change. This is intentional for v1 simplicity — message counts are small (dozens per session, not thousands). No delta/diff protocol needed.

## Frontend Layout

### Desktop (>1024px) — Three Column

```
+--header (existing, extended with session controls)----------+
|                                                              |
|  +--chat (50%)----------+  +--agents (50%)--------------+   |
|  |                       |  |  [bulkhead] [health] [pc]  |   |
|  |  Rig: Here's the     |  |  +-tab content-----------+  |   |
|  |  cross-product...     |  |  | Status: executing     |  |   |
|  |                       |  |  | Messages:             |  |   |
|  |  You: What about     |  |  |   team-lead: EXECUTE   |  |   |
|  |  postcall launch?    |  |  |   Tasks: 2/3 done     |  |   |
|  |                       |  |  +-----------------------+  |   |
|  |  Rig: Postcall is    |  |                              |   |
|  |  on track for...     |  +------------------------------+   |
|  |                       |                                    |
|  |  [input bar]          |  +--dashboard (collapsible)----+   |
|  +-----------------------+  |  product cards | feed        |   |
|                              +------------------------------+   |
+--------------------------------------------------------------+
```

### Tablet (768-1024px) — Two Column

- Left: Chat (~55%)
- Right: Agent tabs (~45%)
- Dashboard: collapsible bottom drawer

### Phone (<768px) — Tabbed Single Column

- Tab bar at top: **Chat** | **Agents** | **Dashboard**
- Each tab is full-width, full-height (minus tab bar)
- Chat has input bar fixed to bottom
- Agent tab shows stacked cards (one per agent, expandable)

### Chat UI Elements

- **IDLE state:** "Start Standup" button, optional product filter dropdown
- **STARTING state:** Pre-meeting output with progress indicator
- **RUNNING state:** Message list + input bar
  - Messages: user messages right-aligned, Rig messages left-aligned
  - Markdown rendering for Rig messages via `marked` (loaded from CDN) — code blocks, bold, lists
  - Auto-scroll to bottom on new messages, with "scroll to bottom" button if user scrolled up
- **SHUTTING_DOWN state:** Chat read-only, "Wrapping up..." indicator

### Agent Panel Elements

- **Tab strip** with agent name + config color dot (blue/green/yellow per team config) + status text badge per agent
- **Panel content:**
  - Status line: text badge with status-derived color (spawning=gray, ready=blue, executing=amber, completed=green, blocked=red)
  - Message thread: chronological, styled as a simple log (not chat bubbles)
  - Task checklist: checkboxes showing completion state
- **Empty state:** "No agents active" when not in swarm mode or session not started

### Header Extension

Add to existing header:
- Session status indicator (dot + label: Idle / Starting / Running / Shutting Down)
- "Start Standup" button (visible in IDLE)
- Product filter dropdown (visible in IDLE)
- "Stop Session" button (visible in RUNNING, with confirmation)

## Dependencies

### New

- `node-pty` — PTY wrapper for claude subprocess (native module, requires build tools)
- `marked` — Markdown rendering (loaded from CDN in browser, not an npm dependency)

### Existing (unchanged)

- `ws` — WebSocket server
- `chokidar` — file watching
- `js-yaml` — YAML parsing

## File Changes

All changes are extensions to existing files:

| File | Change |
|------|--------|
| `dashboard/server.js` | Add session manager, claude home watcher, new WS message handlers |
| `dashboard/app.js` | Add chat UI, agent panels, responsive layout, new WS message handlers |
| `dashboard/index.html` | Add chat section, agent section, tab navigation for mobile |
| `dashboard/style.css` | Add chat styles, agent panel styles, responsive breakpoints |
| `package.json` | Add `node-pty` dependency |

No new files. This is purely extending the existing dashboard.

## Out of Scope (v1)

- Authentication/authorization
- Multiple simultaneous sessions
- Direct interaction with PM agents from the browser (agent panels are read-only)
- Persistent chat history across sessions (buffer is in-memory only)
- Mobile native app
- HTTPS/TLS (use a reverse proxy if needed)
