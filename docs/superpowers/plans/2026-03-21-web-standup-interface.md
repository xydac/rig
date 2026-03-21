# Web Standup Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Rig dashboard to support interactive standup sessions with a chat interface and live PM agent monitoring panels, accessible from any device on the network.

**Architecture:** The existing Node.js dashboard server (`dashboard/server.js`) gains a session manager that spawns `claude` as a PTY subprocess via `node-pty`, pipes stdin/stdout over WebSocket to the browser. A second file watcher monitors `~/.claude/teams/rig-standup/` and `~/.claude/tasks/<sessionId>/` for PM agent activity. The frontend (`dashboard/app.js`) adds a chat pane, agent tab panels, and responsive layout.

**Tech Stack:** Node.js (ESM), node-pty, WebSocket (ws), chokidar, vanilla JS frontend, marked (CDN) for markdown rendering.

**Spec:** `docs/superpowers/specs/2026-03-21-web-standup-interface-design.md`

---

## File Structure

All changes extend existing files. No new files are created.

| File | Responsibility | Changes |
|------|----------------|---------|
| `package.json` | Dependencies | Add `node-pty` |
| `dashboard/server.js` | Backend: HTTP, WebSocket, file watchers, session manager | Add session state machine, PTY management, claude-home watcher, new WS message handlers, chat buffer, agent state tracking |
| `dashboard/index.html` | HTML structure | Add chat section, agent panel section, mobile tab bar, marked CDN script tag, session controls in header |
| `dashboard/style.css` | Styles | Add chat styles, agent panel styles, responsive breakpoints for 3-col/2-col/tabbed layouts |
| `dashboard/app.js` | Frontend logic | Add chat rendering, agent panel rendering, session state handling, new WS message handlers, mobile tab switching |

---

### Task 1: Add node-pty dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install node-pty**

```bash
cd /home/x/working/standupai && npm install node-pty
```

Verify it installed (native module — needs build tools on Linux, which this machine has):

```bash
node -e "import('node-pty').then(m => console.log('node-pty OK'))"
```

Expected: `node-pty OK`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add node-pty for PTY subprocess management"
```

---

### Task 2: Server — Session State Machine & PTY Management

**Files:**
- Modify: `dashboard/server.js:1-14` (add imports)
- Modify: `dashboard/server.js:112-127` (extend WebSocket connection handler)
- Modify: `dashboard/server.js` (add new sections after file watcher, before HTTP server)

**Context:** The server currently has: state management, WebSocket broadcast, file watcher, HTTP server. We're adding a session manager between the file watcher and HTTP server sections.

- [ ] **Step 1: Add node-pty import and session constants**

At the top of `dashboard/server.js`, after the existing imports (line 7), add:

```js
import pty from 'node-pty';
import { spawn } from 'child_process';
import { homedir } from 'os';

const CLAUDE_HOME = join(homedir(), '.claude');
const SCRIPTS = join(ROOT, 'scripts');
```

- [ ] **Step 2: Add session state machine**

After the existing file watcher section (after line 150), add the session manager section:

```js
// --- Session Manager ---
const SESSION_STATES = ['idle', 'starting', 'running', 'shutting_down', 'error'];
let session = {
  status: 'idle',
  proc: null,           // node-pty process
  pid: null,            // claude PID
  sessionId: null,      // from ~/.claude/sessions/<pid>.json
  chatBuffer: [],       // { role: 'user'|'assistant', text: string }
  chatBufferBytes: 0,
  agents: {},           // { name: { color, model, status, messages, tasks } }
  productFilter: '',
  stopTimers: null,     // { sigterm, sigkill } timeout IDs
};

const MAX_BUFFER_MESSAGES = 500;
const MAX_BUFFER_BYTES = 1024 * 1024; // 1MB

function setSessionStatus(status) {
  session.status = status;
  broadcast({ type: 'session-state', data: { status } });
}

function addToChatBuffer(role, text) {
  const entry = { role, text };
  const entrySize = JSON.stringify(entry).length;
  session.chatBuffer.push(entry);
  session.chatBufferBytes += entrySize;
  // Evict oldest if over limits
  while (session.chatBuffer.length > MAX_BUFFER_MESSAGES || session.chatBufferBytes > MAX_BUFFER_BYTES) {
    const removed = session.chatBuffer.shift();
    session.chatBufferBytes -= JSON.stringify(removed).length;
  }
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
}

