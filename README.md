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

### Required Variables & How to Get Them

Here is the `.env` configuration you need to set up:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/smartbudget?appName=Aditya
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
VITE_API_URL=http://localhost:5000/api
```

#### 1. `MONGODB_URI` (MongoDB Connection String)
This connects your application to your database.
*   **Local Database**: If you have MongoDB installed locally, use:
    `mongodb://127.0.0.1:27017/smartbudget`
*   **Cloud Database (MongoDB Atlas)**:
    1.  Create a free account at [MongoDB Atlas](https://www.mongodb.com/).
    2.  Create a database cluster and set up a **Database User** with a username and password under **Security > Database Access**.
    3.  Whitelist your IP address (or `0.0.0.0/0` for access from anywhere) under **Security > Network Access**.
    4.  Click **Connect** on your cluster, select **Drivers**, choose **Node.js**, and copy the connection string.
    5.  Replace `<username>` and `<password>` with your database user credentials.
    *   *Note: If your password contains special characters like `@`, you must URL-encode them (e.g., `@` becomes `%40`) to prevent URI parsing errors.*

#### 2. `JWT_SECRET` (JSON Web Token Secret)
Used by the backend to securely sign and verify authentication tokens.
*   **How to get it**: You can use any long, secure, random string.
*   **Generate one quickly**: Open your terminal and run:
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```
    Copy the generated string and paste it as your `JWT_SECRET`.

#### 3. `PORT`
The port number on which your Express backend server will run (default is `5000`).

#### 4. `VITE_API_URL`
The API URL that the React frontend uses to communicate with the backend. It must point to the backend's address (usually `http://localhost:PORT/api`, which defaults to `http://localhost:5000/api`).

---

## ⚡ Quick Start: Automatic Setup (Recommended)

We have provided an automated setup script that configures your environment, verifies dependencies, tests your database connection, and seeds your database with sample data.

1.  Open your terminal in the root directory of the project.
2.  Run the following command:
    ```bash
    npm run setup-db
    ```
3.  The interactive setup tool will guide you through:
    *   Creating or verifying your `.env` file with custom database credentials.
    *   Installing all necessary root and backend dependencies.
    *   Testing your connection to the MongoDB database.
    *   Initializing the database with required collections, indexes, and **rich sample seed data**.

---

## 🔧 Manual Setup

If you prefer to configure the application manually, follow these steps:

### 1. Create your Environment Files
1.  Copy `.env.example` to a new file named `.env` in the root directory and fill in your variables.
2.  Copy `backend/.env.example` to a new file named `.env` in the `backend` directory and fill in your variables.

### 2. Install Dependencies
Install all required packages for both the frontend and backend in one command:
```bash
npm run setup
```
*(This runs `npm install` in the root and then runs `npm install` in the `backend` directory).*

### 3. Test the Database Connection
Verify that your backend can successfully connect to the configured MongoDB instance:
```bash
npm run test-db
```

### 4. Initialize and Seed the Database
Create the required collections, generate database indexes, and seed the database with sample records:
```bash
npm run init-db
```

---

## 🔑 Pre-seeded Admin Account (First-Run Experience)

During the database initialization, a default admin account is created and seeded with **6 months of realistic transaction history** (salary, freelance income, rent, utilities, food, transport, shopping, savings deposits, goals, and a pre-calculated financial health score). This allows you to immediately experience a fully-populated dashboard without entering data manually.

Use the following credentials to log in:

*   **Email:** `admin@smartbudget.com`
*   **Password:** `SmartBudget@123`

---

## 🏃 Running the Application

### 1. Concurrent Execution (Recommended)
To run both the React frontend and the Express backend concurrently in a single terminal:

```bash
npm run start:all
```

This command runs both servers in parallel using the `concurrently` package:
*   **Frontend (Vite dev server):** runs at `http://localhost:5173`
*   **Backend (Express API server):** runs at `http://localhost:5000`

### 2. Separate Execution (Alternative)
If you prefer to run and monitor the frontend and backend in separate terminal windows:

*   **Terminal 1: Start the Backend API Server**
    ```bash
    npm run server
    ```
    This launches the Express backend. It uses `nodemon` to automatically restart the server whenever you make changes to the backend files.

*   **Terminal 2: Start the Frontend React Application**
    ```bash
    npm run dev
    ```
    This launches the Vite development server for the React frontend with Hot Module Replacement (HMR) for instant updates.

---

## 🔍 Verifying the Setup

After starting the application, you can verify that the backend is running and connected to the database by visiting the health check endpoint in your browser:

👉 **[http://localhost:5000/api/health](http://localhost:5000/api/health)**

You should receive a JSON response showing database connection status:
```json
{
  "status": "UP",
  "database": "connected",
  "timestamp": "2026-06-26T11:30:00.000Z"
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
