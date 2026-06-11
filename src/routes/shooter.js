const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/shooterController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadAny } = require('../middleware/upload');

const shooterAdmin = authorize('admin', 'shooter');

router.get('/projects', authenticate, shooterAdmin, ctrl.getShooterProjects);
router.get('/projects/:id', authenticate, shooterAdmin, ctrl.getShooterProject);
router.patch('/projects/:id/status', authenticate, shooterAdmin, ctrl.updateShooterStatus);
router.post('/projects/:id/upload', authenticate, shooterAdmin, uploadAny.single('file'), ctrl.uploadShooterFile);

module.exports = router;
