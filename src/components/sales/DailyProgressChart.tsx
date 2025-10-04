import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingUp, Target } from "lucide-react";
import { useDailyProgress } from "@/hooks/useDailyProgress";

interface DailyProgressChartProps {
  goalId?: string;
}

const DailyProgressChart = ({ goalId }: DailyProgressChartProps) => {
  const { dailyProgress, loading } = useDailyProgress(goalId);
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Daily Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between mb-1">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!goalId || dailyProgress.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Daily Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Set a sales goal to track daily progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      // Ghanaian format: DD/MM/YYYY with short weekday
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/(\w{3}), (\d{2})\/(\d{2})\/(\d{4})/, '$1 $2/$3/$4');
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const recentProgress = dailyProgress.slice(-7); // Show last 7 days
  const totalAmount = dailyProgress.reduce((sum, day) => sum + day.amount, 0);
  const totalGoal = dailyProgress.reduce((sum, day) => sum + day.goal_amount, 0);
  const overallPercentage = totalGoal > 0 ? (totalAmount / totalGoal) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Daily Progress
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4" />
            {Math.round(overallPercentage)}% overall
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Progress */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Total Progress</span>
              <span className="text-sm text-muted-foreground">
                ¢{totalAmount.toFixed(2)} / ¢{totalGoal.toFixed(2)}
              </span>
            </div>
            <Progress value={Math.min(overallPercentage, 100)} className="h-2" />
          </div>

          {/* Daily Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Recent Days</h4>
            {recentProgress.map((day) => (
              <div key={day.date} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{formatDate(day.date)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      ¢{day.amount.toFixed(2)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      day.percentage >= 100 
                        ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                        : day.percentage >= 50
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                    }`}>
                      {Math.round(day.percentage)}%
                    </span>
                  </div>
                </div>
                <Progress 
                  value={Math.min(day.percentage, 100)} 
                  className="h-2"
                />
              </div>
            ))}
          </div>

          {dailyProgress.length > 7 && (
            <div className="text-center">
              <span className="text-xs text-muted-foreground">
                Showing last 7 days of {dailyProgress.length} total days
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyProgressChart;