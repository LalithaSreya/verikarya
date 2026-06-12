const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: [true, 'Please add a client name'],
    trim: true
  },
  clientPhone: {
    type: String,
    required: [true, 'Please add a client phone number'],
    trim: true
  },
  plan: {
    type: String,
    enum: ['Basic', 'Standard', 'Premium'],
    required: [true, 'Please select a subscription plan']
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Pending'],
    default: 'Active'
  },
  startDate: {
    type: Date,
    required: [true, 'Please add a start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please add an end date']
  },
  preventiveVisitsCount: {
    type: Number,
    default: 0
  },
  prioritySupport: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
