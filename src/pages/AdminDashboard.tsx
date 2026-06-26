import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/services/api';
import { 
  Users, 
  Database, 
  Activity, 
  TrendingUp, 
  RefreshCw, 
  Server, 
  ShieldCheck,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { toast } from 'sonner';

interface CollectionStat {
  name: string;
  count: number;
}

interface AdminStats {
  users: {
    total: number;
    regular: number;
    admins: number;
  };
  financials: {
    expenses: { count: number; totalAmount: number };
    incomes: { count: number; totalAmount: number };
    savings: { count: number; totalAmount: number };
    goals: { count: number };
  };
  database: {
    collections: CollectionStat[];
    connectionState: string;
  };
  system: {
    uptime: number;
    memoryUsage: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
    };
  };
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEEAD'];

const formatToINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatUptime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const hDisplay = h > 0 ? `${h}h ` : '';
  const mDisplay = m > 0 ? `${m}m ` : '';
  const sDisplay = `${s}s`;
  
  return hDisplay + mDisplay + sDisplay;
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const response = await adminApi.getStats();
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching admin stats:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch administrative statistics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="h-10 w-28 bg-muted rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="glass-card">
              <CardHeader className="pb-2">
                <div className="h-4 w-1/3 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-1/2 bg-muted rounded mb-2"></div>
                <div className="h-3 w-2/3 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card h-[350px]">
            <CardHeader><div className="h-5 w-1/4 bg-muted rounded"></div></CardHeader>
            <CardContent className="h-[250px] bg-muted/20 rounded m-6"></CardContent>
          </Card>
          <Card className="glass-card h-[350px]">
            <CardHeader><div className="h-5 w-1/4 bg-muted rounded"></div></CardHeader>
            <CardContent className="h-[250px] bg-muted/20 rounded m-6"></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center space-y-4">
        <h2 className="text-xl font-bold text-destructive">Error Loading Dashboard Data</h2>
        <p className="text-muted-foreground">We were unable to retrieve system statistics. Please verify the backend is running.</p>
        <Button onClick={() => fetchStats()}>Retry</Button>
      </div>
    );
  }

  // Prep data for charts
  const financialDistribution = [
    { name: 'Total Incomes', value: stats.financials.incomes.totalAmount, count: stats.financials.incomes.count },
    { name: 'Total Expenses', value: stats.financials.expenses.totalAmount, count: stats.financials.expenses.count },
    { name: 'Total Savings', value: stats.financials.savings.totalAmount, count: stats.financials.savings.count }
  ].filter(item => item.value > 0);

  const databaseDistribution = stats.database.collections;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-sm text-muted-foreground">Privacy-preserved analytics, system health, and database metrics.</p>
        </div>
        <Button 
          onClick={() => fetchStats(true)} 
          disabled={isRefreshing}
          variant="outline"
          className="glass-card flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Stats'}
        </Button>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <Card className="glass-card relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Accounts</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.users.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.users.regular} users &bull; {stats.users.admins} admins
            </p>
            <div className="absolute right-[-10px] bottom-[-10px] opacity-5">
              <Users className="h-24 w-24" />
            </div>
          </CardContent>
        </Card>

        {/* Total Aggregated Incomes */}
        <Card className="glass-card relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Flow In</CardTitle>
            <ArrowUpRight className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">
              {formatToINR(stats.financials.incomes.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aggregated from {stats.financials.incomes.count} income logs
            </p>
            <div className="absolute right-[-10px] bottom-[-10px] opacity-5">
              <TrendingUp className="h-24 w-24" />
            </div>
          </CardContent>
        </Card>

        {/* Total Aggregated Expenses */}
        <Card className="glass-card relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Flow Out</CardTitle>
            <ArrowDownRight className="h-5 w-5 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-500">
              {formatToINR(stats.financials.expenses.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aggregated from {stats.financials.expenses.count} expense logs
            </p>
            <div className="absolute right-[-10px] bottom-[-10px] opacity-5">
              <ArrowDownRight className="h-24 w-24" />
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="glass-card relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Database Health</CardTitle>
            <ShieldCheck className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">Active</div>
            <p className="text-xs text-muted-foreground mt-1">
              MongoDB state: {stats.database.connectionState}
            </p>
            <div className="absolute right-[-10px] bottom-[-10px] opacity-5">
              <Database className="h-24 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Flow Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Anonymized Financial Distribution</CardTitle>
            <CardDescription>Aggregate system-wide volume of Incomes, Expenses, and Savings.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col justify-center items-center">
            {financialDistribution.length > 0 ? (
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around">
                <div className="w-full sm:w-1/2 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={financialDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {financialDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatToINR(value), 'Total Amount']} 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend */}
                <div className="space-y-3 w-full sm:w-1/2 px-4">
                  {financialDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatToINR(item.value)}</div>
                        <div className="text-xs text-muted-foreground">{item.count} items</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No transaction data logged in the system.</div>
            )}
          </CardContent>
        </Card>

        {/* Database Volume */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Database Record Volumes</CardTitle>
            <CardDescription>Number of registered documents across Mongo collections.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={databaseDistribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                  {databaseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="hsl(var(--primary))" className="opacity-90 hover:opacity-100 transition-opacity" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Status Panel */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              NodeJS Host & System Resources
            </CardTitle>
            <CardDescription>Real-time monitor of server resources and host configurations.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div className="space-y-1 p-3 rounded-lg bg-muted/20">
              <div className="text-muted-foreground text-xs font-semibold uppercase">System Uptime</div>
              <div className="font-bold text-base">{formatUptime(stats.system.uptime)}</div>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/20">
              <div className="text-muted-foreground text-xs font-semibold uppercase">Allocated Memory (RSS)</div>
              <div className="font-bold text-base">{stats.system.memoryUsage.rss}</div>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/20">
              <div className="text-muted-foreground text-xs font-semibold uppercase">Heap Limit (Total)</div>
              <div className="font-bold text-base">{stats.system.memoryUsage.heapTotal}</div>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/20">
              <div className="text-muted-foreground text-xs font-semibold uppercase">Heap Memory in Use</div>
              <div className="font-bold text-base">{stats.system.memoryUsage.heapUsed}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
