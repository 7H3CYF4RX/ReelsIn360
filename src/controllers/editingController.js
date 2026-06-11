const { query, run, get } = require('../config/database');

const EDITING_STATUSES = ['pending','editing_started','first_draft','internal_review','client_review','revision','approved','delivered'];

function getEditorProjects(req, res, next) {
  try {
    const editorId = req.user.id;
    const role = req.user.role;

    let sql = `SELECT p.*, a.client_name, a.business_name, ew.status as edit_status,
                      ca.review_token, ca.revision_count, ca.max_revisions
               FROM projects p
               LEFT JOIN accounts a ON a.id = p.account_id
               LEFT JOIN editing_workflow ew ON ew.project_id = p.id
               LEFT JOIN client_approvals ca ON ca.project_id = p.id`;

    const params = [];
    if (role === 'editor') {
      sql += ` WHERE p.assigned_editor = ? AND p.status NOT IN ('pending','planning','assigned','shoot_scheduled','cancelled')`;
      params.push(editorId);
    } else {
      sql += ` WHERE p.status NOT IN ('pending','planning','assigned','shoot_scheduled','cancelled')`;
    }

    sql += ` ORDER BY p.updated_at DESC`;
    const projects = query(sql, params);
    res.json({ success: true, data: projects });
  } catch (err) { next(err); }
}

function updateEditingStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!EDITING_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid editing status' });
    }

    run(`UPDATE editing_workflow SET status = ?, updated_by = ?, updated_at = ? WHERE project_id = ?`,
      [status, req.user.id, new Date().toISOString(), req.params.id]);

    // If delivered, update main project status
    if (status === 'delivered') {
      run(`UPDATE projects SET status = 'delivered', updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), req.params.id]);
    }

    // If client_review, generate/send review link
    if (status === 'client_review') {
      const approval = get(`SELECT * FROM client_approvals WHERE project_id = ?`, [req.params.id]);
      if (approval) {
        run(`UPDATE client_approvals SET status = 'pending', updated_at = ? WHERE project_id = ?`,
          [new Date().toISOString(), req.params.id]);
      }
    }

    res.json({ success: true, message: 'Editing status updated' });
  } catch (err) { next(err); }
}

function uploadEditorFile(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { upload_type } = req.body;
    const validTypes = ['draft_video', 'final_video', 'cover_image', 'raw_files'];
    if (!validTypes.includes(upload_type)) {
      return res.status(400).json({ success: false, message: 'Invalid upload type' });
    }

    run(
      `INSERT INTO uploads (project_id, upload_type, filename, filepath, uploaded_by) VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, upload_type, req.file.originalname, req.file.path, req.user.id]
    );

    // Auto-advance editing status
    const statusMap = {
      draft_video: 'first_draft',
      final_video: 'approved',
    };
    if (statusMap[upload_type]) {
      const ew = get(`SELECT * FROM editing_workflow WHERE project_id = ?`, [req.params.id]);
      if (ew) {
        run(`UPDATE editing_workflow SET status = ?, updated_at = ? WHERE project_id = ?`,
          [statusMap[upload_type], new Date().toISOString(), req.params.id]);
      }
    }

    // Reset client approval to pending when a new video (draft or final) is uploaded
    if (upload_type === 'draft_video' || upload_type === 'final_video') {
      run(`UPDATE client_approvals SET status = 'pending', updated_at = ? WHERE project_id = ?`,
        [new Date().toISOString(), req.params.id]);
      
      // If the project was previously marked as delivered, revert it to footage_uploaded (active editing)
      run(`UPDATE projects SET status = 'footage_uploaded', updated_at = ? WHERE id = ? AND status = 'delivered'`,
        [new Date().toISOString(), req.params.id]);
    }

    res.json({ success: true, message: 'File uploaded' });
  } catch (err) { next(err); }
}

function getEditingProject(req, res, next) {
  try {
    const project = get(
      `SELECT p.*, a.client_name, a.business_name, a.email as client_email,
              ew.status as edit_status, ew.updated_at as edit_updated_at,
              ca.review_token, ca.revision_count, ca.max_revisions, ca.status as approval_status
       FROM projects p
       LEFT JOIN accounts a ON a.id = p.account_id
       LEFT JOIN editing_workflow ew ON ew.project_id = p.id
       LEFT JOIN client_approvals ca ON ca.project_id = p.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const uploads = query(`SELECT * FROM uploads WHERE project_id = ? ORDER BY created_at DESC`, [project.id]);
    const env = require('../config/env');
    const reviewUrl = project.review_token
      ? `${env.APP_URL}/client-review.html?token=${project.review_token}`
      : null;

    res.json({ success: true, data: { ...project, uploads, review_url: reviewUrl } });
  } catch (err) { next(err); }
}

module.exports = { getEditorProjects, updateEditingStatus, uploadEditorFile, getEditingProject };