function runScript(scriptName, broadcastType = 'script-output') {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', [join(SCRIPTS, scriptName)], {
      cwd: ROOT,
      env: { ...process.env, PRODUCT_FILTER: session.productFilter || '' },
    });
    proc.stdout.on('data', (data) => {
      broadcast({ type: broadcastType, data: { text: data.toString() } });
    });
    proc.stderr.on('data', (data) => {
      broadcast({ type: broadcastType, data: { text: data.toString() } });
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

async function startSession(productFilter) {
  if (session.status !== 'idle') return;

  session.productFilter = productFilter || '';
  session.chatBuffer = [];
  session.chatBufferBytes = 0;
  session.agents = {};
  session.sessionId = null;
  setSessionStatus('starting');

  try {
    await runScript('pre-meeting.sh', 'pre-meeting-output');
  } catch (err) {
    broadcast({ type: 'session-error', data: { message: `Pre-meeting failed: ${err.message}`, exitCode: null } });
    setSessionStatus('idle');
    return;
  }

  // Spawn claude PTY
  const proc = pty.spawn('claude', [], {
    name: 'xterm-256color',
    cols: 120,
    rows: 40,
    cwd: ROOT,
    env: { ...process.env, PRODUCT_FILTER: session.productFilter || '' },
  });

  session.proc = proc;
  session.pid = proc.pid;
  setSessionStatus('running');

  // Lookup sessionId after a short delay (claude writes session file on startup)
  setTimeout(() => lookupSessionId(), 2000);

  // Line-buffer PTY output: accumulate chunks, flush on newline or 150ms timeout.
  // This prevents fragmented chat bubbles from partial PTY data events.
  let outputBuffer = '';
  let outputFlushTimer = null;

  function flushOutput() {
    outputFlushTimer = null;
    if (outputBuffer.trim()) {
      const clean = stripAnsi(outputBuffer);
      if (clean.trim()) {
        addToChatBuffer('assistant', clean);
        broadcast({ type: 'chat-output', data: { text: clean } });
      }
    }
    outputBuffer = '';
  }

  proc.onData((data) => {
    outputBuffer += data;
    // Flush on newline (complete line available)
    if (data.includes('\n')) {
      clearTimeout(outputFlushTimer);
      flushOutput();
    } else {
      // Or flush after 150ms of silence (partial line, e.g., prompt)
      clearTimeout(outputFlushTimer);
      outputFlushTimer = setTimeout(flushOutput, 150);
    }
  });

  proc.onExit(async ({ exitCode, signal }) => {
    // Clear stop escalation timers
    if (session.stopTimers) {
      clearTimeout(session.stopTimers.sigterm);
      clearTimeout(session.stopTimers.sigkill);
      session.stopTimers = null;
    }
    const wasRunning = session.status === 'running';
    session.proc = null;

    if (session.status === 'shutting_down' || exitCode === 0) {
      // Graceful exit — run post-meeting
      try {
        await runScript('post-meeting.sh', 'post-meeting-output');
      } catch (err) {
        broadcast({ type: 'session-error', data: { message: `Post-meeting failed: ${err.message}`, exitCode: null } });
      }
      setSessionStatus('idle');
    } else if (wasRunning) {
      // Unexpected crash
      broadcast({ type: 'session-error', data: { message: `Claude process exited unexpectedly (code: ${exitCode}, signal: ${signal})`, exitCode } });
      setSessionStatus('idle');
    } else {
      setSessionStatus('idle');
    }

    // Clean up watchers
    if (session.taskWatcher) {
      session.taskWatcher.close();
      session.taskWatcher = null;
    }
    session.pid = null;
    session.sessionId = null;
  });
}

function sendChatInput(text) {
  if (session.status !== 'running' || !session.proc) return;
  addToChatBuffer('user', text);
  session.proc.write(text + '\n');
}

function stopSession() {
  if (session.status !== 'running' || !session.proc) return;
  setSessionStatus('shutting_down');

  // Write DONE to trigger normal shutdown
  session.proc.write('DONE\n');

  // Escalation timers
  const sigterm = setTimeout(() => {
    if (session.proc) {
      try { process.kill(session.proc.pid, 'SIGTERM'); } catch {}
    }
  }, 30000);

  const sigkill = setTimeout(() => {
    if (session.proc) {
      try { process.kill(session.proc.pid, 'SIGKILL'); } catch {}
    }
  }, 40000);

  session.stopTimers = { sigterm, sigkill };

  // Clear timers when process actually exits (handled in onExit)
}
```

- [ ] **Step 3: Extend WebSocket connection handler to send session state on connect**

Replace the existing `wss.on('connection', ...)` block (lines 116-120) with:

```js
wss.on('connection', (ws) => {
  clients.add(ws);
  // Send dashboard state
  ws.send(JSON.stringify({ type: 'full-state', data: state }));
  // Send session state
  ws.send(JSON.stringify({ type: 'session-state', data: { status: session.status } }));
  // If session is running, send chat history and agent states
  if (session.status === 'running' || session.status === 'shutting_down') {
    ws.send(JSON.stringify({ type: 'chat-history', data: { messages: session.chatBuffer } }));
    for (const [name, agent] of Object.entries(session.agents)) {
      ws.send(JSON.stringify({ type: 'agent-update', data: agent }));
    }
  }
  // Handle incoming messages
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      switch (msg.type) {
        case 'start-session':
          startSession(msg.data?.productFilter);
          break;
        case 'chat-input':
          sendChatInput(msg.data?.text);
          break;
        case 'stop-session':
          stopSession();
          break;
      }
    } catch {}
  });
  ws.on('close', () => clients.delete(ws));
});
```

- [ ] **Step 4: Verify server starts without errors**

```bash
cd /home/x/working/standupai && timeout 3 node dashboard/server.js 2>&1 || true
```

Expected: Should print `Rig Dashboard: http://0.0.0.0:3847` and then timeout (which is fine — means it started).

