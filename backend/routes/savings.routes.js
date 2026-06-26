const express = require('express');
const Saving = require('../models/Savings.model');
const Goal = require('../models/Goal.model');
const Alert = require('../models/Alert.model');
const auth = require('../middleware/auth.middleware');
const { recalculateFinancialHealth } = require('../utils/financialHealthHelper');

const router = express.Router();

// Helper to adjust Goal progress when a savings entry is created or deleted
async function adjustGoalProgress(userId, category, amount, isIncrement) {
  try {
    // Find an active goal matching the savings category
    const goal = await Goal.findOne({
      userId,
      status: 'active',
      $or: [
        { category: category },
        { title: { $regex: new RegExp(category, 'i') } }
      ]
    });

    if (goal) {
      const adjustment = isIncrement ? amount : -amount;
      goal.currentAmount = Math.max(0, Math.min(goal.currentAmount + adjustment, goal.targetAmount));
      
      // Update milestone completion status
      goal.milestones.forEach(milestone => {
        milestone.completed = goal.currentAmount >= milestone.targetAmount;
      });

      // Update goal status
      if (goal.currentAmount >= goal.targetAmount) {
        goal.status = 'completed';

        // Automatically create a Savings Goal Achieved Alert
        const goalAlert = new Alert({
          userId,
          type: 'saving',
          title: 'Savings Goal Achieved!',
          message: `Congratulations! You have fully achieved your savings goal "${goal.title}" by reaching your target of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(goal.targetAmount)}.`,
          threshold: goal.targetAmount,
          category: 'savings'
        });
        await goalAlert.save();
      } else {
        goal.status = 'active';
      }

      await goal.save();
    }
  } catch (error) {
    console.error('Error adjusting goal progress from savings:', error);
  }
}

// Get all savings entries
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.user._id };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const savings = await Saving.find(query)
      .sort({ date: -1 });

    // Calculate total savings
    const totalSavings = savings.reduce((acc, curr) => {
      return acc + (curr.type === 'deposit' ? curr.amount : -curr.amount);
    }, 0);

    // Calculate savings by category
    const savingsByCategory = await Saving.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
          _id: '$category',
          total: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'deposit'] },
                '$amount',
                { $multiply: ['$amount', -1] }
              ]
            }
          }
        }
      }
    ]);

    res.json({
      savings,
      totalSavings,
      savingsByCategory
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching savings' });
  }
});

// Add new saving entry
router.post('/', auth, async (req, res) => {
  try {
    const {
      amount,
      type, // 'deposit' or 'withdrawal'
      category,
      description,
      date,
      source,
      isRecurring,
      recurringFrequency,
      tags
    } = req.body;

    const saving = new Saving({
      userId: req.user._id,
      amount,
      type: type || 'deposit', // Default to deposit
      category,
      description,
      date: date || new Date(),
      source,
      isRecurring,
      recurringFrequency,
      tags: tags || []
    });

    await saving.save();

    // 1. Automatically update associated Goal progress
    const isIncrement = (type || 'deposit') === 'deposit';
    await adjustGoalProgress(req.user._id, category, amount, isIncrement);

    // 2. Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.status(201).json({ saving });
  } catch (error) {
    console.error('Error creating saving entry:', error);
    res.status(500).json({ message: 'Error creating saving entry' });
  }
});

// Update saving entry
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = [
      'amount',
      'type',
      'category',
      'description',
      'date',
      'source',
      'isRecurring',
      'recurringFrequency',
      'tags'
    ];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    const saving = await Saving.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!saving) {
      return res.status(404).json({ message: 'Saving entry not found' });
    }

    // 1. Reverse the old saving entry's effect on Goal progress
    const oldIsIncrement = saving.type === 'deposit';
    await adjustGoalProgress(req.user._id, saving.category, saving.amount, !oldIsIncrement);

    // Update the saving entry fields
    updates.forEach(update => {
      saving[update] = req.body[update];
    });

    await saving.save();

    // 2. Apply the new saving entry's effect on Goal progress
    const newIsIncrement = saving.type === 'deposit';
    await adjustGoalProgress(req.user._id, saving.category, saving.amount, newIsIncrement);

    // 3. Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.json({ saving });
  } catch (error) {
    console.error('Error updating saving entry:', error);
    res.status(500).json({ message: 'Error updating saving entry' });
  }
});

// Delete saving entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const saving = await Saving.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!saving) {
      return res.status(404).json({ message: 'Saving entry not found' });
    }

    // 1. Reverse the saving entry's effect on Goal progress
    const isIncrement = saving.type === 'deposit';
    await adjustGoalProgress(req.user._id, saving.category, saving.amount, !isIncrement);

    // Delete the entry
    await Saving.findByIdAndDelete(saving._id);

    // 2. Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.json({ saving });
  } catch (error) {
    console.error('Error deleting saving entry:', error);
    res.status(500).json({ message: 'Error deleting saving entry' });
  }
});

// Get savings statistics
router.get('/stats', auth, async (req, res) => {
  try {
    // Get total savings
    const totalSavings = await Saving.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get monthly savings
    const monthlySavings = await Saving.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: {
          '_id.year': -1,
          '_id.month': -1
        }
      }
    ]);

    // Get savings by category
    const savingsByCategory = await Saving.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Get recurring savings
    const recurringSavings = await Saving.find({
      userId: req.user._id,
      isRecurring: true
    }).sort({ amount: -1 });

    res.json({
      totalSavings: totalSavings[0]?.total || 0,
      monthlySavings,
      savingsByCategory,
      recurringSavings
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching savings statistics' });
  }
});

module.exports = router; 