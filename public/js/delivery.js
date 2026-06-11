// ===== DELIVERY PAGE =====
register('delivery', async (container) => {
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-secondary btn-sm" id="btn-view-invoices" onclick="showInvoicesModal()" style="display:inline-flex;align-items:center;gap:6px">
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      Invoices
    </button>`;

  try {
    const [{ data: projects }, { data: deliveries }] = await Promise.all([
      apiRequest('/projects?status=approved'),
      apiRequest('/delivery').catch(() => ({ data: [] })),
    ]);

    const { data: allProjects } = await apiRequest('/projects?limit=200');

    container.innerHTML = `
      <div class="grid-2 mb-4">
        <div class="card">
          <div class="card-header">
            <div class="card-title" style="display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Record Delivery
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Select Project</label>
            <select id="delivery-project" class="form-control">
              <option value="">Choose project...</option>
              ${allProjects.filter(p => !['pending','planning','assigned','shoot_scheduled','cancelled'].includes(p.status))
                .map(p => `<option value="${p.id}">${p.project_id} — ${p.client_name || '?'} (${p.status})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Delivery Method</label>
            <select id="delivery-method" class="form-control">
              <option value="">Select...</option>
              <option value="google_drive">Google Drive</option>
              <option value="dropbox">Dropbox</option>
              <option value="wetransfer">WeTransfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Delivery Link</label>
            <input id="delivery-link" type="url" class="form-control" placeholder="https://drive.google.com/..."/>
          </div>
          <div class="form-group">
            <label class="form-label">Notes (optional)</label>
            <textarea id="delivery-notes" class="form-control" rows="2" placeholder="Any notes for the client..."></textarea>
          </div>
          <button class="btn btn-primary w-full" onclick="submitDelivery()">Record Delivery</button>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title" style="display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Deliverables Checklist
            </div>
          </div>
          <div class="text-muted text-sm" style="margin-bottom:12px">Standard deliverables per project:</div>
          ${['Final Reels','Cover Images','Raw Footage (if included)','Poster Designs','BTS Content'].map(item => `
            <div class="checklist-item">
              <div class="checklist-box" onclick="this.classList.toggle('checked')"></div>
              <span class="checklist-label">${item}</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div class="card-title" style="display:flex;align-items:center;gap:6px">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Delivery History
          </div>
          <div style="position:relative;width:250px">
            <input type="text" id="delivery-search" class="form-control form-control-sm" placeholder="Search project, client, or method..." style="padding-left:32px"/>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Project</th><th>Client</th><th>Method</th><th>Link</th><th>Delivered</th></tr></thead>
            <tbody>
              ${deliveries && deliveries.length ? deliveries.map(d => `
                <tr class="delivery-row" data-search="${d.project_id} ${d.client_name || ''} ${d.delivery_method}">
                  <td><strong style="color:var(--purple-400)">${d.project_id}</strong></td>
                  <td>${d.client_name || '—'}</td>
                  <td><span class="badge badge-cyan">${d.delivery_method.replace(/_/g,' ')}</span></td>
                  <td><a href="${d.delivery_link}" target="_blank" style="color:var(--purple-400);font-size:12px">Open Link ↗</a></td>
                  <td>${fmtDate(d.delivered_at)}</td>
                </tr>`).join('') : ''}
              <tr id="delivery-empty-row" style="display: ${deliveries && deliveries.length ? 'none' : ''}">
                <td colspan="5" class="text-center text-muted">No deliveries found</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;

    const searchInput = document.getElementById('delivery-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const rows = container.querySelectorAll('.delivery-row');
        let visibleCount = 0;

        rows.forEach(row => {
          const text = row.dataset.search.toLowerCase();
          if (text.includes(q)) {
            row.style.display = '';
            visibleCount++;
          } else {
            row.style.display = 'none';
          }
        });

        const emptyRow = container.querySelector('#delivery-empty-row');
        if (emptyRow) {
          emptyRow.style.display = visibleCount === 0 ? '' : 'none';
        }
      });
    }
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

async function submitDelivery() {
  const project_id = document.getElementById('delivery-project').value;
  const delivery_link = document.getElementById('delivery-link').value.trim();
  const delivery_method = document.getElementById('delivery-method').value;
  const notes = document.getElementById('delivery-notes').value.trim();

  if (!project_id || !delivery_link || !delivery_method) {
    toast('Project, link, and method are required', 'error'); return;
  }
  try {
    await apiRequest(`/delivery/projects/${project_id}`, {
      method: 'POST',
      body: JSON.stringify({ delivery_link, delivery_method, notes }),
    });
    toast('Delivery recorded! Project marked as Delivered', 'success');
    navigate('delivery');
  } catch (err) { toast(err.message, 'error'); }
}

async function showInvoicesModal() {
  try {
    const { data: invoices } = await apiRequest('/delivery/invoices');
    const body = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Invoice</th><th>Project</th><th>Client</th><th>Amount</th><th>Due</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${invoices.map(inv => `
              <tr>
                <td><strong>${inv.invoice_number}</strong></td>
                <td>${inv.project_id || '—'}</td>
                <td>${inv.client_name || '—'}</td>
                <td style="font-weight:700">${fmtCurrency(inv.amount)}</td>
                <td>${fmtDate(inv.due_date)}</td>
                <td>${statusBadge(inv.status)}</td>
                <td>
                  <div style="display:flex;gap:6px;align-items:center">
                    ${inv.status !== 'paid' ? `<button class="btn btn-xs btn-success" onclick="markPaid(${inv.id})">Mark Paid</button>` : '<span class="badge badge-green">Paid</span>'}
                    <button class="btn btn-xs btn-secondary" onclick="window.open('/invoice.html?id=${inv.id}', '_blank')" style="display:inline-flex;align-items:center;gap:4px">
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      PDF
                    </button>
                  </div>
                </td>
              </tr>`).join('') || '<tr><td colspan="7" class="text-center text-muted">No invoices</td></tr>'}
          </tbody>
        </table>
      </div>`;
    openModal('Invoices', body);
  } catch (err) { toast(err.message, 'error'); }
}

async function markPaid(id) {
  try {
    await apiRequest(`/delivery/invoices/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) });
    toast('Invoice marked as paid!', 'success');
    showInvoicesModal();
  } catch (err) { toast(err.message, 'error'); }
}
