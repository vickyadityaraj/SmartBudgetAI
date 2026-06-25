import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { formatToINR } from '@/lib/utils';
import { goalsApi } from '@/services/api';
import { toast } from 'sonner';

interface Milestone {
  _id?: string;
  description: string;
  targetAmount: number;
  completed: boolean;
}

interface Goal {
  _id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  deadline: string;
  milestones: Milestone[];
}

const GOAL_CATEGORIES = [
  'Emergency Fund',
  'Retirement',
  'Home Purchase',
  'Debt Payoff',
  'Vacation',
  'Education',
  'Investment',
  'Other'
];

const GoalsPage = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState(GOAL_CATEGORIES[0]);
  const [monthsToDeadline, setMonthsToDeadline] = useState('12');
  const [newMilestone, setNewMilestone] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [milestoneAmount, setMilestoneAmount] = useState('');
  const [progressValue, setProgressValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const response = await goalsApi.getGoals();
      const loadedGoals = response.data.goals || [];
      setGoals(loadedGoals);
      
      // Sync selected goal with updated data from backend
      if (selectedGoal) {
        const updatedSelected = loadedGoals.find((g: Goal) => g._id === selectedGoal._id);
        setSelectedGoal(updatedSelected || null);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to load goals.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleAddGoal = async () => {
    if (!title || !targetAmount || !category) return;

    try {
      const deadlineDate = addMonths(new Date(), parseInt(monthsToDeadline));
      await goalsApi.addGoal({
        title,
        targetAmount: parseFloat(targetAmount),
        category,
        deadline: deadlineDate
      });
      
      toast.success('Financial goal created.');
      fetchGoals();
      setTitle('');
      setTargetAmount('');
      setMonthsToDeadline('12');
    } catch (error) {
      console.error('Error adding goal:', error);
      toast.error('Failed to create financial goal.');
    }
  };

  const handleAddMilestone = async (goalId: string) => {
    if (!newMilestone || !milestoneAmount) return;

    try {
      await goalsApi.addMilestone(goalId, {
        description: newMilestone,
        targetAmount: parseFloat(milestoneAmount)
      });
      
      toast.success('Milestone added.');
      fetchGoals();
      setNewMilestone('');
      setMilestoneAmount('');
    } catch (error) {
      console.error('Error adding milestone:', error);
      toast.error('Failed to add milestone.');
    }
  };

  const handleUpdateProgress = async (goalId: string) => {
    const val = parseFloat(progressValue);
    if (isNaN(val) || val <= 0) return;

    try {
      await goalsApi.updateGoalProgress(goalId, val);
      toast.success('Goal progress updated.');
      fetchGoals();
      setProgressValue('');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress.');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await goalsApi.deleteGoal(goalId);
      toast.success('Goal deleted successfully.');
      fetchGoals();
      if (selectedGoal?._id === goalId) {
        setSelectedGoal(null);
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">Financial Goals</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add Goal Card */}
            <Card className="glass-card animate-fade-in">
              <CardHeader>
                <CardTitle>Create New Goal</CardTitle>
                <CardDescription>Set your financial targets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Goal Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter goal title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAmount">Target Amount</Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    placeholder="Enter target amount"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Months to Deadline</Label>
                  <Input
                    id="deadline"
                    type="number"
                    placeholder="Number of months"
                    value={monthsToDeadline}
                    onChange={(e) => setMonthsToDeadline(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleAddGoal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Goal
                </Button>
              </CardContent>
            </Card>

            {/* Goal Details Card */}
            {selectedGoal && (
              <Card className="glass-card animate-fade-in">
                <CardHeader>
                  <CardTitle>Goal Details</CardTitle>
                  <CardDescription>{selectedGoal.title}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>Progress</span>
                      <span className="text-muted-foreground font-medium">
                        {formatToINR(selectedGoal.currentAmount)} / {formatToINR(selectedGoal.targetAmount)}
                      </span>
                    </div>
                    <Progress
                      value={(selectedGoal.currentAmount / selectedGoal.targetAmount) * 100}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-progress-input">Add Progress Amount</Label>
                    <div className="flex gap-2">
                      <Input
                        id="add-progress-input"
                        type="number"
                        placeholder="Amount to add"
                        className="flex-1"
                        value={progressValue}
                        onChange={(e) => setProgressValue(e.target.value)}
                      />
                      <Button onClick={() => handleUpdateProgress(selectedGoal._id)}>
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="milestone-desc">Add Milestone</Label>
                    <div className="flex gap-2">
                      <Input
                        id="milestone-desc"
                        placeholder="Description"
                        value={newMilestone}
                        onChange={(e) => setNewMilestone(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={milestoneAmount}
                        onChange={(e) => setMilestoneAmount(e.target.value)}
                        className="w-32"
                      />
                      <Button onClick={() => handleAddMilestone(selectedGoal._id)}>
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Milestones</Label>
                    <div className="space-y-2">
                      {selectedGoal.milestones.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1">No milestones added yet.</p>
                      ) : (
                        selectedGoal.milestones.map((milestone, index) => (
                          <div
                            key={milestone._id || index}
                            className={`p-2 rounded-lg border flex items-center justify-between ${
                              milestone.completed ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2
                                className={`w-4 h-4 ${
                                  milestone.completed ? 'text-green-500' : 'text-gray-400'
                                }`}
                              />
                              <span className="text-sm">{milestone.description}</span>
                            </div>
                            <span className="text-sm font-medium">{formatToINR(milestone.targetAmount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Goals List Card */}
          <Card className="glass-card animate-fade-in">
            <CardHeader>
              <CardTitle>Your Goals</CardTitle>
              <CardDescription>Track your financial goals progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {goals.length === 0 ? (
                  <p className="text-muted-foreground text-center">No goals set yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.map((goal) => (
                      <Card
                        key={goal._id}
                        className={`glass-card animate-fade-in cursor-pointer transition-all hover:shadow-lg ${
                          selectedGoal?._id === goal._id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedGoal(goal)}
                      >
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{goal.title}</CardTitle>
                              <CardDescription>{goal.category}</CardDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGoal(goal._id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Target:</span>
                                <span className="font-medium">{formatToINR(goal.targetAmount)}</span>
                              </div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Current:</span>
                                <span className="font-medium">{formatToINR(goal.currentAmount)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Deadline:</span>
                                <span className="font-medium">{format(new Date(goal.deadline), 'MMM dd, yyyy')}</span>
                              </div>
                            </div>
                            <Progress
                              value={(goal.currentAmount / goal.targetAmount) * 100}
                              className="h-2"
                            />
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">
                                {((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)}% Complete
                              </span>
                              <span className="text-muted-foreground">
                                {formatToINR(Math.max(0, goal.targetAmount - goal.currentAmount))} remaining
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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

export default GoalsPage;
