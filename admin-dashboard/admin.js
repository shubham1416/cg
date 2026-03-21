/* ────────────────────────────────────────────────────────
   Compliance Quest — Admin Dashboard JS
   ──────────────────────────────────────────────────────── */

const API = '/api';
let _parsedScenarios = [];
let _editingId = null;

// ── API URL helper (always use relative paths for portability)
function apiUrl(path) {
    return path;
}

/* ── Login ─────────────────────────────────────────────── */
document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('adminPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
    const pw = document.getElementById('adminPass').value;
    const hint = document.getElementById('loginHint');
    hint.textContent = '';

    if (!pw) { hint.textContent = 'Password is required.'; return; }

    try {
        const resp = await fetch(apiUrl('/api/admin/login'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw }),
        });
        if (!resp.ok) { hint.textContent = '❌ Invalid password.'; return; }
        document.getElementById('adminLogin').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        loadPage('overview');
    } catch (e) {
        hint.textContent = '⚠️ Cannot connect to backend. Make sure the server is running.';
    }
}

/* ── Logout ─────────────────────────────────────────────── */
document.getElementById('logoutBtn').addEventListener('click', () => {
    // Redirect to the game screen
    window.location.href = '/';
});

/* ── Navigation ────────────────────────────────────────── */
document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadPage(btn.dataset.page);
    });
});

function loadPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + name).classList.add('active');
    if (name === 'overview') loadOverview();
    if (name === 'scenarios') loadScenarios();
    if (name === 'players') loadPlayers();
    if (name === 'leaderboard') loadLeaderboard();
}

// Stats Download
document.getElementById('downloadStatsBtn').addEventListener('click', () => {
    window.open(apiUrl('/api/stats/export/csv'), '_blank');
});

/* ── Overview ──────────────────────────────────────────── */
async function loadOverview() {
    try {
        const resp = await fetch(apiUrl('/api/dashboard/summary'));
        const data = await resp.json();

        const grid = document.getElementById('overviewStats');
        grid.innerHTML = `
      <div class="stat-card" style="--card-accent: linear-gradient(135deg,#38bdf8,#818cf8)">
        <div class="stat-icon">📝</div>
        <div class="stat-num">${data.total_scenarios}</div>
        <div class="stat-label">Total Scenarios</div>
      </div>
      <div class="stat-card" style="--card-accent: linear-gradient(135deg,#34d399,#38bdf8)">
        <div class="stat-icon">👥</div>
        <div class="stat-num">${data.total_players}</div>
        <div class="stat-label">Players</div>
      </div>
      <div class="stat-card" style="--card-accent: linear-gradient(135deg,#f472b6,#a78bfa)">
        <div class="stat-icon">✅</div>
        <div class="stat-num">${data.total_answers}</div>
        <div class="stat-label">Answers Submitted</div>
      </div>
      <div class="stat-card" style="--card-accent: linear-gradient(135deg,#fbbf24,#fb923c)">
        <div class="stat-icon">🎯</div>
        <div class="stat-num">${data.overall_accuracy}%</div>
        <div class="stat-label">Overall Accuracy</div>
      </div>
    `;

        drawDonutChart('domainChart', data.domain_distribution, {
            cyber: '#38bdf8', posh: '#f472b6', business: '#fbbf24'
        });
        drawBarChart('levelChart', data.level_distribution, '#818cf8');

        // Add click listeners ONLY ONCE
        if (!window._chartsInitialized) {
            setupChartInteractivity();
            window._chartsInitialized = true;
        }
    } catch (e) {
        document.getElementById('overviewStats').innerHTML = `<div style="color:var(--danger);padding:20px">⚠️ Unable to load data — is the backend running?</div>`;
    }
}

/* ── Charts Interactivity ────────────────────────────── */
let _domainMetadata = []; // { key, start, end }
let _levelMetadata = [];  // { key, x, y, w, h }

function setupChartInteractivity() {
    const domainC = document.getElementById('domainChart');
    const levelC = document.getElementById('levelChart');

    domainC.onclick = (e) => {
        const rect = domainC.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = domainC.width / 2;
        const cy = domainC.height / 2;

        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const r = Math.min(cx, cy) - 30;

        if (dist > r * 0.5 && dist < r) {
            let angle = Math.atan2(dy, dx);
            if (angle < -0.5 * Math.PI) angle += 2 * Math.PI;

            const match = _domainMetadata.find(m => angle >= m.start && angle < m.end);
            if (match) showBreakdown('domain', match.key);
        }
    };

    levelC.onclick = (e) => {
        const rect = levelC.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const match = _levelMetadata.find(m =>
            x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h
        );
        if (match) showBreakdown('level', match.key);
    };
}

async function showBreakdown(type, value) {
    const container = document.getElementById('statsBreakdown');
    const title = document.getElementById('breakdownTitle');
    const content = document.getElementById('breakdownContent');

    container.classList.remove('hidden');
    title.textContent = `${type === 'domain' ? 'Domain' : 'Level'} Breakdown: ${value.toUpperCase()}`;
    content.innerHTML = `<div style="padding:20px"><span class="spinner"></span> Fetching details...</div>`;

    try {
        if (type === 'domain') {
            const resp = await fetch(apiUrl('/api/leaderboard'));
            const data = await resp.json();
            const players = data.leaders.filter(p => p.domain.toLowerCase() === value.toLowerCase());

            if (!players.length) {
                content.innerHTML = `<p style="color:var(--text-dim)">No player data for this domain yet.</p>`;
                return;
            }

            content.innerHTML = `
                <div class="breakdown-grid">
                    ${players.map((p, idx) => `
                        <div class="breakdown-item">
                            <div class="breakdown-item-title">${p.user}</div>
                            <div class="breakdown-item-stat"><span>Score:</span> <span>${p.score}</span></div>
                            <div class="breakdown-item-stat"><span>Accuracy:</span> <span>${p.accuracy}%</span></div>
                            <div class="breakdown-item-stat"><span>Rank:</span> <span>#${idx + 1}</span></div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            // Level breakdown: show scenarios
            if (!_allScenarios.length) {
                const resp = await fetch(apiUrl('/api/scenarios/all'));
                const data = await resp.json();
                _allScenarios = data.scenarios;
            }
            const scenarios = _allScenarios.filter(s => String(s.level) === String(value));

            content.innerHTML = `
                <div class="breakdown-grid">
                    ${scenarios.map(s => `
                        <div class="breakdown-item">
                            <div class="breakdown-item-title">${s.title || 'Untitled'}</div>
                            <div class="breakdown-item-stat"><span>Domain:</span> <span>${s.domain}</span></div>
                            <div class="breakdown-item-stat"><span>Status:</span> <span style="color:${s.status === 'published' ? 'var(--success)' : 'var(--gold)'}">${s.status}</span></div>
                            <div class="breakdown-item-stat"><span>Type:</span> <span>${s.type}</span></div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
        content.innerHTML = `<div style="color:var(--danger)">Failed to load breakdown.</div>`;
    }
}

/* ── Scenarios ─────────────────────────────────────────── */
let _allScenarios = [];

async function loadScenarios() {
    const body = document.getElementById('scenarioBody');
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-dim)"><span class="spinner"></span> Loading...</td></tr>`;
    try {
        const resp = await fetch(apiUrl('/api/scenarios/all'));
        const data = await resp.json();
        _allScenarios = data.scenarios;
        renderScenarioTable(_allScenarios);
    } catch (e) {
        body.innerHTML = `<tr><td colspan="6" style="color:var(--danger)">Failed to load scenarios.</td></tr>`;
    }
}

