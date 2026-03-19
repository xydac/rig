# Milestone 2 Sprint 3 — Live Ops Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live ops dashboard that starts with Rig, watches the repo for changes, and updates the browser in real-time via WebSocket. Dark terminal aesthetic.

**Architecture:** Node.js server watches the repo's markdown files with `chokidar`. On change, it re-parses affected files and pushes deltas via WebSocket to a single-page HTML/JS frontend. No framework, no build step.

**Tech Stack:** Node.js, `ws` (WebSocket), `chokidar` (file watcher), `js-yaml` (YAML parser), vanilla HTML/CSS/JS

---

## File Map

| File | Responsibility |
|------|---------------|
| `dashboard/server.js` | **Create** — HTTP server + WebSocket + file watcher. Parses markdown/yaml, pushes state to browser |
| `dashboard/index.html` | **Create** — Single page app with all views |
| `dashboard/style.css` | **Create** — Dark theme, terminal aesthetic, ops center layout |
| `dashboard/app.js` | **Create** — WebSocket client, DOM updates, view switching |
| `scripts/dashboard.sh` | **Create** — Start/stop the dashboard server |
| `scripts/rig` | **Modify** — Start dashboard on `run` command |
| `package.json` | **Create** — Dependencies (ws, chokidar, js-yaml) |

---

### Task 1: Initialize Node.js project and dependencies

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create package.json**

Create `package.json` at repo root:

```json
{
  "name": "rig-dashboard",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dashboard": "node dashboard/server.js"
  },
  "dependencies": {
    "chokidar": "^4.0.0",
    "js-yaml": "^4.1.0",
    "ws": "^8.18.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd /home/x/working/standupai && npm install
```

- [ ] **Step 3: Add node_modules to .gitignore**

Create `.gitignore`:

```
node_modules/
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "feat: initialize node.js project for dashboard"
```

---

### Task 2: Build the dashboard server

**Files:**
- Create: `dashboard/server.js`

- [ ] **Step 1: Create dashboard/server.js**

```javascript
import { createServer } from 'http';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import yaml from 'js-yaml';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORT = process.env.PORT || 3847;

// --- State ---
let state = { products: [], standups: [], config: {}, lastUpdate: null };

// --- Markdown/YAML Parsing ---
function readConfig() {
  try {
    return yaml.load(readFileSync(join(ROOT, 'config.yaml'), 'utf8'));
  } catch { return {}; }
}

function readMarkdown(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

function listFiles(dir, ext = '.md') {
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith(ext) && !f.startsWith('.'))
      .sort()
      .reverse();
  } catch { return []; }
}

function getLatestFile(dir, prefix = '') {
  const files = listFiles(dir).filter(f => !prefix || f.startsWith(prefix));
  return files.length > 0 ? join(dir, files[0]) : null;
}

function parseProduct(name, config) {
  const productConfig = config.products?.find(p => p.name === name) || {};
  const productDir = join(ROOT, 'products', name);
  const summaryDir = join(productDir, 'summaries');
  const metricsDir = join(productDir, 'metrics');
  const ideasDir = join(productDir, 'ideas');
  const decisionsDir = join(productDir, 'decisions');

  // Latest summary
  const latestSummary = getLatestFile(summaryDir);
  const summary = latestSummary ? readMarkdown(latestSummary) : '';

  // Latest metrics
  const latestMetrics = getLatestFile(metricsDir);
  const metrics = latestMetrics ? readMarkdown(latestMetrics) : '';

  // Ideas counts
  const inboxCount = listFiles(join(ideasDir, 'inbox')).length;
  const evaluatedCount = listFiles(join(ideasDir, 'evaluated')).length;
  const prioritized = readMarkdown(join(ideasDir, 'prioritized.md'));

  // Decisions count
  const decisionCount = listFiles(decisionsDir).length;

  // Roadmap
  const roadmap = readMarkdown(join(productDir, 'roadmap.md'));
  const backlog = readMarkdown(join(productDir, 'backlog.md'));

  // Open issues from metrics
  const openIssues = metrics.match(/Open issues: (\d+)/)?.[1] || '?';
  const closedIssues = metrics.match(/Closed since last standup: (\d+)/)?.[1] || '0';

  // Launch info
  const launchDate = productConfig.launch_date || null;
  let daysToLaunch = null;
  if (launchDate) {
    daysToLaunch = Math.ceil((new Date(launchDate) - new Date()) / (1000 * 60 * 60 * 24));
  }

  return {
    name,
    description: productConfig.description || '',
    stage: productConfig.stage || 'unknown',
    repo: productConfig.repo || '',
    launchDate,
    daysToLaunch,
    openIssues,
    closedIssues,
    summary,
    metrics,
    roadmap,
    backlog,
    prioritized,
    ideas: { inbox: inboxCount, evaluated: evaluatedCount },
    decisions: decisionCount,
  };
}

function getStandups() {
  const dir = join(ROOT, 'standups');
  return listFiles(dir).slice(0, 10).map(f => ({
    name: f.replace('.md', ''),
    content: readMarkdown(join(dir, f)),
  }));
}

function buildState() {
  const config = readConfig();
  const productNames = (config.products || []).map(p => p.name);
  state = {
    config,
    products: productNames.map(name => parseProduct(name, config)),
    standups: getStandups(),
    lastUpdate: new Date().toISOString(),
  };
  return state;
}

// --- WebSocket ---
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'full-state', data: state }));
  ws.on('close', () => clients.delete(ws));
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(data);
  }
}

// --- File Watcher ---
const watcher = chokidar.watch([
  join(ROOT, 'products'),
  join(ROOT, 'standups'),
  join(ROOT, 'decisions'),
  join(ROOT, 'config.yaml'),
  join(ROOT, 'company'),
], {
  ignoreInitial: true,
  ignored: /(^|[\/\\])\../, // ignore dotfiles except .action-items
  persistent: true,
  awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
});

let debounceTimer = null;
watcher.on('all', (event, path) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    buildState();
    broadcast({ type: 'full-state', data: state });
  }, 300);
});

// --- HTTP Server ---
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = join(__dirname, filePath);

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
  res.end(readFileSync(filePath));
});

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

// --- Start ---
buildState();
server.listen(PORT, () => {
  console.log(`Rig Dashboard: http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Test server starts**

