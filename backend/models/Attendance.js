const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkInPhoto: {
    type: String // Path to check-in photo proof
  },
  checkInCode: {
    type: String // VK-XXXX code for check-in
  },
  checkInLocation: {
    lat: Number,
    lng: Number
  },
  checkInDistance: {
    type: Number // in meters from office
  },
  checkInReviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  checkInComments: {
    type: String
  },
  checkOut: {
    type: Date
  },
  checkOutPhoto: {
    type: String // Path to check-out photo proof
  },
  checkOutCode: {
    type: String // VK-XXXX code for check-out
  },
  checkOutLocation: {
    lat: Number,
    lng: Number
  },
  checkOutDistance: {
    type: Number // in meters from office
  },
  checkOutReviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  checkOutComments: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Remove unique index on date so users can log multiple sessions per day
AttendanceSchema.index({ user: 1 });
AttendanceSchema.index({ date: 1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);