function renderScenarioTable(scenarios) {
    const body = document.getElementById('scenarioBody');
    if (!scenarios.length) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:32px">No scenarios found.</td></tr>`;
        return;
    }
    body.innerHTML = scenarios.map(s => {
        const isDraft = s.status === 'draft' || !s.status;
        return `
    <tr>
      <td class="td-truncate">${s.title || '<em style="color:var(--text-dim)">Untitled</em>'}</td>
      <td><span class="badge badge-${s.domain}">${s.domain}</span></td>
      <td>${s.level}</td>
      <td class="td-truncate">${s.question}</td>
      <td><span class="badge badge-${isDraft ? 'draft' : 'published'}">${isDraft ? 'Draft' : 'Published'}</span></td>
      <td><span class="badge badge-${s.source || 'manual'}">${s.source || 'manual'}</span></td>
      <td>
        <div class="action-group">
          ${isDraft ? `<button class="action-btn approve" onclick="approveScenario('${s.id}')">✅ Approve</button>` : ''}
          <button class="action-btn" onclick="editScenario('${s.id}')">✏️ Edit</button>
          <button class="action-btn del" onclick="deleteScenario('${s.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `;
    }).join('');
}

// Filter scenarios
document.getElementById('filterDomain').addEventListener('change', applyFilters);
document.getElementById('filterLevel').addEventListener('change', applyFilters);
document.getElementById('filterSearch').addEventListener('input', applyFilters);

function applyFilters() {
    const domain = document.getElementById('filterDomain').value;
    const level = document.getElementById('filterLevel').value;
    const search = document.getElementById('filterSearch').value.toLowerCase();

    let filtered = _allScenarios;
    if (domain) filtered = filtered.filter(s => s.domain === domain);
    if (level) filtered = filtered.filter(s => String(s.level) === level);
    if (search) filtered = filtered.filter(s =>
        s.question.toLowerCase().includes(search) ||
        (s.title || '').toLowerCase().includes(search) ||
        (s.topic || '').toLowerCase().includes(search)
    );
    renderScenarioTable(filtered);
}

/* ── Add/Edit Scenario Modal ──────────────────────────── */
document.getElementById('addScenarioBtn').addEventListener('click', () => openModal());
document.getElementById('cancelModal').addEventListener('click', closeModal);
document.getElementById('scenarioModal').addEventListener('click', e => { if (e.target === document.getElementById('scenarioModal')) closeModal(); });

function openModal(scenario = null) {
    _editingId = scenario ? scenario.id : null;
    document.getElementById('modalTitle').textContent = scenario ? 'Edit Scenario' : 'New Scenario';
    document.getElementById('sDomain').value = scenario?.domain || 'cyber';
    document.getElementById('sLevel').value = scenario?.level || 1;
    document.getElementById('sDifficulty').value = scenario?.difficulty || 1;
    document.getElementById('sTitle').value = scenario?.title || '';
    document.getElementById('sStory').value = scenario?.story || '';
    document.getElementById('sQuestion').value = scenario?.question || '';
    document.getElementById('sTopic').value = scenario?.topic || '';
    document.getElementById('sCorrect').value = scenario?.correct_index ?? 0;
    const opts = scenario?.options || ['', '', '', ''];
    ['sOpt0', 'sOpt1', 'sOpt2', 'sOpt3'].forEach((id, i) => {
        document.getElementById(id).value = opts[i] || '';
    });
    document.getElementById('scenarioModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('scenarioModal').classList.add('hidden');
    _editingId = null;
}

document.getElementById('scenarioForm').addEventListener('submit', async e => {
    e.preventDefault();
    const options = ['sOpt0', 'sOpt1', 'sOpt2', 'sOpt3']
        .map(id => document.getElementById(id).value.trim())
        .filter(Boolean);

    const payload = {
        domain: document.getElementById('sDomain').value,
        level: parseInt(document.getElementById('sLevel').value),
        difficulty: parseInt(document.getElementById('sDifficulty').value),
        title: document.getElementById('sTitle').value.trim(),
        story: document.getElementById('sStory').value.trim(),
        question: document.getElementById('sQuestion').value.trim(),
        topic: document.getElementById('sTopic').value.trim() || 'general',
        options,
        correct_index: parseInt(document.getElementById('sCorrect').value),
    };

    const url = _editingId ? apiUrl(`/api/scenarios/${_editingId}`) : apiUrl('/api/scenarios');
    const method = _editingId ? 'PUT' : 'POST';

    try {
        const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error('Failed');
        closeModal();
        loadScenarios();
    } catch (err) {
        alert('Failed to save scenario. Check browser console.');
    }
});

function editScenario(id) {
    const s = _allScenarios.find(x => x.id === id);
    if (s) openModal(s);
}

async function deleteScenario(id) {
    if (!confirm('Delete this scenario?')) return;
    try {
        await fetch(apiUrl(`/api/scenarios/${id}`), { method: 'DELETE' });
        loadScenarios();
    } catch (e) { alert('Delete failed.'); }
}

async function approveScenario(id) {
    try {
        const resp = await fetch(apiUrl('/api/admin/scenarios/approve'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario_ids: [id], action: 'approve' })
        });
        if (!resp.ok) throw new Error('Approve failed');
        loadScenarios();
    } catch (e) {
        alert('Failed to approve scenario.');
    }
}

