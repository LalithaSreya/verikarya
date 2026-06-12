const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'refModel'
  },
  refModel: {
    type: String,
    required: true,
    enum: ['Task', 'Visit']
  },
  rating: {
    type: Number,
    required: [true, 'Please add a rating between 1 and 5'],
    min: 1,
    max: 5
  },
  comments: {
    type: String,
    trim: true
  },
  clientName: {
    type: String,
    trim: true
  },
  clientPhone: {
    type: String,
    trim: true
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
