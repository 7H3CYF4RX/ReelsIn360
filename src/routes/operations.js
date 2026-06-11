const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/operationsController');
const { authenticate, authorize } = require('../middleware/auth');

const opsAdmin = authorize('admin', 'operations');

router.get('/projects', authenticate, opsAdmin, ctrl.listOperationsProjects);
router.get('/team', authenticate, opsAdmin, ctrl.getTeamMembers);
router.patch('/projects/:id/status', authenticate, opsAdmin, ctrl.updateProjectStatus);
router.patch('/projects/:id/checklist', authenticate, opsAdmin, ctrl.updateChecklist);
router.post('/projects/:id/assign', authenticate, opsAdmin, ctrl.assignTeam);
router.post('/users', authenticate, authorize('admin'), ctrl.createUser);
router.get('/users', authenticate, authorize('admin'), ctrl.listUsers);
router.patch('/users/:id', authenticate, authorize('admin'), ctrl.updateUser);

module.exports = router;
