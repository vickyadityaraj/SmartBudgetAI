const express = require('express');
const auth = require('../middleware/auth.middleware');
const User = require('../models/User.model');
const Expense = require('../models/Expense.model');
const Income = require('../models/Income.model');
const Savings = require('../models/Savings.model');
const Goal = require('../models/Goal.model');
const Alert = require('../models/Alert.model');

const router = express.Router();

// Middleware to verify the user is an admin
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
};

// Apply authentication and admin check to all endpoints in this router
router.use(auth);
router.use(adminOnly);

/**
 * @route   GET /api/admin/stats
 * @desc    Get aggregated system-wide statistics (privacy-preserved)
 * @access  Admin
 */
router.get('/stats', async (req, res) => {
  try {
    // 1. User metrics
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    // 2. Aggregated financials (Total sums and counts anonymously)
    const expenseAggregate = await Expense.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const incomeAggregate = await Income.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const savingsAggregate = await Savings.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const goalsCount = await Goal.countDocuments();
    const alertsCount = await Alert.countDocuments();

    const expenseStats = expenseAggregate[0] || { count: 0, totalAmount: 0 };
    const incomeStats = incomeAggregate[0] || { count: 0, totalAmount: 0 };
    const savingsStats = savingsAggregate[0] || { count: 0, totalAmount: 0 };

    // 3. Database status (collections & document counts)
    const collections = [
      { name: 'Users', count: await User.countDocuments() },
      { name: 'Expenses', count: expenseStats.count },
      { name: 'Incomes', count: incomeStats.count },
      { name: 'Savings', count: savingsStats.count },
      { name: 'Goals', count: goalsCount },
      { name: 'Alerts', count: alertsCount }
    ];

    // 4. System Uptime & Memory
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.json({
      users: {
        total: totalUsers + totalAdmins,
        regular: totalUsers,
        admins: totalAdmins
      },
      financials: {
        expenses: {
          count: expenseStats.count,
          totalAmount: expenseStats.totalAmount
        },
        incomes: {
          count: incomeStats.count,
          totalAmount: incomeStats.totalAmount
        },
        savings: {
          count: savingsStats.count,
          totalAmount: savingsStats.totalAmount
        },
        goals: {
          count: goalsCount
        }
      },
      database: {
        collections,
        connectionState: 'connected'
      },
      system: {
        uptime,
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching system statistics' });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get list of all registered users with record counts (no transaction details)
 * @access  Admin
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });

    // Populate counts for each user in parallel to keep it fast
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const userId = user._id;
        const expensesCount = await Expense.countDocuments({ userId });
        const incomesCount = await Income.countDocuments({ userId });
        const savingsCount = await Savings.countDocuments({ userId });
        const goalsCount = await Goal.countDocuments({ userId });

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          stats: {
            expensesCount,
            incomesCount,
            savingsCount,
            goalsCount,
            totalTransactions: expensesCount + incomesCount + savingsCount
          }
        };
      })
    );

    res.json(usersWithStats);
  } catch (error) {
    console.error('Error fetching users for admin:', error);
    res.status(500).json({ message: 'Error fetching users directory' });
  }
});

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Toggle user role (user -> admin or admin -> user)
 * @access  Admin
 */
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Prevent self-demotion
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If demoting an admin, make sure they are not the last admin
    if (role === 'user' && user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot demote the last administrator in the system' });
      }
    }

    user.role = role;
    await user.save();

    res.json({
      message: `User role updated to ${role} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user and cascade delete all their associated records
 * @access  Admin
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If deleting an admin, ensure they aren't the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last administrator in the system' });
      }
    }

    // Cascade deletion of all user data
    await Expense.deleteMany({ userId: id });
    await Income.deleteMany({ userId: id });
    await Savings.deleteMany({ userId: id });
    await Goal.deleteMany({ userId: id });
    await Alert.deleteMany({ userId: id });
    // If there is a FinancialHealth model or others, clean them too
    try {
      const FinancialHealth = require('../models/FinancialHealth.model');
      await FinancialHealth.deleteMany({ userId: id });
    } catch (e) {
      // Ignore if model doesn't exist
    }
    try {
      const Settings = require('../models/Settings.model');
      await Settings.deleteMany({ userId: id });
    } catch (e) {
      // Ignore if model doesn't exist
    }

    // Finally delete the user
    await User.deleteOne({ _id: id });

    res.json({ message: 'User and all associated financial records deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user and their records' });
  }
});

module.exports = router;
