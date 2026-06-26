import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PiggyBank, TrendingUp, Calculator, ArrowUpRight, ArrowDownRight, Pencil } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatToINR } from '@/lib/utils';
import { savingsApi } from '@/services/api';
import { toast } from 'sonner';

interface SavingsEntry {
  _id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  category: string;
  date: string;
  description?: string;
}

const SAVINGS_CATEGORIES = [
  'Regular Savings',
  'Emergency Fund',
  'Investment',
  'Retirement',
  'Major Purchase',
  'Other'
];

const SavingsPage = () => {
  const [entries, setEntries] = useState<SavingsEntry[]>([]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [category, setCategory] = useState(SAVINGS_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [isEditingSavings, setIsEditingSavings] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [isEditingSavingsRate, setIsEditingSavingsRate] = useState(false);
  const [editSavingsRate, setEditSavingsRate] = useState('');
  const [isEditingMonthlyTrend, setIsEditingMonthlyTrend] = useState(false);
  const [editMonthlyAmount, setEditMonthlyAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSavings = async () => {
    try {
      setIsLoading(true);
      const response = await savingsApi.getSavings();
      setEntries(response.data.savings || []);
    } catch (error) {
      console.error('Error fetching savings:', error);
      toast.error('Failed to load savings records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSavings();
  }, []);

  const handleAddEntry = async () => {
    if (!amount || !category) return;

    try {
      await savingsApi.addSaving({
        amount: parseFloat(amount),
        type,
        category,
        description,
        date: new Date()
      });
      
      toast.success('Savings transaction recorded.');
      fetchSavings();
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Error adding saving entry:', error);
      toast.error('Failed to record transaction.');
    }
  };

  const totalSavings = entries.reduce((sum, entry) => {
    return sum + (entry.type === 'deposit' ? entry.amount : -entry.amount);
  }, 0);

  const lastMonthSavings = entries
    .filter(entry => {
      const entryDate = new Date(entry.date);
      const lastMonth = subMonths(new Date(), 1);
      return entryDate >= lastMonth;
    })
    .reduce((sum, entry) => {
      return sum + (entry.type === 'deposit' ? entry.amount : -entry.amount);
    }, 0);

  const monthlySavingsData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), i);
    const monthStr = format(month, 'MMM yyyy');
    const monthSavings = entries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return format(entryDate, 'MMM yyyy') === monthStr;
      })
      .reduce((sum, entry) => {
        return sum + (entry.type === 'deposit' ? entry.amount : -entry.amount);
      }, 0);

    return {
      month: monthStr,
      savings: monthSavings
    };
  }).reverse();

  const calculateSavingsRate = () => {
    if (entries.length === 0) return 0;
    const deposits = entries
      .filter(entry => entry.type === 'deposit')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const withdrawals = entries
      .filter(entry => entry.type === 'withdrawal')
      .reduce((sum, entry) => sum + entry.amount, 0);
    return deposits > 0 ? ((deposits - withdrawals) / deposits) * 100 : 0;
  };

  const savingsRate = calculateSavingsRate();

  const handleEditSavings = async () => {
    if (!editAmount) return;
    
    const newAmount = parseFloat(editAmount);
    const currentTotal = totalSavings;
    const difference = newAmount - currentTotal;
    
    if (difference === 0) {
      setIsEditingSavings(false);
      return;
    }

    try {
      await savingsApi.addSaving({
        amount: Math.abs(difference),
        type: difference > 0 ? 'deposit' : 'withdrawal',
        category: 'Adjustment',
        description: 'Manual balance adjustment',
        date: new Date()
      });
      
      toast.success('Savings balance adjusted.');
      fetchSavings();
      setIsEditingSavings(false);
      setEditAmount('');
    } catch (error) {
      console.error('Error adjusting savings:', error);
      toast.error('Failed to adjust savings balance.');
    }
  };

  const handleEditSavingsRate = async () => {
    if (!editSavingsRate) return;
    
    const targetRate = parseFloat(editSavingsRate);
    const currentDeposits = entries
      .filter(entry => entry.type === 'deposit')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const requiredSavings = (targetRate / 100) * currentDeposits;
    const currentSavings = totalSavings;
    const difference = requiredSavings - currentSavings;
    
    if (difference !== 0) {
      try {
        await savingsApi.addSaving({
          amount: Math.abs(difference),
          type: difference > 0 ? 'deposit' : 'withdrawal',
          category: 'Rate Adjustment',
          description: 'Savings rate target adjustment',
          date: new Date()
        });
        toast.success('Savings rate target adjusted.');
        fetchSavings();
      } catch (error) {
        console.error('Error adjusting rate:', error);
        toast.error('Failed to adjust savings rate.');
      }
    }
    
    setIsEditingSavingsRate(false);
    setEditSavingsRate('');
  };

  const handleEditMonthlyTrend = async () => {
    if (!editMonthlyAmount) return;
    
    const targetAmount = parseFloat(editMonthlyAmount);
    const currentMonthSavings = monthlySavingsData[monthlySavingsData.length - 1]?.savings || 0;
    const difference = targetAmount - currentMonthSavings;
    
    if (difference !== 0) {
      try {
        await savingsApi.addSaving({
          amount: Math.abs(difference),
          type: difference > 0 ? 'deposit' : 'withdrawal',
          category: 'Monthly Adjustment',
          description: 'Monthly trend adjustment',
          date: new Date()
        });
        toast.success('Monthly savings trend adjusted.');
        fetchSavings();
      } catch (error) {
        console.error('Error adjusting monthly trend:', error);
        toast.error('Failed to adjust monthly trend.');
      }
    }
    
    setIsEditingMonthlyTrend(false);
    setEditMonthlyAmount('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">Savings</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Savings Card */}
            <Card className="glass-card animate-fade-in">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Savings
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <PiggyBank className="w-8 h-8 text-primary" />
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatToINR(totalSavings)}</p>
                    <div className="text-sm text-muted-foreground">
                      {lastMonthSavings >= 0 ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <ArrowUpRight className="w-4 h-4" />
                          +{formatToINR(lastMonthSavings)} last month
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1">
                          <ArrowDownRight className="w-4 h-4" />
                          {formatToINR(lastMonthSavings)} last month
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Savings Rate Card */}
            <Card className="glass-card animate-fade-in">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Savings Rate
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Calculator className="w-8 h-8 text-primary" />
                  <div className="text-right">
                    <p className="text-2xl font-bold">{savingsRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">
                      Of total deposits
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trend Card */}
            <Card className="glass-card animate-fade-in">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Monthly Trend
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {formatToINR(monthlySavingsData[monthlySavingsData.length - 1]?.savings || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This month's savings
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Savings Chart */}
          <Card className="glass-card animate-fade-in">
            <CardHeader>
              <CardTitle>Savings Trend</CardTitle>
              <CardDescription>Your savings over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {monthlySavingsData.some(d => d.savings !== 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySavingsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatToINR(value)} />
                    <Line
                      type="monotone"
                      dataKey="savings"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ fill: '#2563eb' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full w-full justify-center items-center">
                  <p className="text-muted-foreground text-sm">No savings trend data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Entry Card */}
          <Card className="glass-card animate-fade-in">
            <CardHeader>
              <CardTitle>Add Transaction</CardTitle>
              <CardDescription>Record your savings or withdrawals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="type">Transaction Type</Label>
                  <Select value={type} onValueChange={(value: 'deposit' | 'withdrawal') => setType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SAVINGS_CATEGORIES.map((cat) => (
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
              </div>
              <Button className="w-full" onClick={handleAddEntry}>
                Add Transaction
              </Button>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="glass-card animate-fade-in">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest savings activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {entries.length === 0 ? (
                  <p className="text-muted-foreground text-center">No transactions recorded yet.</p>
                ) : (
                  <div className="divide-y">
                    {entries.slice().reverse().map((entry) => (
                      <div key={entry._id} className="py-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {entry.type === 'deposit' ? (
                              <ArrowUpRight className="w-4 h-4 text-green-500" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-red-500" />
                            )}
                            <p className="font-medium">{entry.category}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {entry.description || 'No description'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(entry.date), 'dd MMM yyyy, hh:mm a')}
                          </p>
                        </div>
                        <span className={`font-semibold ${
                          entry.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {entry.type === 'deposit' ? '+' : '-'}{formatToINR(entry.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SavingsPage;
