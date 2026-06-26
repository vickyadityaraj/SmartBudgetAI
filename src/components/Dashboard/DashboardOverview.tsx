import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  IndianRupee,
  PiggyBank,
  Target,
  Edit2,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Plus,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, eachWeekOfInterval, getWeek, startOfWeek, endOfWeek, addDays } from 'date-fns';
// Import the API service
import { dashboardApi, expensesApi } from '@/services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Import event bus
import eventBus, { EVENTS } from '@/services/eventBus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "@/components/ui/use-toast";

// Format number to Indian currency format
const formatToINR = (number: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(number);
};

interface BalanceData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
}

interface DashboardData {
  financialData: {
    balance: number;
    income: number;
    expenses: number;
    savings: number;
  };
  expenses: {
    expenses: Array<any>;
    totalExpenses: number;
    categoryWiseExpenses: Array<{category: string; total: number}>;
  };
  savings: {
    totalSavings: number;
    savingsGoal: number;
    savingsItems: Array<any>;
  };
  alerts: {
    upcomingBills: Array<{
      name: string;
      amount: number;
      dueDate: string;
      category: string;
    }>;
  };
}

// Temporary function to generate daily expense data - will be replaced with API data
const generateDailyExpenseData = (startDate: Date, endDate: Date) => {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return {
      date: format(date, 'dd MMM'),
      amount: Math.random() * 2000 + 500
    };
  });
};

// Validation schema for manual expense entry
const expenseEntrySchema = z.object({
  date: z.string().nonempty("Date is required"),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  description: z.string().optional(),
});

// Validation schema for manual expense category entry
const categoryEntrySchema = z.object({
  name: z.string().nonempty("Category name is required"),
  value: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
});

// Add validation schema for adding a new expense
const newExpenseSchema = z.object({
  date: z.date({
    required_error: "Date is required",
  }),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  category: z.string({
    required_error: "Category is required",
  }),
  description: z.string().optional(),
});

type NewExpenseValues = z.infer<typeof newExpenseSchema>;

// Define 50-30-20 rule budget categories
const BUDGET_CATEGORIES = [
  { name: 'Needs (50%)', value: 50, color: '#FF6B6B' },
  { name: 'Wants (30%)', value: 30, color: '#4ECDC4' },
  { name: 'Savings (20%)', value: 20, color: '#45B7D1' },
];

// Function to generate weekly data
const generateWeeklyData = (startDate: Date, endDate: Date) => {
  // Get all weeks in the date range
  const weeks = eachWeekOfInterval({ start: startDate, end: endDate });
  
  return weeks.map((weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    const weekNumber = getWeek(weekStart);
    
    return {
      weekNumber,
      weekLabel: `Week ${weekNumber}`,
      dateRange: `${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM')}`,
      income: Math.round(Math.random() * 15000 + 15000),
      expenses: Math.round(Math.random() * 10000 + 8000),
      savings: 0, // Will be calculated
    };
  }).map(week => ({
    ...week,
    savings: week.income - week.expenses
  }));
};

// Function to generate monthly expense data
const generateMonthlyExpenseData = (numberOfMonths = 12) => {
  const currentDate = new Date();
  return Array.from({ length: numberOfMonths }, (_, i) => {
    const date = new Date(currentDate);
    date.setMonth(currentDate.getMonth() - (numberOfMonths - 1) + i);
    return {
      month: format(date, 'MMM yyyy'),
      amount: Math.random() * 30000 + 15000,
      shortMonth: format(date, 'MMM')
    };
  });
};

