const express = require('express');
const Expense = require('../models/Expense.model');
const auth = require('../middleware/auth.middleware');
const { recalculateFinancialHealth } = require('../utils/financialHealthHelper');

const router = express.Router();

// Get all expenses
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

    const expenses = await Expense.find(query).sort({ date: -1 });
    const totalExpenses = await Expense.calculateTotalExpenses(
      req.user._id,
      startDate || new Date(0),
      endDate || new Date()
    );
    const categoryWiseExpenses = await Expense.getCategoryWiseExpenses(
      req.user._id,
      startDate || new Date(0),
      endDate || new Date()
    );

    res.json({
      expenses,
      totalExpenses,
      categoryWiseExpenses
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses' });
  }
});

// Add new expense
router.post('/', auth, async (req, res) => {
  try {
    const {
      amount,
      category,
      description,
      date,
      tags,
      paymentMethod,
      recurring,
      recurringFrequency
    } = req.body;

    const expense = new Expense({
      userId: req.user._id,
      amount,
      category,
      description,
      date: date || new Date(),
      tags,
      paymentMethod,
      recurring,
      recurringFrequency
    });

    await expense.save();

    // Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.status(201).json({ expense });
  } catch (error) {
    res.status(500).json({ message: 'Error adding expense' });
  }
});

// Update expense
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = [
      'amount',
      'category',
      'description',
      'date',
      'tags',
      'paymentMethod',
      'recurring',
      'recurringFrequency'
    ];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    updates.forEach(update => {
      expense[update] = req.body[update];
    });

    await expense.save();

    // Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.json({ expense });
  } catch (error) {
    res.status(500).json({ message: 'Error updating expense' });
  }
});

// Delete expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.json({ expense });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting expense' });
  }
});

// Get expense statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery = {
      userId: req.user._id
    };

    if (startDate && endDate) {
      matchQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            category: '$category'
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          categories: {
            $push: {
              category: '$_id.category',
              amount: '$totalAmount',
              count: '$count'
            }
          },
          totalExpenses: { $sum: '$totalAmount' }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          categories: 1,
          totalExpenses: 1
        }
      },
      { $sort: { year: 1, month: 1 } }
    ]);

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expense statistics' });
  }
});

module.exports = router; 