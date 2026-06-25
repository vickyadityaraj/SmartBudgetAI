const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['budget', 'saving', 'bill', 'system', 'other'],
    default: 'budget'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  threshold: {
    type: Number
  },
  category: {
    type: String
  },
  frequency: {
    type: String,
    enum: ['once', 'daily', 'weekly', 'monthly'],
    default: 'once'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notificationMethod: [{
    type: String,
    enum: ['app', 'email', 'sms'],
    default: 'app'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
