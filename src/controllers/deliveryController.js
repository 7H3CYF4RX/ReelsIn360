const { query, run, get } = require('../config/database');

function listDeliveries(req, res, next) {
  try {
    const deliveries = query(
      `SELECT d.*, p.project_id, p.package, a.client_name, a.business_name, u.name as delivered_by_name
       FROM deliveries d
       LEFT JOIN projects p ON p.id = d.project_id
       LEFT JOIN accounts a ON a.id = p.account_id
       LEFT JOIN users u ON u.id = d.delivered_by
       ORDER BY d.delivered_at DESC`
    );
    res.json({ success: true, data: deliveries });
  } catch (err) { next(err); }
}

function createDelivery(req, res, next) {
  try {
    const { delivery_link, delivery_method, notes } = req.body;
    const { id } = req.params;

    if (!delivery_link || !delivery_method) {
      return res.status(400).json({ success: false, message: 'delivery_link and delivery_method are required' });
    }

    const validMethods = ['google_drive', 'dropbox', 'wetransfer', 'other'];
    if (!validMethods.includes(delivery_method)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery method' });
    }

    run(
      `INSERT INTO deliveries (project_id, delivery_link, delivery_method, notes, delivered_by) VALUES (?, ?, ?, ?, ?)`,
      [id, delivery_link, delivery_method, notes || null, req.user.id]
    );

    // Mark project as delivered
    run(`UPDATE projects SET status = 'delivered', updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]);
    run(`UPDATE editing_workflow SET status = 'delivered', updated_at = ? WHERE project_id = ?`,
      [new Date().toISOString(), id]);

    res.status(201).json({ success: true, message: 'Delivery recorded and project marked as delivered' });
  } catch (err) { next(err); }
}

function getProjectDelivery(req, res, next) {
  try {
    const { id } = req.params;
    const project = get(
      `SELECT p.*, a.client_name, a.business_name, a.email
       FROM projects p LEFT JOIN accounts a ON a.id = p.account_id WHERE p.id = ?`,
      [id]
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const deliveries = query(`SELECT * FROM deliveries WHERE project_id = ? ORDER BY delivered_at DESC`, [id]);
    const uploads = query(
      `SELECT * FROM uploads WHERE project_id = ? AND upload_type IN ('final_video','cover_image','raw_files') ORDER BY created_at DESC`,
      [id]
    );

    res.json({ success: true, data: { project, deliveries, uploads } });
  } catch (err) { next(err); }
}

// Invoice management
function getInvoices(req, res, next) {
  try {
    const invoices = query(
      `SELECT i.*, p.project_id, a.client_name, a.business_name
       FROM invoices i
       LEFT JOIN projects p ON p.id = i.project_id
       LEFT JOIN accounts a ON a.id = i.account_id
       ORDER BY i.created_at DESC`
    );
    res.json({ success: true, data: invoices });
  } catch (err) { next(err); }
}

function updateInvoice(req, res, next) {
  try {
    const { status, amount, due_date, notes } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (amount) updates.amount = amount;
    if (due_date) updates.due_date = due_date;
    if (notes) updates.notes = notes;
    if (status === 'paid') updates.paid_at = new Date().toISOString();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    run(`UPDATE invoices SET ${setClauses} WHERE id = ?`, [...Object.values(updates), req.params.id]);
    res.json({ success: true, message: 'Invoice updated' });
  } catch (err) { next(err); }
}

function getInvoiceById(req, res, next) {
  try {
    const invoice = get(
      `SELECT i.*, p.project_id, p.package, a.client_name, a.business_name, a.email, a.phone
       FROM invoices i
       LEFT JOIN projects p ON p.id = i.project_id
       LEFT JOIN accounts a ON a.id = i.account_id
       WHERE i.id = ?`,
      [req.params.id]
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) { next(err); }
}

module.exports = { listDeliveries, createDelivery, getProjectDelivery, getInvoices, updateInvoice, getInvoiceById };
