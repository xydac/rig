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
