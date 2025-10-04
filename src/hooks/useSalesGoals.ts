import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = January

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

interface SalesGoal {
  id: string;
  goal_type: string;
  target_amount: number;
  period_start: string;
  period_end: string;
  is_active: boolean;
}

export const useSalesGoals = () => {
  const { user } = useAuth();
  const [currentGoal, setCurrentGoal] = useState<SalesGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentGoal = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const now = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

      const { data, error } = await supabase
        .from('sales_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .lte('period_start', now)
        .gte('period_end', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      const { start, end } = getCurrentMonthRange();
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching sales goal:', error);
        return;
      }

      setCurrentGoal({
        ...data,
        period_start: start,
        period_end: end
      });
    } catch (error) {
      console.error('Error fetching sales goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (goalData: {
    goal_type: string;
    target_amount: number;
    period_start: string;
    period_end: string;
  }) => {
    if (!user) return null;

    try {
      // Deactivate any existing active goals for the same period
      await supabase
        .from('sales_goals')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('goal_type', goalData.goal_type)
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('sales_goals')
        .insert({
          user_id: user.id,
          ...goalData
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating sales goal:', error);
        toast.error('Failed to create sales goal');
        return null;
      }

      setCurrentGoal(data);
      toast.success('Sales goal created successfully!');
      return data;
    } catch (error) {
      console.error('Error creating sales goal:', error);
      toast.error('Failed to create sales goal');
      return null;
    }
  };

  const updateGoal = async (goalId: string, updates: Partial<SalesGoal>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('sales_goals')
        .update(updates)
        .eq('id', goalId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating sales goal:', error);
        toast.error('Failed to update sales goal');
        return null;
      }

      setCurrentGoal(data);
      toast.success('Sales goal updated successfully!');
      return data;
    } catch (error) {
      console.error('Error updating sales goal:', error);
      toast.error('Failed to update sales goal');
      return null;
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('sales_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting sales goal:', error);
        toast.error('Failed to delete sales goal');
        return false;
      }

      setCurrentGoal(null);
      toast.success('Sales goal deleted successfully!');
      return true;
    } catch (error) {
      console.error('Error deleting sales goal:', error);
      toast.error('Failed to delete sales goal');
      return false;
    }
  };

  useEffect(() => {
    fetchCurrentGoal();
  }, [user]);

  return {
    currentGoal,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    refreshGoal: fetchCurrentGoal
  };
};