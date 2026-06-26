import React, { useEffect } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '@/components/Dashboard/Sidebar';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      navigate('/login');
      return;
    }

    const path = location.pathname;
    const isAdmin = user.role === 'admin';
    const isAdminPath = path.startsWith('/dashboard/admin');
    const isAllowedAdminPath = isAdminPath || path === '/dashboard/settings' || path === '/dashboard/profile';

    if (isAdmin) {
      // Admins are only allowed on admin pages, settings, and profile
      if (!isAllowedAdminPath && path.startsWith('/dashboard')) {
        navigate('/dashboard/admin');
      }
    } else {
      // Regular users are not allowed on admin pages
      if (isAdminPath) {
        navigate('/dashboard');
      }
    }
  }, [user, location.pathname, navigate]);
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  const path = location.pathname;
  const isAdmin = user.role === 'admin';
  const isAdminPath = path.startsWith('/dashboard/admin');
  const isAllowedAdminPath = isAdminPath || path === '/dashboard/settings' || path === '/dashboard/profile';

  if (isAdmin && !isAllowedAdminPath && path.startsWith('/dashboard')) {
    return <Navigate to="/dashboard/admin" />;
  }

  if (!isAdmin && isAdminPath) {
    return <Navigate to="/dashboard" />;
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
