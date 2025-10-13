import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { subscribeToSalesDataUpdates } from "@/lib/sales-events";
import { fetchSalesAnalytics, sumEffectiveAmount } from "@/lib/sales-analytics";

interface DailyProgress {
  date: string;
  amount: number;
  goal_amount: number;
  percentage: number;
}

export const useDailyProgress = (goalId?: string) => {
  const { user } = useAuth();
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDailyProgress = useCallback(async () => {
    if (!user || !goalId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get the sales goal details
      const { data: goal } = await supabase
        .from('sales_goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single();

      if (!goal) {
        setLoading(false);
        return;
      }

      // Calculate daily progress based on goal type
      const startDate = new Date(goal.period_start);
      const endDate = new Date(goal.period_end);
      const today = new Date();

      // Get all sales within the goal period
      const sales = await fetchSalesAnalytics(user.id, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeReversed: false
      });

      const validSales = sales.filter((sale) => Number(sale.effective_amount ?? sale.amount ?? 0) > 0);

      // Calculate daily targets based on goal type
      let dailyTarget = 0;
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      switch (goal.goal_type) {
        case 'daily':
          dailyTarget = Number(goal.target_amount);
          break;
        case 'weekly':
          dailyTarget = Number(goal.target_amount) / 7;
          break;
        case 'monthly':
          dailyTarget = Number(goal.target_amount) / totalDays;
          break;
        case 'yearly':
          dailyTarget = Number(goal.target_amount) / 365;
          break;
      }

      // Group sales by date
      const salesByDate = validSales.reduce((acc, sale) => {
        const saleDate = new Date(sale.purchase_date).toISOString().split('T')[0];
        if (!acc[saleDate]) {
          acc[saleDate] = 0;
        }
        acc[saleDate] += Number(sale.effective_amount ?? sale.amount ?? 0);
        return acc;
      }, {} as Record<string, number>);

      // Generate daily progress data
      const progressData: DailyProgress[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate && currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayAmount = salesByDate[dateStr] || 0;
        const percentage = dailyTarget > 0 ? (dayAmount / dailyTarget) * 100 : 0;

        progressData.push({
          date: dateStr,
          amount: dayAmount,
          goal_amount: dailyTarget,
          percentage: Math.min(percentage, 100) // Cap at 100%
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      setDailyProgress(progressData);
    } catch (error) {
      console.error('Error fetching daily progress:', error);
    } finally {
      setLoading(false);
    }
  }, [goalId, user]);

  useEffect(() => {
    fetchDailyProgress();
  }, [fetchDailyProgress]);

  useEffect(() => {
    if (!user || !goalId) {
      return;
    }
    const unsubscribe = subscribeToSalesDataUpdates(() => {
      fetchDailyProgress();
    });
    return unsubscribe;
  }, [user, goalId, fetchDailyProgress]);

  return {
    dailyProgress,
    loading,
    refreshProgress: fetchDailyProgress
  };
};