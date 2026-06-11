const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/projectsController');
const { authenticate, authorize } = require('../middleware/auth');

const allStaff = authorize('admin', 'sales', 'operations', 'editor');

router.get('/accounts', authenticate, allStaff, ctrl.listAccounts);
router.get('/', authenticate, allStaff, ctrl.listProjects);
router.get('/:id', authenticate, allStaff, ctrl.getProject);
router.patch('/:id', authenticate, authorize('admin', 'operations'), ctrl.updateProject);
router.post('/:id/notes', authenticate, allStaff, ctrl.addProjectNote);
router.post('/leads/:leadId/convert', authenticate, authorize('admin', 'sales'), ctrl.convertLeadToProject);

module.exports = router;
