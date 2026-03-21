// --- State ---
let state = { products: [], standups: [], config: {}, lastUpdate: null };
let feedItems = [];

// --- Session / Chat State ---
let sessionStatus = 'idle';
let chatMessages = [];
let agents = {};
let activeAgentTab = null;
let autoScroll = true;

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
      populateProductFilter();

    } else if (msg.type === 'session-state') {
      sessionStatus = msg.data.status;
      renderSessionControls();
      renderChatView();

    } else if (msg.type === 'chat-output') {
      chatMessages.push(msg.data);
      renderChatMessages();

    } else if (msg.type === 'chat-history') {
      chatMessages = msg.data;
      renderChatMessages();

    } else if (msg.type === 'pre-meeting-output') {
      appendPreMeetingOutput(msg.data.text);

    } else if (msg.type === 'post-meeting-output' || msg.type === 'script-output') {
      addFeedItem(msg.data.text || msg.data, 'info');

    } else if (msg.type === 'session-error') {
      addFeedItem(msg.data.text || msg.data, 'error');

    } else if (msg.type === 'agent-update') {
      const agent = msg.data;
      agents[agent.name] = agent;
      renderAgentTabs();
      renderAgentPanel();

    } else if (msg.type === 'tasks-update') {
      // no-op for now
    }
  };
}

// --- WebSocket Send Helper ---
function wsSend(type, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
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

// --- Product Filter ---
function populateProductFilter() {
  const select = document.getElementById('product-filter');
  // Keep the "ALL PRODUCTS" default option, replace the rest
  const products = (state.config.products || []).filter(p => p.name !== 'rig');
  // Remove any previously added options (keep index 0)
  while (select.options.length > 1) select.remove(1);
  for (const p of products) {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.name.toUpperCase();
    select.appendChild(opt);
  }
}

// --- Session Controls ---
function renderSessionControls() {
  const badge = document.getElementById('session-status');
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const filterEl = document.getElementById('product-filter');

  const labels = { idle: 'IDLE', starting: 'STARTING', running: 'RUNNING', stopping: 'STOPPING' };
  badge.textContent = labels[sessionStatus] || sessionStatus.toUpperCase();
  badge.className = `session-badge ${sessionStatus}`;

  const isIdle = sessionStatus === 'idle';
  const isRunning = sessionStatus === 'running' || sessionStatus === 'starting';

  startBtn.classList.toggle('hidden', !isIdle);
  filterEl.classList.toggle('hidden', !isIdle);
  stopBtn.classList.toggle('hidden', !isRunning);
}

// --- Chat View ---
function renderChatView() {
  const chatIdle = document.getElementById('chat-idle');
  const chatStarting = document.getElementById('chat-starting');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  if (sessionStatus === 'idle') {
    if (chatIdle) chatIdle.style.display = '';
    if (chatStarting) chatStarting.classList.add('hidden');
    chatInput.disabled = true;
    sendBtn.disabled = true;
  } else if (sessionStatus === 'starting') {
    if (chatIdle) chatIdle.style.display = 'none';
    if (chatStarting) chatStarting.classList.remove('hidden');
    chatInput.disabled = true;
    sendBtn.disabled = true;
  } else {
    // running or stopping
    if (chatIdle) chatIdle.style.display = 'none';
    if (chatStarting) chatStarting.classList.add('hidden');
    chatInput.disabled = false;
    sendBtn.disabled = false;
  }
}

// --- Pre-meeting Output ---
function appendPreMeetingOutput(text) {
  let pre = document.getElementById('pre-meeting-output');
  if (!pre) {
    // Create a pre element inside chat-starting if it doesn't exist
    const startingDiv = document.getElementById('chat-starting');
    if (startingDiv) {
      pre = document.createElement('pre');
      pre.id = 'pre-meeting-output';
      startingDiv.appendChild(pre);
    } else {
      return;
    }
  }
  pre.textContent += text;
}

// --- Chat Messages ---
function renderChatMessages() {
  const container = document.getElementById('chat-messages');

  // Keep idle state element; remove previous chat-msg elements
  const existingMsgs = container.querySelectorAll('.chat-msg');
  existingMsgs.forEach(el => el.remove());

  for (const msg of chatMessages) {
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg-${msg.role || 'assistant'}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'chat-msg-content';

    if (msg.role === 'user') {
      contentDiv.textContent = msg.text || msg.content || '';
    } else {
      const raw = msg.text || msg.content || '';
      if (typeof marked !== 'undefined') {
        contentDiv.innerHTML = marked.parse(raw);
      } else {
        contentDiv.textContent = raw;
      }
    }

    div.appendChild(contentDiv);
    container.appendChild(div);
  }

  if (autoScroll) {
    container.scrollTop = container.scrollHeight;
  }
  updateScrollBottomBtn();
}

// --- Send Chat Message ---
function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  chatMessages.push({ role: 'user', text });
  renderChatMessages();
  wsSend('chat-input', { text });
}

// --- Scroll-to-bottom Button ---
function updateScrollBottomBtn() {
  const container = document.getElementById('chat-messages');
  const btn = document.getElementById('scroll-bottom-btn');
  if (!btn) return;
  const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
  btn.classList.toggle('hidden', atBottom);
}

