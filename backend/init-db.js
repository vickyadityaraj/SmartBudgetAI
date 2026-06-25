const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// MongoDB connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    console.log('✅ Connected to MongoDB');
    
    // Load all models
    const modelsPath = path.join(__dirname, 'models');
    const modelFiles = fs.readdirSync(modelsPath).filter(file => file.includes('.model.js'));
    
    console.log('Loading models:', modelFiles.join(', '));
    
    // Import all models to make sure schemas are registered
    modelFiles.forEach(file => {
      require(path.join(modelsPath, file));
      console.log(`Loaded model: ${file}`);
    });
    
    // Create indexes for each model
    console.log('\nCreating indexes...');
    for (const modelName of mongoose.modelNames()) {
      const model = mongoose.model(modelName);
      console.log(`Creating indexes for ${modelName}...`);
      await model.createIndexes();
      console.log(`✅ Indexes created for ${modelName}`);
    }
    
    // Check if User model exists and create an admin user if no users exist
    if (mongoose.modelNames().includes('User')) {
      const User = mongoose.model('User');
      const usersCount = await User.countDocuments();
      
      if (usersCount === 0) {
        console.log('\nNo users found. Creating admin user...');
        
        const bcrypt = require('bcryptjs');
        const adminUser = new User({
          name: 'Admin User',
          email: 'admin@smartbudget.com',
          password: await bcrypt.hash('SmartBudget@123', 10),
          role: 'admin'
        });
        
        await adminUser.save();
        console.log('✅ Admin user created successfully');
        console.log('Email: admin@smartbudget.com');
        console.log('Password: SmartBudget@123');

        // Seed financial data for admin user
        console.log('\nSeeding historical financial data for admin user...');
        const Expense = mongoose.model('Expense');
        const Income = mongoose.model('Income');
        const Savings = mongoose.model('Savings');
        const Goal = mongoose.model('Goal');
        const FinancialHealth = mongoose.model('FinancialHealth');

        const userId = adminUser._id;

        // Generate past dates
        const getPastDate = (monthsAgo, day) => {
          const d = new Date();
          d.setMonth(d.getMonth() - monthsAgo);
          d.setDate(day);
          d.setHours(12, 0, 0, 0);
          return d;
        };

        // 1. Seed Income (Salary and Freelance for past 6 months)
        const incomes = [];
        for (let i = 5; i >= 0; i--) {
          incomes.push({
            userId,
            amount: 75000,
            source: 'TechCorp Salary',
            category: 'Salary',
            description: 'Monthly paycheck',
            date: getPastDate(i, 1),
            isRecurring: true,
            recurringFrequency: 'monthly',
            tags: ['salary', 'primary']
          });
          incomes.push({
            userId,
            amount: 15000,
            source: 'Freelance Design',
            category: 'Freelance',
            description: 'UI Design consultation',
            date: getPastDate(i, 15),
            isRecurring: true,
            recurringFrequency: 'monthly',
            tags: ['freelance', 'side-hustle']
          });
        }
        await Income.insertMany(incomes);
        console.log(`✅ Seeded ${incomes.length} Income records`);

        // 2. Seed Expenses (Rent, utilities, food, etc. for past 6 months)
        const expenses = [];
        const foodCategories = ['Food & Dining', 'Groceries', 'Restaurants'];
        const shoppingCategories = ['Shopping', 'Clothing', 'Electronics'];
        
        for (let i = 5; i >= 0; i--) {
          // Monthly Rent
          expenses.push({
            userId,
            amount: 20000,
            category: 'Housing',
            description: 'Appartment rent',
            date: getPastDate(i, 1),
            paymentMethod: 'netbanking',
            recurring: true,
            recurringFrequency: 'monthly',
            tags: ['rent', 'fixed']
          });

          // Monthly Utilities
          expenses.push({
            userId,
            amount: 3200,
            category: 'Utilities',
            description: 'Electricity & Wifi bills',
            date: getPastDate(i, 5),
            paymentMethod: 'upi',
            recurring: true,
            recurringFrequency: 'monthly',
            tags: ['bills', 'utility']
          });

          // Transportation
          expenses.push({
            userId,
            amount: 1500,
            category: 'Transportation',
            description: 'Fuel & Cab fares',
            date: getPastDate(i, 10),
            paymentMethod: 'card',
            recurring: false,
            tags: ['commute']
          });

          // Weekly Food expenses
          for (let week = 1; week <= 4; week++) {
            expenses.push({
              userId,
              amount: Math.round(1200 + Math.random() * 800),
              category: foodCategories[week % foodCategories.length],
              description: `Weekly food expense W${week}`,
              date: getPastDate(i, week * 7),
              paymentMethod: 'upi',
              recurring: false,
              tags: ['food', 'weekly']
            });
          }

          // Monthly Entertainment
          expenses.push({
            userId,
            amount: Math.round(2500 + Math.random() * 2000),
            category: 'Entertainment',
            description: 'Movies, Dining out, Subscriptions',
            date: getPastDate(i, 20),
            paymentMethod: 'card',
            recurring: false,
            tags: ['fun', 'leisure']
          });

          // Monthly Shopping
          expenses.push({
            userId,
            amount: Math.round(3000 + Math.random() * 4000),
            category: shoppingCategories[i % shoppingCategories.length],
            description: 'Clothing & household shopping',
            date: getPastDate(i, 25),
            paymentMethod: 'card',
            recurring: false,
            tags: ['shopping']
          });
        }
        await Expense.insertMany(expenses);
        console.log(`✅ Seeded ${expenses.length} Expense records`);

        // 3. Seed Savings (past 6 months deposits)
        const savings = [];
        for (let i = 5; i >= 0; i--) {
          savings.push({
            userId,
            amount: 15000,
            type: 'deposit',
            category: 'Regular Savings',
            description: 'Monthly savings transfer',
            date: getPastDate(i, 5)
          });
          savings.push({
            userId,
            amount: 10000,
            type: 'deposit',
            category: 'Emergency Fund',
            description: 'Emergency fund contribution',
            date: getPastDate(i, 5)
          });
        }
        await Savings.insertMany(savings);
        console.log(`✅ Seeded ${savings.length} Savings records`);

        // 4. Seed Goals
        const goals = [
          {
            userId,
            title: 'Emergency Fund',
            targetAmount: 150000,
            currentAmount: 60000,
            category: 'Emergency Fund',
            deadline: (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d; })(),
            priority: 'high',
            status: 'active',
            notes: 'Build 6 months of expenses backup',
            reminderFrequency: 'monthly',
            milestones: [
              { description: '1 Month Expense Backup', targetAmount: 25000, completed: true },
              { description: '3 Month Expense Backup', targetAmount: 75000, completed: false },
              { description: '6 Month Expense Backup', targetAmount: 150000, completed: false }
            ]
          },
          {
            userId,
            title: 'New Laptop for Work',
            targetAmount: 80000,
            currentAmount: 20000,
            category: 'Other',
            deadline: (() => { const d = new Date(); d.setMonth(d.getMonth() + 10); return d; })(),
            priority: 'medium',
            status: 'active',
            notes: 'MacBook Air or Pro replacement',
            reminderFrequency: 'never',
            milestones: [
              { description: 'Initial savings deposit', targetAmount: 20000, completed: true },
              { description: 'Halfway target', targetAmount: 40000, completed: false }
            ]
          },
          {
            userId,
            title: 'Europe Vacation',
            targetAmount: 120000,
            currentAmount: 15000,
            category: 'Vacation',
            deadline: (() => { const d = new Date(); d.setMonth(d.getMonth() + 8); return d; })(),
            priority: 'low',
            status: 'active',
            notes: 'Planning for Paris and Rome trip',
            reminderFrequency: 'weekly',
            milestones: [
              { description: 'Flights deposit', targetAmount: 30000, completed: false }
            ]
          }
        ];
        await Goal.insertMany(goals);
        console.log(`✅ Seeded ${goals.length} Goal records`);

        // 5. Seed FinancialHealth
        const health = new FinancialHealth({
          userId,
          overallScore: 78,
          factors: {
            savingsRatio: { score: 85, weight: 0.3 },
            debtToIncome: { score: 90, weight: 0.2 },
            expensesToIncome: { score: 70, weight: 0.2 },
            emergencyFund: { score: 65, weight: 0.2 },
            goalProgress: { score: 80, weight: 0.1 }
          }
        });
        await health.save();
        console.log('✅ Seeded FinancialHealth score');

      } else {
        console.log(`Found ${usersCount} existing users. Skipping admin user creation and seeding.`);
      }
    }
    
    // Verify collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nVerified collections in database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    console.log('\nDatabase initialization completed successfully');
    
  } catch (error) {
    console.error('❌ Database initialization error:');
    console.error(error);
  } finally {
    // Close the connection
    if (mongoose.connection.readyState) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the initialization
initializeDatabase(); 