/* ── Upload ───────────────────────────────────────────── */
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault(); uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

function handleFile(file) {
    const result = document.getElementById('uploadResult');
    const preview = document.getElementById('uploadPreview');

    result.className = '';
    result.classList.remove('hidden');
    result.innerHTML = isCSV
        ? `<span class="spinner"></span> ⏳ <strong>Processing CSV data...</strong>`
        : `<span class="spinner"></span> ⏳ <strong>AI is analyzing "${file.name}"...</strong> This may take a moment.`;

    // Auto-detect type
    const isCSV = file.name.toLowerCase().endsWith('.csv');

    const reader = new FileReader();
    reader.onload = e => {
        const text = e.target.result;
        if (isCSV) {
            _parsedScenarios = parseCSV(text);
            showPreview(_parsedScenarios, file.name);
        } else {
            // For txt/etc, show a "Doc" preview
            _parsedScenarios = null;
            showDocPreview(file.name, text);
        }

        // TRIGGER UPLOAD AUTOMATICALLY
        doUpload(file);
    };
    reader.readAsText(file);
    fileInput._file = file;
}

function showDocPreview(filename, text) {
    const preview = document.getElementById('uploadPreview');
    const body = document.getElementById('previewBody');
    document.getElementById('previewCount').textContent = `Document: ${filename}`;

    body.innerHTML = `
        <tr>
            <td colspan="5" style="padding: 24px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <div style="color: var(--accent2); font-weight: 700; margin-bottom: 8px;">📄 Document Source Content:</div>
                <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-dim); line-height: 1.6; max-height: 150px; overflow-y: auto;">
                    ${text.substring(0, 800)}...
                </div>
                <div style="margin-top: 12px; font-size: 0.75rem; color: var(--accent);">✨ AI will extract scenarios from this text automatically.</div>
            </td>
        </tr>
    `;
    preview.classList.remove('hidden');
}

async function doUpload(file) {
    const result = document.getElementById('uploadResult');
    const fd = new FormData();
    fd.append('file', file);

    try {
        const resp = await fetch(apiUrl('/api/upload-content'), { method: 'POST', body: fd });
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.detail || 'Upload failed');
        }
        const data = await resp.json();
        result.className = 'result-success';
        result.innerHTML = `✅ <strong>Success!</strong> Generated <strong>${data.generated}</strong> new scenarios from "${file.name}".<br><span style="font-size: 0.8rem; opacity: 0.8;">They are now in "Draft" status. Go to the Scenarios tab to approve them.</span>`;
        loadScenarios();
    } catch (e) {
        result.className = 'result-error';
        result.innerHTML = `❌ <strong>Upload Error:</strong> ${e.message}`;
    }
}

