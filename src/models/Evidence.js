const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema(
  {
    evidenceId: { type: String, required: true, unique: true, index: true },
    sessionId: { type: String, required: true, index: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: 'image/jpeg' },
    caption: { type: String, default: 'Recovery Evidence' },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    capturedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Evidence', evidenceSchema);
