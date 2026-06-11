const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/editingController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadAny } = require('../middleware/upload');

const editAdmin = authorize('admin', 'editor', 'operations');

router.get('/projects', authenticate, editAdmin, ctrl.getEditorProjects);
router.get('/projects/:id', authenticate, editAdmin, ctrl.getEditingProject);
router.patch('/projects/:id/status', authenticate, editAdmin, ctrl.updateEditingStatus);
router.post('/projects/:id/upload', authenticate, editAdmin, uploadAny.single('file'), ctrl.uploadEditorFile);

module.exports = router;
