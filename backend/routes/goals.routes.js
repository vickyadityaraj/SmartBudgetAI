const express = require('express');
const Goal = require('../models/Goal.model');
const auth = require('../middleware/auth.middleware');
const { recalculateFinancialHealth } = require('../utils/financialHealthHelper');

const router = express.Router();

// Get all goals
router.get('/', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id })
      .sort({ deadline: 1 });
    res.json({ goals });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching goals' });
  }
});

// Add new goal
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      targetAmount,
      category,
      deadline,
      milestones,
      priority,
      notes,
      reminderFrequency
    } = req.body;

    const goal = new Goal({
      userId: req.user._id,
      title,
      targetAmount,
      category,
      deadline,
      milestones: milestones || [],
      priority,
      notes,
      reminderFrequency
    });

    await goal.save();

    // Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.status(201).json({ goal });
  } catch (error) {
    res.status(500).json({ message: 'Error creating goal' });
  }
});

// Update goal
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = [
      'title',
      'targetAmount',
      'currentAmount',
      'category',
      'deadline',
      'milestones',
      'priority',
      'status',
      'notes',
      'reminderFrequency'
    ];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    updates.forEach(update => {
      goal[update] = req.body[update];
    });

    await goal.save();

    // Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.json({ goal });
  } catch (error) {
    res.status(500).json({ message: 'Error updating goal' });
  }
});

// Delete goal
router.delete('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    // Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.json({ goal });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting goal' });
  }
});

// Update goal progress
router.post('/:id/progress', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    await goal.updateProgress(amount);

    // Automatically recalculate user's Financial Health Score
    await recalculateFinancialHealth(req.user._id);

    res.json({ goal });
  } catch (error) {
    res.status(500).json({ message: 'Error updating goal progress' });
  }
});

// Add milestone to goal
router.post('/:id/milestones', auth, async (req, res) => {
  try {
    const { description, targetAmount } = req.body;
    
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    goal.milestones.push({
      description,
      targetAmount,
      completed: goal.currentAmount >= targetAmount
    });

    await goal.save();
    res.json({ goal });
  } catch (error) {
    res.status(500).json({ message: 'Error adding milestone' });
  }
});

// Update milestone
router.patch('/:id/milestones/:milestoneId', auth, async (req, res) => {
  try {
    const { description, targetAmount } = req.body;
    
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const milestone = goal.milestones.id(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    milestone.description = description || milestone.description;
    milestone.targetAmount = targetAmount || milestone.targetAmount;
    milestone.completed = goal.currentAmount >= milestone.targetAmount;

    await goal.save();
    res.json({ goal });
  } catch (error) {
    res.status(500).json({ message: 'Error updating milestone' });
  }
});

// Delete milestone
router.delete('/:id/milestones/:milestoneId', auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    goal.milestones = goal.milestones.filter(
      m => m._id.toString() !== req.params.milestoneId
    );

    await goal.save();
    res.json({ goal });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting milestone' });
  }
});

module.exports = router; 