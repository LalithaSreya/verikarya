const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true // Holds Task, Visit, or Attendance ID
  },
  type: {
    type: String,
    enum: ['task', 'visit', 'attendance_checkin', 'attendance_checkout'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  comments: {
    type: String
  },
  reviewedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Review', ReviewSchema);
