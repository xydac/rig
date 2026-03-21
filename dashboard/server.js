import { createServer } from 'http';
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, extname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import yaml from 'js-yaml';
import { spawn } from 'child_process';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORT = process.env.PORT || 3847;
const HOME = homedir();

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

  const latestSummary = getLatestFile(summaryDir);
  const summary = latestSummary ? readMarkdown(latestSummary) : '';

  const latestMetrics = getLatestFile(metricsDir);
  const metrics = latestMetrics ? readMarkdown(latestMetrics) : '';

  const inboxCount = listFiles(join(ideasDir, 'inbox')).length;
  const evaluatedCount = listFiles(join(ideasDir, 'evaluated')).length;
  const prioritized = readMarkdown(join(ideasDir, 'prioritized.md'));

  const decisionCount = listFiles(decisionsDir).length;

  const roadmap = readMarkdown(join(productDir, 'roadmap.md'));
  const backlog = readMarkdown(join(productDir, 'backlog.md'));

  const openIssues = metrics.match(/Open issues: (\d+)/)?.[1] || '?';
  const closedIssues = metrics.match(/Closed since last standup: (\d+)/)?.[1] || '0';

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

// --- Session State Machine ---
// States: IDLE | STARTING | RUNNING | SHUTTING_DOWN | ERROR
const SESSION_STATES = { IDLE: 'IDLE', STARTING: 'STARTING', RUNNING: 'RUNNING', SHUTTING_DOWN: 'SHUTTING_DOWN', ERROR: 'ERROR' };

let session = {
  state: SESSION_STATES.IDLE,
  sessionId: null,        // UUID for claude --session-id / --resume
  claudeProcess: null,    // active child_process from spawn
  turnActive: false,      // true while a claude process is running
  stopTimer: null,        // SIGTERM timer for forced stop
  killTimer: null,        // SIGKILL timer for forced stop
  taskWatcher: null,      // chokidar watcher for ~/.claude/tasks/<sessionId>/
  taskRetries: 0,
};

// Chat buffer — max 500 messages / 1MB, oldest evicted first
const CHAT_MAX_MESSAGES = 500;
const CHAT_MAX_BYTES = 1024 * 1024;
let chatHistory = [];
let chatBytes = 0;

function pushChat(msg) {
  const serialized = JSON.stringify(msg);
  const size = serialized.length;
  chatBytes += size;
  chatHistory.push({ msg, size });
  // Evict oldest
  while (chatHistory.length > CHAT_MAX_MESSAGES || chatBytes > CHAT_MAX_BYTES) {
    const evicted = chatHistory.shift();
    chatBytes -= evicted.size;
  }
  broadcast({ type: 'chat-output', data: msg });
}

function setSessionState(newState, extra = {}) {
  session.state = newState;
  broadcast({ type: 'session-state', data: { state: newState, sessionId: session.sessionId, ...extra } });
}

// --- Agent State Tracking ---
const TEAMS_DIR = join(HOME, '.claude', 'teams', 'rig-standup', 'inboxes');
let agentStates = {}; // name -> { status, lastUpdate }
let agentDebounceTimer = null;

function deriveAgentStatus(inboxPath) {
  try {
    const raw = readFileSync(inboxPath, 'utf8');
    const messages = JSON.parse(raw);
    if (!Array.isArray(messages) || messages.length === 0) return 'spawning';

    // Find last message from team-lead and last from agent
    let lastLeadMsg = null;
    let lastAgentMsg = null;
    for (const m of messages) {
      if (m.from === 'team-lead' || m.role === 'team-lead') lastLeadMsg = m;
      else lastAgentMsg = m;
    }

    if (lastAgentMsg) {
      const content = (lastAgentMsg.content || lastAgentMsg.text || '').toString();
      if (content.includes('COMPLETED')) return 'completed';
      if (content.includes('BLOCKED')) return 'blocked';
    }

    if (lastLeadMsg) {
      const content = (lastLeadMsg.content || lastLeadMsg.text || '').toString();
      if (content.includes('EXECUTE')) {
        // Stale check: if lead sent EXECUTE more than 5 min ago and no agent response
        const ts = lastLeadMsg.timestamp ? new Date(lastLeadMsg.timestamp).getTime() : Date.now();
        const age = Date.now() - ts;
        return age > 5 * 60 * 1000 && !lastAgentMsg ? 'stale' : 'executing';
      }
    }

    return 'ready';
  } catch {
    return 'spawning';
  }
}

