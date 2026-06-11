// ===== USER MANAGEMENT PAGE =====
let allUsers = [];

register('users', async (container) => {
  try {
    const { data: users } = await apiRequest('/operations/users');
    allUsers = users;

    container.innerHTML = `
      <div class="grid-2 mb-4">
        <!-- Create User Form Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title" style="display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Add New User
            </div>
          </div>
          <form id="create-user-form" onsubmit="submitCreateUser(event)">
            <div class="form-group">
              <label class="form-label" for="user-name-input">Full Name</label>
              <input id="user-name-input" type="text" class="form-control" placeholder="e.g. Rahul Sharma" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="user-email-input">Email Address</label>
              <input id="user-email-input" type="email" class="form-control" placeholder="e.g. rahul@reels360.in" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="user-role-input">Role</label>
              <select id="user-role-input" class="form-control" required>
                <option value="">Choose role...</option>
                <option value="admin">Admin</option>
                <option value="operations">Operations</option>
                <option value="sales">Sales</option>
                <option value="shooter">Shooter</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="user-password-input">Password</label>
              <input id="user-password-input" type="password" class="form-control" placeholder="••••••••" required />
            </div>
            <button type="submit" class="btn btn-primary w-full" style="justify-content:center;margin-top:16px">Create User Account</button>
          </form>
        </div>

        <!-- Team Members List Card -->
        <div class="card">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <div class="card-title" style="display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green-primary)"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Active Team
            </div>
            <div style="position:relative;width:220px">
              <input type="text" id="user-search" class="form-control form-control-sm" placeholder="Search team..." style="padding-left:32px"/>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => {
                  const roleBadges = {
                    admin: 'badge-red',
                    operations: 'badge-purple',
                    sales: 'badge-cyan',
                    shooter: 'badge-yellow',
                    editor: 'badge-green'
                  };
                  const badgeCls = roleBadges[u.role] || 'badge-gray';
                  return `
                    <tr class="user-row" data-search="${u.name} ${u.email} ${u.role}">
                      <td>
                        <div style="display:flex;align-items:center;gap:8px">
                          <div class="user-avatar" style="width:28px;height:28px;font-size:12px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;background:var(--bg-secondary);border:1px solid var(--border)">
                            ${u.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div style="font-weight:600">${u.name}</div>
                            <div class="text-xs text-muted">${u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span class="badge ${badgeCls}">${u.role.toUpperCase()}</span></td>
                      <td><span class="text-sm text-muted">${fmtDate(u.created_at)}</span></td>
                      <td>
                        <button class="btn btn-xs btn-secondary" onclick="editUserModal(${u.id})" style="display:inline-flex;align-items:center;gap:4px">
                          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          Edit
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
                <tr id="user-empty-row" style="display:none">
                  <td colspan="4" class="text-center text-muted">No users match search</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const searchInput = document.getElementById('user-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const rows = container.querySelectorAll('.user-row');
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

        const emptyRow = container.querySelector('#user-empty-row');
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

async function submitCreateUser(event) {
  event.preventDefault();

  const name = document.getElementById('user-name-input').value.trim();
  const email = document.getElementById('user-email-input').value.trim();
  const role = document.getElementById('user-role-input').value;
  const password = document.getElementById('user-password-input').value;

  if (!name || !email || !role || !password) {
    toast('All fields are required', 'error');
    return;
  }

  try {
    const data = await apiRequest('/operations/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, role, password })
    });

    toast('User created successfully!', 'success');
    navigate('users');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function editUserModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) {
    toast('User not found', 'error');
    return;
  }

  const bodyHtml = `
    <form id="edit-user-form" onsubmit="submitEditUser(event, ${user.id})">
      <div class="form-group">
        <label class="form-label" for="edit-user-name">Full Name</label>
        <input id="edit-user-name" type="text" class="form-control" value="${user.name}" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="edit-user-email">Email Address</label>
        <input id="edit-user-email" type="email" class="form-control" value="${user.email}" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="edit-user-role">Role</label>
        <select id="edit-user-role" class="form-control" required>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="operations" ${user.role === 'operations' ? 'selected' : ''}>Operations</option>
          <option value="sales" ${user.role === 'sales' ? 'selected' : ''}>Sales</option>
          <option value="shooter" ${user.role === 'shooter' ? 'selected' : ''}>Shooter</option>
          <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>Editor</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="edit-user-password">Password (Optional)</label>
        <input id="edit-user-password" type="password" class="form-control" placeholder="Leave blank to keep current password" />
      </div>
      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  `;

  openModal('Edit User Profile', bodyHtml);
}

async function submitEditUser(event, userId) {
  event.preventDefault();

  const name = document.getElementById('edit-user-name').value.trim();
  const email = document.getElementById('edit-user-email').value.trim();
  const role = document.getElementById('edit-user-role').value;
  const password = document.getElementById('edit-user-password').value;

  if (!name || !email || !role) {
    toast('Name, email, and role are required', 'error');
    return;
  }

  const payload = { name, email, role };
  if (password) {
    payload.password = password;
  }

  try {
    await apiRequest(`/operations/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    toast('User updated successfully!', 'success');
    closeModal();
    navigate('users');
  } catch (err) {
    toast(err.message, 'error');
  }
}
