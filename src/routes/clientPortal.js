const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/clientPortalController');

// Public routes — no auth, token-based
router.get('/review/:token', ctrl.getReview);
router.post('/review/:token/approve', ctrl.approveReview);
router.post('/review/:token/revision', ctrl.requestRevision);

module.exports = router;
