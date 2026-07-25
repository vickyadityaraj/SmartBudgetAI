# Smart Budget Genius - Personal Finance Dashboard

Smart Budget Genius is a feature-rich, full-stack personal finance dashboard and analytics platform. It is designed to help users track expenses, manage savings goals, analyze bank statements, and assess overall financial health with interactive visualizations.

---

## 🚀 Key Features

*   **Financial Health Analyzer**: A comprehensive scoring algorithm evaluating savings ratio, debt-to-income, expense-to-income, emergency fund adequacy, and goal progress.
*   **Bank Statement Analyzer**: Intelligent parsing of bank statements to extract transaction history and automatically categorize cash flows.
*   **Interactive Expense & Income Tracking**: Detail-oriented logging with categories, tags, and payment methods.
*   **Smart Savings Goals**: Progress tracking with milestones, priority levels, and automatic reminders.
*   **Data Visualizations**: Rich interactive charts (using Recharts) for category breakdowns, trend lines, and monthly budget comparisons.
*   **Secure Authentication**: JWT-based secure user authentication and route protection.

---

## 🛠️ Technology Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts
*   **Backend**: Node.js, Express.js, Mongoose
*   **Database**: MongoDB (Local or Atlas Cloud)

---

## 📋 Prerequisites

Before running the application, ensure you have the following installed:

1.  **Node.js** (v18.0.0 or higher recommended)
2.  **MongoDB** (either a locally running MongoDB instance or a MongoDB Atlas account)

---

## 🔑 Security & Environment Configuration (`.env`)

To run this application, you must configure your environment variables. 

> [!IMPORTANT]
> **CRITICAL SECURITY WARNING**
> Environment variables contain sensitive database credentials and secret keys. 
> *   The `.env` files are configured in `.gitignore` so they are **never** committed to Git or pushed to GitHub.
> *   Keep your `.env` file private and never share its contents.

### Environment Templates
We have provided template files showing what variables are required:
*   Root template: [`.env.example`](file:///d:/Finance/.env.example)
*   Backend template: [`backend/.env.example`](file:///d:/Finance/backend/.env.example)

### Required & Optional Environment Variables

Create `.env` files based on `.env.example` in both root and `backend/` directories:

```env
# Database & Server
MONGODB_URI=mongodb://127.0.0.1:27017/smartbudget
PORT=5000
NODE_ENV=development

# Security & Authentication
JWT_SECRET=your_jwt_secret_key_here

# Frontend Communication
VITE_API_URL=http://localhost:5000/api

# AI Financial Advisor API Keys (Optional)
GROQ_API_KEY=gsk_your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=sk-your_openai_api_key_here
```

#### Detailed Variable Reference:
1. **`MONGODB_URI`** (MongoDB Connection String)
   * **Local MongoDB**: `mongodb://127.0.0.1:27017/smartbudget`
   * **MongoDB Atlas Cloud**: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/smartbudget?retryWrites=true&w=majority`
2. **`PORT`**: Backend server port (default: `5000`).
3. **`NODE_ENV`**: Environment mode (`development` or `production`).
4. **`JWT_SECRET`**: Secret key for JWT token encryption. Generate one using:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
5. **`VITE_API_URL`**: Backend API base URL for frontend (`http://localhost:5000/api`).
6. **`GROQ_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY`**: Optional API keys for AI advisor insights and recommendations.

---

## 📦 Installation of Dependencies

You need to install dependencies for both the root (React frontend) and the `backend` (Express API server).

### Option A: One-Command Installation (Recommended)

From the root directory, run:

```bash
npm run setup
```

*This command automatically executes `npm install` in the root directory and then in the `backend` directory.*

### Option B: Manual Step-by-Step Installation

1. **Install Root (Frontend) Dependencies:**
   ```bash
   npm install
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

---

## ⚡ Setup & Database Seeding

### Automated Setup Tool (Recommended)

Run the interactive setup tool to configure `.env`, install dependencies, test database connectivity, and seed sample data:

```bash
npm run setup-db
```

### Manual Database Initialization

If you prefer initializing manually:

1. **Copy Environment Files**:
   ```bash
   # Windows PowerShell / CMD
   copy .env.example .env
   copy backend\.env.example backend\.env

   # Mac / Linux
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

2. **Test Database Connection**:
   ```bash
   npm run test-db
   ```

3. **Initialize & Seed Database**:
   ```bash
   npm run init-db
   ```

---

## 🔑 Pre-seeded Admin Account Credentials

Database initialization seeds a demo account with **6 months of realistic financial transactions, goals, and metrics**:

* **Email:** `admin@smartbudget.com`
* **Password:** `SmartBudget@123`

---

## 🏃 Running the Application

### Method 1: Run Frontend & Backend Concurrently (Recommended)

To start both the React frontend and Express backend simultaneously in a single terminal:

```bash
npm run start:all
```

* **Frontend App**: `http://localhost:5173`
* **Backend API**: `http://localhost:5000`

### Method 2: Run Frontend & Backend Separately

Open two terminal windows:

* **Terminal 1: Start Backend API**
  ```bash
  npm run server
  ```
  *(Runs `nodemon` in the `backend` folder to automatically restart on backend code changes)*

* **Terminal 2: Start Frontend App**
  ```bash
  npm run dev
  ```
  *(Launches Vite dev server with Hot Module Replacement at `http://localhost:5173`)*

### Method 3: Production Build & Preview

To test a production build locally:

1. **Build the Frontend**:
   ```bash
   npm run build
   ```
2. **Preview the Build**:
   ```bash
   npm run preview
   ```

---

## 🔍 Verifying the Application Setup

Verify that the backend service is up and connected to your database by visiting:

👉 **[http://localhost:5000/api/health](http://localhost:5000/api/health)**

Expected JSON response:
```json
{
  "status": "UP",
  "database": "connected",
  "timestamp": "2026-07-25T12:45:00.000Z"
}
```

---

## 📁 Database Schema Reference

Smart Budget Genius uses Mongoose schemas to manage the following collections:

*   `users`: User accounts, hashed credentials, and roles.
*   `expenses`: Detail-oriented expense records with payment methods and categories.
*   `incomes`: Recurring and non-recurring income records.
*   `savings`: Savings accounts and deposits.
*   `goals`: Financial goals, deadlines, priorities, and milestone progress.
*   `financialhealths`: Calculated financial health scores and contributing factors.
*   `settings`: Application and user preferences.
*   `alerts`: Smart notifications and budget warnings.

---

## ❓ Troubleshooting

### 1. Database Connection Fails (`MongoServerSelectionError` or `bad auth`)
*   **Authentication Failed**: Check that your database username and password in the connection string are correct. In MongoDB Atlas, these are database user credentials (set up under *Database Access*), not your Atlas account login credentials.
*   **IP Blocked**: Verify that your IP address is whitelisted in the MongoDB Atlas Security settings under **Network Access**.
*   **Local MongoDB**: Check if the MongoDB service is running on your computer.

### 2. Port Conflict (Port 5000 or 5173 already in use)
*   If port 5000 is already in use by another application, open your `.env` files, change `PORT` to a different number (e.g., `5001`), and update `VITE_API_URL` to match (e.g., `http://localhost:5001/api`).
