const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a task title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
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
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  deadline: {
    type: Date,
    required: [true, 'Please add a deadline']
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  verificationCode: {
    type: String // VK-XXXX
  },
  evidence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evidence'
  },
  clientPhone: {
    type: String
  },
  requireCode: {
    type: Boolean,
    default: true
  },
  progressHistory: [{
    photoPath: String,
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Task', TaskSchema);