- [ ] **Step 5: Commit**

```bash
git add dashboard/server.js
git commit -m "feat(dashboard): add session state machine and PTY management"
```

---

### Task 3: Server — Claude Home Watcher & Agent State

**Files:**
- Modify: `dashboard/server.js` (add after session manager section)

**Context:** Watch `~/.claude/teams/rig-standup/` for agent roster and messages. Watch `~/.claude/tasks/<sessionId>/` for task progress. Derive agent status from message content.

- [ ] **Step 1: Add PID-to-sessionId lookup function**

Add after the `stopSession` function:

```js
// --- Claude Home Watcher ---
function lookupSessionId() {
  if (!session.pid) return;
  const sessionFile = join(CLAUDE_HOME, 'sessions', `${session.pid}.json`);
  try {
    const data = JSON.parse(readFileSync(sessionFile, 'utf8'));
    session.sessionId = data.sessionId;
    // Start watching tasks for this session
    startTaskWatcher(data.sessionId);
  } catch {
    // Session file may not exist yet — retry
    setTimeout(() => lookupSessionId(), 1000);
  }
}

function startTaskWatcher(sessionId, retries = 5) {
  const taskDir = join(CLAUDE_HOME, 'tasks', sessionId);
  if (!existsSync(taskDir)) {
    if (retries > 0) setTimeout(() => startTaskWatcher(sessionId, retries - 1), 2000);
    return;
  }
  session.taskWatcher = chokidar.watch(taskDir, {
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });
  session.taskWatcher.on('all', () => {
    readTasks(sessionId);
  });
}

function readTasks(sessionId) {
  const taskDir = join(CLAUDE_HOME, 'tasks', sessionId);
  try {
    const files = readdirSync(taskDir).filter(f => f.endsWith('.json'));
    const tasks = files.map(f => {
      try {
        return JSON.parse(readFileSync(join(taskDir, f), 'utf8'));
      } catch { return null; }
    }).filter(Boolean);
    // Broadcast tasks (these are the orchestrator's tasks, not per-agent)
    broadcast({ type: 'tasks-update', data: { tasks } });
  } catch {}
}
```

- [ ] **Step 2: Add team watcher and agent state derivation**

```js
function deriveAgentStatus(messages) {
  if (!messages || messages.length === 0) return 'spawning';
  const lastTeamLeadMsg = [...messages].reverse().find(m => m.from === 'team-lead');
  const lastAgentMsg = [...messages].reverse().find(m => m.from !== 'team-lead');
  if (lastAgentMsg?.text?.includes('COMPLETED')) return 'completed';
  if (lastAgentMsg?.text?.includes('BLOCKED')) return 'blocked';
  if (lastTeamLeadMsg?.text?.includes('EXECUTE')) {
    // Check for stale: no activity for >5 minutes during execution
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.timestamp) {
      const elapsed = Date.now() - new Date(lastMsg.timestamp).getTime();
      if (elapsed > 5 * 60 * 1000) return 'stale';
    }
    return 'executing';
  }
  return 'ready';
}

function readTeamState() {
  const configFile = join(CLAUDE_HOME, 'teams', 'rig-standup', 'config.json');
  const inboxDir = join(CLAUDE_HOME, 'teams', 'rig-standup', 'inboxes');
  try {
    const config = JSON.parse(readFileSync(configFile, 'utf8'));
    const members = (config.members || []).filter(m => m.agentType !== 'team-lead');
    for (const member of members) {
      const inboxFile = join(inboxDir, `${member.name}.json`);
      let messages = [];
      try {
        messages = JSON.parse(readFileSync(inboxFile, 'utf8'));
      } catch {}

      const agent = {
        name: member.name,
        color: member.color || 'blue',
        model: member.model || 'sonnet',
        status: deriveAgentStatus(messages),
        messages,
        tasks: [],  // tasks are session-level, not per-agent in Claude Code
      };
      session.agents[member.name] = agent;
      broadcast({ type: 'agent-update', data: agent });
    }
  } catch {}
}

// Watch team directory (always — chokidar handles non-existent dirs gracefully)
const teamDir = join(CLAUDE_HOME, 'teams', 'rig-standup');
const teamWatcher = chokidar.watch(teamDir, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  // chokidar will start watching once the directory is created
  disableGlobbing: true,
});
let teamDebounce = null;
teamWatcher.on('all', () => {
  clearTimeout(teamDebounce);
  teamDebounce = setTimeout(() => {
    if (session.status === 'running' || session.status === 'shutting_down') {
      readTeamState();
    }
  }, 300);
});
```

- [ ] **Step 3: Verify server starts cleanly**