function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map(line => {
        const vals = parseCSVLine(line);
        const row = {};
        headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
        const opts = ['option_a', 'option_b', 'option_c', 'option_d'].map(k => row[k]).filter(Boolean);
        return {
            domain: row.domain || 'cyber',
            level: parseInt(row.level) || 1,
            title: row.title || '',
            question: row.question || '',
            options: opts,
            correct_index: parseInt(row.correct_index) || 0,
            topic: row.topic || 'general',
        };
    }).filter(s => s.question && s.options.length >= 2);
}

function parseCSVLine(line) {
    const result = [], re = /("(?:[^"]|"")*"|[^,]*)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
        let v = m[1];
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/""/g, '"');
        result.push(v);
    }
    return result;
}

function showPreview(scenarios, filename = '', rawText = '') {
    const preview = document.getElementById('uploadPreview');
    const body = document.getElementById('previewBody');
    document.getElementById('previewCount').textContent = scenarios ? `(${scenarios.length} scenarios)` : `(${filename})`;

    if (scenarios) {
        body.innerHTML = scenarios.slice(0, 20).map(s => `
      <tr>
        <td><span class="badge badge-${s.domain}">${s.domain}</span></td>
        <td>${s.level}</td>
        <td class="td-truncate">${s.question}</td>
        <td class="td-truncate">${s.options.join(' / ')}</td>
        <td>${s.options[s.correct_index] || s.correct_index}</td>
      </tr>
    `).join('');
        if (scenarios.length > 20) {
            body.innerHTML += `<tr><td colspan="5" style="color:var(--text-dim);text-align:center">...and ${scenarios.length - 20} more</td></tr>`;
        }
    }
    preview.classList.remove('hidden');
}

document.getElementById('cancelUpload').addEventListener('click', () => {
    document.getElementById('uploadPreview').classList.add('hidden');
    document.getElementById('uploadResult').classList.add('hidden');
    _parsedScenarios = [];
    fileInput.value = '';
});

// Download CSV template
document.getElementById('downloadTemplate').addEventListener('click', () => {
    const rows = [
        'domain,level,title,story,question,option_a,option_b,option_c,option_d,correct_index,topic,difficulty',
        'cyber,1,USB Safety,A USB stick was found in the parking lot.,"What should an employee do if they find a suspicious USB drive?",Plug it into a workstation,Report to IT Security,Throw it away,Ignore it,1,removable_media,1',
        'posh,1,Meeting Conduct,During a team meeting a colleague makes an inappropriate remark.,"How should you respond to inappropriate workplace jokes?",Laugh along,Report to HR,Share more jokes,Ignore it,1,harassment,1',
        'business,2,System Outage,A critical business system fails during peak hours.,"Who should be notified FIRST in case of a critical system failure?",Team Lead,Social Media,Client,Ignore it,0,incident_response,2',
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'scenario_template.csv';
    a.click();
});

/* ── Players ───────────────────────────────────────────── */
async function loadPlayers() {
    const body = document.getElementById('playersBody');
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim)"><span class="spinner"></span> Loading...</td></tr>`;
    try {
        const resp = await fetch(apiUrl('/api/stats'));
        const data = await resp.json();
        const players = data.players;
        if (!players.length) {
            body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-dim)">No players yet.</td></tr>`;
            return;
        }
        body.innerHTML = players.map((p, i) => {
            const acc = p.overall_accuracy || 0;
            const accColor = acc >= 70 ? 'var(--success)' : acc >= 40 ? 'var(--gold)' : 'var(--danger)';
            return `<tr>
        <td><strong>${p.username}</strong></td>
        <td style="font-family:monospace;color:var(--accent)">${p.total_score}</td>
        <td>${p.total_correct}</td>
        <td>${p.total_questions}</td>
        <td>
          <span style="color:${accColor};font-weight:700">${acc}%</span>
          <div class="acc-bar-wrap" style="margin-left:8px"><div class="acc-bar" style="width:${acc}%;background:${accColor}"></div></div>
        </td>
        <td>${[...new Set(p.domains)].map(d => `<span class="badge badge-${d}">${d}</span>`).join(' ')}</td>
        <td style="color:var(--text-dim);font-size:.8rem">${p.last_played ? new Date(p.last_played).toLocaleDateString() : '—'}</td>
      </tr>`;
        }).join('');
    } catch (e) {
        body.innerHTML = `<tr><td colspan="7" style="color:var(--danger)">Failed to load player data.</td></tr>`;
    }
}

