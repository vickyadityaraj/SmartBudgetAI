import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Download,
  Database
} from 'lucide-react';
import { format } from 'date-fns';
import { formatToINR } from '@/lib/utils';
import { expensesApi, incomeApi } from '@/services/api';
import eventBus, { EVENTS } from '@/services/eventBus';
import { toast } from 'sonner';

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
}

interface AnalysisResult {
  totalCredits: number;
  totalDebits: number;
  balance: number;
  categories: { name: string; value: number; fill: string }[];
  merchantAnalysis: { name: string; frequency: number; total: number }[];
  recurringPayments: Transaction[];
  largeTransactions: Transaction[];
  allTransactions: Transaction[];
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B786F', '#A8E6CF'];

// Helper to format date string to YYYY-MM-DD
const formatDateString = (dateStr: string): string => {
  try {
    const cleanStr = dateStr.trim().replace(/^["']|["']$/g, '');
    const parts = cleanStr.split(/[-/]/);
    if (parts.length === 3) {
      // If DD-MM-YYYY or DD/MM/YYYY
      if (parts[0].length <= 2 && parts[2].length === 4) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        return format(new Date(year, month, day), 'yyyy-MM-dd');
      }
      // If YYYY-MM-DD
      if (parts[0].length === 4 && parts[2].length <= 2) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        return format(new Date(year, month, day), 'yyyy-MM-dd');
      }
    }
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      return format(d, 'yyyy-MM-dd');
    }
  } catch (e) {
    console.error('Error parsing date:', dateStr);
  }
  return format(new Date(), 'yyyy-MM-dd');
};

// Keyword-based auto-categorization
const autoCategorize = (desc: string, type: 'credit' | 'debit'): string => {
  const s = desc.toLowerCase();
  
  if (type === 'credit') {
    if (s.includes('salary') || s.includes('paycheck') || s.includes('direct dep') || s.includes('techcorp')) return 'Salary';
    if (s.includes('freelance') || s.includes('consult') || s.includes('gigs') || s.includes('design')) return 'Freelance';
    if (s.includes('refund') || s.includes('cashback')) return 'Refund';
    if (s.includes('interest') || s.includes('dividend')) return 'Interest';
    return 'Other Income';
  }

  if (s.includes('swiggy') || s.includes('zomato') || s.includes('starbucks') || s.includes('mcdonald') || s.includes('burger') || s.includes('restaurant') || s.includes('food') || s.includes('grocer') || s.includes('cafe')) {
    return 'Food & Dining';
  }
  if (s.includes('uber') || s.includes('ola') || s.includes('metro') || s.includes('fuel') || s.includes('petrol') || s.includes('diesel') || s.includes('cab') || s.includes('taxi')) {
    return 'Transportation';
  }
  if (s.includes('rent') || s.includes('landlord') || s.includes('pg') || s.includes('flat') || s.includes('house')) {
    return 'Housing';
  }
  if (s.includes('electricity') || s.includes('water') || s.includes('wifi') || s.includes('broadband') || s.includes('airtel') || s.includes('jio') || s.includes('mobile') || s.includes('bill') || s.includes('recharge')) {
    return 'Utilities';
  }
  if (s.includes('netflix') || s.includes('spotify') || s.includes('cinema') || s.includes('movie') || s.includes('theatre') || s.includes('prime') || s.includes('disney') || s.includes('hotstar') || s.includes('entertainment') || s.includes('game') || s.includes('playstation')) {
    return 'Entertainment';
  }
  if (s.includes('amazon') || s.includes('flipkart') || s.includes('myntra') || s.includes('zara') || s.includes('nike') || s.includes('shopping') || s.includes('mall') || s.includes('clothing') || s.includes('electronics')) {
    return 'Shopping';
  }
  if (s.includes('hospital') || s.includes('pharmacy') || s.includes('doctor') || s.includes('medplus') || s.includes('apollo') || s.includes('health') || s.includes('clinic') || s.includes('medicine') || s.includes('gym')) {
    return 'Healthcare';
  }
  return 'Other';
};

// Helper to parse standard CSV lines (respects quoted fields)
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
};

