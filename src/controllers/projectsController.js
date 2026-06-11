const { query, run, get } = require('../config/database');
const { generateProjectId, generateInvoiceNumber } = require('../utils/idGenerator');
const { CHECKLIST_ITEMS, PACKAGE_REVISIONS, PACKAGE_REELS } = require('../config/seed');
const { v4: uuidv4 } = require('uuid');

function createProjectFromLead(leadId) {
  const lead = get(`SELECT * FROM leads WHERE id = ?`, [leadId]);
  if (!lead) throw new Error('Lead not found');
  if (lead.status !== 'won') throw new Error('Lead must be in Won status to create a project');

  // Check if project already exists for this lead
  const existing = get(`SELECT id FROM projects WHERE lead_id = ?`, [leadId]);
  if (existing) throw new Error('Project already exists for this lead');

  // Create Account
  const accResult = run(
    `INSERT INTO accounts (lead_id, client_name, business_name, phone, email, package) VALUES (?, ?, ?, ?, ?, ?)`,
    [lead.id, lead.client_name, lead.business_name, lead.phone, lead.email, lead.package]
  );
  const accountId = accResult.lastInsertRowid;

  // Create Project
  const projectId = generateProjectId();
  const reelsCount = PACKAGE_REELS[lead.package] || 1;
  const maxRevisions = PACKAGE_REVISIONS[lead.package] || 1;

  // Set default delivery date 3 days after shoot date if shoot date set
  const projResult = run(
    `INSERT INTO projects (project_id, account_id, lead_id, package, reels_count, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
    [projectId, accountId, lead.id, lead.package, reelsCount]
  );
  const dbProjectId = projResult.lastInsertRowid;

  // Create Checklist
  for (const item of CHECKLIST_ITEMS) {
    run(
      `INSERT INTO project_checklist (project_id, item_key, item_label, completed) VALUES (?, ?, ?, 0)`,
      [dbProjectId, item.key, item.label]
    );
  }

  // Create Editing Workflow entry
  run(`INSERT INTO editing_workflow (project_id, status) VALUES (?, 'pending')`, [dbProjectId]);

  // Create Client Approval entry
  const reviewToken = uuidv4();
  run(
    `INSERT INTO client_approvals (project_id, review_token, max_revisions) VALUES (?, ?, ?)`,
    [dbProjectId, reviewToken, maxRevisions]
  );

  // Create Invoice
  const invoiceNum = generateInvoiceNumber();
  run(
    `INSERT INTO invoices (project_id, account_id, invoice_number, amount, status, due_date)
     VALUES (?, ?, ?, ?, 'pending', date('now', '+7 days'))`,
    [dbProjectId, accountId, invoiceNum, lead.budget || 0]
  );

  return { projectId, accountId, dbProjectId, reviewToken };
}

function listProjects(req, res, next) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `SELECT p.*, a.client_name, a.business_name,
                      us.name as shooter_name, ue.name as editor_name
               FROM projects p
               LEFT JOIN accounts a ON a.id = p.account_id
               LEFT JOIN users us ON us.id = p.assigned_shooter
               LEFT JOIN users ue ON ue.id = p.assigned_editor
               WHERE 1=1`;
    const params = [];

    if (status) { sql += ` AND p.status = ?`; params.push(status); }
    if (search) {
      sql += ` AND (a.client_name LIKE ? OR a.business_name LIKE ? OR p.project_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const projects = query(sql, params);
    res.json({ success: true, data: projects });
  } catch (err) { next(err); }
}

function getProject(req, res, next) {
  try {
    const project = get(
      `SELECT p.*, a.client_name, a.business_name, a.phone, a.email,
              us.name as shooter_name, ue.name as editor_name, ud.name as designer_name
       FROM projects p
       LEFT JOIN accounts a ON a.id = p.account_id
       LEFT JOIN users us ON us.id = p.assigned_shooter
       LEFT JOIN users ue ON ue.id = p.assigned_editor
       LEFT JOIN users ud ON ud.id = p.assigned_designer
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const checklist = query(`SELECT * FROM project_checklist WHERE project_id = ?`, [project.id]);
    const notes = query(
      `SELECT pn.*, u.name as author FROM project_notes pn LEFT JOIN users u ON u.id = pn.user_id WHERE pn.project_id = ? ORDER BY pn.created_at DESC`,
      [project.id]
    );
    const uploads = query(`SELECT * FROM uploads WHERE project_id = ? ORDER BY created_at DESC`, [project.id]);
    const editing = get(`SELECT * FROM editing_workflow WHERE project_id = ?`, [project.id]);
    const approval = get(`SELECT * FROM client_approvals WHERE project_id = ?`, [project.id]);
    const delivery = query(`SELECT * FROM deliveries WHERE project_id = ? ORDER BY delivered_at DESC`, [project.id]);
    const invoice = get(`SELECT * FROM invoices WHERE project_id = ?`, [project.id]);

    res.json({ success: true, data: { ...project, checklist, notes, uploads, editing, approval, delivery, invoice } });
  } catch (err) { next(err); }
}

function updateProject(req, res, next) {
  try {
    const allowed = ['status','shoot_date','delivery_date','reels_count','package',
                     'assigned_shooter','assigned_editor','assigned_designer','design_type'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }
    updates.updated_at = new Date().toISOString();
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    run(`UPDATE projects SET ${setClauses} WHERE id = ?`, [...Object.values(updates), req.params.id]);

    res.json({ success: true, message: 'Project updated' });
  } catch (err) { next(err); }
}

function convertLeadToProject(req, res, next) {
  try {
    const id = parseInt(req.params.leadId || req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid lead ID' });

    // Mark lead as won first
    run(`UPDATE leads SET status = 'won', updated_at = ? WHERE id = ?`, [new Date().toISOString(), id]);

    // Verify lead exists
    const lead = get(`SELECT * FROM leads WHERE id = ?`, [id]);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // Check if project already exists
    const existing = get(`SELECT id, project_id FROM projects WHERE lead_id = ?`, [id]);
    if (existing) return res.status(400).json({ success: false, message: `Project already exists: ${existing.project_id}` });

    // Create Account
    const accResult = run(
      `INSERT INTO accounts (lead_id, client_name, business_name, phone, email, package) VALUES (?, ?, ?, ?, ?, ?)`,
      [lead.id, lead.client_name, lead.business_name || null, lead.phone || null, lead.email || null, lead.package || null]
    );
    const accountId = accResult.lastInsertRowid;

    // Create Project
    const { generateProjectId, generateInvoiceNumber } = require('../utils/idGenerator');
    const { CHECKLIST_ITEMS, PACKAGE_REVISIONS, PACKAGE_REELS } = require('../config/seed');
    const { v4: uuidv4 } = require('uuid');

    const projectId = generateProjectId();
    const reelsCount = PACKAGE_REELS[lead.package] || 1;
    const maxRevisions = PACKAGE_REVISIONS[lead.package] || 1;

    const projResult = run(
      `INSERT INTO projects (project_id, account_id, lead_id, package, reels_count, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
      [projectId, accountId, lead.id, lead.package || null, reelsCount]
    );
    const dbProjectId = projResult.lastInsertRowid;

    // Checklist
    for (const item of CHECKLIST_ITEMS) {
      run(`INSERT INTO project_checklist (project_id, item_key, item_label, completed) VALUES (?, ?, ?, 0)`,
        [dbProjectId, item.key, item.label]);
    }

    // Editing Workflow
    run(`INSERT INTO editing_workflow (project_id, status) VALUES (?, 'pending')`, [dbProjectId]);

    // Client Approval
    const reviewToken = uuidv4();
    run(`INSERT INTO client_approvals (project_id, review_token, max_revisions) VALUES (?, ?, ?)`,
      [dbProjectId, reviewToken, maxRevisions]);

    // Invoice
    const invoiceNum = generateInvoiceNumber();
    run(`INSERT INTO invoices (project_id, account_id, invoice_number, amount, status, due_date) VALUES (?, ?, ?, ?, 'pending', date('now','+7 days'))`,
      [dbProjectId, accountId, invoiceNum, lead.budget || 0]);

    res.status(201).json({ success: true, message: 'Project created!', data: { projectId, accountId, dbProjectId, reviewToken } });
  } catch (err) { next(err); }
}

function listAccounts(req, res, next) {
  try {
    const accounts = query(
      `SELECT a.*, COUNT(p.id) as project_count FROM accounts a LEFT JOIN projects p ON p.account_id = a.id GROUP BY a.id ORDER BY a.created_at DESC`
    );
    res.json({ success: true, data: accounts });
  } catch (err) { next(err); }
}

function addProjectNote(req, res, next) {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ success: false, message: 'Note is required' });
    run(`INSERT INTO project_notes (project_id, user_id, note) VALUES (?, ?, ?)`,
      [req.params.id, req.user.id, note]);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { listProjects, getProject, updateProject, convertLeadToProject, listAccounts, addProjectNote, createProjectFromLead };
