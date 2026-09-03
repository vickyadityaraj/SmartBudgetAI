import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  BarChart3, 
  CreditCard, 
  PiggyBank, 
  Target, 
  BellRing, 
  Settings, 
  LogOut, 
  Menu, 
  ChevronRight,
  FileSpreadsheet,
  Users,
  Shield,
  Brain,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  
  // Get user role from localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'admin';
  
  const menuItems = isAdmin
    ? [
        { icon: Shield, label: 'Admin Overview', path: '/dashboard/admin' },
        { icon: Users, label: 'User Management', path: '/dashboard/admin/users' },
        { icon: Brain, label: 'Assignment 1', path: '/dashboard/smart-advisor' },
        { icon: Bot, label: 'Assignment 2', path: '/dashboard/assignment-2' },
        { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
      ]
    : [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: CreditCard, label: 'Expenses', path: '/dashboard/expenses' },
        { icon: BarChart3, label: 'Reports', path: '/dashboard/reports' },
        { icon: PiggyBank, label: 'Savings', path: '/dashboard/savings' },
        { icon: Target, label: 'Goals', path: '/dashboard/goals' },
        { icon: FileSpreadsheet, label: 'Bank Statement', path: '/dashboard/bank-statement' },
        { icon: Brain, label: 'Assignment 1', path: '/dashboard/smart-advisor' },
        { icon: Bot, label: 'Assignment 2', path: '/dashboard/assignment-2' },
        { icon: BellRing, label: 'Alerts', path: '/dashboard/alerts' },
        { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
      ];
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
    navigate('/');
  };
  
  return (
    <div 
      className={cn(
        'h-screen bg-muted/30 border-r flex flex-col transition-all duration-300 ease-in-out overflow-y-auto',
        collapsed ? 'w-[70px]' : 'w-[250px]',
        className
      )}
    >
      <div className="p-4 flex items-center justify-between border-b">
        {!collapsed && (
          <Link to={isAdmin ? "/dashboard/admin" : "/dashboard"} className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary"></div>
            <span className="text-xl font-bold">FinGenius</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-full bg-primary mx-auto"></div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="ml-auto" 
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={18} /> : <Menu size={18} />}
        </Button>
      </div>
      
      <nav className="flex-1 py-6">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={cn(
                    'flex items-center py-3 px-3 rounded-md transition-colors duration-200',
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <item.icon size={20} className={cn(collapsed ? 'mx-auto' : 'mr-3')} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="mt-auto p-4 border-t">
        <Button 
          variant="ghost" 
          className={cn(
            'w-full justify-start text-muted-foreground hover:text-destructive', 
            collapsed && 'justify-center'
          )}
          onClick={handleLogout}
        >
          <LogOut size={20} className={cn(collapsed ? '' : 'mr-3')} />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
