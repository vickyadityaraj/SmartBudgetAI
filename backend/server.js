const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

console.log('Starting server initialization...');

// Import routes
const authRoutes = require('./routes/auth.routes');
const savingsRoutes = require('./routes/savings.routes');
const expensesRoutes = require('./routes/expenses.routes');
const goalsRoutes = require('./routes/goals.routes');
const financialHealthRoutes = require('./routes/financialHealth.routes');
const alertsRoutes = require('./routes/alerts.routes');
const reportsRoutes = require('./routes/reports.routes');
const settingsRoutes = require('./routes/settings.routes');
const incomeRoutes = require('./routes/income.routes');
const adminRoutes = require('./routes/admin.routes');
const aiRoutes = require('./routes/ai.routes');

// Load environment variables
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();
console.log('Environment loaded, MONGODB_URI:', process.env.MONGODB_URI);
console.log('PORT:', process.env.PORT);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// MongoDB connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// MongoDB connection with retries
async function connectDB() {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`Attempting MongoDB connection (attempt ${retries + 1}/${maxRetries})...`);
      console.log('MongoDB URI:', process.env.MONGODB_URI);
      
      await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
      
      // Test the connection
      await mongoose.connection.db.admin().ping();
      
      console.log('Connected to MongoDB successfully');
      console.log('Database name:', mongoose.connection.name);
      console.log('Connection state:', mongoose.connection.readyState);
      
      // Set up mongoose debug logging
      mongoose.set('debug', process.env.NODE_ENV === 'development');
      
      return true;
    } catch (err) {
      console.error('MongoDB connection error:', err);
      console.error('Error name:', err.name);
      console.error('Error code:', err.code);
      
      retries++;
      if (retries === maxRetries) {
        console.error('Max retries reached. Exiting...');
        return false;
      }
      
      // Wait for 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Basic route for testing
app.get('/api/health', async (req, res) => {
  console.log('Health check endpoint called');
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    // Test database connection
    let pingResult = false;
    try {
      await mongoose.connection.db.admin().ping();
      pingResult = true;
    } catch (err) {
      console.error('Database ping failed:', err);
    }

    // Get collection stats
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    res.json({
      status: 'ok',
      message: 'Server is running',
      mongoStatus: dbStatus[dbState] || 'unknown',
      mongoPing: pingResult,
      databaseName: mongoose.connection.name,
      collections: collectionNames
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error checking server health',
      error: error.message
    });
  }
});

// Routes
console.log('Setting up routes...');
app.use('/api/auth', authRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/financial-health', financialHealthRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
console.log('Routes setup complete');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  console.error('Stack trace:', err.stack);
  
  // Log request details for debugging
  console.error('Request details:', {
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query,
    params: req.params
  });

  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server and connect to MongoDB
async function startServer() {
  try {
    const connected = await connectDB();
    if (!connected) {
      console.error('Failed to connect to MongoDB. Exiting...');
      process.exit(1);
    }

    const PORT = process.env.PORT || 5000;
    console.log('Attempting to start server on port', PORT);
    
    const server = app.listen(PORT, () => {
      console.log(`Server is running successfully on port ${PORT}`);
      console.log(`Test the API at: http://localhost:${PORT}/api/health`);
    });

    server.on('error', (error) => {
      console.error('Server error occurred:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

    // Monitor database connection
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB error:', err);
    });

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Handle process errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
});

// Start the server
startServer();

module.exports = app; 