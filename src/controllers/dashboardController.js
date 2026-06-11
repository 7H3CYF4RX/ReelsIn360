const { query, get } = require('../config/database');

function getDashboardSummary(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    // Today's shoots
    const todaysShoots = get(
      `SELECT COUNT(*) as cnt FROM projects WHERE shoot_date = ? AND status != 'delivered'`,
      [today]
    );

    // Pending shoots
    const pendingShoots = get(
      `SELECT COUNT(*) as cnt FROM projects WHERE status IN ('pending','planning','assigned') AND (shoot_date IS NULL OR shoot_date >= ?)`,
      [today]
    );

    // Completed shoots
    const completedShoots = get(
      `SELECT COUNT(*) as cnt FROM projects WHERE status IN ('shoot_completed','delivered')`
    );

    // Editing statuses
    const editingPending = get(`SELECT COUNT(*) as cnt FROM editing_workflow WHERE status = 'pending'`);
    const editingInProgress = get(`SELECT COUNT(*) as cnt FROM editing_workflow WHERE status IN ('editing_started','first_draft','internal_review')`);
    const clientReview = get(`SELECT COUNT(*) as cnt FROM editing_workflow WHERE status = 'client_review'`);
    const delivered = get(`SELECT COUNT(*) as cnt FROM projects WHERE status = 'delivered'`);

    // Revenue
    const monthlyRevenue = get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = 'paid' AND paid_at >= ?`,
      [monthStart]
    );
    const outstanding = get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status IN ('pending','overdue')`
    );

    // Total leads by stage
    const leadsStats = query(
      `SELECT status, COUNT(*) as cnt FROM leads GROUP BY status`
    );

    // Active projects
    const activeProjects = get(
      `SELECT COUNT(*) as cnt FROM projects WHERE status NOT IN ('delivered','cancelled')`
    );

    // Team performance
    const shooterPerformance = query(
      `SELECT u.name, COUNT(p.id) as total_shoots,
        SUM(CASE WHEN p.status IN ('shoot_completed','footage_uploaded','delivered') THEN 1 ELSE 0 END) as completed
       FROM users u
       LEFT JOIN projects p ON p.assigned_shooter = u.id
       WHERE u.role = 'shooter' AND u.is_active = 1
       GROUP BY u.id, u.name`
    );

    const editorPerformance = query(
      `SELECT u.name, COUNT(ew.id) as total_edits,
        SUM(CASE WHEN ew.status = 'delivered' THEN 1 ELSE 0 END) as completed
       FROM users u
       LEFT JOIN editing_workflow ew ON ew.project_id IN (SELECT id FROM projects WHERE assigned_editor = u.id)
       WHERE u.role = 'editor' AND u.is_active = 1
       GROUP BY u.id, u.name`
    );

    // Recent projects
    const recentProjects = query(
      `SELECT p.project_id, p.package, p.status, p.shoot_date, p.delivery_date,
              a.client_name, a.business_name
       FROM projects p
       LEFT JOIN accounts a ON a.id = p.account_id
       ORDER BY p.created_at DESC LIMIT 5`
    );

    // Upcoming shoots (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    const upcomingShoots = query(
      `SELECT p.project_id, p.shoot_date, p.package, a.client_name, a.business_name,
              u.name as shooter_name
       FROM projects p
       LEFT JOIN accounts a ON a.id = p.account_id
       LEFT JOIN users u ON u.id = p.assigned_shooter
       WHERE p.shoot_date BETWEEN ? AND ? AND p.status != 'delivered'
       ORDER BY p.shoot_date ASC`,
      [today, nextWeekStr]
    );

    res.json({
      success: true,
      data: {
        shoots: {
          today: todaysShoots.cnt,
          pending: pendingShoots.cnt,
          completed: completedShoots.cnt,
        },
        editing: {
          pending: editingPending.cnt,
          in_progress: editingInProgress.cnt,
          client_review: clientReview.cnt,
          delivered: delivered.cnt,
        },
        revenue: {
          monthly: monthlyRevenue.total,
          outstanding: outstanding.total,
        },
        active_projects: activeProjects.cnt,
        leads_pipeline: leadsStats,
        team: {
          shooters: shooterPerformance,
          editors: editorPerformance,
        },
        recent_projects: recentProjects,
        upcoming_shoots: upcomingShoots,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboardSummary };
