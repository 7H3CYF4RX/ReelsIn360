// ===== PROJECTS PAGE =====
register('projects', async (container) => {
  document.getElementById('topbar-actions').innerHTML = `
    <select id="proj-filter" class="form-control" style="width:160px">
      <option value="">All Projects</option>
      <option value="pending">Pending</option>
      <option value="planning">Planning</option>
      <option value="assigned">Assigned</option>
      <option value="shoot_scheduled">Shoot Scheduled</option>
      <option value="shoot_completed">Shoot Completed</option>
      <option value="delivered">Delivered</option>
    </select>`;

  async function load(status = '') {
    container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
    try {
      const { data: projects } = await apiRequest(`/projects${status ? `?status=${status}` : ''}`);

      if (!projects.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p>No projects found</p>
            <p class="text-sm">Mark a lead as Won to auto-create a project</p>
          </div>`;
        return;
      }

      container.innerHTML = `
        <div class="grid-auto" id="projects-grid">
          ${projects.map(p => renderProjectCard(p)).join('')}
        </div>`;

      container.querySelectorAll('.proj-card').forEach(card => {
        card.addEventListener('click', () => showProjectDetail(card.dataset.id));
      });
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--red-500)"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <p>${err.message}</p>
        </div>`;
    }
  }

  await load();
  document.getElementById('proj-filter').addEventListener('change', e => load(e.target.value));
});

function renderProjectCard(p) {
  const progress = { pending: 10, planning: 25, assigned: 40, shoot_scheduled: 55, shoot_completed: 70, footage_uploaded: 80, delivered: 100 };
  const pct = progress[p.status] || 10;
  return `<div class="card proj-card" data-id="${p.id}" style="cursor:pointer">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
      <div>
        <div style="font-size:12px;color:var(--purple-400);font-weight:700">${p.project_id}</div>
        <div style="font-size:16px;font-weight:700;margin-top:2px">${p.client_name || '—'}</div>
        <div class="text-sm text-muted">${p.business_name || ''}</div>
      </div>
      ${statusBadge(p.status)}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div><div class="text-sm text-muted">Package</div><div style="font-weight:600;font-size:13px">${p.package || '—'}</div></div>
      <div><div class="text-sm text-muted">Reels</div><div style="font-weight:600;font-size:13px">${p.reels_count || 1}</div></div>
      <div><div class="text-sm text-muted">Shoot Date</div><div style="font-size:13px">${fmtDate(p.shoot_date)}</div></div>
      <div><div class="text-sm text-muted">Delivery</div><div style="font-size:13px">${fmtDate(p.delivery_date)}</div></div>
    </div>
    <div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span class="text-sm text-muted">Progress</span><span class="text-sm">${pct}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
      ${p.shooter_name ? `<span class="badge badge-cyan" style="display:inline-flex;align-items:center;gap:4px"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h10a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> ${p.shooter_name}</span>` : '<span class="badge badge-gray">No Shooter</span>'}
      ${p.editor_name ? `<span class="badge badge-purple" style="display:inline-flex;align-items:center;gap:4px"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg> ${p.editor_name}</span>` : ''}
    </div>
  </div>`;
}

async function showProjectDetail(id) {
  try {
    const { data: p } = await apiRequest(`/projects/${id}`);
    const reviewUrl = p.approval?.review_token
      ? `${window.location.origin}/client-review.html?token=${p.approval.review_token}` : null;

    const body = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div><div class="text-sm text-muted">Project ID</div><strong style="color:var(--purple-400)">${p.project_id}</strong></div>
        <div><div class="text-sm text-muted">Status</div>${statusBadge(p.status)}</div>
        <div><div class="text-sm text-muted">Client</div><strong>${p.client_name}</strong></div>
        <div><div class="text-sm text-muted">Package</div>${p.package || '—'}</div>
        <div><div class="text-sm text-muted">Shoot Date</div>
          <input type="date" id="pd-shoot" class="form-control" value="${p.shoot_date || ''}" style="margin-top:4px"/>
        </div>
        <div><div class="text-sm text-muted">Delivery Date</div>
          <input type="date" id="pd-delivery" class="form-control" value="${p.delivery_date || ''}" style="margin-top:4px"/>
        </div>
        <div><div class="text-sm text-muted">Reels Count</div><input type="number" id="pd-reels" class="form-control" value="${p.reels_count || 1}" style="margin-top:4px"/></div>
        <div><div class="text-sm text-muted">Shooter</div><strong>${p.shooter_name || 'Unassigned'}</strong></div>
      </div>
      <button class="btn btn-primary btn-sm mb-4" onclick="saveProjectDates(${p.id})">Save Changes</button>

      <div class="form-label" style="margin-bottom:8px">Project Checklist</div>
      <div style="margin-bottom:20px">
        ${p.checklist.map(item => `
          <div class="checklist-item">
            <div class="checklist-box ${item.completed ? 'checked' : ''}" data-key="${item.item_key}"></div>
            <span class="checklist-label ${item.completed ? 'checked' : ''}">${item.item_label}</span>
          </div>`).join('')}
      </div>

      ${reviewUrl ? `
        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:16px">
          <div class="text-sm text-muted" style="margin-bottom:6px;display:flex;align-items:center;gap:6px">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <span>Client Review Link</span>
          </div>
          <div style="font-size:12px;word-break:break-all;color:var(--purple-400)">${reviewUrl}</div>
          <button class="btn btn-xs btn-secondary mt-2" onclick="navigator.clipboard.writeText('${reviewUrl}');toast('Link copied!','success')">Copy Link</button>
        </div>` : ''}

      <div class="form-label">Uploads (${p.uploads.length})</div>
      <div style="max-height:160px;overflow-y:auto;margin-bottom:16px">
        ${p.uploads.length ? p.uploads.map(u => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
            <span class="text-sm">${u.filename}</span>
            <span class="badge badge-gray">${u.upload_type}</span>
          </div>`).join('') : '<div class="text-muted text-sm">No uploads yet</div>'}
      </div>

      <div class="form-label">Invoice</div>
      ${p.invoice ? `
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-secondary);padding:12px;border-radius:10px">
          <div>
            <div style="font-weight:600">${p.invoice.invoice_number}</div>
            <div class="text-sm text-muted">Due: ${fmtDate(p.invoice.due_date)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:18px;font-weight:800">${fmtCurrency(p.invoice.amount)}</div>
            ${statusBadge(p.invoice.status)}
          </div>
        </div>` : '<div class="text-muted text-sm">No invoice</div>'}`;

    openModal(`Project: ${p.project_id}`, body);

    document.querySelectorAll('.checklist-box').forEach(box => {
      box.addEventListener('click', async () => {
        const completed = !box.classList.contains('checked');
        try {
          await apiRequest(`/operations/projects/${id}/checklist`, {
            method: 'PATCH', body: JSON.stringify({ item_key: box.dataset.key, completed }),
          });
          box.classList.toggle('checked', completed);
          const label = box.nextElementSibling;
          if (label) label.classList.toggle('checked', completed);
          toast('Checklist updated', 'success');
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  } catch (err) { toast(err.message, 'error'); }
}

async function saveProjectDates(id) {
  try {
    await apiRequest(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        shoot_date: document.getElementById('pd-shoot').value || null,
        delivery_date: document.getElementById('pd-delivery').value || null,
        reels_count: parseInt(document.getElementById('pd-reels').value) || 1,
      }),
    });
    toast('Project updated!', 'success');
    navigate('projects');
    closeModal();
  } catch (err) { toast(err.message, 'error'); }
}

// ===== OPERATIONS PAGE =====
register('operations', async (container) => {
  document.getElementById('topbar-actions').innerHTML = `
    <select id="ops-filter" class="form-control" style="width:160px">
      <option value="">All Status</option>
      <option value="pending">Pending</option>
      <option value="planning">Planning</option>
      <option value="assigned">Assigned</option>
      <option value="shoot_scheduled">Shoot Scheduled</option>
      <option value="shoot_completed">Shoot Completed</option>
    </select>`;

  async function load(status = '') {
    try {
      const [{ data: projects }, { data: team }] = await Promise.all([
        apiRequest(`/operations/projects${status ? `?status=${status}` : ''}`),
        apiRequest('/operations/team'),
      ]);

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div class="card-title" style="display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
              Operations — ${projects.length} Projects
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Project</th><th>Client</th><th>Package</th><th>Shoot Date</th><th>Status</th><th>Shooter</th><th>Editor</th><th>Actions</th></tr></thead>
              <tbody>
                ${projects.map(p => `
                  <tr>
                    <td><strong style="color:var(--purple-400)">${p.project_id}</strong></td>
                    <td>${p.client_name || '—'}<br><span class="text-sm text-muted">${p.business_name || ''}</span></td>
                    <td>${p.package || '—'}</td>
                    <td>${fmtDate(p.shoot_date)}</td>
                    <td>${statusBadge(p.status)}</td>
                    <td>${p.shooter_name || '<span class="text-muted">—</span>'}</td>
                    <td>${p.editor_name || '<span class="text-muted">—</span>'}</td>
                    <td>
                      <button class="btn btn-xs btn-secondary" onclick="showOpsAssign(${p.id},'${p.project_id}',${JSON.stringify(team).replace(/"/g,'&quot;')}, ${p.assigned_shooter || 'null'}, ${p.assigned_editor || 'null'}, ${p.assigned_designer || 'null'}, '${p.design_type || ''}')">Assign</button>
                      <button class="btn btn-xs btn-secondary" onclick="showStatusUpdate(${p.id},'${p.status}')">Status</button>
                    </td>
                  </tr>`).join('') || '<tr><td colspan="8" class="text-center text-muted">No projects</td></tr>'}
              </tbody>
            </table>
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
  }

  await load();
  document.getElementById('ops-filter').addEventListener('change', e => load(e.target.value));
});

function showOpsAssign(projectId, projectCode, team, shooterId = null, editorId = null, designerId = null, designType = '') {
  const body = `
    <div class="form-group"><label class="form-label">Shooter</label>
      <select id="assign-shooter" class="form-control">
        <option value="">Unassigned</option>
        ${team.shooters.map(s => `<option value="${s.id}" ${shooterId == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Editor</label>
      <select id="assign-editor" class="form-control">
        <option value="">Unassigned</option>
        ${team.editors.map(e => `<option value="${e.id}" ${editorId == e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Designer</label>
      <select id="assign-designer" class="form-control">
        <option value="">Unassigned</option>
        ${team.designers.map(d => `<option value="${d.id}" ${designerId == d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Design Type</label>
      <select id="assign-design-type" class="form-control">
        <option value="" ${!designType ? 'selected' : ''}>None</option>
        <option ${designType === 'Thumbnail' ? 'selected' : ''}>Thumbnail</option>
        <option ${designType === 'Poster' ? 'selected' : ''}>Poster</option>
        <option ${designType === 'Motion Graphics' ? 'selected' : ''}>Motion Graphics</option>
      </select>
    </div>`;

  openModal(`Assign Team — ${projectCode}`, body, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitAssign(${projectId})">Assign Team</button>`);
}

async function submitAssign(id) {
  const payload = {
    assigned_shooter: document.getElementById('assign-shooter').value || null,
    assigned_editor: document.getElementById('assign-editor').value || null,
    assigned_designer: document.getElementById('assign-designer').value || null,
    design_type: document.getElementById('assign-design-type').value || null,
  };
  try {
    await apiRequest(`/operations/projects/${id}/assign`, { method: 'POST', body: JSON.stringify(payload) });
    toast('Team assigned!', 'success');
    closeModal();
    navigate('operations');
  } catch (err) { toast(err.message, 'error'); }
}

function showStatusUpdate(projectId, current) {
  const statuses = ['pending','planning','assigned','shoot_scheduled','shoot_completed'];
  const labels = ['Pending','Planning','Assigned','Shoot Scheduled','Shoot Completed'];
  const body = `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${statuses.map((s, i) => `
        <button class="btn ${current === s ? 'btn-primary' : 'btn-secondary'}" onclick="updateOpsStatus(${projectId},'${s}')">
          ${current === s ? '● ' : '○ '}${labels[i]}
        </button>`).join('')}
    </div>`;
  openModal('Update Status', body);
}

async function updateOpsStatus(id, status) {
  try {
    await apiRequest(`/operations/projects/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast('Status updated!', 'success');
    closeModal();
    navigate('operations');
  } catch (err) { toast(err.message, 'error'); }
}