```bash
node dashboard/server.js &
sleep 1
curl -s http://localhost:3847 | head -5
kill %1
```

Expected: Returns HTML content

- [ ] **Step 3: Commit**

```bash
git add dashboard/server.js
git commit -m "feat: add dashboard server with WebSocket and file watcher"
```

---

### Task 3: Build the frontend — HTML

**Files:**
- Create: `dashboard/index.html`

- [ ] **Step 1: Create dashboard/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rig Ops Center</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>RIG OPS CENTER</h1>
    <div id="header-meta">
      <span id="last-update"></span>
      <span id="connection-status" class="status-dot">●</span>
    </div>
  </header>

  <main>
    <!-- Product Cards -->
    <section id="product-cards" class="card-grid"></section>

    <!-- Live Feed -->
    <section id="live-feed-section">
      <h2>LIVE FEED</h2>
      <div id="live-feed"></div>
    </section>

    <!-- Product Detail (shown on card click) -->
    <section id="product-detail" class="hidden">
      <button id="back-btn" class="btn">← Back</button>
      <div id="detail-content"></div>
    </section>

    <!-- Standups -->
    <section id="standups-section">
      <h2>RECENT STANDUPS</h2>
      <div id="standups-list"></div>
    </section>
  </main>

  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/index.html
git commit -m "feat: add dashboard HTML structure"
```

---

### Task 4: Build the frontend — CSS

**Files:**
- Create: `dashboard/style.css`

- [ ] **Step 1: Create dashboard/style.css**

```css
:root {
  --bg: #0a0a0f;
  --bg-card: #12121a;
  --bg-card-hover: #1a1a25;
  --border: #2a2a3a;
  --text: #e0e0e8;
  --text-dim: #6a6a7a;
  --accent: #00d4aa;
  --accent-dim: #00a888;
  --warning: #ffaa00;
  --danger: #ff4444;
  --info: #4488ff;
  --success: #00d4aa;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  min-height: 100vh;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}

header h1 {
  font-size: 14px;
  letter-spacing: 3px;
  color: var(--accent);
  font-weight: 600;
}

#header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-dim);
  font-size: 12px;
}

.status-dot { font-size: 10px; }
.status-dot.connected { color: var(--success); }
.status-dot.disconnected { color: var(--danger); }

main { padding: 24px; }

h2 {
  font-size: 11px;
  letter-spacing: 2px;
  color: var(--text-dim);
  margin-bottom: 12px;
  text-transform: uppercase;
}

/* Product Cards Grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.product-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s;
}

.product-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent-dim);
}

.product-card .card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.product-card .card-stage {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.stage-exploration { color: var(--info); }
.stage-building { color: var(--warning); }
.stage-pre-launch { color: #ff8844; }
.stage-launch { color: var(--danger); }
.stage-growth { color: var(--success); }
.stage-maintenance { color: var(--text-dim); }

.product-card .card-meta {
  font-size: 12px;
  color: var(--text-dim);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-meta .launch-warn {
  color: var(--warning);
  font-weight: 600;
}

/* Live Feed */
#live-feed-section { margin-bottom: 24px; }

#live-feed {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px 16px;
  max-height: 300px;
  overflow-y: auto;
  font-size: 12px;
}

.feed-item {
  padding: 4px 0;
  border-bottom: 1px solid #1a1a25;
  display: flex;
  gap: 12px;
}

