const API = 'http://localhost:3001/api';
let token = localStorage.getItem('bsc_token');
let currentUser = JSON.parse(localStorage.getItem('bsc_user') || 'null');

// ─── UTILITY ───────────────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function showAlert(id, msg, type = 'info') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
  setTimeout(() => el.classList.remove('show'), 5000);
}

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="loader"></span> Processing...`
    : btn.dataset.label || btn.textContent;
}

// ─── AUTH ───────────────────────────────────────────────────────────────────
function updateAuthUI() {
  const authOverlay = document.getElementById('authOverlay');
  const userBadge = document.getElementById('userBadge');
  const matrixBg = document.getElementById('matrixCanvas');
  const sections = document.querySelectorAll('section.section');
  const nav = document.querySelector('nav');

  if (currentUser) {
    if (authOverlay) authOverlay.style.display = 'none';
    if (matrixBg) matrixBg.classList.remove('active');
    if (nav) nav.style.display = 'flex';
    sections.forEach(s => s.style.display = '');
    if (userBadge) {
      userBadge.textContent = `◉ ${currentUser.username}`;
      userBadge.style.color = 'var(--neon-green)';
    }
    loadDashboardStats();
  } else {
    if (authOverlay) authOverlay.style.display = 'flex';
    if (matrixBg) matrixBg.classList.add('active');
    if (nav) nav.style.display = 'none';
    sections.forEach(s => s.style.display = 'none');
  }
}

window.authAction = async function(type) {
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  if (!username || !password) {
    showAlert('authAlert', 'Please enter username and password', 'error');
    return;
  }
  setLoading('authBtn', true);
  try {
    const data = await apiFetch(`/auth/${type}`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('bsc_token', token);
    localStorage.setItem('bsc_user', JSON.stringify(currentUser));
    updateAuthUI();
  } catch (err) {
    showAlert('authAlert', err.message, 'error');
  } finally {
    setLoading('authBtn', false);
  }
};

window.logout = function() {
  token = null; currentUser = null;
  localStorage.removeItem('bsc_token');
  localStorage.removeItem('bsc_user');
  updateAuthUI();
};

// ─── NAVIGATION ─────────────────────────────────────────────────────────────
window.showSection = function(id) {
  $$('.section').forEach(s => s.classList.remove('active'));
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  document.querySelector(`[onclick="showSection('${id}')"]`)?.classList.add('active');
};

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────
async function loadDashboardStats() {
  try {
    const data = await apiFetch('/blockchain/stats');
    const s = data.stats;
    document.getElementById('statBlocks').textContent = s.totalBlocks;
    document.getElementById('statPending').textContent = s.pendingTransactions;
    document.getElementById('statValid').textContent = s.isValid ? '✓ VALID' : '✗ INVALID';
    document.getElementById('statDifficulty').textContent = s.difficulty;
    document.getElementById('statHash').textContent = s.latestBlockHash.substring(0, 16) + '...';
  } catch {}
}

// ─── BLOCKCHAIN EXPLORER ────────────────────────────────────────────────────
window.loadChain = async function() {
  setLoading('loadChainBtn', true);
  try {
    const data = await apiFetch('/blockchain');
    renderChain(data.chain);
    showAlert('chainAlert', `Chain loaded: ${data.chain.length} blocks. Valid: ${data.stats.isValid}`, 'success');
    loadDashboardStats();
  } catch (err) {
    showAlert('chainAlert', err.message, 'error');
  } finally {
    setLoading('loadChainBtn', false);
  }
};

function renderChain(chain) {
  const container = document.getElementById('chainDisplay');
  if (!container) return;

  container.innerHTML = chain.map((block, i) => `
    <div class="block-item" onclick="toggleBlockDetail(${i})">
      <div class="block-header">
        <span class="block-index">BLOCK #${block.index}</span>
        <span class="badge badge-valid">CONFIRMED</span>
      </div>
      <div class="block-hash">HASH: ${block.hash}</div>
      <div class="block-hash">PREV: ${block.previousHash}</div>
      <div id="blockDetail-${i}" class="block-data" style="display:none">${JSON.stringify(block.data, null, 2)}</div>
    </div>
    ${i < chain.length - 1 ? '<div class="block-gap"></div>' : ''}
  `).join('');
}

window.toggleBlockDetail = function(i) {
  const el = document.getElementById(`blockDetail-${i}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.validateChain = async function() {
  setLoading('validateBtn', true);
  try {
    const data = await apiFetch('/blockchain/validate');
    showAlert('chainAlert', data.message, data.isValid ? 'success' : 'error');
  } catch (err) {
    showAlert('chainAlert', err.message, 'error');
  } finally {
    setLoading('validateBtn', false);
  }
};

