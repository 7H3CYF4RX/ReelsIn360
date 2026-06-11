// ===== API & AUTH =====
const API = '/api';
let currentUser = null;

function getToken() { return localStorage.getItem('r360_token'); }
function setToken(t) { localStorage.setItem('r360_token', t); }
function clearToken() { localStorage.removeItem('r360_token'); localStorage.removeItem('r360_user'); }

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// ===== TOAST =====
function toast(msg, type = 'info') {
  const icons = {
    success: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ===== MODAL =====
function openModal(title, bodyHtml, footerHtml = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml;
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target.id === 'modal-overlay') closeModal(); });

// ===== STATUS HELPERS =====
const STATUS_BADGES = {
  new_lead: 'badge-gray', contacted: 'badge-cyan', requirement_collected: 'badge-cyan',
  quotation_sent: 'badge-yellow', follow_up: 'badge-orange', won: 'badge-green', lost: 'badge-red',
  pending: 'badge-gray', planning: 'badge-cyan', assigned: 'badge-purple',
  shoot_scheduled: 'badge-yellow', shoot_completed: 'badge-green', footage_uploaded: 'badge-green',
  travelling: 'badge-yellow', shoot_started: 'badge-orange',
  editing_started: 'badge-cyan', first_draft: 'badge-purple', internal_review: 'badge-yellow',
  client_review: 'badge-orange', revision: 'badge-red', approved: 'badge-green', delivered: 'badge-green',
  paid: 'badge-green', overdue: 'badge-red',
};
function statusBadge(s) {
  const label = s ? s.replace(/_/g, ' ') : '—';
  const cls = STATUS_BADGES[s] || 'badge-gray';
  return `<span class="badge ${cls}">${label}</span>`;
}
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
function fmtCurrency(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }

// ===== SIDEBAR NAV =====
function setActivePage(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

function applyRoleVisibility(role) {
  const hideForRoles = {
    shooter: ['nav-leads', 'nav-projects', 'nav-operations', 'nav-editing', 'nav-delivery', 'nav-admin-label', 'nav-users'],
    editor: ['nav-leads', 'nav-operations', 'nav-shooter', 'nav-admin-label', 'nav-users'],
    sales: ['nav-operations', 'nav-shooter', 'nav-editing', 'nav-delivery', 'nav-admin-label', 'nav-users'],
    operations: ['nav-leads', 'nav-admin-label', 'nav-users'],
  };
  const hidden = hideForRoles[role] || [];
  hidden.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
}

// ===== ROUTER =====
const routes = {};
function register(page, fn) { routes[page] = fn; }

function navigate(page) {
  if (!routes[page]) page = 'dashboard';
  document.getElementById('page-title').textContent = PAGE_TITLES[page] || page;
  document.getElementById('page-subtitle').textContent = PAGE_SUBTITLES[page] || '';
  document.getElementById('topbar-actions').innerHTML = '';
  setActivePage(page);
  const content = document.getElementById('content');
  content.scrollTop = 0;
  content.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  routes[page](content);
  window.location.hash = page;
}

const PAGE_TITLES = {
  dashboard: 'Dashboard', leads: 'Lead Management', projects: 'Projects & Accounts',
  operations: 'Operations', shooter: 'Shooter App', editing: 'Editing', delivery: 'Delivery & Invoices',
  users: 'User Management',
};
const PAGE_SUBTITLES = {
  dashboard: 'Live business overview', leads: 'Manage your sales pipeline',
  projects: 'Active productions', operations: 'Assign & track shoots',
  shooter: 'Your assigned shoots', editing: 'Post-production workflow',
  delivery: 'Deliverables & payments',
  users: 'Create and manage team members',
};

// ===== SIDEBAR TOGGLE (mobile) =====
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
if (window.innerWidth <= 768) document.getElementById('sidebar-toggle').style.display = 'block';

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    navigate(el.dataset.page);
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
  });
});

document.getElementById('logout-btn').addEventListener('click', () => {
  clearToken(); currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-page').style.display = 'flex';
});

// ===== LOGIN =====
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  btn.disabled = true;
  document.getElementById('login-btn-text').textContent = 'Signing in...';
  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
      }),
    });
    setToken(data.token);
    currentUser = data.user;
    localStorage.setItem('r360_user', JSON.stringify(data.user));
    initApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    document.getElementById('login-btn-text').textContent = 'Sign In';
  }
});

// Toggle password visibility
const togglePasswordBtn = document.getElementById('toggle-password');
if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', () => {
    const passwordInput = document.getElementById('login-password');
    const eyeIcon = document.getElementById('eye-icon');
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      togglePasswordBtn.title = 'Hide Password';
      eyeIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
    } else {
      passwordInput.type = 'password';
      togglePasswordBtn.title = 'Show Password';
      eyeIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    }
  });
}

// ===== INIT APP =====
function initApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('sidebar-avatar').textContent = currentUser.name[0].toUpperCase();
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-role').textContent = currentUser.role;
  applyRoleVisibility(currentUser.role);

  // Route to correct page based on role
  const defaultPage = currentUser.role === 'shooter' ? 'shooter' : currentUser.role === 'editor' ? 'editing' : 'dashboard';
  const hash = window.location.hash.replace('#', '') || defaultPage;
  navigate(hash);
}