.feed-item:last-child { border-bottom: none; }

.feed-time {
  color: var(--text-dim);
  white-space: nowrap;
  min-width: 50px;
}

.feed-text { color: var(--text); }

/* Product Detail */
#product-detail {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 24px;
  margin-bottom: 24px;
}

#product-detail.hidden { display: none; }

#detail-content h3 {
  font-size: 13px;
  color: var(--accent);
  margin: 16px 0 8px;
  letter-spacing: 1px;
}

#detail-content h3:first-child { margin-top: 0; }

#detail-content pre {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
  overflow-x: auto;
  font-size: 12px;
  margin: 8px 0;
}

#detail-content p,
#detail-content li {
  color: var(--text-dim);
  font-size: 12px;
}

.btn {
  background: var(--bg);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 14px;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 16px;
}

.btn:hover { border-color: var(--accent); }

/* Standups */
#standups-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.standup-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.15s;
}

.standup-item:hover { border-color: var(--accent-dim); }

.standup-item .standup-name {
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.standup-item .standup-preview {
  font-size: 12px;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.standup-expanded {
  font-size: 12px;
  color: var(--text-dim);
  white-space: pre-wrap;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  display: none;
}

.standup-item.open .standup-expanded { display: block; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }

/* Responsive */
@media (max-width: 768px) {
  .card-grid { grid-template-columns: 1fr 1fr; }
  main { padding: 12px; }
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/style.css
git commit -m "feat: add dashboard dark theme CSS"
```

---

### Task 5: Build the frontend — JavaScript

**Files:**
- Create: `dashboard/app.js`

- [ ] **Step 1: Create dashboard/app.js**

```javascript
// --- State ---
let state = { products: [], standups: [], config: {}, lastUpdate: null };
let feedItems = [];

// --- WebSocket ---
const wsUrl = `ws://${location.host}`;
let ws;
let reconnectTimer;

function connect() {
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    document.getElementById('connection-status').className = 'status-dot connected';
    document.getElementById('connection-status').title = 'Connected';
    addFeedItem('Dashboard connected');
  };

  ws.onclose = () => {
    document.getElementById('connection-status').className = 'status-dot disconnected';
    document.getElementById('connection-status').title = 'Disconnected';
    reconnectTimer = setTimeout(connect, 3000);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'full-state') {
      const oldState = state;
      state = msg.data;
      render();
      detectChanges(oldState, state);
    }
  };
}

// --- Change Detection for Live Feed ---
function detectChanges(oldState, newState) {
  if (!oldState.lastUpdate) return;

  for (const product of newState.products) {
    const old = oldState.products.find(p => p.name === product.name);
    if (!old) { addFeedItem(`New product: ${product.name}`); continue; }
    if (product.summary !== old.summary) addFeedItem(`Summary updated: ${product.name}`);
    if (product.metrics !== old.metrics) addFeedItem(`Metrics updated: ${product.name}`);
    if (product.ideas.inbox !== old.ideas.inbox) addFeedItem(`New idea in ${product.name} inbox`);
    if (product.decisions !== old.decisions) addFeedItem(`New decision for ${product.name}`);
  }

  if (newState.standups.length > oldState.standups.length) {
    addFeedItem(`New standup: ${newState.standups[0].name}`);
  }
}

function addFeedItem(text) {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  feedItems.unshift({ time, text });
  if (feedItems.length > 50) feedItems.pop();
  renderFeed();
}

// --- Rendering ---
function render() {
  renderHeader();
  renderProductCards();
  renderStandups();
  renderFeed();
}

function renderHeader() {
  const update = state.lastUpdate ? new Date(state.lastUpdate).toLocaleTimeString() : '—';
  document.getElementById('last-update').textContent = `Last update: ${update}`;
}

function renderProductCards() {
  const container = document.getElementById('product-cards');
  container.innerHTML = state.products.map(p => `
    <div class="product-card" onclick="showDetail('${p.name}')">
      <div class="card-name">${p.name}</div>
      <div class="card-stage stage-${p.stage}">${p.stage.toUpperCase()}</div>
      <div class="card-meta">
        ${p.daysToLaunch !== null ? `<span class="${p.daysToLaunch <= 7 ? 'launch-warn' : ''}">T-${p.daysToLaunch} days</span>` : ''}
        <span>${p.openIssues} open issues</span>
        ${p.ideas.inbox > 0 ? `<span>${p.ideas.inbox} ideas in inbox</span>` : ''}
      </div>
    </div>
  `).join('');
}

function renderFeed() {
  const container = document.getElementById('live-feed');
  if (feedItems.length === 0) {
    container.innerHTML = '<div class="feed-item"><span class="feed-text" style="color: var(--text-dim)">Waiting for activity...</span></div>';
    return;
  }
  container.innerHTML = feedItems.map(item => `
    <div class="feed-item">
      <span class="feed-time">${item.time}</span>
      <span class="feed-text">${item.text}</span>
    </div>
  `).join('');
}

function renderStandups() {
  const container = document.getElementById('standups-list');
  if (state.standups.length === 0) {
    container.innerHTML = '<div class="standup-item"><div class="standup-name">No standups yet</div></div>';
    return;
  }
  container.innerHTML = state.standups.map(s => {
    const firstLine = s.content.split('\n').find(l => l.startsWith('## ') || (l.startsWith('- ') && l.length > 3)) || '';
    return `
      <div class="standup-item" onclick="this.classList.toggle('open')">
        <div class="standup-name">${s.name}</div>
        <div class="standup-preview">${escapeHtml(firstLine)}</div>
        <div class="standup-expanded">${escapeHtml(s.content)}</div>
      </div>
    `;
  }).join('');
}

// --- Product Detail View ---
function showDetail(name) {
  const product = state.products.find(p => p.name === name);
  if (!product) return;

  document.getElementById('product-cards').style.display = 'none';
  document.getElementById('live-feed-section').style.display = 'none';
  document.getElementById('standups-section').style.display = 'none';
  document.getElementById('product-detail').classList.remove('hidden');

  const detail = document.getElementById('detail-content');
  detail.innerHTML = `
    <h3>${product.name} — ${product.stage.toUpperCase()}</h3>
    <p>${product.description}</p>
    ${product.daysToLaunch !== null ? `<p class="${product.daysToLaunch <= 7 ? 'launch-warn' : ''}">Launch: ${product.launchDate} (${product.daysToLaunch} days)</p>` : ''}

    <h3>METRICS</h3>
    <pre>${product.metrics || 'No metrics yet'}</pre>

    <h3>ROADMAP</h3>
    <pre>${product.roadmap || 'No roadmap yet'}</pre>

    <h3>BACKLOG</h3>
    <pre>${product.backlog || 'No backlog yet'}</pre>

    <h3>IDEAS (${product.ideas.inbox} inbox / ${product.ideas.evaluated} evaluated)</h3>
    <pre>${product.prioritized || 'No ideas yet'}</pre>

    <h3>LATEST SUMMARY</h3>
    <pre>${product.summary || 'No summary yet'}</pre>
  `;
}

document.getElementById('back-btn').addEventListener('click', () => {
  document.getElementById('product-cards').style.display = '';
  document.getElementById('live-feed-section').style.display = '';
  document.getElementById('standups-section').style.display = '';
  document.getElementById('product-detail').classList.add('hidden');
});

// --- Utilities ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Init ---
connect();
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/app.js
git commit -m "feat: add dashboard client app with WebSocket and views"
```

---

### Task 6: Create dashboard start/stop script

**Files:**
- Create: `scripts/dashboard.sh`
- Modify: `scripts/rig`

- [ ] **Step 1: Create scripts/dashboard.sh**

```bash
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
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/dashboard.sh
```

- [ ] **Step 3: Add .dashboard.pid to .gitignore**

Append to `.gitignore`:

```
.dashboard.pid
```

- [ ] **Step 4: Update scripts/rig to start dashboard**

In `scripts/rig`, in the `run)` case, add dashboard start before pre-meeting and a note in the output. After `echo ""` (first one after the focus echo), add:

```bash
    # Start dashboard
    "$SCRIPT_DIR/dashboard.sh" start