window.addBlock = async function() {
  const blockData = document.getElementById('blockData').value.trim();
  if (!blockData) { showAlert('chainAlert', 'Block data is required', 'error'); return; }

  let parsedData;
  try {
    parsedData = JSON.parse(blockData);
  } catch {
    parsedData = { message: blockData, type: 'custom' };
  }

  setLoading('addBlockBtn', true);
  try {
    const data = await apiFetch('/blockchain/add-block', {
      method: 'POST',
      body: JSON.stringify({ data: parsedData })
    });
    showAlert('chainAlert', `Block #${data.block.index} mined! Hash: ${data.block.hash.substring(0, 16)}...`, 'success');
    document.getElementById('blockData').value = '';
    loadDashboardStats();
    loadChain();
  } catch (err) {
    showAlert('chainAlert', err.message, 'error');
  } finally {
    setLoading('addBlockBtn', false);
  }
};

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────
window.sendTransaction = async function() {
  const to = document.getElementById('txTo').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);
  const token_type = document.getElementById('txToken').value;

  if (!to || !amount) { showAlert('txAlert', 'Fill in all fields', 'error'); return; }

  setLoading('sendTxBtn', true);
  try {
    const data = await apiFetch('/blockchain/transaction', {
      method: 'POST',
      body: JSON.stringify({ to, amount, token: token_type })
    });
    showAlert('txAlert', `Transaction queued! Risk: ${data.threatAnalysis.riskLevel.toUpperCase()} (${data.threatAnalysis.riskScore}/100)`,
      data.threatAnalysis.riskLevel === 'low' ? 'success' : 'warn');
    renderThreatAnalysis(data.threatAnalysis);
    loadDashboardStats();
    document.getElementById('txTo').value = '';
    document.getElementById('txAmount').value = '';
  } catch (err) {
    showAlert('txAlert', err.message, 'error');
  } finally {
    setLoading('sendTxBtn', false);
  }
};