```bash
cd /home/x/working/standupai && timeout 3 node dashboard/server.js 2>&1 || true
```

Expected: `Rig Dashboard: http://0.0.0.0:3847` with no errors.

- [ ] **Step 4: Commit**

```bash
git add dashboard/server.js
git commit -m "feat(dashboard): add claude home watcher and agent state tracking"
```

---

### Task 4: Frontend — HTML Structure

**Files:**
- Modify: `dashboard/index.html`

**Context:** Add chat section, agent panel section, mobile tab bar, session controls in header, and marked CDN script tag. The existing sections (product cards, agent status, live feed, standups) remain but are wrapped in a dashboard container.

- [ ] **Step 1: Update index.html**

Replace the full content of `dashboard/index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rig Ops Center</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</head>
<body>
  <header>
    <div class="header-left">
      <h1>RIG</h1>
      <div class="header-divider"></div>
      <span id="company-name">OPS CENTER</span>
    </div>
    <div id="header-controls">
      <select id="product-filter" class="header-select">
        <option value="">All Products</option>
      </select>
      <button id="start-btn" class="btn btn-primary">START STANDUP</button>
      <button id="stop-btn" class="btn btn-danger hidden">STOP SESSION</button>
      <span id="session-status" class="session-badge">IDLE</span>
    </div>
    <div id="header-meta">
      <span id="run-id"></span>
      <span id="last-update"></span>
      <span id="connection-status" class="status-dot">●</span>
    </div>
  </header>

  <!-- Mobile Tab Bar -->
  <nav id="mobile-tabs" class="mobile-tabs">
    <button class="tab-btn active" data-tab="chat">Chat</button>
    <button class="tab-btn" data-tab="agents">Agents</button>
    <button class="tab-btn" data-tab="dashboard">Dashboard</button>
  </nav>

  <main>
    <!-- Chat Section -->
    <section id="chat-section" data-tab-content="chat">
      <div id="chat-messages"></div>
      <div id="chat-idle" class="chat-idle">
        <div class="idle-text">No active session. Click START STANDUP to begin.</div>
      </div>
      <div id="chat-starting" class="chat-starting hidden">
        <div class="section-header">PRE-MEETING</div>
        <pre id="pre-meeting-output"></pre>
      </div>
      <div id="chat-input-bar" class="chat-input-bar hidden">
        <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off" />
        <button id="chat-send" class="btn btn-primary">SEND</button>
      </div>
      <button id="scroll-bottom-btn" class="scroll-bottom-btn hidden">↓</button>
    </section>

    <!-- Agent Panels Section -->
    <section id="agents-section" data-tab-content="agents">
      <div id="agent-tabs" class="agent-tabs"></div>
      <div id="agent-panel-content" class="agent-panel-content">
        <div class="agent-empty">No agents active</div>
      </div>
    </section>

    <!-- Dashboard Section (existing features) -->
    <section id="dashboard-section" data-tab-content="dashboard">
      <div id="product-cards-section">
        <div class="section-header">PRODUCTS</div>
        <div id="product-cards" class="card-grid"></div>
      </div>
      <div id="agent-status-section">
        <div class="section-header">AGENTS</div>
        <div id="agent-status" class="agent-grid"></div>
      </div>
      <div id="live-feed-section">
        <div class="section-header">ACTIVITY</div>
        <div id="live-feed"></div>
      </div>
      <div id="standups-section">
        <div class="section-header">STANDUPS</div>
        <div id="standups-list"></div>
      </div>

    </section>

    <!-- Product Detail (overlay — outside dashboard-section for full-page positioning) -->
    <section id="product-detail" class="hidden">
      <div class="detail-header">
        <div>
          <div class="detail-title" id="detail-title"></div>
          <div class="detail-desc" id="detail-desc"></div>
        </div>
        <button id="back-btn" class="btn">ESC BACK</button>
      </div>
      <div id="detail-content" class="detail-grid"></div>
    </section>
  </main>

  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/index.html
git commit -m "feat(dashboard): add chat and agent panel HTML structure"
```

---

### Task 5: Frontend — CSS for Chat, Agents, and Responsive Layout

**Files:**
- Modify: `dashboard/style.css`

**Context:** Add styles for the chat interface, agent panels, mobile tab bar, session controls, and responsive breakpoints. Must match the existing dark green ops-center aesthetic.

- [ ] **Step 1: Add session control styles**

At the end of the `/* === HEADER === */` section (after line 93), add:

