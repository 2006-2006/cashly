/**
 * reconcileRoutes.js
 * Routes for the Finance-Ops Reconciliation Agent.
 */

const express = require('express');
const router = express.Router();
const { getReconcileData, runReconciliation, getReport } = require('../controllers/reconcileController');
const { protect } = require('../middleware/authMiddleware');

// Raw dataset
router.get('/data', protect, getReconcileData);

// Run full reconciliation loop
router.post('/run', protect, runReconciliation);

// Retrieve stored report by runId
router.get('/report/:id', protect, getReport);

module.exports = router;