function renderThreatAnalysis(analysis) {
  const container = document.getElementById('threatDisplay');
  if (!container) return;
  container.style.display = 'block';
  container.innerHTML = `
    <div style="margin-bottom:0.8rem">
      <div style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.3rem">RISK SCORE: ${analysis.riskScore}/100</div>
      <div class="risk-bar-bg">
        <div class="risk-bar-fill" style="width:${analysis.riskScore}%"></div>
      </div>
    </div>
    <div class="risk-tags">
      <span class="risk-tag risk-${analysis.riskLevel}">LEVEL: ${analysis.riskLevel.toUpperCase()}</span>
      <span class="risk-tag risk-${analysis.approved ? 'low' : 'critical'}">${analysis.approved ? '✓ APPROVED' : '✗ BLOCKED'}</span>
      ${analysis.risks.map(r => `<span class="risk-tag risk-${r.severity}">${r.type}</span>`).join('')}
    </div>
    ${analysis.risks.map(r => `<div style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-secondary);margin-top:0.5rem">▸ ${r.message}</div>`).join('')}
  `;
}

window.minePending = async function() {
  setLoading('mineBtn', true);
  try {
    const data = await apiFetch('/blockchain/mine', { method: 'POST' });
    showAlert('txAlert', data.message + ` Reward: ${data.reward} tokens`, 'success');
    loadDashboardStats();
  } catch (err) {
    showAlert('txAlert', err.message, 'error');
  } finally {
    setLoading('mineBtn', false);
  }
};

window.loadPending = async function() {
  try {
    const data = await apiFetch('/blockchain/pending');
    const tbody = document.getElementById('pendingTbody');
    if (!tbody) return;
    if (data.pendingTransactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">No pending transactions</td></tr>';
      return;
    }
    tbody.innerHTML = data.pendingTransactions.map(tx => `
      <tr>
        <td>${tx.id?.substring(0,8)}...</td>
        <td>${tx.from?.substring(0,12)}...</td>
        <td>${tx.to?.substring(0,12)}...</td>
        <td class="token-${tx.token?.toLowerCase()}">${tx.amount} ${tx.token}</td>
        <td><span class="badge badge-pending">PENDING</span></td>
      </tr>
    `).join('');
  } catch {}
};

// ─── SECURITY TOOLS ─────────────────────────────────────────────────────────
window.hashData = async function() {
  const input = document.getElementById('hashInput').value.trim();
  if (!input) { showAlert('hashAlert', 'Enter data to hash', 'error'); return; }

  setLoading('hashBtn', true);
  try {
    const data = await apiFetch('/auth/hash', {
      method: 'POST',
      body: JSON.stringify({ data: input })
    });
    document.getElementById('hashOutput').innerHTML = `
      <div class="hash-display">
        <div style="font-size:0.7rem;color:var(--text-secondary);margin-bottom:0.5rem">SHA-256 HASH</div>
        <div>${data.hash}</div>
        <div style="margin-top:0.8rem;font-size:0.7rem;color:var(--text-secondary)">NONCE (32-byte random)</div>
        <div style="color:var(--neon-yellow)">${data.nonce}</div>
      </div>
    `;
    showAlert('hashAlert', 'Hash computed successfully', 'success');
  } catch (err) {
    showAlert('hashAlert', err.message, 'error');
  } finally {
    setLoading('hashBtn', false);
  }
};

window.analyzeThreat = async function() {
  const from = document.getElementById('atFrom').value.trim();
  const to = document.getElementById('atTo').value.trim();
  const amount = parseFloat(document.getElementById('atAmount').value);

  if (!from || !to || !amount) { showAlert('atAlert', 'Fill all fields', 'error'); return; }

  setLoading('atBtn', true);
  try {
    const data = await apiFetch('/auth/analyze-threat', {
      method: 'POST',
      body: JSON.stringify({ transaction: { from, to, amount } })
    });
    renderThreatAnalysis(data.analysis);
    document.getElementById('threatDisplay').style.display = 'block';
    showAlert('atAlert', `Analysis complete. Risk: ${data.analysis.riskLevel}`, 
      data.analysis.riskLevel === 'low' ? 'success' : 'warn');
  } catch (err) {
    showAlert('atAlert', err.message, 'error');
  } finally {
    setLoading('atBtn', false);
  }
};

window.generateWallet = async function() {
  setLoading('genWalletBtn', true);
  try {
    const data = await apiFetch('/auth/generate-wallet', { method: 'POST' });
    document.getElementById('walletOutput').innerHTML = `
      <div class="wallet-info">
        <div class="wallet-label">Wallet Address</div>
        <div class="wallet-address">${data.wallet.address}</div>
        <div class="wallet-label" style="margin-top:0.8rem">Public Key (truncated)</div>
        <div class="wallet-address" style="font-size:0.65rem">${data.wallet.publicKey.substring(0,120)}...</div>
        <div class="wallet-label" style="margin-top:0.8rem">Created At</div>
        <div class="wallet-address">${new Date(data.wallet.createdAt).toLocaleString()}</div>
      </div>
    `;
    showAlert('walletAlert', 'New wallet generated with EC secp256k1 keypair', 'success');
  } catch (err) {
    showAlert('walletAlert', err.message, 'error');
  } finally {
    setLoading('genWalletBtn', false);
  }
};

// ─── MATRIX RAIN ANIMATION ─────────────────────────────────────────────────
(function initMatrixRain() {
  const canvas = document.getElementById('matrixCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  
  const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
  const fontSize = 16;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = Array(columns).fill(1);
  
  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#0F0';
    ctx.font = fontSize + 'px monospace';
    
    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }
  
  setInterval(draw, 35);
})();

// ─── INIT ────────────────────────────────────────────────────────────────────
updateAuthUI();
showSection('dashboard');

// Auto-refresh stats every 30s
setInterval(() => { if (currentUser) loadDashboardStats(); }, 30000);

// Store btn labels
document.querySelectorAll('.btn').forEach(btn => {
  btn.dataset.label = btn.innerHTML;
});
