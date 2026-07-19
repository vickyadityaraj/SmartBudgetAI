import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ChatbotWidget } from "@/components/Chatbot/ChatbotWidget";

import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import DashboardIndex from "./pages/DashboardIndex";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ExpensesPage from "./pages/ExpensesPage";
import ReportsPage from "./pages/ReportsPage";
import SavingsPage from "./pages/SavingsPage";
import GoalsPage from "./pages/GoalsPage";
import AlertsPage from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";
import BankStatementAnalyzer from "./pages/BankStatementAnalyzer";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsersPage from "./pages/AdminUsersPage";
import SmartAdvisor from "./pages/SmartAdvisor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={<Dashboard />}>
              <Route index element={<DashboardIndex />} />
              <Route path="profile" element={<Profile />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="savings" element={<SavingsPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="bank-statement" element={<BankStatementAnalyzer />} />
              <Route path="smart-advisor" element={<SmartAdvisor />} />
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatbotWidget />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
