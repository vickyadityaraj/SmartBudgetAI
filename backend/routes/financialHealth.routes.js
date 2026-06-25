const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const FinancialHealth = require('../models/FinancialHealth.model');
const User = require('../models/User.model');
const Expense = require('../models/Expense.model');
const Income = require('../models/Income.model');
const Savings = require('../models/Savings.model');
const Goal = require('../models/Goal.model');

// Get financial health score
router.get('/', auth, async (req, res) => {
  try {
    let healthScore = await FinancialHealth.findOne({ userId: req.user.id });
    
    if (!healthScore) {
      // Create initial health score if it doesn't exist
      healthScore = new FinancialHealth({
        userId: req.user.id
      });
      await healthScore.save();
    }
    
    res.json(healthScore);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching financial health score' });
  }
});

// Recalculate financial health score
router.post('/calculate', auth, async (req, res) => {
  try {
    let healthScore = await FinancialHealth.findOne({ userId: req.user.id });
    if (!healthScore) {
      healthScore = new FinancialHealth({ userId: req.user.id });
    }

    // Get user's financial data
    const [expenses, income, savings, goals] = await Promise.all([
      Expense.find({ userId: req.user.id }),
      Income.find({ userId: req.user.id }),
      Savings.find({ userId: req.user.id }),
      Goal.find({ userId: req.user.id })
    ]);

    // Calculate total monthly income
    const monthlyIncome = income.reduce((sum, inc) => sum + inc.amount, 0);

    // Calculate savings ratio
    const totalSavings = savings.reduce((sum, saving) => sum + saving.amount, 0);
    const savingsRatio = monthlyIncome > 0 ? (totalSavings / monthlyIncome) * 100 : 0;
    healthScore.factors.savingsRatio.score = Math.min(100, savingsRatio * 2); // 50% savings ratio = 100 score

    // Calculate expenses to income ratio
    const monthlyExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const expenseRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 100;
    healthScore.factors.expensesToIncome.score = Math.max(0, 100 - expenseRatio); // Lower ratio is better

    // Calculate emergency fund score (assuming 6 months of expenses is ideal)
    const monthlyExpenseAverage = monthlyExpenses / 12;
    const emergencyFundRatio = monthlyExpenseAverage > 0 ? totalSavings / (monthlyExpenseAverage * 6) : 0;
    healthScore.factors.emergencyFund.score = Math.min(100, emergencyFundRatio * 100);

    // Calculate goal progress
    if (goals.length > 0) {
      const goalScores = goals.map(goal => {
        const progress = (goal.currentAmount / goal.targetAmount) * 100;
        return Math.min(100, progress);
      });
      healthScore.factors.goalProgress.score = goalScores.reduce((sum, score) => sum + score, 0) / goals.length;
    }

    // Recalculate overall score
    healthScore.recalculateScore();
    await healthScore.save();

    res.json(healthScore);
  } catch (err) {
    console.error('Error calculating financial health:', err);
    res.status(500).json({ message: 'Error calculating financial health score' });
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