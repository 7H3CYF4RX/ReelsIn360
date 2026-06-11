// ===== LEADS PAGE =====
register('leads', async (container) => {
  document.getElementById('topbar-actions').innerHTML =
    `<button class="btn btn-primary btn-sm" id="btn-new-lead">+ New Lead</button>`;
  document.getElementById('btn-new-lead').onclick = showCreateLeadModal;

  const stages = [
    { key: 'new_lead', label: 'New Lead', color: '#94a3b8' },
    { key: 'contacted', label: 'Contacted', color: '#06b6d4' },
    { key: 'requirement_collected', label: 'Req. Collected', color: '#8b5cf6' },
    { key: 'quotation_sent', label: 'Quotation Sent', color: '#f59e0b' },
    { key: 'follow_up', label: 'Follow-up', color: '#f97316' },
    { key: 'won', label: 'Won', color: '#10b981' },
    { key: 'lost', label: 'Lost', color: '#ef4444' },
  ];

  try {
    const { data: leads } = await apiRequest('/leads?limit=200');
    const byStage = {};
    stages.forEach(s => { byStage[s.key] = []; });
    leads.forEach(l => { if (byStage[l.status] !== undefined) byStage[l.status].push(l); });

    container.innerHTML = `
      <div style="margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap">
        <input id="leads-search" type="text" class="form-control" placeholder="Search leads..." style="max-width:260px"/>
      </div>
      <div class="kanban-board" id="kanban-board">
        ${stages.map(s => `
          <div class="kanban-col" data-stage="${s.key}">
            <div class="kanban-col-header">
              <span class="kanban-col-title" style="color:${s.color}">${s.label}</span>
              <span class="kanban-col-count">${byStage[s.key].length}</span>
            </div>
            <div class="kanban-cards" id="col-${s.key}">
              ${byStage[s.key].map(l => renderLeadCard(l)).join('') || '<div class="text-center text-muted text-sm" style="padding:12px">Empty</div>'}
            </div>
          </div>`).join('')}
      </div>`;

    container.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', () => showLeadDetail(card.dataset.id));
    });

    document.getElementById('leads-search').addEventListener('input', async (e) => {
      const q = e.target.value.trim();
      if (q.length < 2 && q.length > 0) return;
      const { data } = await apiRequest(`/leads?search=${encodeURIComponent(q)}&limit=200`);
      const byS = {};
      stages.forEach(s => { byS[s.key] = []; });
      data.forEach(l => { if (byS[l.status] !== undefined) byS[l.status].push(l); });
      stages.forEach(s => {
        const col = document.getElementById(`col-${s.key}`);
        if (col) col.innerHTML = byS[s.key].map(l => renderLeadCard(l)).join('') || '<div class="text-center text-muted text-sm" style="padding:12px">Empty</div>';
      });
      container.querySelectorAll('.kanban-card').forEach(card => {
        card.addEventListener('click', () => showLeadDetail(card.dataset.id));
      });
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

function renderLeadCard(l) {
  return `<div class="kanban-card" data-id="${l.id}">
    <div class="lead-name">${l.client_name}</div>
    <div class="lead-biz">${l.business_name || '—'}</div>
    <div class="lead-meta">
      ${l.package ? `<span class="badge badge-purple">${l.package}</span>` : ''}
      ${l.budget ? `<span class="badge badge-green">${fmtCurrency(l.budget)}</span>` : ''}
      ${l.source ? `<span class="badge badge-gray">${l.source}</span>` : ''}
    </div>
    <div class="lead-phone" style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;color:var(--text-secondary)">
      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      <span>${l.phone}</span>
    </div>
  </div>`;
}

async function showLeadDetail(id) {
  try {
    const { data: l } = await apiRequest(`/leads/${id}`);
    const { data: users } = await apiRequest('/leads/users');
    const salesUsers = users.filter(u => ['admin','sales'].includes(u.role));
    const stages = ['new_lead','contacted','requirement_collected','quotation_sent','follow_up','won','lost'];
    const stageLabels = ['New Lead','Contacted','Req. Collected','Quotation Sent','Follow-up','Won','Lost'];

    const body = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div><div class="text-sm text-muted">Lead ID</div><strong>${l.lead_id}</strong></div>
        <div><div class="text-sm text-muted">Status</div>${statusBadge(l.status)}</div>
        <div><div class="text-sm text-muted">Client</div><strong>${l.client_name}</strong></div>
        <div><div class="text-sm text-muted">Business</div>${l.business_name || '—'}</div>
        <div><div class="text-sm text-muted">Phone</div>${l.phone}</div>
        <div><div class="text-sm text-muted">Email</div>${l.email || '—'}</div>
        <div><div class="text-sm text-muted">Package</div>${l.package || '—'}</div>
        <div><div class="text-sm text-muted">Budget</div>${fmtCurrency(l.budget)}</div>
        <div><div class="text-sm text-muted">Location</div>${l.location || '—'}</div>
        <div><div class="text-sm text-muted">Source</div>${l.source || '—'}</div>
        <div><div class="text-sm text-muted">Instagram</div>${l.instagram || '—'}</div>
        <div><div class="text-sm text-muted">Assigned To</div>${l.assigned_name || 'Unassigned'}</div>
      </div>

      <div style="margin-bottom:16px">
        <div class="form-label">Move Pipeline Stage</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${stages.map((s, i) => `<button class="btn btn-xs ${l.status === s ? 'btn-primary' : 'btn-secondary'}" onclick="moveLead(${l.id},'${s}')">${stageLabels[i]}</button>`).join('')}
        </div>
      </div>

      ${!l.project_id_created ? `<button class="btn btn-success btn-sm" style="margin-bottom:16px;background-color:var(--green-primary);box-shadow:0 2px 8px rgba(27,107,69,0.2)" onclick="convertLead(${l.id})">Mark as Won & Create Project</button>` : `<div class="badge badge-green" style="margin-bottom:16px">Project Created (${l.project_id_created})</div>`}

      <div style="margin-bottom:16px">
        <div class="form-label">Assign Salesperson</div>
        <div style="display:flex;gap:8px">
          <select id="assign-select" class="form-control" style="flex:1">
            <option value="">Unassigned</option>
            ${salesUsers.map(u => `<option value="${u.id}" ${l.assigned_to == u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-sm" onclick="assignSales(${l.id})">Save</button>
        </div>
      </div>

      <div style="margin-bottom:16px">
        <div class="form-label">Add Note</div>
        <div style="display:flex;gap:8px">
          <input id="new-note" type="text" class="form-control" placeholder="Type a note..."/>
          <button class="btn btn-secondary btn-sm" onclick="addLeadNote(${l.id})">Add</button>
        </div>
        <div style="margin-top:12px;max-height:160px;overflow-y:auto">
          ${l.notes.map(n => `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
            <div class="text-sm text-muted">${n.author || 'Staff'} · ${fmtDate(n.created_at)}</div>
            <div>${n.note}</div>
          </div>`).join('') || '<div class="text-muted text-sm">No notes yet</div>'}
        </div>
      </div>

      <div style="margin-bottom:16px">
        <div class="form-label">Set Follow-up Reminder</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input id="reminder-date" type="datetime-local" class="form-control" style="flex:1"/>
          <input id="reminder-msg" type="text" class="form-control" placeholder="Reminder note..." style="flex:2"/>
          <button class="btn btn-secondary btn-sm" onclick="addReminder(${l.id})">Set</button>
        </div>
      </div>

      <div>
        <div class="form-label">Upload Quotation PDF</div>
        <input type="file" id="quotation-file" accept=".pdf" class="form-control"/>
        <button class="btn btn-secondary btn-sm mt-2" onclick="uploadQuotation(${l.id})">Upload</button>
        ${l.attachments.map(a => `
          <div class="text-sm" style="margin-top:6px;display:flex;align-items:center;gap:6px;color:var(--text-secondary)">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>${a.filename}</span>
          </div>`).join('')}
      </div>`;

    openModal(`Lead: ${l.client_name}`, body);
  } catch (err) { toast(err.message, 'error'); }
}

async function moveLead(id, status) {
  try {
    await apiRequest(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast('Stage updated', 'success');
    closeModal();
    navigate('leads');
  } catch (err) { toast(err.message, 'error'); }
}

async function convertLead(id) {
  if (!confirm('Mark as Won and auto-create Project, Account & Invoice?')) return;
  try {
    const res = await apiRequest(`/projects/leads/${id}/convert`, { method: 'POST' });
    toast(`Project ${res.data.projectId} created!`, 'success');
    closeModal();
    navigate('projects');
  } catch (err) { toast(err.message, 'error'); }
}

async function assignSales(id) {
  const val = document.getElementById('assign-select').value;
  try {
    await apiRequest(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ assigned_to: val || null }) });
    toast('Salesperson assigned', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

async function addLeadNote(id) {
  const note = document.getElementById('new-note').value.trim();
  if (!note) return;
  try {
    await apiRequest(`/leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) });
    toast('Note added', 'success');
    showLeadDetail(id);
  } catch (err) { toast(err.message, 'error'); }
}

async function addReminder(id) {
  const remind_at = document.getElementById('reminder-date').value;
  const message = document.getElementById('reminder-msg').value;
  if (!remind_at) { toast('Select a date/time', 'error'); return; }
  try {
    await apiRequest(`/leads/${id}/reminders`, { method: 'POST', body: JSON.stringify({ remind_at, message }) });
    toast('Reminder set!', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

async function uploadQuotation(id) {
  const file = document.getElementById('quotation-file').files[0];
  if (!file) { toast('Select a PDF', 'error'); return; }
  const fd = new FormData();
  fd.append('file', file);
  try {
    const token = getToken();
    const res = await fetch(`/api/leads/${id}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    toast('Quotation uploaded!', 'success');
    showLeadDetail(id);
  } catch (err) { toast(err.message, 'error'); }
}

function showCreateLeadModal() {
  const body = `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Client Name *</label><input id="nl-name" class="form-control" placeholder="John Doe"/></div>
      <div class="form-group"><label class="form-label">Business Name</label><input id="nl-biz" class="form-control" placeholder="ABC Cafe"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Phone *</label><input id="nl-phone" class="form-control" placeholder="+91 98765 43210"/></div>
      <div class="form-group"><label class="form-label">Email</label><input id="nl-email" type="email" class="form-control"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Instagram</label><input id="nl-ig" class="form-control" placeholder="@handle"/></div>
      <div class="form-group"><label class="form-label">Location</label><input id="nl-loc" class="form-control" placeholder="City"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Package</label>
        <select id="nl-pkg" class="form-control">
          <option value="">Select...</option>
          <option>Starter Package</option>
          <option>Growth Package</option>
          <option>Premium Package</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Budget (₹)</label><input id="nl-budget" type="number" class="form-control"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Source</label>
        <select id="nl-source" class="form-control">
          <option value="">Select...</option>
          <option>Instagram</option><option>Referral</option><option>Walk-in</option>
          <option>Google</option><option>Facebook</option><option>WhatsApp</option><option>Other</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea id="nl-notes" class="form-control"></textarea></div>`;

  openModal('New Lead', body, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitNewLead()">Create Lead</button>`);
}

async function submitNewLead() {
  const payload = {
    client_name: document.getElementById('nl-name').value.trim(),
    business_name: document.getElementById('nl-biz').value.trim(),
    phone: document.getElementById('nl-phone').value.trim(),
    email: document.getElementById('nl-email').value.trim(),
    instagram: document.getElementById('nl-ig').value.trim(),
    location: document.getElementById('nl-loc').value.trim(),
    package: document.getElementById('nl-pkg').value,
    budget: document.getElementById('nl-budget').value || null,
    source: document.getElementById('nl-source').value,
    notes: document.getElementById('nl-notes').value.trim(),
  };
  if (!payload.client_name || !payload.phone) { toast('Name and phone are required', 'error'); return; }
  try {
    await apiRequest('/leads', { method: 'POST', body: JSON.stringify(payload) });
    toast('Lead created!', 'success');
    closeModal();
    navigate('leads');
  } catch (err) { toast(err.message, 'error'); }
}
