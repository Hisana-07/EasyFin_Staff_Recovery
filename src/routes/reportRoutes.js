const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.post('/submit', protect, reportController.submitReport);
router.get('/history', protect, reportController.getReportsHistory);
router.get('/:id', protect, reportController.getReportDetail);

module.exports = router;
