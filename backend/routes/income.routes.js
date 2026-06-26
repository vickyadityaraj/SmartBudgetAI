const express = require('express');
const Income = require('../models/Income.model');
const auth = require('../middleware/auth.middleware');
const { recalculateFinancialHealth } = require('../utils/financialHealthHelper');

const router = express.Router();

// Get all income entries
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

    const income = await Income.find(query)
      .sort({ date: -1 });

    // Calculate total income
    const totalIncome = income.reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate income by source
    const incomeBySource = await Income.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
          _id: '$source',
          total: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      income,
      totalIncome,
      incomeBySource
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching income' });
  }
});

// Add new income entry
router.post('/', auth, async (req, res) => {
  try {
    const {
      amount,
      source,
      description,
      date,
      category,
      isRecurring,
      recurringFrequency,
      tags
    } = req.body;

    const income = new Income({
      userId: req.user._id,
      amount,
      source,
      description,
      date: date || new Date(),
      category,
      isRecurring,
      recurringFrequency,
      tags: tags || []
    });

    await income.save();

    // Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.status(201).json({ income });
  } catch (error) {
    res.status(500).json({ message: 'Error creating income entry' });
  }
});

// Update income entry
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = [
      'amount',
      'source',
      'description',
      'date',
      'category',
      'isRecurring',
      'recurringFrequency',
      'tags'
    ];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    const income = await Income.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!income) {
      return res.status(404).json({ message: 'Income entry not found' });
    }

    updates.forEach(update => {
      income[update] = req.body[update];
    });

    await income.save();

    // Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.json({ income });
  } catch (error) {
    res.status(500).json({ message: 'Error updating income entry' });
  }
});

// Delete income entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const income = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!income) {
      return res.status(404).json({ message: 'Income entry not found' });
    }

    // Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.json({ income });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting income entry' });
  }
});

// Get income statistics
router.get('/stats', auth, async (req, res) => {
  try {
    // Get total income
    const totalIncome = await Income.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get monthly income
    const monthlyIncome = await Income.aggregate([
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

    // Get income by source
    const incomeBySource = await Income.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
          _id: '$source',
          total: { $sum: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Get recurring income
    const recurringIncome = await Income.find({
      userId: req.user._id,
      isRecurring: true
    }).sort({ amount: -1 });

    res.json({
      totalIncome: totalIncome[0]?.total || 0,
      monthlyIncome,
      incomeBySource,
      recurringIncome
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching income statistics' });
  }
});

// Get recurring income
router.get('/recurring', auth, async (req, res) => {
  try {
    const recurringIncome = await Income.find({
      userId: req.user._id,
      isRecurring: true
    }).sort({ amount: -1 });

    const totalRecurring = recurringIncome.reduce((acc, curr) => acc + curr.amount, 0);

    res.json({
      recurringIncome,
      totalRecurring
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recurring income' });
  }
});

// Get income by source
router.get('/source/:source', auth, async (req, res) => {
  try {
    const income = await Income.find({
      userId: req.user._id,
      source: req.params.source
    }).sort({ date: -1 });

    const total = income.reduce((acc, curr) => acc + curr.amount, 0);

    res.json({
      income,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching income by source' });
  }
});

module.exports = router; 