```css
#header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-select {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 4px 8px;
  font-family: inherit;
  font-size: 11px;
}

.btn-primary {
  background: var(--bg);
  color: var(--green);
  border: 1px solid var(--green-dim);
}

.btn-primary:hover {
  background: var(--bg-card);
  border-color: var(--green);
  text-shadow: 0 0 6px var(--green-glow);
}

.btn-danger {
  background: var(--bg);
  color: var(--red);
  border: 1px solid var(--red);
}

.btn-danger:hover {
  background: var(--red-dim);
}

.session-badge {
  font-size: 9px;
  letter-spacing: 1px;
  padding: 2px 8px;
  border-radius: 2px;
  font-weight: 600;
}

.session-badge.idle { color: var(--text-muted); background: var(--bg); border: 1px solid var(--border); }
.session-badge.starting { color: var(--amber); background: var(--amber-dim); }
.session-badge.running { color: var(--green); background: var(--green-glow); }
.session-badge.shutting_down { color: var(--amber); background: var(--amber-dim); }
.session-badge.error { color: var(--red); background: var(--red-dim); }

.hidden { display: none !important; }
```

- [ ] **Step 2: Replace the `/* === LAYOUT === */` section**

Replace the existing `main` grid (lines 97-109) with:

```css
/* === LAYOUT === */
main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
  grid-template-areas: "chat right";
  gap: 0;
  height: calc(100vh - 45px);
  overflow: hidden;
}

#chat-section {
  grid-area: chat;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}

#agents-section {
  grid-area: right;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#dashboard-section {
  display: none;
  padding: 16px;
  overflow-y: auto;
}

/* Show dashboard when no session is active (toggled by JS) */
main.show-dashboard {
  grid-template-columns: 1fr 340px;
  grid-template-areas: "dashboard feed";
}

main.show-dashboard #chat-section,
main.show-dashboard #agents-section { display: none; }
main.show-dashboard #dashboard-section { display: block; grid-area: dashboard; }
main.show-dashboard #live-feed-section { grid-area: feed; }
```

- [ ] **Step 3: Add chat styles**

After the layout section, add:

```css
/* === CHAT === */
#chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-msg {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
  word-wrap: break-word;
}

.chat-msg.user {
  align-self: flex-end;
  background: var(--bg-elevated);
  border: 1px solid var(--border-bright);
  color: var(--text-bright);
}

.chat-msg.assistant {
  align-self: flex-start;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text);
}

.chat-msg.assistant p { margin: 0 0 8px 0; }
.chat-msg.assistant p:last-child { margin-bottom: 0; }
.chat-msg.assistant code {
  background: var(--bg);
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 11px;
}
.chat-msg.assistant pre {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 10px;
  font-size: 11px;
  overflow-x: auto;
  margin: 8px 0;
}
.chat-msg.assistant ul, .chat-msg.assistant ol {
  padding-left: 20px;
  margin: 4px 0;
}

.chat-idle, .chat-starting {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 12px;
  padding: 20px;
}

.chat-starting {
  align-items: stretch;
  justify-content: flex-start;
  overflow-y: auto;
}

.chat-starting pre {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 12px;
  font-size: 11px;
  white-space: pre-wrap;
  color: var(--text-dim);
  flex: 1;
  overflow-y: auto;
}

.chat-input-bar {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
}

#chat-input {
  flex: 1;
  background: var(--bg);
  color: var(--text-bright);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 12px;
  outline: none;
}

#chat-input:focus {
  border-color: var(--green-dim);
}

.scroll-bottom-btn {
  position: absolute;
  bottom: 70px;
  right: 20px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 1px solid var(--border-bright);
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
```

- [ ] **Step 4: Add agent panel styles**

```css
/* === AGENT PANELS === */
.agent-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
  overflow-x: auto;
}

.agent-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 11px;
  font-family: inherit;
  color: var(--text-dim);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}

.agent-tab:hover { color: var(--text); }
.agent-tab.active { color: var(--text-bright); border-bottom-color: var(--green-dim); }

.agent-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.agent-color-dot.blue { background: var(--blue); }
.agent-color-dot.green { background: var(--green); }
.agent-color-dot.yellow { background: var(--amber); }
.agent-color-dot.purple { background: #aa77ff; }
.agent-color-dot.red { background: var(--red); }

.agent-status-badge {
  font-size: 8px;
  letter-spacing: 0.5px;
  padding: 1px 5px;
  border-radius: 2px;
  font-weight: 600;
  text-transform: uppercase;
}

.agent-status-badge.spawning { color: var(--text-muted); background: var(--bg); }
.agent-status-badge.ready { color: var(--blue); background: var(--blue-dim); }
.agent-status-badge.executing { color: var(--amber); background: var(--amber-dim); }
.agent-status-badge.completed { color: var(--green); background: var(--green-glow); }
.agent-status-badge.blocked { color: var(--red); background: var(--red-dim); }
.agent-status-badge.stale { color: var(--orange); background: rgba(255, 136, 68, 0.15); }

.agent-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.agent-empty {
  color: var(--text-muted);
  font-size: 11px;
  text-align: center;
  padding: 40px;
}

.agent-panel { display: none; }
.agent-panel.active { display: block; }

.agent-panel-status {
  margin-bottom: 16px;
}

.agent-message-log {
  margin-bottom: 16px;
}

.agent-message-log .section-header { margin-bottom: 6px; }

.agent-msg {
  padding: 6px 0;
  border-bottom: 1px solid var(--bg-card);
  font-size: 11px;
  line-height: 1.5;
}

.agent-msg:last-child { border-bottom: none; }

.agent-msg-from {
  color: var(--green-dim);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.agent-msg-time {
  color: var(--text-muted);
  font-size: 10px;
  margin-left: 8px;
}

.agent-msg-text {
  color: var(--text-dim);
  margin-top: 2px;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.agent-task-list {
  list-style: none;
  padding: 0;
}

.agent-task-item {
  padding: 4px 0;
  font-size: 11px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.agent-task-check {
  color: var(--text-muted);
  font-size: 12px;
  min-width: 16px;
}

.agent-task-check.done { color: var(--green); }
.agent-task-subject { color: var(--text-dim); }
.agent-task-item.done .agent-task-subject { color: var(--text-muted); text-decoration: line-through; }
```

