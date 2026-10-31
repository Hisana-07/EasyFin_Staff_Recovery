const express = require('express');
const router = express.Router();
const recoverySessionController = require('../controllers/recoverySessionController');
const evidenceController = require('../controllers/evidenceController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/start', protect, recoverySessionController.startSession);
router.get('/active', protect, recoverySessionController.getActiveSession);
router.post('/sessions/:sessionId/points', protect, recoverySessionController.addTrackingPoints);
router.post('/sessions/:sessionId/stops', protect, recoverySessionController.recordStop);
router.patch('/sessions/:sessionId/outcome', protect, recoverySessionController.updateSessionOutcome);
router.post('/sessions/:sessionId/end', protect, recoverySessionController.endSession);

// Evidence upload
router.post('/sessions/:sessionId/evidence', protect, upload.single('photo'), evidenceController.uploadEvidence);
router.get('/sessions/:sessionId/evidence', protect, evidenceController.getSessionEvidence);

module.exports = router;
