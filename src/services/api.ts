import axios from 'axios';
import eventBus, { EVENTS } from './eventBus';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authorization header if token exists
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Dashboard API endpoints
export const dashboardApi = {
  getDashboardData: async (startDate?: Date, endDate?: Date) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    try {
      // Get overall financial data
      const financialDataPromise = apiClient.get('/financial-health?' + params.toString());
      
      // Get expense data
      const expensesPromise = apiClient.get('/expenses?' + params.toString());
      
      // Get savings data
      const savingsPromise = apiClient.get('/savings?' + params.toString());
      
      // Get upcoming bills/alerts
      const alertsPromise = apiClient.get('/alerts');
      
      // Wait for all requests to complete
      const [financialData, expenses, savings, alerts] = await Promise.all([
        financialDataPromise,
        expensesPromise,
        savingsPromise,
        alertsPromise
      ]);
      
      return {
        financialData: financialData.data,
        expenses: expenses.data,
        savings: savings.data,
        alerts: alerts.data
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },
  
  // Update financial data
  updateFinancialData: async (data: any) => {
    return apiClient.patch('/financial-health', data);
  }
};

// Auth API endpoints
export const authApi = {
  login: async (email: string, password: string) => {
    return apiClient.post('/auth/login', { email, password });
  },
  register: async (userData: any) => {
    return apiClient.post('/auth/register', userData);
  },
  logout: async () => {
    localStorage.removeItem('token');
  }
};

// Expenses API endpoints
export const expensesApi = {
  getExpenses: async (startDate?: Date, endDate?: Date) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    return apiClient.get('/expenses?' + params.toString());
  },
  
  addExpense: async (expenseData: any) => {
    try {
      const response = await apiClient.post('/expenses', expenseData);
      // Emit event when expense is added
      eventBus.emit(EVENTS.EXPENSE_ADDED, response.data.expense);
      return response;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  },
  
  updateExpense: async (id: string, expenseData: any) => {
    try {
      const response = await apiClient.patch(`/expenses/${id}`, expenseData);
      // Emit event when expense is updated
      eventBus.emit(EVENTS.EXPENSE_UPDATED, response.data.expense);
      return response;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  },
  
  deleteExpense: async (id: string) => {
    try {
      const response = await apiClient.delete(`/expenses/${id}`);
      // Emit event when expense is deleted
      eventBus.emit(EVENTS.EXPENSE_DELETED, id);    
      return response;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }
};

// Savings API endpoints
export const savingsApi = {
  getSavings: async (startDate?: Date, endDate?: Date) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    return apiClient.get('/savings?' + params.toString());
  },
  addSaving: async (savingData: any) => {
    return apiClient.post('/savings', savingData);
  },
  updateSaving: async (id: string, savingData: any) => {
    return apiClient.patch(`/savings/${id}`, savingData);
  },
  deleteSaving: async (id: string) => {
    return apiClient.delete(`/savings/${id}`);
  }
};

// Goals API endpoints
export const goalsApi = {
  getGoals: async () => {
    return apiClient.get('/goals');
  },
  addGoal: async (goalData: any) => {
    return apiClient.post('/goals', goalData);
  },
  updateGoal: async (id: string, goalData: any) => {
    return apiClient.patch(`/goals/${id}`, goalData);
  },
  deleteGoal: async (id: string) => {
    return apiClient.delete(`/goals/${id}`);
  },
  updateGoalProgress: async (id: string, amount: number) => {
    return apiClient.post(`/goals/${id}/progress`, { amount });
  },
  addMilestone: async (id: string, milestone: any) => {
    return apiClient.post(`/goals/${id}/milestones`, milestone);
  }
};

// Income API endpoints
export const incomeApi = {
  getIncome: async (startDate?: Date, endDate?: Date) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    return apiClient.get('/income?' + params.toString());
  },
  addIncome: async (incomeData: any) => {
    return apiClient.post('/income', incomeData);
  }
};

// Reports API endpoints
export const reportsApi = {
  getReportsData: async (period: string, selectedDate?: Date) => {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (selectedDate) params.append('date', selectedDate.toISOString());
    
    try {
      // Get monthly data
      const monthlyDataPromise = apiClient.get('/reports/monthly?' + params.toString());
      
      // Get expense categories data
      const expenseCategoriesPromise = apiClient.get('/reports/expense-categories?' + params.toString());
      
      // Get financial health score
      const financialScorePromise = apiClient.get('/reports/financial-score?' + params.toString());
      
      // Wait for all requests to complete
      const [monthlyData, expenseCategories, financialScore] = await Promise.all([
        monthlyDataPromise,
        expenseCategoriesPromise,
        financialScorePromise
      ]);
      
      return {
        monthlyData: monthlyData.data,
        expenseCategories: expenseCategories.data,
        financialScore: financialScore.data
      };
    } catch (error) {
      console.error('Error fetching reports data:', error);
      // Return mock data for demo purposes
      return generateMockReportsData(period);
    }
  }
};

// Helper function to generate mock data for reports if API fails
const generateMockReportsData = (period: string) => {
  const months = parseInt(period.replace('M', '')) || 6;
  
  // Generate monthly data
  const monthlyData = Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      income: Math.random() * 80000 + 50000,
      expenses: Math.random() * 50000 + 30000,
      savings: Math.random() * 30000 + 10000,
      investments: Math.random() * 20000 + 5000
    };
  }).reverse();
  
  // Generate expense categories data
  const expenseCategories = [
    { name: 'Housing', value: 25000, fill: '#FF6B6B' },
    { name: 'Food', value: 12000, fill: '#4ECDC4' },
    { name: 'Transport', value: 8000, fill: '#45B7D1' },
    { name: 'Utilities', value: 5000, fill: '#96CEB4' },
    { name: 'Entertainment', value: 7000, fill: '#FFEEAD' },
    { name: 'Healthcare', value: 4000, fill: '#D4A5A5' },
    { name: 'Shopping', value: 9000, fill: '#9B786F' }
  ];
  
  // Calculate financial health score
  const latestMonth = monthlyData[monthlyData.length - 1];
  const savingsRate = (latestMonth.savings / latestMonth.income) * 100;
  const expenseRate = (latestMonth.expenses / latestMonth.income) * 100;
  const investmentRate = (latestMonth.investments / latestMonth.income) * 100;
  
  const financialScore = Math.min(
    Math.round((savingsRate * 0.4) + (100 - expenseRate) * 0.4 + (investmentRate * 0.2)),
    100
  );
  
  return {
    monthlyData,
    expenseCategories,
    financialScore: { score: financialScore }
  };
};

// Admin API endpoints
export const adminApi = {
  getStats: async () => {
    return apiClient.get('/admin/stats');
  },
  getUsers: async () => {
    return apiClient.get('/admin/users');
  },
  updateUserRole: async (id: string, role: 'user' | 'admin') => {
    return apiClient.patch(`/admin/users/${id}/role`, { role });
  },
  deleteUser: async (id: string) => {
    return apiClient.delete(`/admin/users/${id}`);
  }
};

export default apiClient; 