function refreshAgentStates() {
  try {
    const files = existsSync(TEAMS_DIR)
      ? readdirSync(TEAMS_DIR).filter(f => f.endsWith('.json'))
      : [];
    const updated = {};
    for (const f of files) {
      const name = f.replace('.json', '');
      const status = deriveAgentStatus(join(TEAMS_DIR, f));
      updated[name] = { status, lastUpdate: new Date().toISOString() };
    }
    agentStates = updated;
    broadcast({ type: 'agent-update', data: agentStates });
  } catch (e) {
    // Non-fatal
  }
}

// --- Team Watcher (always on) ---
const teamWatcher = chokidar.watch(TEAMS_DIR, {
  ignoreInitial: false,
  persistent: true,
  awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
});

teamWatcher.on('all', () => {
  clearTimeout(agentDebounceTimer);
  agentDebounceTimer = setTimeout(refreshAgentStates, 300);
});

// --- Task Watcher (per-session) ---
function startTaskWatcher(sessionId) {
  const taskDir = join(HOME, '.claude', 'tasks', sessionId);
  if (session.taskWatcher) {
    session.taskWatcher.close();
    session.taskWatcher = null;
  }
  session.taskRetries = 0;

  function tryWatch() {
    if (!existsSync(taskDir)) {
      if (session.taskRetries < 5) {
        session.taskRetries++;
        setTimeout(tryWatch, 2000);
      }
      return;
    }
    const tw = chokidar.watch(taskDir, {
      ignoreInitial: false,
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });
    tw.on('all', (event, filePath) => {
      try {
        const content = readFileSync(filePath, 'utf8');
        broadcast({ type: 'tasks-update', data: { event, path: filePath, content } });
      } catch { /* non-fatal */ }
    });
    session.taskWatcher = tw;
  }

  tryWatch();
}

// --- Script Runner ---
function runScript(scriptPath, broadcastType) {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', [scriptPath], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout.on('data', (chunk) => {
      broadcast({ type: broadcastType, data: { stream: 'stdout', text: chunk.toString() } });
    });
    proc.stderr.on('data', (chunk) => {
      broadcast({ type: broadcastType, data: { stream: 'stderr', text: chunk.toString() } });
    });
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptPath} exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

// --- Claude Process Management ---
function spawnClaude(args) {
  return spawn('claude', args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
}

function parseClaude(line) {
  // Each stdout line from --output-format stream-json is a JSON object
  try {
    return JSON.parse(line.trim());
  } catch { return null; }
}

function attachClaudeHandlers(proc) {
  let buffer = '';
  session.turnActive = true;

  proc.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete last line
    for (const line of lines) {
      if (!line.trim()) continue;
      const obj = parseClaude(line);
      if (!obj) continue;

      // Stream text deltas
      if (obj.type === 'stream_event') {
        const delta = obj.event?.content_block_delta?.delta;
        if (delta?.type === 'text_delta' && delta.text) {
          pushChat({ role: 'assistant', type: 'delta', text: delta.text, ts: Date.now() });
        }
      }

      // Complete assistant message
      if (obj.type === 'assistant' && obj.message) {
        const content = obj.message.content;
        if (Array.isArray(content)) {
          const text = content.filter(c => c.type === 'text').map(c => c.text).join('');
          if (text) pushChat({ role: 'assistant', type: 'message', text, ts: Date.now() });
        }
      }

      // Turn complete
      if (obj.type === 'result') {
        pushChat({ role: 'system', type: 'result', data: obj, ts: Date.now() });
      }
    }
  });

  proc.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    broadcast({ type: 'session-error', data: { text } });
  });

  proc.on('exit', (code, signal) => {
    session.turnActive = false;
    session.claudeProcess = null;
    clearTimeout(session.stopTimer);
    clearTimeout(session.killTimer);

    // If we were shutting down (stop-session flow), finish post-meeting
    if (session.state === SESSION_STATES.SHUTTING_DOWN) {
      finishShutdown();
      return;
    }

    if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
      setSessionState(SESSION_STATES.ERROR, { code, signal });
      return;
    }

    // Otherwise turn is just done; stay RUNNING and ready for next message
    if (session.state === SESSION_STATES.RUNNING) {
      broadcast({ type: 'session-state', data: { state: SESSION_STATES.RUNNING, sessionId: session.sessionId, turnActive: false } });
    }
  });

  proc.on('error', (err) => {
    session.turnActive = false;
    session.claudeProcess = null;
    setSessionState(SESSION_STATES.ERROR, { error: err.message });
  });
}

