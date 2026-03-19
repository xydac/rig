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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

connect();