- [ ] **Step 5: Add mobile tab bar and responsive styles**

Replace the existing `/* === RESPONSIVE === */` section (lines 485-499) with:

```css
/* === MOBILE TABS === */
.mobile-tabs {
  display: none;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
}

.tab-btn {
  flex: 1;
  padding: 10px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-dim);
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
}

.tab-btn.active {
  color: var(--green);
  border-bottom-color: var(--green-dim);
}

/* === RESPONSIVE === */

/* Tablet */
@media (max-width: 1024px) {
  main {
    grid-template-columns: 55% 45%;
  }
}

/* Phone */
@media (max-width: 768px) {
  .mobile-tabs {
    display: flex;
  }

  main {
    grid-template-columns: 1fr;
    grid-template-areas: "content";
    height: calc(100vh - 45px - 42px); /* header + tab bar */
  }

  #chat-section,
  #agents-section,
  #dashboard-section {
    grid-area: content;
    border-right: none;
  }

  /* Only show active tab content */
  [data-tab-content] { display: none !important; }
  [data-tab-content].tab-active {
    display: flex !important;
    flex-direction: column;
  }
  #dashboard-section.tab-active {
    display: block !important;
    overflow-y: auto;
  }

  /* Header adjustments */
  header { flex-wrap: wrap; gap: 8px; padding: 8px 12px; }
  #header-controls { order: 3; width: 100%; justify-content: space-between; }
  #header-meta { font-size: 10px; }

  /* Chat adjustments */
  .chat-msg { max-width: 95%; }

  /* Agent adjustments */
  .agent-msg-text { max-height: 120px; }
}
```

- [ ] **Step 6: Verify CSS has no syntax errors**

Open `http://localhost:3847` in a browser (or curl to verify it serves):

```bash
curl -s http://localhost:3847/ | head -5
```

Expected: Returns the HTML with no errors.

- [ ] **Step 7: Commit**

```bash
git add dashboard/style.css
git commit -m "feat(dashboard): add chat, agent panel, and responsive CSS styles"
```

---

### Task 6: Frontend — Chat UI Logic

**Files:**
- Modify: `dashboard/app.js`

**Context:** Add session state handling, chat message rendering, input handling, and new WebSocket message types to the existing frontend JS. Extend the existing `connect()` function and add new render functions.

- [ ] **Step 1: Add session state and chat state variables**

At the top of `app.js`, after the existing state variables (line 3), add:

```js
let sessionStatus = 'idle';
let chatMessages = [];  // { role: 'user'|'assistant', text: string }
let agents = {};        // { name: { color, model, status, messages, tasks } }
let activeAgentTab = null;
let autoScroll = true;
```

- [ ] **Step 2: Extend WebSocket message handler**

In the `ws.onmessage` handler (inside `connect()`), extend the message handling. Replace the existing `ws.onmessage` block (lines 22-30) with:

```js
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    switch (msg.type) {
      case 'full-state': {
        const oldState = state;
        state = msg.data;
        render();
        detectChanges(oldState, state);
        populateProductFilter();
        break;
      }
      case 'session-state':
        sessionStatus = msg.data.status;
        renderSessionControls();
        renderChatView();
        break;
      case 'chat-output':
        chatMessages.push({ role: 'assistant', text: msg.data.text });
        renderChatMessages();
        break;
      case 'chat-history':
        chatMessages = msg.data.messages || [];
        renderChatMessages();
        break;
      case 'pre-meeting-output':
        appendPreMeetingOutput(msg.data.text);
        break;
      case 'post-meeting-output':
      case 'script-output':
        addFeedItem(msg.data.text.trim(), 'info');
        break;
      case 'session-error':
        addFeedItem(`Session error: ${msg.data.message}`, 'error');
        break;
      case 'agent-update':
        agents[msg.data.name] = msg.data;
        renderAgentTabs();
        renderAgentPanel();
        break;
      case 'tasks-update':
        // Could display orchestrator tasks if desired
        break;
    }
  };
```

- [ ] **Step 3: Add send function**

```js
function wsSend(type, data) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type, data }));
  }
}
```

- [ ] **Step 4: Add session control rendering and handlers**

