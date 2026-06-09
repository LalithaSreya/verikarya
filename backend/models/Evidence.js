const mongoose = require('mongoose');

const EvidenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['task', 'visit'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'type' // Mongoose dynamic ref
  },
  photoPath: {
    type: String,
    required: false
  },
  verificationCode: {
    type: String,
    required: false
  },
  location: {
    lat: Number,
    lng: Number
  },
  distance: {
    type: Number // in meters, for visits
  },
  notes: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Evidence', EvidenceSchema);
