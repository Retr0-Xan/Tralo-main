import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Settings, Target, Trash2, TrendingUp, Calendar } from "lucide-react";
import { useSalesGoals } from "@/hooks/useSalesGoals";
import { Badge } from "@/components/ui/badge";

interface SalesGoalDialogProps {
  onGoalUpdate?: () => void;
}

const SalesGoalDialog = ({ onGoalUpdate }: SalesGoalDialogProps) => {
  const { currentGoal, createGoal, updateGoal, deleteGoal, loading } = useSalesGoals();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    goal_type: currentGoal?.goal_type || 'monthly',
    target_amount: currentGoal?.target_amount?.toString() || '',
    period_start: currentGoal?.period_start || '',
    period_end: currentGoal?.period_end || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [useCustomDates, setUseCustomDates] = useState(false);

  // Format the target amount display
  const formatTargetAmount = (amount: string) => {
    // Remove any non-numeric characters except decimal point
    const cleaned = amount.replace(/[^\d.]/g, '');
    // Handle multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  };

  const handleTargetAmountChange = (value: string) => {
    const formatted = formatTargetAmount(value);
    setFormData(prev => ({ ...prev, target_amount: formatted }));
  };

  const handleTargetAmountFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text when focused for easy clearing
    e.target.select();
  };

  const calculatePeriod = (goalType: string) => {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (goalType) {
      case 'daily':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 1);
        periodEnd.setMilliseconds(periodEnd.getMilliseconds() - 1); // End of day
        break;
      case 'weekly':
        const startOfWeek = now.getDate() - now.getDay();
        periodStart = new Date(now.getFullYear(), now.getMonth(), startOfWeek);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999); // End of week
        break;
      case 'yearly':
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodEnd = new Date(now.getFullYear(), 11, 31);
        periodEnd.setHours(23, 59, 59, 999);
        break;
      default: // monthly
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        periodEnd.setHours(23, 59, 59, 999);
        break;
    }

    return {
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0]
    };
  };

  const getPeriodDescription = (goalType: string) => {
    const now = new Date();
    const formatGhanaianDate = (date: Date) => 
      date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    switch (goalType) {
      case 'daily':
        return `Today (${formatGhanaianDate(now)})`;
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `This week (${formatGhanaianDate(startOfWeek)} - ${formatGhanaianDate(endOfWeek)})`;
      case 'yearly':
        return `Year ${now.getFullYear()}`;
      default:
        return `${now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmount = parseFloat(formData.target_amount);
    if (submitting || !targetAmount || targetAmount <= 0) return;

    setSubmitting(true);
    
    let period;
    if (useCustomDates && formData.period_start && formData.period_end) {
      period = {
        period_start: formData.period_start,
        period_end: formData.period_end
      };
    } else {
      period = calculatePeriod(formData.goal_type);
    }
    
    const goalData = {
      goal_type: formData.goal_type,
      target_amount: targetAmount,
      ...period
    };

    let result;
    if (currentGoal) {
      result = await updateGoal(currentGoal.id, goalData);
    } else {
      result = await createGoal(goalData);
    }

    if (result) {
      setOpen(false);
      onGoalUpdate?.();
    }
    
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!currentGoal || submitting) return;
    
    setSubmitting(true);
    const success = await deleteGoal(currentGoal.id);
    
    if (success) {
      setOpen(false);
      onGoalUpdate?.();
    }
    
    setSubmitting(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen || !loading) {
      setOpen(newOpen);
      if (newOpen && currentGoal) {
        setFormData({
          goal_type: currentGoal.goal_type,
          target_amount: Number(currentGoal.target_amount).toString(),
          period_start: currentGoal.period_start,
          period_end: currentGoal.period_end
        });
      } else if (newOpen && !currentGoal) {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          goal_type: 'monthly',
          target_amount: '',
          period_start: today,
          period_end: today
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          {currentGoal ? 'Edit Goal' : 'Set Goal'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {currentGoal ? 'Edit Sales Goal' : 'Set Sales Goal'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal_type">Goal Period</Label>
            <Select 
              value={formData.goal_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, goal_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily Goal</SelectItem>
                <SelectItem value="weekly">Weekly Goal</SelectItem>
                <SelectItem value="monthly">Monthly Goal</SelectItem>
                <SelectItem value="yearly">Yearly Goal</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {getPeriodDescription(formData.goal_type)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_amount">Target Amount (¢)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">¢</span>
              <Input
                id="target_amount"
                type="text"
                value={formData.target_amount}
                onChange={(e) => handleTargetAmountChange(e.target.value)}
                onFocus={handleTargetAmountFocus}
                placeholder="0.00"
                className="pl-8"
                required
              />
            </div>
            {formData.target_amount && (
              <div className="text-xs text-muted-foreground">
                Goal: ¢{parseFloat(formData.target_amount || '0').toLocaleString()} for {getPeriodDescription(formData.goal_type).toLowerCase()}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Custom Date Range</Label>
              <Switch
                checked={useCustomDates}
                onCheckedChange={setUseCustomDates}
              />
            </div>
            
            {useCustomDates && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="period_start" className="text-xs">Start Date</Label>
                  <Input
                    id="period_start"
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                    className="text-sm"
                    required={useCustomDates}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period_end" className="text-xs">End Date</Label>
                  <Input
                    id="period_end"
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                    className="text-sm"
                    required={useCustomDates}
                  />
                </div>
              </div>
            )}
            
            {!useCustomDates && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 px-3 py-2 bg-muted/30 rounded-md">
                <Calendar className="w-3 h-3" />
                Period will be calculated automatically based on goal type
              </div>
            )}
          </div>

          {currentGoal && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Goal</span>
                <Badge variant="outline">{currentGoal.goal_type}</Badge>
              </div>
              <div className="text-lg font-bold">¢{Number(currentGoal.target_amount).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {currentGoal.period_start} to {currentGoal.period_end}
              </div>
            </div>
          )}

          <div className="flex justify-between gap-3 pt-4">
            {currentGoal && (
              <Button 
                type="button" 
                variant="destructive" 
                size="sm"
                onClick={handleDelete}
                disabled={submitting}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Goal
              </Button>
            )}
            
            <div className="flex gap-2 ml-auto">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting || !formData.target_amount || parseFloat(formData.target_amount || '0') <= 0}
              >
                {submitting ? 'Saving...' : (currentGoal ? 'Update Goal' : 'Create Goal')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SalesGoalDialog;