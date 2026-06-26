const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const FinancialHealth = require('../models/FinancialHealth.model');
const User = require('../models/User.model');
const Expense = require('../models/Expense.model');
const Income = require('../models/Income.model');
const Savings = require('../models/Savings.model');
const Goal = require('../models/Goal.model');

const { recalculateFinancialHealth } = require('../utils/financialHealthHelper');

// Helper to enrich FinancialHealth with dynamic/calculated balance, income, expenses, and savings
async function getEnrichedFinancialHealth(userId, healthScore) {
  const [expenses, incomes, savings] = await Promise.all([
    Expense.find({ userId }),
    Income.find({ userId }),
    Savings.find({ userId })
  ]);

  const dynamicIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const dynamicExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const dynamicSavings = savings.reduce((sum, s) => {
    return sum + (s.type === 'deposit' ? s.amount : -s.amount);
  }, 0);
  const dynamicBalance = dynamicIncome - dynamicExpenses - dynamicSavings;

  return {
    ...healthScore.toObject(),
    balance: healthScore.balanceOverride !== undefined ? healthScore.balanceOverride : dynamicBalance,
    income: healthScore.incomeOverride !== undefined ? healthScore.incomeOverride : dynamicIncome,
    expenses: healthScore.expensesOverride !== undefined ? healthScore.expensesOverride : dynamicExpenses,
    savings: healthScore.savingsOverride !== undefined ? healthScore.savingsOverride : dynamicSavings
  };
}

// Get financial health score and summary (GET /)
router.get('/', auth, async (req, res) => {
  try {
    // Automatically recalculate on GET to ensure fresh data
    const healthScore = await recalculateFinancialHealth(req.user.id);
    const enrichedData = await getEnrichedFinancialHealth(req.user.id, healthScore);
    res.json(enrichedData);
  } catch (err) {
    console.error('Error fetching/calculating financial health:', err);
    res.status(500).json({ message: 'Error fetching financial health score' });
  }
});

// Recalculate financial health score (explicit endpoint)
router.post('/calculate', auth, async (req, res) => {
  try {
    const healthScore = await recalculateFinancialHealth(req.user.id);
    const enrichedData = await getEnrichedFinancialHealth(req.user.id, healthScore);
    res.json(enrichedData);
  } catch (err) {
    console.error('Error calculating financial health:', err);
    res.status(500).json({ message: 'Error calculating financial health score' });
  }
});

// Update financial data (PATCH / - manual dashboard overrides)
router.patch('/', auth, async (req, res) => {
  try {
    const { balance, income, expenses, savings } = req.body;
    let healthScore = await FinancialHealth.findOne({ userId: req.user.id });
    if (!healthScore) {
      healthScore = new FinancialHealth({ userId: req.user.id });
    }

    if (balance !== undefined) healthScore.balanceOverride = balance;
    if (income !== undefined) healthScore.incomeOverride = income;
    if (expenses !== undefined) healthScore.expensesOverride = expenses;
    if (savings !== undefined) healthScore.savingsOverride = savings;

    await healthScore.save();

    // Recalculate score & weights, then enrich and return
    const updatedScore = await recalculateFinancialHealth(req.user.id);
    const enrichedData = await getEnrichedFinancialHealth(req.user.id, updatedScore);
    res.json(enrichedData);
  } catch (err) {
    console.error('Error updating financial overrides:', err);
    res.status(500).json({ message: 'Error updating financial data' });
  }
});

// Update factor weights
router.put('/weights', auth, async (req, res) => {
  try {
    const { weights } = req.body;
    let healthScore = await FinancialHealth.findOne({ userId: req.user.id });
    
    if (!healthScore) {
      healthScore = new FinancialHealth({ userId: req.user.id });
    }

    // Update weights if provided
    if (weights.savingsRatio) healthScore.factors.savingsRatio.weight = weights.savingsRatio;
    if (weights.debtToIncome) healthScore.factors.debtToIncome.weight = weights.debtToIncome;
    if (weights.expensesToIncome) healthScore.factors.expensesToIncome.weight = weights.expensesToIncome;
    if (weights.emergencyFund) healthScore.factors.emergencyFund.weight = weights.emergencyFund;
    if (weights.goalProgress) healthScore.factors.goalProgress.weight = weights.goalProgress;

    // Recalculate score with new weights
    healthScore.recalculateScore();
    await healthScore.save();

    res.json(healthScore);
  } catch (err) {
    res.status(500).json({ message: 'Error updating factor weights' });
  }
});

// Get score history (mock data for now)
router.get('/history', auth, async (req, res) => {
  try {
    const currentScore = await FinancialHealth.findOne({ userId: req.user.id });
    
    // Generate mock historical data
    const history = [];
    const baseScore = currentScore ? currentScore.overallScore : 50;
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      history.push({
        date: date.toISOString().split('T')[0],
        score: Math.max(0, Math.min(100, baseScore + Math.floor(Math.random() * 20) - 10))
      });
    }

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching score history' });
  }
});

module.exports = router; 