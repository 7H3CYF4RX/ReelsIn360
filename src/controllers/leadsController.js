const { query, run, get } = require('../config/database');
const { generateLeadId } = require('../utils/idGenerator');
const path = require('path');

const PIPELINE_STAGES = ['new_lead', 'contacted', 'requirement_collected', 'quotation_sent', 'follow_up', 'won', 'lost'];

function listLeads(req, res, next) {
  try {
    const { status, assigned_to, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `SELECT l.*, u.name as assigned_name
               FROM leads l
               LEFT JOIN users u ON u.id = l.assigned_to
               WHERE 1=1`;
    const params = [];

    if (status) { sql += ` AND l.status = ?`; params.push(status); }
    if (assigned_to) { sql += ` AND l.assigned_to = ?`; params.push(assigned_to); }
    if (search) {
      sql += ` AND (l.client_name LIKE ? OR l.business_name LIKE ? OR l.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    let countSql = `SELECT COUNT(*) as cnt FROM leads l WHERE 1=1`;
    const countParams = [];
    if (status) { countSql += ` AND l.status = ?`; countParams.push(status); }
    if (search) {
      countSql += ` AND (l.client_name LIKE ? OR l.business_name LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    const countResult = get(countSql, countParams);

    sql += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const leads = query(sql, params);
    res.json({ success: true, data: leads, total: countResult ? countResult.cnt : 0 });
  } catch (err) { next(err); }
}

function getLead(req, res, next) {
  try {
    const lead = get(
      `SELECT l.*, u.name as assigned_name, p.project_id as project_id_created
       FROM leads l
       LEFT JOIN users u ON u.id = l.assigned_to
       LEFT JOIN projects p ON p.lead_id = l.id
       WHERE l.id = ?`,
      [req.params.id]
    );
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const notes = query(
      `SELECT ln.*, u.name as author FROM lead_notes ln LEFT JOIN users u ON u.id = ln.user_id WHERE ln.lead_id = ? ORDER BY ln.created_at DESC`,
      [lead.id]
    );
    const attachments = query(`SELECT * FROM lead_attachments WHERE lead_id = ?`, [lead.id]);
    const reminders = query(`SELECT * FROM follow_up_reminders WHERE lead_id = ? ORDER BY remind_at ASC`, [lead.id]);

    res.json({ success: true, data: { ...lead, notes, attachments, reminders } });
  } catch (err) { next(err); }
}

function createLead(req, res, next) {
  try {
    const {
      client_name, business_name, phone, email, instagram,
      package: pkg, budget, location, source, notes, assigned_to
    } = req.body;

    if (!client_name || !phone) {
      return res.status(400).json({ success: false, message: 'client_name and phone are required' });
    }

    const lead_id = generateLeadId();
    const result = run(
      `INSERT INTO leads (lead_id, client_name, business_name, phone, email, instagram, package, budget, location, source, notes, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [lead_id, client_name, business_name || null, phone, email || null, instagram || null,
       pkg || null, budget || null, location || null, source || null, notes || null, assigned_to || null]
    );

    const lead = get(`SELECT * FROM leads WHERE id = ?`, [result.lastInsertRowid]);
    res.status(201).json({ success: true, data: lead });
  } catch (err) { next(err); }
}

function updateLead(req, res, next) {
  try {
    const { id } = req.params;
    const allowed = ['client_name','business_name','phone','email','instagram','package','budget',
                     'location','source','notes','status','assigned_to'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.status && !PIPELINE_STAGES.includes(updates.status)) {
      return res.status(400).json({ success: false, message: 'Invalid pipeline status' });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    updates.updated_at = new Date().toISOString();
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    run(`UPDATE leads SET ${setClauses} WHERE id = ?`, [...Object.values(updates), id]);

    const lead = get(`SELECT * FROM leads WHERE id = ?`, [id]);
    res.json({ success: true, data: lead });
  } catch (err) { next(err); }
}

function addNote(req, res, next) {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ success: false, message: 'Note is required' });
    run(`INSERT INTO lead_notes (lead_id, user_id, note) VALUES (?, ?, ?)`,
      [req.params.id, req.user.id, note]);
    res.json({ success: true, message: 'Note added' });
  } catch (err) { next(err); }
}

function addReminder(req, res, next) {
  try {
    const { remind_at, message } = req.body;
    if (!remind_at) return res.status(400).json({ success: false, message: 'remind_at is required' });
    run(`INSERT INTO follow_up_reminders (lead_id, user_id, remind_at, message) VALUES (?, ?, ?, ?)`,
      [req.params.id, req.user.id, remind_at, message || null]);
    res.json({ success: true, message: 'Reminder set' });
  } catch (err) { next(err); }
}

function uploadAttachment(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    run(`INSERT INTO lead_attachments (lead_id, filename, filepath) VALUES (?, ?, ?)`,
      [req.params.id, req.file.originalname, req.file.path]);
    res.json({ success: true, message: 'Attachment uploaded', filename: req.file.originalname });
  } catch (err) { next(err); }
}

function getUsers(req, res, next) {
  try {
    const users = query(`SELECT id, name, email, role FROM users WHERE is_active = 1 ORDER BY name`);
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
}

module.exports = { listLeads, getLead, createLead, updateLead, addNote, addReminder, uploadAttachment, getUsers };
