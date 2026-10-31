const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, analyticsController.getDashboardStats);
router.get('/monthly', protect, analyticsController.getMonthlySummary);

module.exports = router;
