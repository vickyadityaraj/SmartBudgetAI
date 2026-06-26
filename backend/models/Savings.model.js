const mongoose = require('mongoose');

const savingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal'],
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
  }
}, {
  timestamps: true
});

// Virtual for formatted amount
savingsSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(this.amount);
});

// Method to calculate total savings
savingsSchema.statics.calculateTotalSavings = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: {
      _id: null,
      total: {
        $sum: {
          $cond: [
            { $eq: ['$type', 'deposit'] },
            '$amount',
            { $multiply: ['$amount', -1] }
          ]
        }
      }
    }}
  ]);
  return result.length > 0 ? result[0].total : 0;
};

// Method to calculate savings rate
savingsSchema.statics.calculateSavingsRate = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: {
      _id: '$type',
      total: { $sum: '$amount' }
    }}
  ]);
  
  const deposits = result.find(r => r._id === 'deposit')?.total || 0;
  const withdrawals = result.find(r => r._id === 'withdrawal')?.total || 0;
  
  return deposits > 0 ? ((deposits - withdrawals) / deposits) * 100 : 0;
};

module.exports = mongoose.model('Savings', savingsSchema); 