const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/deliveryController');
const { authenticate, authorize } = require('../middleware/auth');

const staffAdmin = authorize('admin', 'operations', 'editor');

router.get('/', authenticate, authorize('admin'), ctrl.listDeliveries);
router.get('/invoices', authenticate, authorize('admin'), ctrl.getInvoices);
router.get('/invoices/:id', authenticate, authorize('admin'), ctrl.getInvoiceById);
router.patch('/invoices/:id', authenticate, authorize('admin'), ctrl.updateInvoice);
router.get('/projects/:id', authenticate, staffAdmin, ctrl.getProjectDelivery);
router.post('/projects/:id', authenticate, staffAdmin, ctrl.createDelivery);

module.exports = router;
