const mongoose = require('mongoose');

const VerificationCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true // Holds User ID for attendance codes, or Task/Visit ID
  },
  type: {
    type: String,
    enum: ['task', 'visit', 'attendance_checkin', 'attendance_checkout'],
    required: true
  },
  generatedFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 * 7 // Keep codes in database for 7 days
  }
});

module.exports = mongoose.model('VerificationCode', VerificationCodeSchema);
