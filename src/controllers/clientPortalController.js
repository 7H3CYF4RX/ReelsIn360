const { query, run, get } = require('../config/database');
const env = require('../config/env');

function getReview(req, res, next) {
  try {
    const { token } = req.params;
    const approval = get(`SELECT * FROM client_approvals WHERE review_token = ?`, [token]);
    if (!approval) return res.status(404).json({ success: false, message: 'Review link not found or expired' });

    const project = get(
      `SELECT p.project_id, p.package, p.reels_count, a.client_name, a.business_name
       FROM projects p LEFT JOIN accounts a ON a.id = p.account_id WHERE p.id = ?`,
      [approval.project_id]
    );

    const videos = query(
      `SELECT * FROM uploads WHERE project_id = ? AND upload_type IN ('draft_video','final_video') ORDER BY created_at DESC`,
      [approval.project_id]
    );

    res.json({
      success: true,
      data: {
        approval,
        project,
        videos,
        remaining_revisions: Math.max(0, approval.max_revisions - approval.revision_count),
      },
    });
  } catch (err) { next(err); }
}

function approveReview(req, res, next) {
  try {
    const { token } = req.params;
    const approval = get(`SELECT * FROM client_approvals WHERE review_token = ?`, [token]);
    if (!approval) return res.status(404).json({ success: false, message: 'Invalid review token' });
    if (approval.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Already approved' });
    }

    run(`UPDATE client_approvals SET status = 'approved', updated_at = ? WHERE review_token = ?`,
      [new Date().toISOString(), token]);

    // Advance editing workflow to 'delivered' and project status
    run(`UPDATE editing_workflow SET status = 'delivered', updated_at = ? WHERE project_id = ?`,
      [new Date().toISOString(), approval.project_id]);
    run(`UPDATE projects SET status = 'delivered', updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), approval.project_id]);

    res.json({ success: true, message: 'Video approved! Project marked as delivered.' });
  } catch (err) { next(err); }
}

function requestRevision(req, res, next) {
  try {
    const { token } = req.params;
    const { feedback } = req.body;
    const approval = get(`SELECT * FROM client_approvals WHERE review_token = ?`, [token]);
    if (!approval) return res.status(404).json({ success: false, message: 'Invalid review token' });

    if (approval.revision_count >= approval.max_revisions) {
      return res.status(400).json({
        success: false,
        message: `No revisions remaining. Your ${approval.max_revisions} revision(s) have been used.`,
      });
    }

    run(
      `UPDATE client_approvals SET status = 'revision_requested', revision_count = revision_count + 1, client_feedback = ?, updated_at = ? WHERE review_token = ?`,
      [feedback || null, new Date().toISOString(), token]
    );

    // Advance editing workflow back to 'revision'
    run(`UPDATE editing_workflow SET status = 'revision', updated_at = ? WHERE project_id = ?`,
      [new Date().toISOString(), approval.project_id]);

    const remaining = approval.max_revisions - approval.revision_count - 1;
    res.json({
      success: true,
      message: `Revision requested. ${remaining} revision(s) remaining.`,
      remaining_revisions: remaining,
    });
  } catch (err) { next(err); }
}

module.exports = { getReview, approveReview, requestRevision };
