// ===== SHOOTER PAGE =====
register('shooter', async (container) => {
  try {
    const { data: projects } = await apiRequest('/shooter/projects');

    if (!projects.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h10a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <p>No shoots assigned to you yet</p>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="grid-auto">${projects.map(p => renderShooterCard(p)).join('')}</div>`;
    container.querySelectorAll('.shooter-card').forEach(card => {
      card.addEventListener('click', () => showShooterProject(card.dataset.id));
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
});

function renderShooterCard(p) {
  const statusColors = { assigned: 'badge-gray', travelling: 'badge-yellow', shoot_started: 'badge-orange', shoot_completed: 'badge-green', footage_uploaded: 'badge-green' };
  return `<div class="card shooter-card" data-id="${p.id}" style="cursor:pointer">
    <div style="display:flex;justify-content:space-between;margin-bottom:12px">
      <div>
        <div style="font-size:12px;color:var(--purple-400);font-weight:700">${p.project_id}</div>
        <div style="font-size:16px;font-weight:700;margin-top:2px">${p.client_name || '—'}</div>
        <div class="text-sm text-muted">${p.business_name || ''}</div>
      </div>
      ${statusBadge(p.status)}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <span class="badge badge-gray" style="display:inline-flex;align-items:center;gap:4px">
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${fmtDate(p.shoot_date)}
      </span>
      <span class="badge badge-purple">${p.package || '—'}</span>
      <span class="badge badge-cyan">${p.reels_count || 1} Reels</span>
    </div>
    ${p.client_phone ? `<div class="text-sm text-muted" style="display:inline-flex;align-items:center;gap:4px"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${p.client_phone}</div>` : ''}
  </div>`;
}

async function showShooterProject(id) {
  try {
    const { data: p } = await apiRequest(`/shooter/projects/${id}`);
    const statuses = ['assigned','travelling','shoot_started','shoot_completed','footage_uploaded'];
    const statusLabels = ['Assigned','Travelling','Shoot Started','Shoot Completed','Footage Uploaded'];
    const currentIdx = statuses.indexOf(p.status);

    const body = `
      <div style="margin-bottom:20px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><div class="text-sm text-muted">Project</div><strong style="color:var(--purple-400)">${p.project_id}</strong></div>
          <div><div class="text-sm text-muted">Package</div>${p.package || '—'}</div>
          <div><div class="text-sm text-muted">Client</div><strong>${p.client_name}</strong></div>
          <div><div class="text-sm text-muted">Phone</div>${p.client_phone || '—'}</div>
          <div><div class="text-sm text-muted">Shoot Date</div>${fmtDate(p.shoot_date)}</div>
          <div><div class="text-sm text-muted">Reels</div>${p.reels_count}</div>
        </div>
      </div>

      <div class="form-label">Status Flow</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">
        ${statuses.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const next = i === currentIdx + 1;
          return `<button class="btn ${active ? 'btn-primary' : done ? 'btn-success' : 'btn-secondary'} w-full"
            ${!next ? 'disabled' : ''} onclick="updateShooterStatus(${p.id},'${s}')">
            ${done ? '✓' : active ? '▶' : '○'} ${statusLabels[i]}
          </button>`;
        }).join('')}
      </div>

      <div class="form-label">Upload Files</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[
          { type: 'raw_footage', label: 'Raw Footage', icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted);vertical-align:middle;margin-right:4px"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' },
          { type: 'bts_photos', label: 'BTS Photos', icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted);vertical-align:middle;margin-right:4px"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h10a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' },
          { type: 'client_approval_photo', label: 'Client Approval Photo', icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted);vertical-align:middle;margin-right:4px"><polyline points="20 6 9 17 4 12"/></svg>' },
        ].map(u => `
          <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:14px">
            <div style="font-weight:600;margin-bottom:8px;display:flex;align-items:center">${u.icon} ${u.label}</div>
            <input type="file" id="file-${u.type}" accept="${u.accept || '*'}" capture="environment" class="form-control" style="margin-bottom:6px"/>
            <button class="btn btn-secondary btn-sm w-full" onclick="submitShooterUpload(${p.id},'${u.type}')">Upload</button>
          </div>`).join('')}
      </div>

      <div class="form-label" style="margin-top:16px">Previous Uploads (${p.uploads.length})</div>
      ${p.uploads.map(u => `
        <div class="text-sm" style="padding:6px 0;display:flex;align-items:center;gap:6px;color:var(--text-secondary);border-bottom:1px solid var(--border)">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          <span>${u.filename}</span>
          <span class="badge badge-gray" style="margin-left:auto">${u.upload_type}</span>
        </div>`).join('') || '<div class="text-muted text-sm">No uploads</div>'}`;

    openModal(`Shoot: ${p.project_id}`, body);
  } catch (err) { toast(err.message, 'error'); }
}

async function updateShooterStatus(id, status) {
  try {
    await apiRequest(`/shooter/projects/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast(`Status: ${status.replace(/_/g,' ')}`, 'success');
    closeModal();
    navigate('shooter');
  } catch (err) { toast(err.message, 'error'); }
}