async function finishShutdown() {
  const postScript = join(ROOT, 'scripts', 'post-meeting.sh');
  if (existsSync(postScript)) {
    try {
      await runScript(postScript, 'post-meeting-output');
    } catch (e) {
      broadcast({ type: 'session-error', data: { text: `post-meeting.sh failed: ${e.message}` } });
    }
  }

  if (session.taskWatcher) {
    session.taskWatcher.close();
    session.taskWatcher = null;
  }

  session.sessionId = null;
  chatHistory = [];
  chatBytes = 0;
  agentStates = {};
  setSessionState(SESSION_STATES.IDLE);
}

// --- WebSocket ---
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);

  // Send current session state
  ws.send(JSON.stringify({
    type: 'session-state',
    data: { state: session.state, sessionId: session.sessionId, turnActive: session.turnActive },
  }));

  // Send full product/standup state
  ws.send(JSON.stringify({ type: 'full-state', data: state }));

  // If running, also send chat history and agent states
  if (session.state === SESSION_STATES.RUNNING || session.state === SESSION_STATES.SHUTTING_DOWN) {
    ws.send(JSON.stringify({ type: 'chat-history', data: chatHistory.map(h => h.msg) }));
    ws.send(JSON.stringify({ type: 'agent-update', data: agentStates }));
  }

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'start-session') {
      if (session.state !== SESSION_STATES.IDLE) return;
      setSessionState(SESSION_STATES.STARTING);
      session.sessionId = randomUUID();

      // Run pre-meeting script
      const preScript = join(ROOT, 'scripts', 'pre-meeting.sh');
      if (existsSync(preScript)) {
        try {
          await runScript(preScript, 'pre-meeting-output');
        } catch (e) {
          broadcast({ type: 'session-error', data: { text: `pre-meeting.sh failed: ${e.message}` } });
          setSessionState(SESSION_STATES.ERROR, { error: e.message });
          return;
        }
      }

      setSessionState(SESSION_STATES.RUNNING);

      // First turn: launch claude with initial prompt from CLAUDE.md context
      // The user will send the first chat-input to actually begin
      broadcast({ type: 'session-state', data: { state: SESSION_STATES.RUNNING, sessionId: session.sessionId, turnActive: false, ready: true } });
    }

    else if (msg.type === 'chat-input') {
      if (session.state !== SESSION_STATES.RUNNING) return;
      if (session.turnActive) return; // busy

      const text = (msg.data || '').trim();
      if (!text) return;

      pushChat({ role: 'user', type: 'message', text, ts: Date.now() });

      // Build claude args
      let args;
      const commonArgs = ['--output-format', 'stream-json', '--verbose', '--include-partial-messages'];
      if (!session.claudeProcess && chatHistory.filter(h => h.msg.role === 'user').length <= 1) {
        // First turn
        args = ['-p', ...commonArgs, '--session-id', session.sessionId, text];
      } else {
        // Subsequent turns
        args = ['-p', '--resume', session.sessionId, ...commonArgs, text];
      }

      const proc = spawnClaude(args);
      session.claudeProcess = proc;
      attachClaudeHandlers(proc);
    }

    else if (msg.type === 'stop-session') {
      if (session.state !== SESSION_STATES.RUNNING) return;
      setSessionState(SESSION_STATES.SHUTTING_DOWN);

      if (session.turnActive && session.claudeProcess) {
        // Wait for current turn to finish before sending DONE
        // We'll send DONE once the current process exits (handled in exit handler)
        // For safety, also set a hard stop
        session.stopTimer = setTimeout(() => {
          if (session.claudeProcess) session.claudeProcess.kill('SIGTERM');
          session.killTimer = setTimeout(() => {
            if (session.claudeProcess) session.claudeProcess.kill('SIGKILL');
          }, 10000);
        }, 30000);
      } else {
        // Send DONE as a new turn
        const args = ['-p', '--resume', session.sessionId,
          '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
          'DONE'];
        pushChat({ role: 'user', type: 'message', text: 'DONE', ts: Date.now() });
        const proc = spawnClaude(args);
        session.claudeProcess = proc;
        attachClaudeHandlers(proc);

        // Safety: force-stop after 30s
        session.stopTimer = setTimeout(() => {
          if (session.claudeProcess) session.claudeProcess.kill('SIGTERM');
          session.killTimer = setTimeout(() => {
            if (session.claudeProcess) session.claudeProcess.kill('SIGKILL');
          }, 10000);
        }, 30000);
      }
    }
  });

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
  ignored: /(^|[\/\\])\../,
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
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Rig Dashboard: http://${HOST}:${PORT}`);
});