// ===== BOOT =====
window.addEventListener('load', async () => {
  const token = getToken();
  const stored = localStorage.getItem('r360_user');
  if (token && stored) {
    try {
      const data = await apiRequest('/auth/me');
      currentUser = data.user;
      localStorage.setItem('r360_user', JSON.stringify(data.user));
      initApp();
    } catch {
      clearToken();
      document.getElementById('login-page').style.display = 'flex';
    }
  } else {
    document.getElementById('login-page').style.display = 'flex';
  }
});

// ===== DASHBOARD PAGE =====
register('dashboard', async (container) => {
  try {
    const { data } = await apiRequest('/dashboard/summary');
    const d = data;

    const topActions = document.getElementById('topbar-actions');
    topActions.innerHTML = `<button class="btn btn-secondary btn-sm" onclick="navigate('dashboard')">
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Refresh
    </button>`;

    container.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card purple">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--purple-500)"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="kpi-value">${d.shoots.today}</div>
          <div class="kpi-label">Today's Shoots</div>
        </div>
        <div class="kpi-card yellow">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--yellow-500)"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="kpi-value">${d.shoots.pending}</div>
          <div class="kpi-label">Pending Shoots</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-500)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="kpi-value">${d.shoots.completed}</div>
          <div class="kpi-label">Completed Shoots</div>
        </div>
        <div class="kpi-card cyan">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--cyan-500)"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="kpi-value">${d.active_projects}</div>
          <div class="kpi-label">Active Projects</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-icon">
            <span style="font-weight:700;color:var(--green-500);font-size:20px;line-height:24px">₹</span>
          </div>
          <div class="kpi-value">${fmtCurrency(d.revenue.monthly)}</div>
          <div class="kpi-label">Monthly Revenue</div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--red-500)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="kpi-value">${fmtCurrency(d.revenue.outstanding)}</div>
          <div class="kpi-label">Outstanding</div>
        </div>
      </div>

      <div class="grid-2 mb-4">
        <div class="card">
          <div class="card-header">
            <div class="card-title" style="display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
              Editing Pipeline
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:22px;font-weight:800">${d.editing.pending}</div>
              <div class="text-sm text-muted">Pending Edit</div>
            </div>
            <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:22px;font-weight:800;color:var(--cyan-500)">${d.editing.in_progress}</div>
              <div class="text-sm text-muted">In Progress</div>
            </div>
            <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:22px;font-weight:800;color:var(--yellow-500)">${d.editing.client_review}</div>
              <div class="text-sm text-muted">Client Review</div>
            </div>
            <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:22px;font-weight:800;color:var(--green-500)">${d.editing.delivered}</div>
              <div class="text-sm text-muted">Delivered</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title" style="display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Upcoming Shoots
            </div>
          </div>
          ${d.upcoming_shoots.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <p>No upcoming shoots in next 7 days</p>
            </div>` :
            d.upcoming_shoots.map(s => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
                <div>
                  <div style="font-weight:600">${s.client_name || '—'} <span class="text-muted">· ${s.project_id}</span></div>
                  <div class="text-sm text-muted">${s.shooter_name || 'Unassigned'} · ${s.package || '—'}</div>
                </div>
                <div class="badge badge-yellow">${fmtDate(s.shoot_date)}</div>
              </div>`).join('')}
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div class="card-title" style="display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h10a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Shooter Performance
            </div>
          </div>
          <div class="table-wrap">
            <table><thead><tr><th>Name</th><th>Total</th><th>Completed</th></tr></thead>
            <tbody>
              ${d.team.shooters.map(s => `<tr><td><strong>${s.name}</strong></td><td>${s.total_shoots || 0}</td><td>${s.completed || 0}</td></tr>`).join('') || '<tr><td colspan="3" class="text-center text-muted">No data</td></tr>'}
            </tbody></table>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title" style="display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
              Editor Performance
            </div>
          </div>
          <div class="table-wrap">
            <table><thead><tr><th>Name</th><th>Total</th><th>Delivered</th></tr></thead>
            <tbody>
              ${d.team.editors.map(e => `<tr><td><strong>${e.name}</strong></td><td>${e.total_edits || 0}</td><td>${e.completed || 0}</td></tr>`).join('') || '<tr><td colspan="3" class="text-center text-muted">No data</td></tr>'}
            </tbody></table>
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header">
          <div class="card-title" style="display:flex;align-items:center;gap:6px">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            Recent Projects
          </div>
        </div>
        <div class="table-wrap">
          <table><thead><tr><th>Project ID</th><th>Client</th><th>Package</th><th>Shoot Date</th><th>Delivery</th><th>Status</th></tr></thead>
          <tbody>
            ${d.recent_projects.map(p => `
              <tr style="cursor:pointer" onclick="navigate('projects')">
                <td><strong>${p.project_id}</strong></td>
                <td>${p.client_name || '—'} <br><span class="text-sm text-muted">${p.business_name || ''}</span></td>
                <td>${p.package || '—'}</td>
                <td>${fmtDate(p.shoot_date)}</td>
                <td>${fmtDate(p.delivery_date)}</td>
                <td>${statusBadge(p.status)}</td>
              </tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted">No projects yet</td></tr>'}
          </tbody></table>
        </div>
      </div>`;
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--red-500)"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <p>${err.message}</p>
      </div>`;
  }
});
