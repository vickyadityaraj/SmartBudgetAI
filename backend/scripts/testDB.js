const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User.model');
const Expense = require('../models/Expense.model');
const Savings = require('../models/Savings.model');
const Goal = require('../models/Goal.model');

// Load environment variables
dotenv.config();

async function testDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartbudget';
    console.log('Using database URI:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected successfully');

    // Test User Operations
    console.log('\nTesting User Operations:');
    const testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });

    // Save user
    console.log('Saving test user...');
    await testUser.save();
    console.log('Test user saved successfully');

    // Find user
    console.log('Finding test user...');
    const foundUser = await User.findOne({ email: 'test@example.com' });
    console.log('Found user:', foundUser ? 'Yes' : 'No');

    // Test Expense Operations
    console.log('\nTesting Expense Operations:');
    const testExpense = new Expense({
      userId: testUser._id,
      amount: 1000,
      category: 'Test',
      description: 'Test expense'
    });

    // Save expense
    console.log('Saving test expense...');
    await testExpense.save();
    console.log('Test expense saved successfully');

    // Find expense
    console.log('Finding test expense...');
    const foundExpense = await Expense.findOne({ userId: testUser._id });
    console.log('Found expense:', foundExpense ? 'Yes' : 'No');

    // Test Savings Operations
    console.log('\nTesting Savings Operations:');
    const testSaving = new Savings({
      userId: testUser._id,
      amount: 5000,
      type: 'deposit',
      category: 'Test',
      description: 'Test saving'
    });

    // Save saving
    console.log('Saving test saving...');
    await testSaving.save();
    console.log('Test saving saved successfully');

    // Find saving
    console.log('Finding test saving...');
    const foundSaving = await Savings.findOne({ userId: testUser._id });
    console.log('Found saving:', foundSaving ? 'Yes' : 'No');

    // Clean up test data
    console.log('\nCleaning up test data...');
    await Promise.all([
      User.deleteOne({ email: 'test@example.com' }),
      Expense.deleteOne({ _id: testExpense._id }),
      Savings.deleteOne({ _id: testSaving._id })
    ]);
    console.log('Test data cleaned up successfully');

    console.log('\nAll database tests completed successfully!');
  } catch (error) {
    console.error('Error during database testing:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the tests
console.log('Starting database tests...');
testDatabase(); 