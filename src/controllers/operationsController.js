const { query, run, get } = require('../config/database');

const PROJECT_STATUSES = ['pending', 'planning', 'assigned', 'shoot_scheduled', 'shoot_completed'];

function listOperationsProjects(req, res, next) {
  try {
    const { status } = req.query;
    let sql = `SELECT p.*, a.client_name, a.business_name,
                      us.name as shooter_name, ue.name as editor_name, ud.name as designer_name
               FROM projects p
               LEFT JOIN accounts a ON a.id = p.account_id
               LEFT JOIN users us ON us.id = p.assigned_shooter
               LEFT JOIN users ue ON ue.id = p.assigned_editor
               LEFT JOIN users ud ON ud.id = p.assigned_designer
               WHERE p.status NOT IN ('delivered')`;
    const params = [];
    if (status) { sql += ` AND p.status = ?`; params.push(status); }
    sql += ` ORDER BY p.created_at DESC`;
    const projects = query(sql, params);
    res.json({ success: true, data: projects });
  } catch (err) { next(err); }
}

function updateProjectStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    run(`UPDATE projects SET status = ?, updated_at = ? WHERE id = ?`,
      [status, new Date().toISOString(), req.params.id]);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) { next(err); }
}

function updateChecklist(req, res, next) {
  try {
    const { item_key, completed } = req.body;
    if (!item_key) return res.status(400).json({ success: false, message: 'item_key required' });
    run(
      `UPDATE project_checklist SET completed = ?, completed_at = ?, completed_by = ? WHERE project_id = ? AND item_key = ?`,
      [completed ? 1 : 0, completed ? new Date().toISOString() : null, completed ? req.user.id : null, req.params.id, item_key]
    );
    const checklist = query(`SELECT * FROM project_checklist WHERE project_id = ?`, [req.params.id]);
    res.json({ success: true, data: checklist });
  } catch (err) { next(err); }
}

function assignTeam(req, res, next) {
  try {
    const { assigned_shooter, assigned_editor, assigned_designer, design_type } = req.body;
    const updates = {};
    if (assigned_shooter !== undefined) updates.assigned_shooter = assigned_shooter;
    if (assigned_editor !== undefined) updates.assigned_editor = assigned_editor;
    if (assigned_designer !== undefined) updates.assigned_designer = assigned_designer;
    if (design_type !== undefined) updates.design_type = design_type;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No assignment fields provided' });
    }

    // Update status to 'assigned' if assigning shooter
    if (assigned_shooter) updates.status = 'assigned';

    updates.updated_at = new Date().toISOString();
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    run(`UPDATE projects SET ${setClauses} WHERE id = ?`, [...Object.values(updates), req.params.id]);
    res.json({ success: true, message: 'Team assigned' });
  } catch (err) { next(err); }
}

function getTeamMembers(req, res, next) {
  try {
    const shooters = query(`SELECT id, name, email FROM users WHERE role = 'shooter' AND is_active = 1`);
    const editors = query(`SELECT id, name, email FROM users WHERE role = 'editor' AND is_active = 1`);
    const designers = query(`SELECT id, name, email FROM users WHERE role IN ('admin','operations') AND is_active = 1`);
    res.json({ success: true, data: { shooters, editors, designers } });
  } catch (err) { next(err); }
}

function createUser(req, res, next) {
  try {
    const { name, email, role, password } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ success: false, message: 'All fields (name, email, role, password) are required.' });
    }

    const validRoles = ['admin', 'sales', 'shooter', 'editor', 'operations'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    // Check if user already exists
    const existing = get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = bcrypt.hashSync(password, 10);

    run(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      [name, email, passwordHash, role]
    );

    res.json({ success: true, message: 'User created successfully.' });
  } catch (err) { next(err); }
}

function listUsers(req, res, next) {
  try {
    const users = query(`SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC`);
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
}

function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    const user = get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) {
      const trimmedEmail = email.trim();
      const existing = get('SELECT id FROM users WHERE email = ? AND id != ?', [trimmedEmail, id]);
      if (existing) {
        return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
      }
      updates.email = trimmedEmail;
    }
    if (role !== undefined) {
      const validRoles = ['admin', 'sales', 'shooter', 'editor', 'operations'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role.' });
      }
      updates.role = role;
    }
    if (password) {
      const bcrypt = require('bcryptjs');
      updates.password_hash = bcrypt.hashSync(password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No update fields provided.' });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    run(`UPDATE users SET ${setClauses} WHERE id = ?`, [...Object.values(updates), id]);

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) { next(err); }
}

module.exports = { listOperationsProjects, updateProjectStatus, updateChecklist, assignTeam, getTeamMembers, createUser, listUsers, updateUser };
