import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatToINR } from '@/lib/utils';
import { expensesApi } from '@/services/api';
import { toast } from 'sonner';

interface Expense {
  _id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Housing',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Other'
];

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B786F', '#A8E6CF'];

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const response = await expensesApi.getExpenses();
      setExpenses(response.data.expenses || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async () => {
    if (!amount || !category) return;

    try {
      const response = await expensesApi.addExpense({
        amount: parseFloat(amount),
        category,
        description,
        date: new Date()
      });
      
      toast.success('Expense added successfully.');
      fetchExpenses(); // Re-fetch to update all stats and totals
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await expensesApi.deleteExpense(id);
      toast.success('Expense deleted successfully.');
      setExpenses(expenses.filter(expense => expense._id !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense.');
    }
  };

  const categoryData = EXPENSE_CATEGORIES.map(cat => ({
    name: cat,
    value: expenses
      .filter(expense => expense.category === cat)
      .reduce((sum, expense) => sum + expense.amount, 0)
  })).filter(item => item.value > 0);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">Expenses</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add Expense Card */}
        <Card className="glass-card animate-fade-in">
          <CardHeader>
            <CardTitle>Add Expense</CardTitle>
            <CardDescription>Track your daily expenses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Enter description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleAddExpense}>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </CardContent>
        </Card>

        {/* Expense Summary Card */}
        <Card className="glass-card animate-fade-in">
          <CardHeader>
            <CardTitle>Expense Summary</CardTitle>
            <CardDescription>Total Expenses: {formatToINR(totalExpenses)}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <div className="flex h-full w-full justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${formatToINR(value)}`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full justify-center items-center flex-col">
                <p className="text-muted-foreground text-sm">No expense data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses Card */}
      <Card className="glass-card animate-fade-in">
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Your latest transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : expenses.length === 0 ? (
              <p className="text-muted-foreground text-center">No expenses recorded yet.</p>
            ) : (
              <div className="divide-y">
                {expenses.map((expense) => (
                  <div key={expense._id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{expense.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {expense.description || 'No description'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(expense.date), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold flex items-center">
                        {formatToINR(expense.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteExpense(expense._id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesPage;
