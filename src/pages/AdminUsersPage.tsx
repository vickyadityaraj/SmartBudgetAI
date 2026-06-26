import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/services/api';
import { 
  Users, 
  Trash2, 
  UserCheck, 
  ShieldAlert, 
  Eye, 
  Search, 
  RefreshCw,
  Clock,
  Briefcase,
  PiggyBank,
  Target,
  FileText
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserStats {
  expensesCount: number;
  incomesCount: number;
  savingsCount: number;
  goalsCount: number;
  totalTransactions: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  stats: UserStats;
}

const AdminUsersPage = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  
  // Role change confirmation
  const [userToModifyRole, setUserToModifyRole] = useState<UserData | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<'user' | 'admin' | null>(null);
  const [isRoleConfirmOpen, setIsRoleConfirmOpen] = useState(false);

  // Deletion confirmation
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Get currently logged-in admin details to prevent self-modification
  const currentAdmin = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchUsers = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const response = await adminApi.getUsers();
      setUsers(response.data);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error.response?.data?.message || 'Failed to load users directory.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleRoleClick = (user: UserData) => {
    if (user.id === currentAdmin.id) {
      toast.error('You cannot change your own role.');
      return;
    }
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    setUserToModifyRole(user);
    setRoleChangeTarget(nextRole);
    setIsRoleConfirmOpen(true);
  };

  const executeRoleChange = async () => {
    if (!userToModifyRole || !roleChangeTarget) return;
    
    try {
      await adminApi.updateUserRole(userToModifyRole.id, roleChangeTarget);
      toast.success(`Updated ${userToModifyRole.name}'s role to ${roleChangeTarget}.`);
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === userToModifyRole.id ? { ...u, role: roleChangeTarget } : u));
    } catch (error: any) {
      console.error('Error changing user role:', error);
      toast.error(error.response?.data?.message || 'Failed to update user role.');
    } finally {
      setIsRoleConfirmOpen(false);
      setUserToModifyRole(null);
      setRoleChangeTarget(null);
    }
  };

  const handleDeleteClick = (user: UserData) => {
    if (user.id === currentAdmin.id) {
      toast.error('You cannot delete your own admin account.');
      return;
    }
    setUserToDelete(user);
    setDeleteConfirmationText('');
    setIsDeleteConfirmOpen(true);
  };

  const executeUserDeletion = async () => {
    if (!userToDelete) return;
    
    if (deleteConfirmationText.trim().toLowerCase() !== 'delete') {
      toast.error('Confirmation text does not match. Please type "delete" to confirm.');
      return;
    }

    try {
      await adminApi.deleteUser(userToDelete.id);
      toast.success(`Account and all financial logs for ${userToDelete.name} permanently deleted.`);
      
      // Update local state
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user.');
    } finally {
      setIsDeleteConfirmOpen(false);
      setUserToDelete(null);
      setDeleteConfirmationText('');
    }
  };

  const handleViewSummary = (user: UserData) => {
    setSelectedUser(user);
    setIsSummaryOpen(true);
  };

  // Filter users based on query
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage user accounts, roles, and review account activity summaries safely.</p>
        </div>
        <Button 
          onClick={() => fetchUsers(true)} 
          disabled={isRefreshing}
          variant="outline"
          className="glass-card flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Directory'}
        </Button>
      </div>

      {/* Directory Table */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <CardTitle>User Directory</CardTitle>
              <CardDescription>All registered FinGenius users and administrators.</CardDescription>
            </div>
            {/* Search Input */}
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 overflow-x-auto">
          {isLoading ? (
            <div className="p-12 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse w-full"></div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No accounts found matching your search.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-center">Total Activity Logs</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentAdmin.id;
                  return (
                    <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                      {/* Name and Email */}
                      <td className="p-4">
                        <div className="font-medium">{user.name} {isSelf && <span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">You</span>}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>
                      </td>
                      
                      {/* Role Badge */}
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'admin' 
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                            : 'bg-muted-foreground/10 text-muted-foreground'
                        }`}>
                          {user.role === 'admin' ? 'Administrator' : 'User'}
                        </span>
                      </td>
                      
                      {/* Joined Date */}
                      <td className="p-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(user.createdAt), 'dd MMM yyyy')}
                        </div>
                      </td>
                      
                      {/* Activity Total */}
                      <td className="p-4 text-center font-semibold text-sm">
                        {user.stats.totalTransactions} logs
                      </td>
                      
                      {/* Action Buttons */}
                      <td className="p-4 text-right space-x-2">
                        {/* View Privacy-Preserved Summary */}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleViewSummary(user)}
                          title="View activity summary"
                          className="hover:bg-muted/50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {/* Toggle Role */}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleToggleRoleClick(user)}
                          disabled={isSelf}
                          title={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                          className="hover:bg-muted/50 text-blue-500 disabled:opacity-50"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        
                        {/* Delete Account */}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDeleteClick(user)}
                          disabled={isSelf}
                          title="Permanently delete user data"
                          className="hover:bg-rose-500/10 text-rose-500 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Privacy-Preserved User Summary Dialog */}
      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className="glass-card max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Activity Summary</DialogTitle>
            <DialogDescription>
              Record aggregates for **{selectedUser?.name}**. Private transaction descriptions and values are strictly hidden.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4 space-y-4">
              <div className="p-3 rounded-lg bg-muted/20 border border-muted/50 space-y-1">
                <div className="text-xs text-muted-foreground">Account Details</div>
                <div className="font-semibold">{selectedUser.name}</div>
                <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Registered: {format(new Date(selectedUser.createdAt), 'hh:mm a, dd MMMM yyyy')}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logged Records Count</div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {/* Expenses */}
                  <div className="flex items-center justify-between p-2.5 rounded bg-muted/20">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Briefcase className="h-4 w-4 text-rose-500" />
                      Expenses
                    </div>
                    <span className="font-bold">{selectedUser.stats.expensesCount}</span>
                  </div>

                  {/* Incomes */}
                  <div className="flex items-center justify-between p-2.5 rounded bg-muted/20">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="h-4 w-4 text-emerald-500" />
                      Incomes
                    </div>
                    <span className="font-bold">{selectedUser.stats.incomesCount}</span>
                  </div>

                  {/* Savings */}
                  <div className="flex items-center justify-between p-2.5 rounded bg-muted/20">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <PiggyBank className="h-4 w-4 text-blue-500" />
                      Savings Logs
                    </div>
                    <span className="font-bold">{selectedUser.stats.savingsCount}</span>
                  </div>

                  {/* Goals */}
                  <div className="flex items-center justify-between p-2.5 rounded bg-muted/20">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Target className="h-4 w-4 text-purple-500" />
                      Goals Set
                    </div>
                    <span className="font-bold">{selectedUser.stats.goalsCount}</span>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1 bg-blue-500/10 text-blue-500 p-2.5 rounded border border-blue-500/20 mt-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Individual transaction details are encrypted and private.
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setIsSummaryOpen(false)}>Close Summary</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Toggle Confirmation Modal */}
      <AlertDialog open={isRoleConfirmOpen} onOpenChange={setIsRoleConfirmOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Modify Account Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change **{userToModifyRole?.name}**'s role to **{roleChangeTarget === 'admin' ? 'Administrator' : 'User'}**?
              {roleChangeTarget === 'admin' && ' This will grant them complete system-level analytics and user administration privileges.'}
              {roleChangeTarget === 'user' && ' This will remove all their system administration access and restrict them to personal financial tools.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeRoleChange} className="bg-primary hover:bg-primary/90">
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Destructive User Deletion Confirmation Modal */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-500 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              CRITICAL: Permanently Delete User Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to delete the user **{userToDelete?.name}** ({userToDelete?.email}) and **ALL** their associated financial logs.
              </p>
              <div className="p-3 bg-rose-500/10 text-rose-500 text-xs rounded border border-rose-500/20 font-medium">
                WARNING: This will permanently delete all {userToDelete?.stats.expensesCount} expenses, {userToDelete?.stats.incomesCount} incomes, {userToDelete?.stats.savingsCount} savings deposits, and {userToDelete?.stats.goalsCount} goals. This action is irreversible.
              </div>
              <p className="text-sm">
                To confirm, please type <span className="font-bold text-foreground">"delete"</span> in the box below:
              </p>
              <Input
                placeholder='Type "delete" here'
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="mt-2 border-rose-500/50 focus-visible:ring-rose-500"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <Button 
              variant="destructive"
              onClick={executeUserDeletion}
              disabled={deleteConfirmationText.trim().toLowerCase() !== 'delete'}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
            >
              Permanently Delete Account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsersPage;