async function submitShooterUpload(projectId, uploadType) {
  const fileInput = document.getElementById(`file-${uploadType}`);
  const file = fileInput?.files[0];
  if (!file) { toast('Select a file first', 'error'); return; }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_type', uploadType);
  try {
    const res = await fetch(`/api/shooter/projects/${projectId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    toast('File uploaded!', 'success');
    showShooterProject(projectId);
  } catch (err) { toast(err.message, 'error'); }
}

// ===== EDITING PAGE =====
register('editing', async (container) => {
  try {
    const { data: projects } = await apiRequest('/editing/projects');

    const editStages = ['pending','editing_started','first_draft','internal_review','client_review','revision','approved','delivered'];

    if (!projects.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
          </div>
          <p>No editing projects yet</p>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="grid-auto">${projects.map(p => renderEditCard(p)).join('')}</div>`;
    container.querySelectorAll('.edit-card').forEach(card => {
      card.addEventListener('click', () => showEditDetail(card.dataset.id));
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
});

function renderEditCard(p) {
  const editStatus = p.edit_status || 'pending';
  const stages = ['pending','editing_started','first_draft','internal_review','client_review','revision','approved','delivered'];
  const pct = Math.round(((stages.indexOf(editStatus) + 1) / stages.length) * 100);
  return `<div class="card edit-card" data-id="${p.id}" style="cursor:pointer">
    <div style="display:flex;justify-content:space-between;margin-bottom:10px">
      <div>
        <div style="font-size:12px;color:var(--purple-400);font-weight:700">${p.project_id}</div>
        <div style="font-size:15px;font-weight:700">${p.client_name || '—'}</div>
        <div class="text-sm text-muted">${p.package || '—'}</div>
      </div>
      ${statusBadge(editStatus)}
    </div>
    <div class="progress-bar" style="margin-bottom:8px"><div class="progress-fill" style="width:${pct}%"></div></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      <span class="badge badge-gray">Revisions: ${p.revision_count || 0}/${p.max_revisions || 1}</span>
      <span class="badge ${p.approval_status === 'approved' ? 'badge-green' : p.approval_status === 'revision_requested' ? 'badge-red' : 'badge-gray'}">${p.approval_status || 'pending'}</span>
    </div>
  </div>`;
}

async function showEditDetail(id) {
  try {
    const { data: p } = await apiRequest(`/editing/projects/${id}`);
    const editStages = ['pending','editing_started','first_draft','internal_review','client_review','revision','approved','delivered'];
    const editLabels = ['Pending','Editing Started','First Draft','Internal Review','Client Review','Revision','Approved','Delivered'];
    const current = p.edit_status || 'pending';
    const currentIdx = editStages.indexOf(current);

    const body = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div><div class="text-sm text-muted">Project</div><strong style="color:var(--purple-400)">${p.project_id}</strong></div>
        <div><div class="text-sm text-muted">Client</div><strong>${p.client_name}</strong></div>
        <div><div class="text-sm text-muted">Revisions</div>${p.revision_count || 0} / ${p.max_revisions || 1}</div>
        <div><div class="text-sm text-muted">Approval</div>${statusBadge(p.approval_status)}</div>
      </div>

      ${p.review_url ? `
        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:16px">
          <div class="text-sm text-muted mb-2" style="display:flex;align-items:center;gap:6px">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <span>Client Review Link</span>
          </div>
          <div style="font-size:11px;word-break:break-all;color:var(--purple-400)">${p.review_url}</div>
          <button class="btn btn-xs btn-secondary mt-2" onclick="navigator.clipboard.writeText('${p.review_url}');toast('Link copied!','success')">Copy Link</button>
        </div>` : ''}

      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px">
        ${editStages.map((s, i) => `
          <button class="btn btn-xs ${current === s ? 'btn-primary' : 'btn-secondary'}" onclick="advanceEditStage(${p.id},'${s}')">
            ${i < currentIdx ? '✓' : ''} ${editLabels[i]}
          </button>`).join('')}
      </div>

      <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:16px">
        <div class="form-label" style="margin-bottom:8px">Upload Project File</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <div style="flex:1;min-width:140px">
              <select id="editor-upload-type" class="form-control" style="height:38px">
                <option value="draft_video">Draft Video</option>
                <option value="final_video">Final Video</option>
                <option value="cover_image">Cover Image</option>
                <option value="raw_files">Raw Files</option>
              </select>
            </div>
            <div style="flex:2;min-width:200px">
              <input type="file" id="editor-upload-file" class="form-control" style="height:38px;padding:6px 12px"/>
            </div>
          </div>
          <button class="btn btn-primary btn-sm w-full" onclick="submitEditorUpload(${p.id})">Upload File</button>
        </div>
      </div>

      <div class="form-label">Uploaded Files</div>
      ${p.uploads.map(u => `
        <div style="padding:6px 0;font-size:13px;color:var(--text-secondary);display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border)">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          <span>${u.filename}</span>
          <span class="badge badge-gray" style="margin-left:auto">${u.upload_type}</span>
        </div>`).join('') || '<div class="text-muted text-sm">No uploads yet</div>'}`;

    openModal(`Editing: ${p.project_id}`, body);
  } catch (err) { toast(err.message, 'error'); }
}

async function advanceEditStage(id, status) {
  try {
    await apiRequest(`/editing/projects/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast(`Stage: ${status.replace(/_/g,' ')}`, 'success');
    showEditDetail(id);
  } catch (err) { toast(err.message, 'error'); }
}

async function submitEditorUpload(projectId) {
  const uploadType = document.getElementById('editor-upload-type').value;
  const fileInput = document.getElementById('editor-upload-file');
  const file = fileInput?.files[0];
  if (!file) { toast('Please select a file first', 'error'); return; }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_type', uploadType);
  try {
    const res = await fetch(`/api/editing/projects/${projectId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    toast('File uploaded!', 'success');
    showEditDetail(projectId);
  } catch (err) { toast(err.message, 'error'); }
}
