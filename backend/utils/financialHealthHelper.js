const mongoose = require('mongoose');
const FinancialHealth = require('../models/FinancialHealth.model');
const Expense = require('../models/Expense.model');
const Income = require('../models/Income.model');
const Savings = require('../models/Savings.model');
const Goal = require('../models/Goal.model');
const Settings = require('../models/Settings.model');
const Alert = require('../models/Alert.model');

/**
 * Recalculates the financial health score for a specific user and updates the database.
 * Also checks for budget limits and automatically generates alerts if thresholds are crossed.
 * 
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Object>} The updated FinancialHealth document.
 */
async function recalculateFinancialHealth(userId) {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Get user's financial data
    const [expenses, incomes, savings, goals, settings] = await Promise.all([
      Expense.find({ userId: userObjectId }),
      Income.find({ userId: userObjectId }),
      Savings.find({ userId: userObjectId }),
      Goal.find({ userId: userObjectId }),
      Settings.findOne({ userId: userObjectId })
    ]);

    // 2. Find the range of months in the data to calculate realistic monthly averages
    // We combine all transaction dates to find the start and end dates
    const allDates = [
      ...expenses.map(e => e.date),
      ...incomes.map(i => i.date),
      ...savings.map(s => s.date)
    ].filter(Boolean);

    let numMonths = 1;
    if (allDates.length > 0) {
      const earliestDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
      const latestDate = new Date(Math.max(...allDates.map(d => new Date(d).getTime())));
      
      // Calculate difference in months
      const yearDiff = latestDate.getFullYear() - earliestDate.getFullYear();
      const monthDiff = latestDate.getMonth() - earliestDate.getMonth();
      const totalMonths = (yearDiff * 12) + monthDiff + 1;
      
      numMonths = Math.max(1, totalMonths);
    }

    // 3. Calculate monthly averages
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const averageMonthlyIncome = totalIncome / numMonths;

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const averageMonthlyExpenses = totalExpenses / numMonths;

    // Total savings is deposits minus withdrawals
    const netSavings = savings.reduce((sum, s) => {
      return sum + (s.type === 'deposit' ? s.amount : -s.amount);
    }, 0);
    const averageMonthlySavings = netSavings / numMonths;

    // 4. Find or create FinancialHealth document
    let healthScore = await FinancialHealth.findOne({ userId: userObjectId });
    if (!healthScore) {
      healthScore = new FinancialHealth({ userId: userObjectId });
    }

    // 5. Calculate Savings Ratio Score (ideal savings rate is 20% or higher, 50%+ is 100 score)
    const savingsRatio = averageMonthlyIncome > 0 ? (averageMonthlySavings / averageMonthlyIncome) * 100 : 0;
    healthScore.factors.savingsRatio.score = Math.max(0, Math.min(100, Math.round(savingsRatio * 2)));

    // 6. Calculate Expenses to Income Score (lower ratio is better, 0% expenses = 100 score)
    const expenseRatio = averageMonthlyIncome > 0 ? (averageMonthlyExpenses / averageMonthlyIncome) * 100 : 0;
    healthScore.factors.expensesToIncome.score = Math.max(0, Math.min(100, Math.round(100 - expenseRatio)));

    // 7. Calculate Emergency Fund Score (ideal emergency fund is 6 months of average expenses)
    const idealEmergencyFund = averageMonthlyExpenses * 6;
    if (idealEmergencyFund <= 0) {
      healthScore.factors.emergencyFund.score = 100;
    } else {
      const emergencyFundRatio = netSavings / idealEmergencyFund;
      healthScore.factors.emergencyFund.score = Math.max(0, Math.min(100, Math.round(emergencyFundRatio * 100)));
    }

    // 8. Calculate Goal Progress Score (average progress percentage of all active goals)
    const activeGoals = goals.filter(g => g.status === 'active');
    if (activeGoals.length === 0) {
      healthScore.factors.goalProgress.score = 100; // No active goals means no penalty
    } else {
      const totalGoalProgress = activeGoals.reduce((sum, goal) => {
        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        return sum + Math.min(100, progress);
      }, 0);
      healthScore.factors.goalProgress.score = Math.round(totalGoalProgress / activeGoals.length);
    }

    // 9. Calculate Debt to Income (DTI) Score
    // We look for expense categories related to debt service (e.g. EMI, Loan, Mortgage)
    const debtExpenses = expenses.filter(exp => {
      const cat = (exp.category || '').toLowerCase();
      const desc = (exp.description || '').toLowerCase();
      return cat.includes('emi') || cat.includes('loan') || cat.includes('debt') || cat.includes('mortgage') ||
             desc.includes('emi') || desc.includes('loan') || desc.includes('debt') || desc.includes('mortgage');
    });

    const totalDebt = debtExpenses.reduce((sum, d) => sum + d.amount, 0);
    const averageMonthlyDebt = totalDebt / numMonths;
    const dtiRatio = averageMonthlyIncome > 0 ? (averageMonthlyDebt / averageMonthlyIncome) * 100 : 0;
    
    // Healthy DTI is <= 36% in real life finance. Let's map it: 0% DTI = 100 score, 36% DTI = 0 score
    healthScore.factors.debtToIncome.score = Math.max(0, Math.min(100, Math.round(100 - (dtiRatio / 36) * 100)));

    // 10. Recalculate overall score and save
    healthScore.recalculateScore();
    await healthScore.save();

    // 11. AUTOMATIC ALERTS SYSTEM
    // Check if user has budget alerts enabled in settings (defaults to true if no settings)
    const budgetAlertsEnabled = settings ? settings.notifications.budgetAlerts : true;
    const monthlyBudgetLimit = settings ? settings.budgetPreferences.monthlyBudget : 0;

    if (budgetAlertsEnabled && monthlyBudgetLimit > 0) {
      // Calculate current month's expenses
      const startOfCurrentMonth = new Date();
      startOfCurrentMonth.setDate(1);
      startOfCurrentMonth.setHours(0, 0, 0, 0);

      const currentMonthExpensesList = expenses.filter(exp => new Date(exp.date) >= startOfCurrentMonth);
      const currentMonthExpensesTotal = currentMonthExpensesList.reduce((sum, exp) => sum + exp.amount, 0);

      // Check for 90% threshold
      if (currentMonthExpensesTotal >= monthlyBudgetLimit * 0.9 && currentMonthExpensesTotal < monthlyBudgetLimit) {
        // Check if an alert for this month already exists
        const alertExists = await Alert.findOne({
          userId: userObjectId,
          type: 'budget',
          createdAt: { $gte: startOfCurrentMonth },
          message: { $regex: /90%/ }
        });

        if (!alertExists) {
          const budgetAlert = new Alert({
            userId: userObjectId,
            type: 'budget',
            title: 'Budget Alert: Approaching Limit',
            message: `Warning: Your total spending this month has reached ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(currentMonthExpensesTotal)}, which is over 90% of your monthly budget limit of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(monthlyBudgetLimit)}.`,
            threshold: monthlyBudgetLimit * 0.9,
            category: 'wants'
          });
          await budgetAlert.save();
        }
      }

      // Check for 100% exceeded budget
      if (currentMonthExpensesTotal >= monthlyBudgetLimit) {
        const alertExists = await Alert.findOne({
          userId: userObjectId,
          type: 'budget',
          createdAt: { $gte: startOfCurrentMonth },
          message: { $regex: /exceeded/ }
        });

        if (!alertExists) {
          const budgetAlert = new Alert({
            userId: userObjectId,
            type: 'budget',
            title: 'Budget Exceeded Warning',
            message: `Alert: You have exceeded your monthly budget of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(monthlyBudgetLimit)}! Your total spending this month is currently ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(currentMonthExpensesTotal)}.`,
            threshold: monthlyBudgetLimit,
            category: 'wants'
          });
          await budgetAlert.save();
        }
      }
    }

    return healthScore;
  } catch (error) {
    console.error(`Error recalculating financial health for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  recalculateFinancialHealth
};
