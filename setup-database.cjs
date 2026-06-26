/**
 * Smart Budget Genius - Database Setup Helper
 * This script helps to set up and connect the dashboard to the database
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Header
console.log(`
${colors.bright}${colors.cyan}=================================${colors.reset}
${colors.bright}${colors.cyan} SMART BUDGET GENIUS SETUP TOOL  ${colors.reset}
${colors.bright}${colors.cyan}=================================${colors.reset}
`);

console.log(`${colors.yellow}This utility will help you connect your dashboard to a local database or MongoDB Atlas in the cloud.${colors.reset}\n`);

// Paths to env files
const rootEnvPath = path.join(__dirname, '.env');
const backendEnvPath = path.join(__dirname, 'backend', '.env');

function runCommand(command) {
  try {
    console.log(`${colors.blue}Running: ${command}${colors.reset}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`${colors.red}Failed to execute command: ${command}${colors.reset}`);
    console.error(error.message);
    return false;
  }
}

async function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

async function setup() {
  try {
    let rootEnvExists = fs.existsSync(rootEnvPath);
    let backendEnvExists = fs.existsSync(backendEnvPath);
    let shouldConfigure = !rootEnvExists || !backendEnvExists;

    let currentMongoUri = 'mongodb://127.0.0.1:27017/smartbudget';
    let currentJwtSecret = 'smart-budget-genius-secure-key-2023';
    let currentPort = '5000';

    // If .env already exists, read current values to use as defaults
    if (rootEnvExists) {
      try {
        const rootEnvContent = fs.readFileSync(rootEnvPath, 'utf8');
        const uriMatch = rootEnvContent.match(/MONGODB_URI=(.*)/);
        const secretMatch = rootEnvContent.match(/JWT_SECRET=(.*)/);
        const portMatch = rootEnvContent.match(/PORT=(.*)/);

        if (uriMatch) currentMongoUri = uriMatch[1].trim();
        if (secretMatch) currentJwtSecret = secretMatch[1].trim();
        if (portMatch) currentPort = portMatch[1].trim();
      } catch (e) {
        // Ignore read errors
      }
    }

    if (rootEnvExists || backendEnvExists) {
      console.log(`${colors.green}Found existing configuration file(s).${colors.reset}`);
      console.log(`${colors.white}Current Database URI: ${colors.yellow}${currentMongoUri}${colors.reset}`);
      
      const response = await askQuestion(`\n${colors.cyan}Do you want to update your configuration (e.g., to connect to MongoDB Atlas)? (y/n) [default: n]: ${colors.reset}`);
      if (response.toLowerCase() === 'y') {
        shouldConfigure = true;
      }
    }

    if (shouldConfigure) {
      console.log(`\n${colors.bright}${colors.yellow}--- Database Configuration ---${colors.reset}`);
      console.log(`${colors.white}For MongoDB Atlas (Cloud), enter your connection string.`);
      console.log(`Format: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/smartbudget?retryWrites=true&w=majority`);
      console.log(`For Local MongoDB, press Enter to keep the default.\n`);

      // Ask for MongoDB connection string
      let mongoUri = await askQuestion(`${colors.cyan}Enter MongoDB connection URI\n[default: ${currentMongoUri}]: ${colors.reset}`);
      if (!mongoUri) {
        mongoUri = currentMongoUri;
      }
      
      // Ask for JWT Secret
      let jwtSecret = await askQuestion(`${colors.cyan}Enter JWT Secret\n[default: ${currentJwtSecret}]: ${colors.reset}`);
      if (!jwtSecret) {
        jwtSecret = currentJwtSecret;
      }
      
      // Ask for port
      let port = await askQuestion(`${colors.cyan}Enter backend server port\n[default: ${currentPort}]: ${colors.reset}`);
      if (!port) {
        port = currentPort;
      }
      
      // Create root .env file
      const rootEnvContent = `MONGODB_URI=${mongoUri}
JWT_SECRET=${jwtSecret}
PORT=${port}
VITE_API_URL=http://localhost:${port}/api`;
      
      fs.writeFileSync(rootEnvPath, rootEnvContent);
      console.log(`${colors.green}Created/Updated root .env file successfully.${colors.reset}`);

      // Create backend .env file
      const backendEnvContent = `MONGODB_URI=${mongoUri}
PORT=${port}
JWT_SECRET=${jwtSecret}
NODE_ENV=development`;

      // Ensure backend directory exists (should exist in workspace)
      const backendDir = path.join(__dirname, 'backend');
      if (!fs.existsSync(backendDir)) {
        fs.mkdirSync(backendDir);
      }
      
      fs.writeFileSync(backendEnvPath, backendEnvContent);
      console.log(`${colors.green}Created/Updated backend .env file successfully.${colors.reset}`);
    } else {
      console.log(`${colors.green}Keeping existing configuration files.${colors.reset}`);
    }
    
    // Install dependencies if needed
    console.log(`\n${colors.yellow}Checking if dependencies are installed...${colors.reset}`);
    
    if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
      console.log(`${colors.yellow}Installing dependencies...${colors.reset}`);
      runCommand('npm install');
    } else {
      console.log(`${colors.green}Dependencies already installed.${colors.reset}`);
    }
    
    // Test database connection
    console.log(`\n${colors.yellow}Testing database connection...${colors.reset}`);
    const connectionSuccess = runCommand('node backend/db-test.js');
    
    if (!connectionSuccess) {
      console.log(`\n${colors.red}${colors.bright}❌ Connection Test Failed!${colors.reset}`);
      console.log(`${colors.yellow}Please check your connection string and ensure that your IP address is whitelisted in MongoDB Atlas under "Network Access".${colors.reset}`);
    } else {
      // Ask about database initialization
      const initDb = await askQuestion(`\n${colors.cyan}Do you want to initialize the database with required collections, indexes, and sample seed data? (y/n) [default: y]: ${colors.reset}`);
      
      if (initDb.toLowerCase() !== 'n') {
        console.log(`\n${colors.yellow}Initializing database and seeding data...${colors.reset}`);
        runCommand('node backend/init-db.js');
      }
      
      // Success message
      console.log(`\n${colors.green}${colors.bright}✅ Database setup complete!${colors.reset}`);
      console.log(`\n${colors.yellow}To start the application:${colors.reset}`);
      console.log(`${colors.cyan}Run the complete app (frontend + backend):${colors.reset} npm run start:all`);
      console.log(`${colors.cyan}Or run them separately:${colors.reset}`);
      console.log(`  - Backend: npm run server`);
      console.log(`  - Frontend: npm run dev`);
      console.log(`\n${colors.yellow}Your dashboard is now connected to the database.${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Error during setup:${colors.reset}`, error);
  } finally {
    rl.close();
  }
}

// Run the setup
setup();