const BankStatementAnalyzer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedBank, setSelectedBank] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImported, setIsImported] = useState(false);

  const supportedBanks = [
    { id: 'hdfc', name: 'HDFC Bank' },
    { id: 'sbi', name: 'State Bank of India' },
    { id: 'icici', name: 'ICICI Bank' },
    { id: 'axis', name: 'Axis Bank' },
    { id: 'kotak', name: 'Kotak Mahindra Bank' },
    { id: 'generic', name: 'Generic CSV Statement' }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
        setAnalysisResult(null);
        setIsImported(false);
      } else {
        setError('Please upload a bank statement in CSV format for direct parsing.');
      }
    }
  };

  const parseAndAnalyzeCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) {
      setError('The uploaded CSV file is empty or invalid.');
      return;
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const dateIdx = headers.findIndex(h => h.includes('date'));
    const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('particular') || h.includes('narration') || h.includes('description'));
    const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('value') || h.includes('withdrawal') || h.includes('deposit'));
    const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('cr') || h.includes('dr') || h.includes('transaction type') || h.includes('mode'));

    const dIdx = dateIdx !== -1 ? dateIdx : 0;
    const deIdx = descIdx !== -1 ? descIdx : 1;
    const aIdx = amountIdx !== -1 ? amountIdx : 2;
    const tIdx = typeIdx !== -1 ? typeIdx : 3;

    const transactions: Transaction[] = [];
    let totalCredits = 0;
    let totalDebits = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length <= Math.max(dIdx, deIdx, aIdx)) continue;

      const dateStr = row[dIdx];
      const description = row[deIdx];
      const rawAmount = row[aIdx]?.replace(/[^\d.-]/g, '');
      const amountVal = parseFloat(rawAmount) || 0;

      if (amountVal === 0 || !description || !dateStr) continue;

      // Determine type
      let type: 'credit' | 'debit' = 'debit';
      if (tIdx !== -1 && row[tIdx]) {
        const typeStr = row[tIdx].toLowerCase();
        if (typeStr.includes('credit') || typeStr.includes('cr') || typeStr.includes('dep') || typeStr.includes('receipt')) {
          type = 'credit';
        }
      } else {
        if (amountVal > 0) {
          type = 'credit';
        }
      }

      const absAmount = Math.abs(amountVal);
      if (type === 'credit') {
        totalCredits += absAmount;
      } else {
        totalDebits += absAmount;
      }

      const category = autoCategorize(description, type);

      transactions.push({
        date: formatDateString(dateStr),
        description,
        amount: absAmount,
        type,
        category
      });
    }

    if (transactions.length === 0) {
      setError('Could not parse any valid transactions from the CSV file.');
      return;
    }

    // Category Breakdown
    const categoryTotals: Record<string, number> = {};
    transactions.filter(t => t.type === 'debit').forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const categories = Object.keys(categoryTotals).map((cat, idx) => ({
      name: cat,
      value: categoryTotals[cat],
      fill: COLORS[idx % COLORS.length]
    })).sort((a, b) => b.value - a.value);

    // Merchant Analysis
    const merchants: Record<string, { freq: number; total: number }> = {};
    transactions.filter(t => t.type === 'debit').forEach(t => {
      // Clean merchant name
      let cleanMerchant = t.description.split(/[\d\s*-]/)[0].trim();
      if (cleanMerchant.length < 3) cleanMerchant = t.description.slice(0, 15).trim();
      
      merchants[cleanMerchant] = {
        freq: (merchants[cleanMerchant]?.freq || 0) + 1,
        total: (merchants[cleanMerchant]?.total || 0) + t.amount
      };
    });

    const merchantAnalysis = Object.keys(merchants).map(name => ({
      name,
      frequency: merchants[name].freq,
      total: merchants[name].total
    })).sort((a, b) => b.total - a.total).slice(0, 5);

    // Recurring Payments
    const recurringPayments = transactions.filter(t => {
      const isSub = t.description.toLowerCase().includes('netflix') || 
                    t.description.toLowerCase().includes('spotify') || 
                    t.description.toLowerCase().includes('wifi') || 
                    t.description.toLowerCase().includes('gym') ||
                    t.description.toLowerCase().includes('rent') ||
                    t.description.toLowerCase().includes('membership');
      return t.type === 'debit' && isSub;
    });

    // Large Transactions (> 5000)
    const largeTransactions = transactions.filter(t => t.amount >= 5000);

    setAnalysisResult({
      totalCredits,
      totalDebits,
      balance: totalCredits - totalDebits,
      categories,
      merchantAnalysis,
      recurringPayments,
      largeTransactions,
      allTransactions: transactions
    });
  };

  const startAnalysis = () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 150);

    setTimeout(() => {
      setUploading(false);
      setAnalyzing(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          parseAndAnalyzeCSV(text);
        } catch (err) {
          setError('Failed to parse statement file. Please check the file format.');
        } finally {
          setAnalyzing(false);
        }
      };
      reader.readAsText(file);
    }, 1000);
  };

  // Download Sample CSV to make it extremely easy to use
  const downloadSampleCSV = () => {
    const csvContent = 
`Date,Description,Amount,Type
2026-06-01,TechCorp Salary Paycheck,75000,credit
2026-06-01,Apartment House Rent,20000,debit
2026-06-05,Airtel Wifi Broadband Bill,1200,debit
2026-06-07,Swiggy Restaurant Dinner,850,debit
2026-06-12,Amazon Online Shopping,4500,debit
2026-06-15,Freelance Web Design Consultation,15000,credit
2026-06-18,Netflix Subscription,799,debit
2026-06-20,Gym Membership,1999,debit
2026-06-22,Uber Cab Ride,650,debit
2026-06-25,Zomato Food Order,1200,debit`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_bank_statement.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sample statement CSV downloaded.');
  };

  // Batch import transactions into the real database
  const importTransactionsToDatabase = async () => {
    if (!analysisResult) return;
    setImporting(true);
    setImportProgress(0);

    const transactions = analysisResult.allTransactions;
    const totalCount = transactions.length;
    let successCount = 0;

    try {
      for (let i = 0; i < totalCount; i++) {
        const t = transactions[i];
        if (t.type === 'debit') {
          await expensesApi.addExpense({
            amount: t.amount,
            category: t.category === 'Other' ? 'Other' : t.category,
            description: t.description,
            date: new Date(t.date)
          });
        } else {
          await incomeApi.addIncome({
            amount: t.amount,
            source: t.description,
            category: t.category,
            date: new Date(t.date)
          });
        }
        successCount++;
        setImportProgress(Math.round((successCount / totalCount) * 100));
      }

      toast.success(`Imported ${successCount} transactions successfully.`);
      setIsImported(true);

      // Trigger global dashboard refresh
      eventBus.emit(EVENTS.EXPENSE_ADDED);
      eventBus.emit(EVENTS.INCOME_UPDATED);
    } catch (err) {
      console.error('Error importing transactions:', err);
      toast.error('Import process failed or was interrupted.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bank Statement Analyzer</h1>
          <p className="text-muted-foreground">Upload and analyze statements to import them directly into your database</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadSampleCSV} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download Test CSV
        </Button>
      </div>

      {/* Upload Section */}
      <Card className="glass-card animate-fade-in">
        <CardHeader>
          <CardTitle>Upload Statement</CardTitle>
          <CardDescription>
            Select your bank, upload a CSV statement file, and click Analyze to process it in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your bank" />
                </SelectTrigger>
                <SelectContent>
                  {supportedBanks.map(bank => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="file"
                id="statement"
                className="hidden"
                accept=".csv"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById('statement')?.click()}
                disabled={!selectedBank}
              >
                <Upload className="w-4 h-4 mr-2" />
                Select CSV File
              </Button>
              {file && (
                <Button
                  className="flex-1"
                  onClick={startAnalysis}
                  disabled={uploading || analyzing}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Analyze
                </Button>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {file && (
            <Alert className="border-primary/20 bg-primary/5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertTitle>File Selected</AlertTitle>
              <AlertDescription className="text-xs truncate">{file.name}</AlertDescription>
            </Alert>
          )}

          {uploading && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Reading file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}

          {analyzing && (
            <div className="flex items-center gap-2 text-primary bg-primary/5 p-4 rounded-md animate-pulse">
              <TrendingUp className="h-5 h-5 animate-spin" />
              <div className="text-sm font-medium">Parsing bank statement and categorizing transactions...</div>
            </div>
          )}
        </CardContent>
      </Card>

      {analysisResult && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass-card animate-fade-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Income (Credits)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <TrendingUp className="w-8 h-8 text-green-500" />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{formatToINR(analysisResult.totalCredits)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card animate-fade-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Spending (Debits)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <TrendingDown className="w-8 h-8 text-red-500" />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">{formatToINR(analysisResult.totalDebits)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card animate-fade-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Cashflow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <PiggyBank className="w-8 h-8 text-primary" />
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${analysisResult.balance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                      {formatToINR(analysisResult.balance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Database Import Banner */}
          <Card className="glass-card animate-fade-in border-primary/25 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="font-semibold text-lg flex items-center justify-center md:justify-start gap-2 text-primary">
                  <Database className="w-5 h-5" />
                  Import to Database
                </h3>
                <p className="text-sm text-muted-foreground">
                  Save all {analysisResult.allTransactions.length} parsed transactions directly to your MongoDB. This includes {analysisResult.allTransactions.filter(t => t.type === 'debit').length} Expenses and {analysisResult.allTransactions.filter(t => t.type === 'credit').length} Income entries.
                </p>
              </div>
              <Button 
                onClick={importTransactionsToDatabase} 
                disabled={importing || isImported}
                className="w-full md:w-auto min-w-[180px] shadow-md"
              >
                {importing ? `Importing ${importProgress}%` : isImported ? 'Imported successfully' : 'Import to Database'}
              </Button>
            </CardContent>
            {importing && <Progress value={importProgress} className="h-1 rounded-none bg-transparent" />}
          </Card>

          {/* Expense Categories and Top Merchants */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card animate-fade-in">
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Visual breakdown of debits from statement</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex justify-center items-center">
                {analysisResult.categories.length > 0 ? (
                  <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around">
                    <div className="w-48 h-48 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analysisResult.categories}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            dataKey="value"
                          >
                            {analysisResult.categories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatToINR(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                        <span className="text-xs text-muted-foreground">Total Spent</span>
                        <span className="text-sm font-semibold">{formatToINR(analysisResult.totalDebits)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto w-full sm:w-auto px-4 mt-4 sm:mt-0">
                      {analysisResult.categories.map((c, i) => (
                        <div key={i} className="flex items-center justify-between sm:justify-start gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.fill }} />
                            <span className="font-medium text-muted-foreground">{c.name}</span>
                          </div>
                          <span className="font-semibold">{formatToINR(c.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No spending records found.</p>
                )}
              </CardContent>
            </Card>

            {/* Merchant Analysis */}
            <Card className="glass-card animate-fade-in">
              <CardHeader>
                <CardTitle>Top Merchant Spending</CardTitle>
                <CardDescription>Most frequent transaction outlets</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisResult.merchantAnalysis.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">No merchant spending found.</TableCell>
                      </TableRow>
                    ) : (
                      analysisResult.merchantAnalysis.map((merchant) => (
                        <TableRow key={merchant.name} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <TableCell className="font-medium">{merchant.name}</TableCell>
                          <TableCell>{merchant.frequency} transactions</TableCell>
                          <TableCell className="text-right font-semibold">{formatToINR(merchant.total)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Recurring and Large Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card animate-fade-in">
              <CardHeader>
                <CardTitle>Detected Subscriptions / Recurring</CardTitle>
                <CardDescription>Regular, repeating monthly transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisResult.recurringPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No subscriptions detected.</TableCell>
                      </TableRow>
                    ) : (
                      analysisResult.recurringPayments.map((payment, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium truncate max-w-[150px]">{payment.description}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(payment.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{formatToINR(payment.amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="glass-card animate-fade-in">
              <CardHeader>
                <CardTitle>Large Transactions (≥ ₹5,000)</CardTitle>
                <CardDescription>Significant single expenditures or deposits</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisResult.largeTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No large transactions detected.</TableCell>
                      </TableRow>
                    ) : (
                      analysisResult.largeTransactions.map((transaction, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium truncate max-w-[150px]">{transaction.description}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(transaction.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className={`text-right font-semibold ${
                            transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'credit' ? '+' : '-'}
                            {formatToINR(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Complete Parsed Transactions List */}
          <Card className="glass-card animate-fade-in">
            <CardHeader>
              <CardTitle>Parsed Statement Transactions</CardTitle>
              <CardDescription>All processed records from the uploaded statement</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[350px] overflow-y-auto px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisResult.allTransactions.map((t, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(t.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-medium truncate max-w-[200px]" title={t.description}>{t.description}</TableCell>
                      <TableCell>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded-full">
                          {t.category}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'credit' ? '+' : '-'}{formatToINR(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default BankStatementAnalyzer;