// --- Agent Tabs ---
function renderAgentTabs() {
  const container = document.getElementById('agent-tabs');
  const names = Object.keys(agents);

  if (names.length === 0) {
    container.innerHTML = '<div class="agent-tabs-empty">No agents running</div>';
    return;
  }

  if (!activeAgentTab || !agents[activeAgentTab]) {
    activeAgentTab = names[0];
  }

  container.innerHTML = names.map(name => {
    const agent = agents[name];
    const isActive = name === activeAgentTab;
    const color = agent.color || '#888';
    return `
      <button class="agent-tab-btn${isActive ? ' active' : ''}" onclick="switchAgentTab('${escapeHtml(name)}')">
        <span class="agent-color-dot" style="background:${color}"></span>
        <span class="agent-tab-name">${escapeHtml(name)}</span>
        <span class="agent-status-badge status-${agent.status || 'idle'}">${agent.status || 'idle'}</span>
      </button>
    `;
  }).join('');
}

// --- Switch Agent Tab ---
function switchAgentTab(name) {
  activeAgentTab = name;
  renderAgentTabs();
  renderAgentPanel();
}

// --- Agent Panel ---
function renderAgentPanel() {
  const container = document.getElementById('agent-panel-content');
  const names = Object.keys(agents);

  if (names.length === 0) {
    container.innerHTML = '<div class="agent-panel-empty">No agents active</div>';
    return;
  }

  const agent = agents[activeAgentTab] || agents[names[0]];
  if (!agent) {
    container.innerHTML = '<div class="agent-panel-empty">No agents active</div>';
    return;
  }

  const color = agent.color || '#888';
  const statusColor = {
    idle: 'var(--text-muted)',
    running: 'var(--green)',
    done: 'var(--text-dim)',
    blocked: 'var(--red)',
    starting: 'var(--amber)',
  }[agent.status] || 'var(--text-dim)';

  // Messages
  const messages = agent.messages || [];
  const messagesHtml = messages.length > 0 ? `
    <div class="agent-section-header">MESSAGES</div>
    <div class="agent-messages">
      ${messages.map(m => `
        <div class="agent-message">
          <div class="agent-message-meta">
            <span class="agent-message-from">${escapeHtml(m.from || 'system')}</span>
            ${m.timestamp ? `<span class="agent-message-time">${escapeHtml(m.timestamp)}</span>` : ''}
          </div>
          <div class="agent-message-text">${escapeHtml(m.text || '')}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  // Tasks
  const tasks = agent.tasks || [];
  const tasksHtml = tasks.length > 0 ? `
    <div class="agent-section-header">TASKS</div>
    <div class="agent-tasks">
      ${tasks.map(t => `
        <div class="agent-task-item${t.done ? ' done' : ''}">
          <span class="agent-task-check">${t.done ? '✓' : '○'}</span>
          <span class="agent-task-text">${escapeHtml(t.text || t)}</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  container.innerHTML = `
    <div class="agent-panel-header">
      <span class="agent-color-dot" style="background:${color}"></span>
      <span class="agent-panel-name">${escapeHtml(agent.name || activeAgentTab)}</span>
      <span class="agent-status-badge" style="color:${statusColor}">${agent.status || 'idle'}</span>
      ${agent.model ? `<span class="agent-model">${escapeHtml(agent.model)}</span>` : ''}
    </div>
    ${messagesHtml}
    ${tasksHtml}
  `;
}

// --- Mobile Tab Switching ---
function initMobileTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      // Update button active states
      tabBtns.forEach(b => b.classList.remove('tab-active'));
      btn.classList.add('tab-active');

      // Update content active states
      document.querySelectorAll('[data-tab-content]').forEach(el => {
        el.classList.toggle('tab-active', el.dataset.tabContent === tab);
      });
    });
  });

  // Initialize chat tab as active
  const chatContent = document.querySelector('[data-tab-content="chat"]');
  if (chatContent) chatContent.classList.add('tab-active');
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
  const agentList = state.products
    .filter(p => p.name !== 'rig')
    .map(p => ({
      name: p.name,
      status: 'idle',
      task: '',
    }));

  if (agentList.length === 0) {
    container.innerHTML = '<span style="color: var(--text-muted); font-size: 11px">No agents active</span>';
    return;
  }

  container.innerHTML = agentList.map(a => `
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

// --- Event Listeners ---
document.getElementById('back-btn').addEventListener('click', hideDetail);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideDetail();
});

document.getElementById('start-btn').addEventListener('click', () => {
  const filter = document.getElementById('product-filter').value;
  wsSend('start-session', { product: filter || null });
});

document.getElementById('stop-btn').addEventListener('click', () => {
  if (confirm('Stop the current session?')) {
    wsSend('stop-session', {});
  }
});

document.getElementById('send-btn').addEventListener('click', sendChatMessage);

document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});

document.getElementById('chat-messages').addEventListener('scroll', () => {
  const container = document.getElementById('chat-messages');
  const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
  autoScroll = atBottom;
  updateScrollBottomBtn();
});

document.getElementById('scroll-bottom-btn').addEventListener('click', () => {
  const container = document.getElementById('chat-messages');
  container.scrollTop = container.scrollHeight;
  autoScroll = true;
  updateScrollBottomBtn();
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
initMobileTabs();
connect();