const DashboardOverview = () => {
  // State to track loading status
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Date range state for filtering data
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  
  // Time period selection for quick filters
  const [timePeriod, setTimePeriod] = useState<string>('current-month');
  
  // Dashboard data from API
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  // Fallback data for when API fails
  const [balanceData, setBalanceData] = useState<BalanceData>({
    totalBalance: 150000,
    monthlyIncome: 75000,
    monthlyExpenses: 45000,
    monthlySavings: 30000
  });

  const [monthlyExpenseData, setMonthlyExpenseData] = useState(
    generateMonthlyExpenseData(12)
  );
  
  // State for daily expense data
  const [dailyExpenseData, setDailyExpenseData] = useState(
    generateDailyExpenseData(dateRange.from, dateRange.to)
  );
  
  // State for expense categories
  const [expenseCategories, setExpenseCategories] = useState([
    { name: 'Food', value: 12000 },
    { name: 'Rent', value: 20000 },
    { name: 'Transport', value: 5000 },
    { name: 'Utilities', value: 3000 },
    { name: 'Entertainment', value: 5000 }
  ]);

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'];
  
  // State for editing financial values
  const [editingValue, setEditingValue] = useState('');
  const [editingField, setEditingField] = useState<keyof BalanceData | null>(null);

  // New state for dynamic features
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [dataChanged, setDataChanged] = useState<boolean>(false);
  const prevExpensesRef = useRef<any[]>([]);
  const prevBalanceRef = useRef<BalanceData>(balanceData);
  
  // State for editing expense data point
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState<boolean>(false);
  const [editingExpenseIndex, setEditingExpenseIndex] = useState<number | null>(null);
  const [editingExpenseValue, setEditingExpenseValue] = useState<string>('');
  const [editingExpenseDate, setEditingExpenseDate] = useState<string>('');
  
  // State for budget allocation
  const [budgetAllocation, setBudgetAllocation] = useState<{ name: string; value: number; color: string }[]>(
    BUDGET_CATEGORIES.map(category => ({
      ...category,
      value: (category.value / 100) * balanceData.monthlyIncome
    }))
  );

  // State for monthly and weekly reports
  const [monthlyReport, setMonthlyReport] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    weeklyData: [] as any[]
  });
  const [editingWeekly, setEditingWeekly] = useState(false);
  const [editingWeekIndex, setEditingWeekIndex] = useState<number | null>(null);
  const [editingWeekField, setEditingWeekField] = useState<string | null>(null);
  const [editingWeekValue, setEditingWeekValue] = useState<string>('');
  
  // State for adding a new expense
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState<boolean>(false);
  
  // Form for adding a new expense
  const newExpenseForm = useForm<NewExpenseValues>({
    resolver: zodResolver(newExpenseSchema),
    defaultValues: {
      date: new Date(),
      amount: "",
      category: "",
      description: "",
    },
  });

  // Calculate actual budget allocations based on income 
  const calculateBudgetAllocation = useCallback(() => {
    if (!balanceData.monthlyIncome) return;
    
    setBudgetAllocation(
      BUDGET_CATEGORIES.map(category => ({
        ...category,
        value: (category.value / 100) * balanceData.monthlyIncome
      }))
    );
  }, [balanceData.monthlyIncome]);

  // Update budget allocation when income changes
  useEffect(() => {
    calculateBudgetAllocation();
  }, [balanceData.monthlyIncome, calculateBudgetAllocation]);

  // Function to check if data has changed
  const checkDataChanges = useCallback((newData: any, oldData: any, type: 'expenses' | 'balance') => {
    if (!oldData || !newData) return false;
    
    if (type === 'expenses') {
      // Check if expenses count has changed
      if ((newData?.length || 0) !== (oldData?.length || 0)) return true;
      
      // Check if expense amounts have changed (simple check)
      const newTotal = newData.reduce((acc, exp) => acc + exp.amount, 0);
      const oldTotal = oldData.reduce((acc, exp) => acc + exp.amount, 0);
      return newTotal !== oldTotal;
    } else {
      // Check if any balance values have changed
      return (
        newData.totalBalance !== oldData.totalBalance ||
        newData.monthlyIncome !== oldData.monthlyIncome ||
        newData.monthlyExpenses !== oldData.monthlyExpenses ||
        newData.monthlySavings !== oldData.monthlySavings
      );
    }
  }, []);

  // Enhanced fetchDashboardData function with dynamic updates
  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      const data = await dashboardApi.getDashboardData(dateRange.from, dateRange.to);
      setDashboardData(data);
      
      // Check if data has changed compared to previous fetch
      const expensesChanged = checkDataChanges(
        data.expenses.expenses, 
        prevExpensesRef.current,
        'expenses'
      );
      
      // Store current expenses for future comparison
      prevExpensesRef.current = data.expenses.expenses || [];
      
      // Update local state with API data
      const newBalanceData = {
        totalBalance: data.financialData.balance,
        monthlyIncome: data.financialData.income,
        monthlyExpenses: data.financialData.expenses,
        monthlySavings: data.financialData.savings
      };
      
      const balanceChanged = checkDataChanges(
        newBalanceData,
        prevBalanceRef.current,
        'balance'
      );
      
      // Set data changed flag if either expenses or balance changed
      setDataChanged(expensesChanged || balanceChanged);
      
      // Store current balance for future comparison
      prevBalanceRef.current = newBalanceData;
      
      // Update state with animation if data changed
      if (balanceChanged) {
        // Apply the new balance data with animation
        setBalanceData(prev => {
          const animationDuration = 1000; // 1 second
          const steps = 20;
          const stepDuration = animationDuration / steps;
          
          // Calculate increments for each value
          const incTotal = (newBalanceData.totalBalance - prev.totalBalance) / steps;
          const incIncome = (newBalanceData.monthlyIncome - prev.monthlyIncome) / steps;
          const incExpenses = (newBalanceData.monthlyExpenses - prev.monthlyExpenses) / steps;
          const incSavings = (newBalanceData.monthlySavings - prev.monthlySavings) / steps;
          
          // Animate the values in steps
          let currentStep = 0;
          const interval = setInterval(() => {
            currentStep++;
            if (currentStep >= steps) {
              clearInterval(interval);
              setBalanceData(newBalanceData);
            } else {
              setBalanceData(prev => ({
                totalBalance: prev.totalBalance + incTotal,
                monthlyIncome: prev.monthlyIncome + incIncome,
                monthlyExpenses: prev.monthlyExpenses + incExpenses,
                monthlySavings: prev.monthlySavings + incSavings
              }));
            }
          }, stepDuration);
          
          // Return the same value initially, animation will update it
          return prev;
        });
      } else {
        // If no change, just update directly
        setBalanceData(newBalanceData);
      }
      
      // Update expense categories with API data
      if (data.expenses.categoryWiseExpenses?.length > 0) {
        setExpenseCategories(
          data.expenses.categoryWiseExpenses.map(item => ({
            name: item.category,
            value: item.total
          }))
        );
      }
      
      // Generate daily expense data from actual expenses
      if (data.expenses.expenses?.length > 0) {
        // Group expenses by date
        const expensesByDate = data.expenses.expenses.reduce((acc, expense) => {
          const date = format(new Date(expense.date), 'dd MMM');
          if (!acc[date]) {
            acc[date] = 0;
          }
          acc[date] += expense.amount;
          return acc;
        }, {});
        
        // Convert to array format for chart
        const dailyData = Object.keys(expensesByDate).map(date => ({
          date,
          amount: expensesByDate[date]
        })).sort((a, b) => {
          // Sort by date to ensure chronological order
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
        
        setDailyExpenseData(dailyData);
      } else {
        // If no expense data, use generated data
        setDailyExpenseData(generateDailyExpenseData(dateRange.from, dateRange.to));
      }
      
      // Update last updated time
      setLastUpdated(new Date());

      // Update monthly report based on expense data
      const updateMonthlyReport = () => {
        // Calculate total expenses from daily data for the current month
        const currentMonthExpenses = dailyExpenseData.reduce((total, item) => total + item.amount, 0);
        
        // Update the monthly report state
        setMonthlyReport(prev => {
          // Calculate new totals
          const totalExpenses = currentMonthExpenses;
          const totalSavings = prev.totalIncome - totalExpenses;
          
          // Update weekly data proportionally if it exists
          const updatedWeeklyData = prev.weeklyData.map(week => {
            const weekExpenseRatio = week.expenses / (prev.totalExpenses || 1);
            const newWeekExpenses = weekExpenseRatio * totalExpenses;
            return {
              ...week,
              expenses: newWeekExpenses,
              savings: week.income - newWeekExpenses
            };
          });
          
          return {
            ...prev,
            totalExpenses,
            totalSavings,
            weeklyData: updatedWeeklyData
          };
        });
      };
      
      // Call update function after data is fetched
      updateMonthlyReport();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // If API fails, stick with the current data
      setDataChanged(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRange, checkDataChanges]);

  // Fetch dashboard data on initial load and when date range changes
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, fetchDashboardData]);
  
  // Set up event listeners for expense changes
  useEffect(() => {
    // Listen for expense added, updated, or deleted events
    const handleExpenseChange = () => {
      console.log("Expense data updated. Dashboard refreshing with latest expense data.");
      
      // Refresh dashboard data
      fetchDashboardData();
    };
    
    // Register event listeners
    eventBus.on(EVENTS.EXPENSE_ADDED, handleExpenseChange);
    eventBus.on(EVENTS.EXPENSE_UPDATED, handleExpenseChange);
    eventBus.on(EVENTS.EXPENSE_DELETED, handleExpenseChange);
    
    // Clean up event listeners
    return () => {
      eventBus.off(EVENTS.EXPENSE_ADDED, handleExpenseChange);
      eventBus.off(EVENTS.EXPENSE_UPDATED, handleExpenseChange);
      eventBus.off(EVENTS.EXPENSE_DELETED, handleExpenseChange);
    };
  }, [fetchDashboardData]);
  
  // Auto refresh at a specific interval (every 5 minutes)
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
    
    return () => clearInterval(autoRefreshInterval);
  }, [fetchDashboardData]);

  // Handle time period change
  useEffect(() => {
    if (timePeriod === 'current-month') {
      setDateRange({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      });
    } else if (timePeriod === 'last-month') {
      const lastMonth = subMonths(new Date(), 1);
      setDateRange({
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth)
      });
    } else if (timePeriod === 'last-3-months') {
      setDateRange({
        from: startOfMonth(subMonths(new Date(), 2)),
        to: endOfMonth(new Date())
      });
    }
  }, [timePeriod]);

  const handleEdit = (field: keyof BalanceData) => {
    setEditingField(field);
    setEditingValue(balanceData[field].toString());
  };

  const handleSave = async () => {
    if (editingField) {
      const newValue = parseFloat(editingValue);
      if (!isNaN(newValue) && newValue >= 0) {
        // Update local state
        setBalanceData(prev => ({
          ...prev,
          [editingField]: newValue
        }));
        
        // Update in backend
        try {
          const dataToUpdate = {};
          switch (editingField) {
            case 'totalBalance':
              dataToUpdate['balance'] = newValue;
              break;
            case 'monthlyIncome':
              dataToUpdate['income'] = newValue;
              break;
            case 'monthlyExpenses':
              dataToUpdate['expenses'] = newValue;
              break;
            case 'monthlySavings':
              dataToUpdate['savings'] = newValue;
              break;
          }
          
          await dashboardApi.updateFinancialData(dataToUpdate);
        } catch (error) {
          console.error('Error updating financial data:', error);
        }
      }
      setEditingField(null);
    }
  };
  
  // Function to handle editing an expense data point
  const handleEditExpensePoint = (index: number) => {
    if (index >= 0 && index < dailyExpenseData.length) {
      setEditingExpenseIndex(index);
      setEditingExpenseValue(dailyExpenseData[index].amount.toString());
      setEditingExpenseDate(dailyExpenseData[index].date);
      setIsEditExpenseModalOpen(true);
    }
  };

  // Function to save edited expense data point
  const saveExpenseDataPoint = () => {
    if (editingExpenseIndex !== null && editingExpenseValue) {
      const newAmount = parseFloat(editingExpenseValue);
      
      if (!isNaN(newAmount) && newAmount >= 0) {
        // Create a new array with the updated value
        const updatedExpenseData = [...dailyExpenseData];
        updatedExpenseData[editingExpenseIndex] = {
          ...updatedExpenseData[editingExpenseIndex],
          amount: newAmount
        };
        
        setDailyExpenseData(updatedExpenseData);
        setIsEditExpenseModalOpen(false);
        
        // Show toast notification
        toast({
          title: "Expense updated",
          description: `Expense for ${editingExpenseDate} has been updated.`,
          variant: "default",
        });
      }
    }
  };
  
  // Calculate monthly report data
  const calculateMonthlyReport = useCallback(() => {
    const startDate = dateRange.from;
    const endDate = dateRange.to;
    
    // Generate weekly data based on date range
    const weeklyData = generateWeeklyData(startDate, endDate);
    
    // Calculate totals
    const totalIncome = weeklyData.reduce((sum, week) => sum + week.income, 0);
    const totalExpenses = weeklyData.reduce((sum, week) => sum + week.expenses, 0);
    const totalSavings = totalIncome - totalExpenses;
    
    setMonthlyReport({
      totalIncome,
      totalExpenses,
      totalSavings,
      weeklyData
    });
  }, [dateRange]);
  
  // Update monthly report when date range changes
  useEffect(() => {
    calculateMonthlyReport();
  }, [dateRange, calculateMonthlyReport]);
  
  // Function to edit weekly data
  const handleEditWeek = (index: number, field: string) => {
    setEditingWeekIndex(index);
    setEditingWeekField(field);
    setEditingWeekValue(monthlyReport.weeklyData[index][field].toString());
    setEditingWeekly(true);
  };
  
  // Function to save edited weekly data
  const saveWeeklyData = () => {
    if (editingWeekIndex !== null && editingWeekField && editingWeekValue) {
      const newValue = parseFloat(editingWeekValue);
      
      if (!isNaN(newValue) && newValue >= 0) {
        // Update the weekly data
        const updatedWeeklyData = [...monthlyReport.weeklyData];
        updatedWeeklyData[editingWeekIndex] = {
          ...updatedWeeklyData[editingWeekIndex],
          [editingWeekField]: newValue
        };
        
        // Recalculate savings for the edited week
        if (editingWeekField === 'income' || editingWeekField === 'expenses') {
          const week = updatedWeeklyData[editingWeekIndex];
          updatedWeeklyData[editingWeekIndex].savings = week.income - week.expenses;
        }
        
        // Recalculate totals
        const totalIncome = updatedWeeklyData.reduce((sum, week) => sum + week.income, 0);
        const totalExpenses = updatedWeeklyData.reduce((sum, week) => sum + week.expenses, 0);
        const totalSavings = totalIncome - totalExpenses;
        
        setMonthlyReport({
          totalIncome,
          totalExpenses,
          totalSavings,
          weeklyData: updatedWeeklyData
        });
        
        setEditingWeekIndex(null);
        setEditingWeekField(null);
        setEditingWeekly(false);
        
        // Show toast notification
        toast({
          title: "Weekly data updated",
          description: `Updated ${editingWeekField} for ${updatedWeeklyData[editingWeekIndex].weekLabel}`,
          variant: "default",
        });
      }
    }
  };
  
  // Add function to handle adding a new expense via backend API
  const handleAddExpense = async (values: NewExpenseValues) => {
    try {
      setIsRefreshing(true);
      await expensesApi.addExpense({
        amount: parseFloat(values.amount),
        category: values.category,
        description: values.description || "",
        date: values.date
      });

      toast({
        title: "Expense added successfully",
        description: "Your available balance and monthly statistics have been updated in real-time.",
      });

      // Close the modal and reset the form
      setIsAddExpenseModalOpen(false);
      newExpenseForm.reset();

      // Reload all dashboard data from the backend!
      await fetchDashboardData();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-card animate-fade-in">
              <CardHeader className="pb-2">
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-8 w-28 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="glass-card animate-fade-in">
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="h-[200px] sm:h-[300px]">
                <div className="h-full w-full bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // New function for manual refresh
  const handleRefresh = () => {
    fetchDashboardData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {format(lastUpdated, 'hh:mm a, dd MMM yyyy')}
            {dataChanged && <span className="ml-2 text-green-600">(New data available)</span>}
          </p>
        </div>
        
        {/* Date range filters */}
        <div className="flex flex-col xs:flex-row gap-3 items-start xs:items-center w-full sm:w-auto">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-full xs:w-[200px]">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Current Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            className="gap-1 w-full xs:w-auto relative"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
            {isRefreshing && (
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse"></div>
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Total Balance Card */}
        <Card className={`glass-card ${dataChanged ? 'animate-pulse-once' : 'animate-fade-in'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-center justify-between">
              <IndianRupee className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <div className="text-right">
                <p className="text-lg sm:text-2xl font-bold">{formatToINR(balanceData.totalBalance)}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Available Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Income Card */}
        <Card className={`glass-card ${dataChanged ? 'animate-pulse-once' : 'animate-fade-in'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Monthly Income
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
              <div className="text-right">
                <p className="text-lg sm:text-2xl font-bold">{formatToINR(balanceData.monthlyIncome)}</p>
                <p className="text-xs sm:text-sm text-green-600 flex items-center justify-end gap-1">
                  <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  This Month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Expenses Card */}
        <Card className={`glass-card ${dataChanged ? 'animate-pulse-once' : 'animate-fade-in'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Monthly Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-center justify-between">
              <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
              <div className="text-right">
                <p className="text-lg sm:text-2xl font-bold">{formatToINR(balanceData.monthlyExpenses)}</p>
                <p className="text-xs sm:text-sm text-red-600 flex items-center justify-end gap-1">
                  <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  This Month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Savings Card */}
        <Card className={`glass-card ${dataChanged ? 'animate-pulse-once' : 'animate-fade-in'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Monthly Savings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-center justify-between">
              <PiggyBank className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <div className="text-right">
                <p className="text-lg sm:text-2xl font-bold">{formatToINR(balanceData.monthlySavings)}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {((balanceData.monthlySavings / balanceData.monthlyIncome) * 100).toFixed(0)}% of income
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Budget Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Daily Expenses Chart */}
        <Card className={`glass-card ${dataChanged ? 'animate-pulse-once' : 'animate-fade-in'}`}>
          <CardHeader className="p-3 sm:p-6 pb-0">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base sm:text-lg">Daily Expenses</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {timePeriod === 'current-month'
                    ? 'Current Month'
                    : timePeriod === 'last-month'
                    ? 'Last Month'
                    : timePeriod === 'last-3-months'
                    ? 'Last 3 Months'
                    : 'Custom Range'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddExpenseModalOpen(true)}
                className="text-xs flex items-center gap-1"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Expense
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-0 h-[200px] sm:h-[300px]">
            {dailyExpenseData && dailyExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyExpenseData} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }}
                    tickFormatter={(value) => window.innerWidth < 640 && dailyExpenseData.length > 10 ? value.slice(0, 2) : value}
                  />
                  <YAxis tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }} />
                  <Tooltip
                    formatter={(value: number) => [formatToINR(value), 'Amount']}
                    contentStyle={{ fontSize: window.innerWidth < 768 ? '10px' : '12px' }}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="#3b82f6"
                    onClick={(data, index) => handleEditExpensePoint(index)}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full justify-center items-center flex-col">
                <div className="text-muted-foreground text-sm">No data available</div>
              </div>
            )}
          </CardContent>
          <div className="p-3 text-xs text-muted-foreground text-right">
            Click on any bar to edit its value
          </div>
        </Card>

        {/* Budget Allocation Chart (50-30-20 Rule) */}
        <Card className={`glass-card ${dataChanged ? 'animate-pulse-once' : 'animate-fade-in'}`}>
          <CardHeader className="p-3 sm:p-6 pb-0">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base sm:text-lg">Budget Allocation</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  50-30-20 Rule
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-8 sm:w-8"
                onClick={() => handleEdit('monthlyIncome')}
                title="Edit Monthly Income"
              >
                <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-0 h-[200px] sm:h-[300px]">
            {budgetAllocation && budgetAllocation.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={budgetAllocation}
                    cx="50%"
                    cy="50%"
                    outerRadius={window.innerWidth < 768 ? 70 : 100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => 
                      window.innerWidth < 640 
                        ? `${name.split(' ')[0]}`
                        : `${name}: ${formatToINR(value)}`
                    }
                    labelLine={window.innerWidth >= 640}
                  >
                    {budgetAllocation.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatToINR(value)} 
                    contentStyle={{ fontSize: window.innerWidth < 768 ? '10px' : '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full justify-center items-center flex-col">
                <div className="text-muted-foreground text-sm">No data available</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Expense Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Quick Actions - Budget Status */}
        <Card className="glass-card animate-fade-in hover:shadow-md transition-all duration-300">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Budget Status</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Monthly budget tracking</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span>Spent</span>
                <span>{formatToINR(balanceData.monthlyExpenses)}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000 ease-in-out"
                  style={{
                    width: `${Math.min((balanceData.monthlyExpenses / balanceData.monthlyIncome) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                <span>Budget</span>
                <span>{formatToINR(balanceData.monthlyIncome)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Savings Goal */}
        <Card className="glass-card animate-fade-in hover:shadow-md transition-all duration-300">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Savings Goal</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Progress tracking</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span>Current</span>
                <span>{formatToINR(balanceData.monthlySavings)}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-in-out"
                  style={{
                    width: `${(balanceData.monthlySavings / (balanceData.monthlyIncome * 0.2)) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                <span>Target (20%)</span>
                <span>{formatToINR(balanceData.monthlyIncome * 0.2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Upcoming Bills */}
        <Card className="glass-card animate-fade-in hover:shadow-md transition-all duration-300">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Upcoming Bills</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Next 7 days</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-4">
              {dashboardData?.alerts?.upcomingBills && dashboardData.alerts.upcomingBills.length > 0 ? (
                dashboardData.alerts.upcomingBills.slice(0, 3).map((bill, index) => (
                  <div key={index} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 group-hover:scale-125 transition-transform duration-300" />
                      <span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{bill.name}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium">{formatToINR(bill.amount)}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 group-hover:scale-125 transition-transform duration-300" />
                      <span className="text-xs sm:text-sm">Electricity Bill</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium">{formatToINR(2500)}</span>
                  </div>
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 group-hover:scale-125 transition-transform duration-300" />
                      <span className="text-xs sm:text-sm">Internet Bill</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium">{formatToINR(1200)}</span>
                  </div>
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 group-hover:scale-125 transition-transform duration-300" />
                      <span className="text-xs sm:text-sm">Phone Bill</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium">{formatToINR(800)}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actual Expense Categories Chart */}
      <Card className={`glass-card ${dataChanged ? 'animate-pulse-once' : 'animate-fade-in'}`}>
        <CardHeader className="p-3 sm:p-6 pb-0">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base sm:text-lg">Expense Categories</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {timePeriod === 'current-month'
                  ? 'Current Month'
                  : timePeriod === 'last-month'
                  ? 'Last Month'
                  : timePeriod === 'last-3-months'
                  ? 'Last 3 Months'
                  : 'Custom Range'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                Total: {formatToINR(expenseCategories.reduce((sum, item) => sum + item.value, 0))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-3 sm:pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie Chart View */}
            <div className="h-[200px] sm:h-[240px]">
              {expenseCategories && expenseCategories.length > 0 && expenseCategories.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      outerRadius={window.innerWidth < 768 ? 70 : 90}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => 
                        window.innerWidth < 640 
                          ? `${name.slice(0, 3)}..` 
                          : `${name}`
                      }
                      labelLine={window.innerWidth >= 640}
                    >
                      {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatToINR(value)} 
                      contentStyle={{ fontSize: window.innerWidth < 768 ? '10px' : '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full w-full justify-center items-center flex-col">
                  <div className="text-muted-foreground text-sm">No category data available</div>
                </div>
              )}
            </div>
            
            {/* Category List */}
            <div className="h-[200px] sm:h-[240px] overflow-y-auto px-2">
              {expenseCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between mb-3 group hover:bg-gray-50 p-2 rounded-md transition-colors">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium">{formatToINR(category.value)}</span>
                    <span className="text-xs text-muted-foreground">
                      {((category.value / expenseCategories.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Report Section */}
      <Card className="glass-card">
        <CardHeader className="p-3 sm:p-6">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Monthly Financial Report
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {format(dateRange.from, 'MMMM yyyy')}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingWeekly(!editingWeekly)}
              className="flex items-center gap-1"
            >
              {editingWeekly ? "View Summary" : "Edit Weekly"}
              {editingWeekly ? <BarChartIcon className="h-3 w-3 ml-1" /> : <Edit2 className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-2">
          {/* Monthly Summary (Static) */}
          {!editingWeekly && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600">{formatToINR(monthlyReport.totalIncome)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-lg sm:text-xl font-bold text-red-600">{formatToINR(monthlyReport.totalExpenses)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Savings</p>
                  <p className="text-lg sm:text-xl font-bold text-blue-600">{formatToINR(monthlyReport.totalSavings)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Monthly Overview</p>
                <div className="h-8 bg-gray-200 rounded-lg overflow-hidden flex">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${(monthlyReport.totalIncome / (monthlyReport.totalIncome + monthlyReport.totalExpenses)) * 100}%` }}
                    title="Income"
                  />
                  <div 
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${(monthlyReport.totalExpenses / (monthlyReport.totalIncome + monthlyReport.totalExpenses)) * 100}%` }}
                    title="Expenses"
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Income</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span>Expenses</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Savings Rate</p>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-in-out"
                    style={{
                      width: `${Math.max(0, Math.min(100, (monthlyReport.totalSavings / monthlyReport.totalIncome) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Savings Rate</span>
                  <span>{monthlyReport.totalIncome > 0 
                    ? `${Math.round((monthlyReport.totalSavings / monthlyReport.totalIncome) * 100)}%` 
                    : '0%'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Weekly Breakdown (Editable) */}
          {editingWeekly && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left font-medium p-2 pl-0">Week</th>
                      <th className="text-left font-medium p-2">Date Range</th>
                      <th className="text-right font-medium p-2">Income</th>
                      <th className="text-right font-medium p-2">Expenses</th>
                      <th className="text-right font-medium p-2">Savings</th>
                      <th className="text-right font-medium p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReport.weeklyData.map((week, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 pl-0">{week.weekLabel}</td>
                        <td className="p-2">{week.dateRange}</td>
                        <td className="p-2 text-right text-green-600">{formatToINR(week.income)}</td>
                        <td className="p-2 text-right text-red-600">{formatToINR(week.expenses)}</td>
                        <td className="p-2 text-right text-blue-600">{formatToINR(week.savings)}</td>
                        <td className="p-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-6 w-6" 
                              onClick={() => handleEditWeek(index, 'income')}
                            >
                              <TrendingUp className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-6 w-6" 
                              onClick={() => handleEditWeek(index, 'expenses')}
                            >
                              <Wallet className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-medium">
                      <td className="p-2 pl-0">Total</td>
                      <td className="p-2"></td>
                      <td className="p-2 text-right text-green-600">{formatToINR(monthlyReport.totalIncome)}</td>
                      <td className="p-2 text-right text-red-600">{formatToINR(monthlyReport.totalExpenses)}</td>
                      <td className="p-2 text-right text-blue-600">{formatToINR(monthlyReport.totalSavings)}</td>
                      <td className="p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Click on the income or expense icons to edit weekly data
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Expense Point Modal */}
      <Dialog open={isEditExpenseModalOpen} onOpenChange={setIsEditExpenseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense Amount</DialogTitle>
            <DialogDescription>
              Update the expense amount for {editingExpenseDate}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={editingExpenseValue}
                onChange={(e) => setEditingExpenseValue(e.target.value)}
                placeholder="Enter amount"
                className="transition-all focus:scale-[1.02]"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditExpenseModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveExpenseDataPoint}
                disabled={!editingExpenseValue || isNaN(parseFloat(editingExpenseValue)) || parseFloat(editingExpenseValue) < 0}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Keep this for editing financial values */}
      <Dialog open={editingField !== null} onOpenChange={(open) => !open && setEditingField(null)}>
        <DialogContent className="sm:max-w-md mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Edit {editingField?.split(/(?=[A-Z])/).join(' ')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                placeholder="Enter amount"
                className="transition-all focus:scale-[1.02]"
                autoFocus
              />
            </div>
            {editingField === 'monthlyExpenses' && 
              Number(editingValue) > balanceData.monthlyIncome && (
                <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-2 rounded-md animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Warning: Expenses exceed income</span>
                </div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={() => setEditingField(null)}
                className="w-1/2"
              >
                Cancel
              </Button>
              <Button 
                className="w-1/2 transition-all hover:scale-[1.02]" 
                onClick={handleSave}
                disabled={!editingValue || isNaN(parseFloat(editingValue)) || parseFloat(editingValue) < 0}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Weekly Data Dialog */}
      <Dialog 
        open={editingWeekIndex !== null && editingWeekField !== null} 
        onOpenChange={(open) => !open && (setEditingWeekIndex(null), setEditingWeekField(null))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {editingWeekField === 'income' ? 'Income' : 'Expenses'}
            </DialogTitle>
            <DialogDescription>
              {editingWeekIndex !== null && monthlyReport.weeklyData[editingWeekIndex]?.weekLabel} ({editingWeekIndex !== null && monthlyReport.weeklyData[editingWeekIndex]?.dateRange})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={editingWeekValue}
                onChange={(e) => setEditingWeekValue(e.target.value)}
                placeholder="Enter amount"
                className="transition-all focus:scale-[1.02]"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setEditingWeekIndex(null);
                  setEditingWeekField(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveWeeklyData}
                disabled={!editingWeekValue || isNaN(parseFloat(editingWeekValue)) || parseFloat(editingWeekValue) < 0}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      <Dialog open={isAddExpenseModalOpen} onOpenChange={setIsAddExpenseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>
              Enter the details of your new expense
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newExpenseForm}>
            <form onSubmit={newExpenseForm.handleSubmit(handleAddExpense)} className="space-y-4 py-2">
              <FormField
                control={newExpenseForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} 
                          onChange={e => field.onChange(e.target.valueAsDate)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newExpenseForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-muted-foreground" />
                        <Input 
                          type="number" 
                          placeholder="Enter amount" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newExpenseForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Default categories plus existing categories from state */}
                          <SelectItem value="Food">Food</SelectItem>
                          <SelectItem value="Rent">Rent</SelectItem>
                          <SelectItem value="Transport">Transport</SelectItem>
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Entertainment">Entertainment</SelectItem>
                          <SelectItem value="Shopping">Shopping</SelectItem>
                          <SelectItem value="Healthcare">Healthcare</SelectItem>
                          <SelectItem value="Education">Education</SelectItem>
                          <SelectItem value="Travel">Travel</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                          {expenseCategories
                            .filter(cat => !['Food', 'Rent', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Healthcare', 'Education', 'Travel', 'Others'].includes(cat.name))
                            .map(cat => (
                              <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newExpenseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter a description" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddExpenseModalOpen(false);
                    newExpenseForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Add Expense
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Define a keyframe animation for the pulsing effect on data change
const styles = `
@keyframes pulseOnce {
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
.animate-pulse-once {
  animation: pulseOnce 0.5s ease-in-out;
}
`;

// Insert the styles into the document
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default DashboardOverview;