```js
function populateProductFilter() {
  const select = document.getElementById('product-filter');
  const products = (state.config?.products || []).filter(p => p.name !== 'rig');
  const current = select.value;
  select.innerHTML = '<option value="">All Products</option>' +
    products.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
  select.value = current;
}

function renderSessionControls() {
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const filter = document.getElementById('product-filter');
  const badge = document.getElementById('session-status');

  badge.textContent = sessionStatus.toUpperCase().replace('_', ' ');
  badge.className = `session-badge ${sessionStatus}`;

  startBtn.classList.toggle('hidden', sessionStatus !== 'idle');
  filter.classList.toggle('hidden', sessionStatus !== 'idle');
  stopBtn.classList.toggle('hidden', sessionStatus !== 'running');
}

function renderChatView() {
  const main = document.querySelector('main');
  const messages = document.getElementById('chat-messages');
  const idle = document.getElementById('chat-idle');
  const starting = document.getElementById('chat-starting');
  const inputBar = document.getElementById('chat-input-bar');

  // Toggle between dashboard view (idle) and chat+agents view (active session)
  main.classList.toggle('show-dashboard', sessionStatus === 'idle');

  messages.classList.toggle('hidden', sessionStatus === 'idle' || sessionStatus === 'starting');
  idle.classList.toggle('hidden', sessionStatus !== 'idle');
  starting.classList.toggle('hidden', sessionStatus !== 'starting');
  inputBar.classList.toggle('hidden', sessionStatus !== 'running');

  if (sessionStatus === 'starting') {
    document.getElementById('pre-meeting-output').textContent = '';
  }
  if (sessionStatus === 'idle') {
    chatMessages = [];
    agents = {};
    activeAgentTab = null;
    renderAgentTabs();
    renderAgentPanel();
  }
}

function appendPreMeetingOutput(text) {
  const pre = document.getElementById('pre-meeting-output');
  pre.textContent += text;
  pre.scrollTop = pre.scrollHeight;
}

// Event listeners
document.getElementById('start-btn').addEventListener('click', () => {
  const filter = document.getElementById('product-filter').value;
  wsSend('start-session', { productFilter: filter });
});

document.getElementById('stop-btn').addEventListener('click', () => {
  if (confirm('Stop the current standup session?')) {
    wsSend('stop-session');
  }
});

document.getElementById('chat-send').addEventListener('click', () => {
  sendChatMessage();
});

document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  chatMessages.push({ role: 'user', text });
  renderChatMessages();
  wsSend('chat-input', { text });
}
```

- [ ] **Step 5: Add chat message rendering with markdown**

```js
function renderChatMessages() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = chatMessages.map(msg => {
    const content = msg.role === 'assistant'
      ? (typeof marked !== 'undefined' ? marked.parse(msg.text) : escapeHtml(msg.text))
      : escapeHtml(msg.text);
    return `<div class="chat-msg ${msg.role}">${content}</div>`;
  }).join('');

  // Auto-scroll
  if (autoScroll) {
    container.scrollTop = container.scrollHeight;
  }
}

// Scroll-to-bottom button
const chatMessagesEl = document.getElementById('chat-messages');
chatMessagesEl.addEventListener('scroll', () => {
  const atBottom = chatMessagesEl.scrollHeight - chatMessagesEl.scrollTop - chatMessagesEl.clientHeight < 50;
  autoScroll = atBottom;
  document.getElementById('scroll-bottom-btn').classList.toggle('hidden', atBottom);
});

document.getElementById('scroll-bottom-btn').addEventListener('click', () => {
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  autoScroll = true;
  document.getElementById('scroll-bottom-btn').classList.add('hidden');
});
```

- [ ] **Step 6: Commit**

```bash
git add dashboard/app.js
git commit -m "feat(dashboard): add chat UI logic and session state handling"
```

---

### Task 7: Frontend — Agent Panel Logic

**Files:**
- Modify: `dashboard/app.js` (continue adding to the file)

**Context:** Render agent tabs, panel content with status, message log, and task checklist. Tabs are color-coded per team config.

- [ ] **Step 1: Add agent tab and panel rendering**

