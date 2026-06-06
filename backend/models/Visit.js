const mongoose = require('mongoose');

const VisitSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: [true, 'Please add a client name'],
    trim: true
  },
  purpose: {
    type: String,
    required: [true, 'Please add a visit purpose'],
    trim: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetLocation: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  deadline: {
    type: Date,
    required: [true, 'Please add a deadline']
  },
  status: {
    type: String,
    enum: ['pending', 'started', 'submitted'],
    default: 'pending'
  },
  startedAt: {
    type: Date
  },
  startLocation: {
    lat: Number,
    lng: Number
  },
  submitLocation: {
    lat: Number,
    lng: Number
  },
  distanceToTarget: {
    type: Number // stored in meters
  },
  verificationCode: {
    type: String // VK-XXXX
  },
  evidence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evidence'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Visit', VisitSchema);
