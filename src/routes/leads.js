const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leadsController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadQuotation } = require('../middleware/upload');

const salesAdmin = authorize('admin', 'sales', 'operations');

router.get('/', authenticate, salesAdmin, ctrl.listLeads);
router.post('/', authenticate, salesAdmin, ctrl.createLead);
router.get('/users', authenticate, authenticate, ctrl.getUsers);
router.get('/:id', authenticate, salesAdmin, ctrl.getLead);
router.patch('/:id', authenticate, salesAdmin, ctrl.updateLead);
router.post('/:id/notes', authenticate, salesAdmin, ctrl.addNote);
router.post('/:id/reminders', authenticate, salesAdmin, ctrl.addReminder);
router.post('/:id/attachments', authenticate, salesAdmin, uploadQuotation.single('file'), ctrl.uploadAttachment);

module.exports = router;