```js
function renderAgentTabs() {
  const container = document.getElementById('agent-tabs');
  const agentNames = Object.keys(agents);

  if (agentNames.length === 0) {
    container.innerHTML = '';
    return;
  }

  if (!activeAgentTab || !agents[activeAgentTab]) {
    activeAgentTab = agentNames[0];
  }

  container.innerHTML = agentNames.map(name => {
    const agent = agents[name];
    return `
      <button class="agent-tab ${name === activeAgentTab ? 'active' : ''}" onclick="switchAgentTab('${name}')">
        <span class="agent-color-dot ${agent.color}"></span>
        ${name}
        <span class="agent-status-badge ${agent.status}">${agent.status}</span>
      </button>
    `;
  }).join('');
}

function switchAgentTab(name) {
  activeAgentTab = name;
  renderAgentTabs();
  renderAgentPanel();
}

function renderAgentPanel() {
  const container = document.getElementById('agent-panel-content');
  const agentNames = Object.keys(agents);

  if (agentNames.length === 0) {
    container.innerHTML = '<div class="agent-empty">No agents active</div>';
    return;
  }

  const agent = agents[activeAgentTab];
  if (!agent) return;

  const messagesHtml = (agent.messages || []).map(msg => {
    const time = msg.timestamp
      ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      : '';
    return `
      <div class="agent-msg">
        <span class="agent-msg-from">${escapeHtml(msg.from)}</span>
        <span class="agent-msg-time">${time}</span>
        <div class="agent-msg-text">${escapeHtml(msg.text)}</div>
      </div>
    `;
  }).join('');

  const tasksHtml = (agent.tasks || []).length > 0
    ? `<div class="section-header">TASKS</div>
       <ul class="agent-task-list">
         ${agent.tasks.map(t => `
           <li class="agent-task-item ${t.status === 'completed' ? 'done' : ''}">
             <span class="agent-task-check ${t.status === 'completed' ? 'done' : ''}">${t.status === 'completed' ? '✓' : '○'}</span>
             <span class="agent-task-subject">${escapeHtml(t.subject)}</span>
           </li>
         `).join('')}
       </ul>`
    : '';

  container.innerHTML = `
    <div class="agent-panel active">
      <div class="agent-panel-status">
        <span class="agent-status-badge ${agent.status}">${agent.status}</span>
        <span style="color: var(--text-muted); font-size: 10px; margin-left: 8px">${agent.model}</span>
      </div>
      <div class="agent-message-log">
        <div class="section-header">MESSAGES (${(agent.messages || []).length})</div>
        ${messagesHtml || '<div style="color: var(--text-muted); font-size: 11px">No messages yet</div>'}
      </div>
      ${tasksHtml}
    </div>
  `;
}
```

- [ ] **Step 2: Add mobile tab switching**

```js
// Mobile tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('[data-tab-content]').forEach(el => {
      el.classList.toggle('tab-active', el.dataset.tabContent === tab);
    });
  });
});

// Initialize: show chat tab on mobile
document.querySelector('[data-tab-content="chat"]')?.classList.add('tab-active');
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/app.js
git commit -m "feat(dashboard): add agent panel rendering and mobile tab switching"
```

---

### Task 8: Integration — Wire Everything Together and Manual Test

**Files:**
- Modify: `dashboard/server.js` (minor cleanup if needed)
- Modify: `dashboard/app.js` (minor cleanup if needed)

**Context:** Start the dashboard, verify it loads, test session start/stop flow, verify responsive behavior.

- [ ] **Step 1: Start the dashboard server**

```bash
cd /home/x/working/standupai && node dashboard/server.js &
```

- [ ] **Step 2: Test basic page load**

```bash
curl -s http://localhost:3847/ | grep '<title>'
```

Expected: `<title>Rig Ops Center</title>`

- [ ] **Step 3: Test WebSocket connection**

Open `http://localhost:3847` in a browser. Verify:
- Header shows "RIG | ODDINKS" with "IDLE" badge
- "START STANDUP" button visible
- Product filter dropdown populated
- Chat area shows "No active session" message
- Agent panel shows "No agents active"

- [ ] **Step 4: Test responsive layout**

Resize browser to phone width (<768px). Verify:
- Mobile tab bar appears (Chat | Agents | Dashboard)
- Tapping tabs switches content
- Chat input bar has good touch targets

- [ ] **Step 5: Test session start (if claude CLI is available)**

Click "START STANDUP" and verify:
- Status changes to STARTING
- Pre-meeting output streams
- Transitions to RUNNING with chat input visible
- Agent panels populate as PM agents spawn

If claude CLI is not available for testing, verify the server handles the error gracefully (pre-meeting.sh may fail, which should show an error and return to IDLE).

- [ ] **Step 6: Stop the dashboard**

```bash
kill %1 2>/dev/null; pkill -f "node.*dashboard/server.js" 2>/dev/null || true
```

- [ ] **Step 7: Final commit**

```bash
git add -A
git status
```

If there are any remaining changes:

```bash
git commit -m "feat(dashboard): wire up web standup interface — chat, agents, responsive layout"
```

---

### Task 9: Cleanup & Verify Network Access

**Files:** None (verification only)

- [ ] **Step 1: Verify server binds to 0.0.0.0**

```bash
cd /home/x/working/standupai && node dashboard/server.js &
sleep 1
ss -tlnp | grep 3847
```

Expected: Shows `0.0.0.0:3847` (not `127.0.0.1:3847`)

- [ ] **Step 2: Verify from another device (if available)**

From another machine on the same network, open `http://<your-ip>:3847` in a browser. Should see the full dashboard.

- [ ] **Step 3: Stop server, final cleanup**

```bash
kill %1 2>/dev/null; pkill -f "node.*dashboard/server.js" 2>/dev/null || true
```

- [ ] **Step 4: Commit if any final changes**

```bash
git status
```
