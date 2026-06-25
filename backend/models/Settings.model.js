const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  language: {
    type: String,
    default: 'en'
  },
  theme: {
    type: String,
    default: 'light'
  },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    budgetAlerts: { type: Boolean, default: true },
    goalReminders: { type: Boolean, default: true },
    billReminders: { type: Boolean, default: true }
  },
  budgetPreferences: {
    startDayOfMonth: { type: Number, default: 1 },
    monthlyBudget: { type: Number, default: 0 },
    savingsTarget: { type: Number, default: 0 },
    categories: [{ type: String }]
  },
  displayPreferences: {
    defaultView: { type: String, default: 'monthly' },
    showDecimals: { type: Boolean, default: true },
    compactNumbers: { type: Boolean, default: false }
  },
  exportPreferences: {
    format: { type: String, default: 'csv' },
    includeCategories: { type: Boolean, default: true },
    includeTags: { type: Boolean, default: true },
    dateFormat: { type: String, default: 'YYYY-MM-DD' }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