```

- [ ] **Step 5: Test dashboard starts and stops**

```bash
./scripts/dashboard.sh start
sleep 1
curl -s http://localhost:3847 | head -3
./scripts/dashboard.sh status
./scripts/dashboard.sh stop
```

- [ ] **Step 6: Commit**

```bash
git add scripts/dashboard.sh scripts/rig .gitignore
git commit -m "feat: add dashboard start/stop script, integrate with rig entry point"
```

---

### Task 7: End-to-end verification

- [ ] **Step 1: Start dashboard and verify it serves**

```bash
./scripts/dashboard.sh start
sleep 2
curl -s http://localhost:3847 | grep -c "Rig Ops Center"
```
Expected: 1 (title found)

- [ ] **Step 2: Verify WebSocket serves state**

```bash
node -e "
const ws = new (await import('ws')).default('ws://localhost:3847');
ws.on('message', d => { const m = JSON.parse(d); console.log(m.type, m.data.products.length + ' products'); ws.close(); });
"
```
Expected: `full-state 5 products`

- [ ] **Step 3: Verify help includes dashboard**

Run: `./scripts/rig help`

- [ ] **Step 4: Stop dashboard**

```bash
./scripts/dashboard.sh stop
```

- [ ] **Step 5: Git log**

```bash
git log --oneline -8
```

- [ ] **Step 6: Push**

```bash
git push origin master
```
