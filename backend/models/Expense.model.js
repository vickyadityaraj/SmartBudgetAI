const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: String,
  date: {
    type: Date,
    default: Date.now
  },
  tags: [{
    type: String
  }],
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'netbanking', 'other'],
    default: 'cash'
  },
  recurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: 'monthly'
  }
}, {
  timestamps: true
});

// Virtual for formatted amount
expenseSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(this.amount);
});

// Method to calculate total expenses for a period
expenseSchema.statics.calculateTotalExpenses = async function(userId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);
  return result.length > 0 ? result[0].total : 0;
};

// Method to get category-wise expenses
expenseSchema.statics.getCategoryWiseExpenses = async function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' }
      }
    },
    {
      $project: {
        category: '$_id',
        total: 1,
        _id: 0
      }
    }
  ]);
};

module.exports = mongoose.model('Expense', expenseSchema); 