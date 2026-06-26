const mongoose = require('mongoose');

const financialHealthSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  overallScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 50
  },
  factors: {
    savingsRatio: {
      score: { type: Number, min: 0, max: 100, default: 0 },
      weight: { type: Number, default: 0.3 }
    },
    debtToIncome: {
      score: { type: Number, min: 0, max: 100, default: 0 },
      weight: { type: Number, default: 0.2 }
    },
    expensesToIncome: {
      score: { type: Number, min: 0, max: 100, default: 0 },
      weight: { type: Number, default: 0.2 }
    },
    emergencyFund: {
      score: { type: Number, min: 0, max: 100, default: 0 },
      weight: { type: Number, default: 0.15 }
    },
    goalProgress: {
      score: { type: Number, min: 0, max: 100, default: 0 },
      weight: { type: Number, default: 0.15 }
    }
  },
  balanceOverride: {
    type: Number
  },
  incomeOverride: {
    type: Number
  },
  expensesOverride: {
    type: Number
  },
  savingsOverride: {
    type: Number
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to recalculate overall score
financialHealthSchema.methods.recalculateScore = function() {
  const factors = this.factors;
  this.overallScore = Math.round(
    factors.savingsRatio.score * factors.savingsRatio.weight +
    factors.debtToIncome.score * factors.debtToIncome.weight +
    factors.expensesToIncome.score * factors.expensesToIncome.weight +
    factors.emergencyFund.score * factors.emergencyFund.weight +
    factors.goalProgress.score * factors.goalProgress.weight
  );
  this.lastUpdated = new Date();
  return this.overallScore;
};

module.exports = mongoose.model('FinancialHealth', financialHealthSchema); 