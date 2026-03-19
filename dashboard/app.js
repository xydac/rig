// --- State ---
let state = { products: [], standups: [], config: {}, lastUpdate: null };
let feedItems = [];

// --- WebSocket ---
const wsUrl = `ws://${location.host}`;
let ws;

function connect() {
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    document.getElementById('connection-status').className = 'status-dot connected';
    addFeedItem('Dashboard connected', 'info');
  };

  ws.onclose = () => {
    document.getElementById('connection-status').className = 'status-dot disconnected';
    setTimeout(connect, 3000);
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

// --- Change Detection ---
function detectChanges(oldState, newState) {
  if (!oldState.lastUpdate) return;

  for (const product of newState.products) {
    const old = oldState.products.find(p => p.name === product.name);
    if (!old) { addFeedItem(`New product: ${product.name}`, 'info'); continue; }
    if (product.summary !== old.summary) addFeedItem(`${product.name} summary updated`, 'info');
    if (product.metrics !== old.metrics) addFeedItem(`${product.name} metrics refreshed`, 'info');
    if (product.ideas.inbox !== old.ideas.inbox) addFeedItem(`New idea in ${product.name}`, 'decision');
    if (product.decisions !== old.decisions) addFeedItem(`Decision recorded: ${product.name}`, 'decision');
    if (product.closedIssues !== old.closedIssues && product.closedIssues > old.closedIssues)
      addFeedItem(`${product.name}: ${product.closedIssues - old.closedIssues} issues closed`, 'info');
  }

  if (newState.standups.length > oldState.standups.length) {
    addFeedItem(`Standup completed: ${newState.standups[0].name}`, 'decision');
  }
}

function addFeedItem(text, type = 'info') {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  feedItems.unshift({ time, text, type });
  if (feedItems.length > 100) feedItems.pop();
  renderFeed();
}

// --- Render ---
function render() {
  renderHeader();
  renderProductCards();
  renderAgentStatus();
  renderStandups();
  renderFeed();
}

function renderHeader() {
  const config = state.config;
  const companyName = config.company?.name || 'OPS CENTER';
  document.getElementById('company-name').textContent = companyName.toUpperCase();

  const update = state.lastUpdate ? new Date(state.lastUpdate).toLocaleTimeString('en-US', { hour12: false }) : '--:--:--';
  document.getElementById('last-update').textContent = update;

  // Find latest standup run ID
  if (state.standups.length > 0) {
    document.getElementById('run-id').textContent = state.standups[0].name;
  }
}

function renderProductCards() {
  const container = document.getElementById('product-cards');
  container.innerHTML = state.products.map(p => {
    const launchClass = p.daysToLaunch !== null
      ? (p.daysToLaunch <= 3 ? 'launch-critical' : p.daysToLaunch <= 7 ? 'launch-warn' : 'launch-ok')
      : '';

    return `
      <div class="product-card" onclick="showDetail('${p.name}')">
        <div class="card-header">
          <div class="card-name">${p.name}</div>
          <span class="card-stage stage-${p.stage}">${p.stage.replace('-', ' ')}</span>
        </div>
        <div class="card-stats">
          <div class="card-stat">issues <span class="stat-value">${p.openIssues}</span></div>
          <div class="card-stat">closed <span class="stat-value">${p.closedIssues}</span></div>
          <div class="card-stat">ideas <span class="stat-value">${p.ideas.inbox + p.ideas.evaluated}</span></div>
          <div class="card-stat">decisions <span class="stat-value">${p.decisions}</span></div>
        </div>
        ${p.daysToLaunch !== null ? `
          <div class="card-launch ${launchClass}">
            <span style="color: var(--text-dim)">launch</span>
            <span class="launch-countdown">T-${p.daysToLaunch}d</span>
            <span style="color: var(--text-muted); font-size: 10px">${p.launchDate}</span>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderAgentStatus() {
  const container = document.getElementById('agent-status');
  const agents = state.products
    .filter(p => p.name !== 'rig')
    .map(p => ({
      name: p.name,
      status: 'idle',
      task: '',
    }));

  if (agents.length === 0) {
    container.innerHTML = '<span style="color: var(--text-muted); font-size: 11px">No agents active</span>';
    return;
  }

  container.innerHTML = agents.map(a => `
    <div class="agent-chip">
      <span class="agent-dot ${a.status}"></span>
      <span class="agent-name">${a.name}</span>
      ${a.task ? `<span class="agent-task">${a.task}</span>` : ''}
    </div>
  `).join('');
}

function renderFeed() {
  const container = document.getElementById('live-feed');
  if (feedItems.length === 0) {
    container.innerHTML = '<div class="feed-item"><span class="feed-dot"></span><span class="feed-text" style="color: var(--text-muted)">Waiting for activity...</span></div>';
    return;
  }
  container.innerHTML = feedItems.map(item => `
    <div class="feed-item feed-${item.type}">
      <span class="feed-time">${item.time}</span>
      <span class="feed-dot"></span>
      <span class="feed-text">${escapeHtml(item.text)}</span>
    </div>
  `).join('');
}

function renderStandups() {
  const container = document.getElementById('standups-list');
  if (state.standups.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; padding: 8px">No standups yet</div>';
    return;
  }
  container.innerHTML = state.standups.slice(0, 5).map(s => {
    const highlights = s.content.split('\n')
      .filter(l => l.startsWith('- ') && l.length > 5)
      .slice(0, 2)
      .map(l => l.substring(2))
      .join(' | ');

    return `
      <div class="standup-item" onclick="this.classList.toggle('open')">
        <div class="standup-header">
          <span class="standup-name">${s.name}</span>
          <span class="standup-meta">${countLines(s.content)} lines</span>
        </div>
        <div class="standup-preview">${escapeHtml(highlights || 'No highlights')}</div>
        <div class="standup-expanded">${escapeHtml(s.content)}</div>
      </div>
    `;
  }).join('');
}

// --- Product Detail ---
function showDetail(name) {
  const product = state.products.find(p => p.name === name);
  if (!product) return;

  // Hide main views, show detail
  document.getElementById('product-cards-section').style.display = 'none';
  document.getElementById('agent-status-section').style.display = 'none';
  document.getElementById('live-feed-section').style.display = 'none';
  document.getElementById('standups-section').style.display = 'none';

  const detail = document.getElementById('product-detail');
  detail.classList.remove('hidden');

  document.getElementById('detail-title').innerHTML = `
    ${product.name} <span class="card-stage stage-${product.stage}" style="font-size: 10px; vertical-align: middle; margin-left: 8px">${product.stage.replace('-', ' ')}</span>
    ${product.daysToLaunch !== null ? `<span style="color: var(--amber); font-size: 12px; margin-left: 12px">T-${product.daysToLaunch}d → ${product.launchDate}</span>` : ''}
  `;
  document.getElementById('detail-desc').textContent = product.description;

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-panel">
      <h3>METRICS</h3>
      <pre>${product.metrics || 'No metrics collected yet'}</pre>
    </div>
    <div class="detail-panel">
      <h3>IDEAS (${product.ideas.inbox} inbox / ${product.ideas.evaluated} evaluated)</h3>
      <pre>${product.prioritized || 'No ideas yet'}</pre>
    </div>
    <div class="detail-panel">
      <h3>ROADMAP</h3>
      <pre>${product.roadmap || 'Empty'}</pre>
    </div>
    <div class="detail-panel">
      <h3>BACKLOG</h3>
      <pre>${product.backlog || 'Empty'}</pre>
    </div>
    <div class="detail-panel full-width">
      <h3>LATEST SUMMARY</h3>
      <pre>${product.summary || 'No summary yet'}</pre>
    </div>
  `;
}

function hideDetail() {
  document.getElementById('product-cards-section').style.display = '';
  document.getElementById('agent-status-section').style.display = '';
  document.getElementById('live-feed-section').style.display = '';
  document.getElementById('standups-section').style.display = '';
  document.getElementById('product-detail').classList.add('hidden');
}

document.getElementById('back-btn').addEventListener('click', hideDetail);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideDetail();
});

// --- Utilities ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function countLines(str) {
  return str.split('\n').filter(l => l.trim()).length;
}

// --- Init ---
connect();