/* ── Leaderboard ───────────────────────────────────────── */
async function loadLeaderboard() {
    const list = document.getElementById('leaderboardList');
    list.innerHTML = `<div style="color:var(--text-dim)"><span class="spinner"></span> Loading...</div>`;
    try {
        const resp = await fetch(apiUrl('/api/leaderboard'));
        const data = await resp.json();
        const leaders = data.leaders;
        if (!leaders.length) {
            list.innerHTML = `<div style="color:var(--text-dim);padding:40px;text-align:center">No players yet. Start the game first!</div>`;
            return;
        }
        const medals = ['🥇', '🥈', '🥉'];
        list.innerHTML = leaders.slice(0, 20).map((p, i) => `
      <div class="lb-row">
        <div class="lb-rank">${medals[i] || `#${i + 1}`}</div>
        <div>
          <div class="lb-name">${p.user}</div>
          <div class="lb-domain"><span class="badge badge-${p.domain}">${p.domain}</span></div>
        </div>
        <div style="flex:1"></div>
        <div class="lb-acc">${p.accuracy}% accuracy</div>
        <div class="lb-score">${p.score} pts</div>
      </div>
    `).join('');
    } catch (e) {
        list.innerHTML = `<div style="color:var(--danger)">Failed to load leaderboard.</div>`;
    }
}

/* ── Charts (Canvas) ────────────────────────────────────── */
function drawDonutChart(canvasId, data, colorMap) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const entries = Object.entries(data);
    const total = entries.reduce((a, b) => a + b[1], 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!total) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(cx, cy) - 30;
    let startAngle = -0.5 * Math.PI;

    _domainMetadata = [];

    entries.forEach(([key, val]) => {
        const angle = (val / total) * 2 * Math.PI;
        const endAngle = startAngle + angle;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colorMap[key] || '#818cf8';
        ctx.fill();

        _domainMetadata.push({ key, start: startAngle, end: endAngle });
        startAngle = endAngle;
    });

    // Inner hole
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.56, 0, Math.PI * 2);
    ctx.fillStyle = '#0f1a2e';
    ctx.fill();

    // Centre text
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `bold ${Math.round(r * 0.35)}px Outfit`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy);

    // Legend
    let ly = canvas.height - 10 - entries.length * 20;
    entries.forEach(([key, val]) => {
        ctx.fillStyle = colorMap[key] || '#818cf8';
        ctx.fillRect(10, ly, 12, 12);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Outfit';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${key}: ${val}`, 28, ly);
        ly += 20;
    });
}

function drawBarChart(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const entries = Object.entries(data);
    if (!entries.length) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const max = Math.max(...entries.map(([, v]) => v));
    const barW = (canvas.width - 60) / entries.length - 12;
    const chartH = canvas.height - 55;

    _levelMetadata = [];

    entries.forEach(([key, val], i) => {
        const h = (val / max) * chartH;
        const x = 30 + i * (barW + 12);
        const y = chartH - h + 10;

        _levelMetadata.push({ key, x, y, w: barW, h });

        const grad = ctx.createLinearGradient(x, y, x, chartH + 10);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '55');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect?.(x, y, barW, h, 4) || ctx.rect(x, y, barW, h);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`Lv${key}`, x + barW / 2, chartH + 14);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '12px Outfit';
        ctx.textBaseline = 'bottom';
        ctx.fillText(val, x + barW / 2, y - 2);
    });
}
