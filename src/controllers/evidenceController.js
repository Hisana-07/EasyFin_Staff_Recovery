const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Evidence = require('../models/Evidence');
const memoryStore = require('../services/store');
const { getIsConnected } = require('../config/db');

exports.uploadEvidence = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const staffId = req.staff._id.toString();
    const { caption, latitude, longitude } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo evidence file received.'
      });
    }

    const evidenceId = `EVID-${Date.now()}-${uuidv4().substring(0, 6)}`;
    const relativePath = `/uploads/${req.file.filename}`;

    if (getIsConnected()) {
      const evidence = await Evidence.create({
        evidenceId,
        sessionId,
        staffId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: relativePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        caption: caption || 'Recovery visit supporting evidence',
        latitude: latitude ? Number(latitude) : 0,
        longitude: longitude ? Number(longitude) : 0,
        capturedAt: new Date()
      });

      return res.status(201).json({
        success: true,
        message: 'Evidence photo uploaded and recorded successfully.',
        evidence
      });
    } else {
      const evidence = {
        _id: `evid_${Date.now()}`,
        evidenceId,
        sessionId,
        staffId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: relativePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        caption: caption || 'Recovery visit supporting evidence',
        latitude: latitude ? Number(latitude) : 0,
        longitude: longitude ? Number(longitude) : 0,
        capturedAt: new Date().toISOString()
      };

      memoryStore.evidences.push(evidence);

      return res.status(201).json({
        success: true,
        message: 'Evidence photo uploaded and recorded successfully.',
        evidence
      });
    }
  } catch (error) {
    console.error('Evidence upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload and attach evidence.'
    });
  }
};

exports.getSessionEvidence = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const staffId = req.staff._id.toString();

    if (getIsConnected()) {
      const evidences = await Evidence.find({ sessionId, staffId }).sort({ capturedAt: -1 });
      return res.status(200).json({ success: true, count: evidences.length, evidences });
    } else {
      const evidences = memoryStore.evidences.filter(e => e.sessionId === sessionId && e.staffId === staffId);
      return res.status(200).json({ success: true, count: evidences.length, evidences });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve session evidence.'
    });
  }
};
