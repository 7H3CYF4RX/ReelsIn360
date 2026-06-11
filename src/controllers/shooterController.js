const { query, run, get } = require('../config/database');

const SHOOTER_STATUSES = ['assigned', 'travelling', 'shoot_started', 'shoot_completed', 'footage_uploaded'];

function getShooterProjects(req, res, next) {
  try {
    const shooterId = req.user.id;
    const projects = query(
      `SELECT p.*, a.client_name, a.business_name, a.phone as client_phone
       FROM projects p
       LEFT JOIN accounts a ON a.id = p.account_id
       WHERE p.assigned_shooter = ? AND p.status NOT IN ('delivered','cancelled')
       ORDER BY p.shoot_date ASC`,
      [shooterId]
    );
    res.json({ success: true, data: projects });
  } catch (err) { next(err); }
}

function updateShooterStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!SHOOTER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid shooter status' });
    }

    const project = get(`SELECT * FROM projects WHERE id = ? AND assigned_shooter = ?`,
      [req.params.id, req.user.id]);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found or not assigned to you' });

    run(`UPDATE projects SET status = ?, updated_at = ? WHERE id = ?`,
      [status, new Date().toISOString(), req.params.id]);
    res.json({ success: true, message: 'Status updated', status });
  } catch (err) { next(err); }
}

function uploadShooterFile(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { upload_type } = req.body;
    const validTypes = ['raw_footage', 'bts_photos', 'client_approval_photo'];
    if (!validTypes.includes(upload_type)) {
      return res.status(400).json({ success: false, message: 'Invalid upload type' });
    }

    const project = get(`SELECT * FROM projects WHERE id = ? AND assigned_shooter = ?`,
      [req.params.id, req.user.id]);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    run(
      `INSERT INTO uploads (project_id, upload_type, filename, filepath, uploaded_by) VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, upload_type, req.file.originalname, req.file.path, req.user.id]
    );

    // Auto-update status to footage_uploaded if raw_footage
    if (upload_type === 'raw_footage') {
      run(`UPDATE projects SET status = 'footage_uploaded', updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), req.params.id]);
    }

    res.json({ success: true, message: 'File uploaded successfully' });
  } catch (err) { next(err); }
}

function getShooterProject(req, res, next) {
  try {
    const project = get(
      `SELECT p.*, a.client_name, a.business_name, a.phone as client_phone, a.email as client_email
       FROM projects p LEFT JOIN accounts a ON a.id = p.account_id
       WHERE p.id = ? AND p.assigned_shooter = ?`,
      [req.params.id, req.user.id]
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const checklist = query(`SELECT * FROM project_checklist WHERE project_id = ?`, [project.id]);
    const uploads = query(`SELECT * FROM uploads WHERE project_id = ? ORDER BY created_at DESC`, [project.id]);

    res.json({ success: true, data: { ...project, checklist, uploads } });
  } catch (err) { next(err); }
}

module.exports = { getShooterProjects, updateShooterStatus, uploadShooterFile, getShooterProject };
