import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Bell, Calendar, Clock, AlertCircle, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReminderForm from "@/components/reminders/ReminderForm";
import RemindersList from "@/components/reminders/RemindersList";

interface Reminder {
  id: string;
  title: string;
  description?: string;
  reminder_date: string;
  reminder_time?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  is_completed: boolean;
  is_notified: boolean;
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  created_at: string;
  updated_at: string;
}

const Reminders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'today'>('all');

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('business_reminders')
        .select('*')
        .order('reminder_date', { ascending: true });

      if (error) throw error;
      setReminders((data || []) as Reminder[]);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast({
        title: "Error",
        description: "Failed to load reminders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReminderCreated = () => {
    setShowForm(false);
    fetchReminders();
    toast({
      title: "✅ Reminder Created!",
      description: "Your business reminder has been saved successfully.",
    });
  };

  const toggleReminderComplete = async (reminderId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('business_reminders')
        .update({ is_completed: !currentStatus })
        .eq('id', reminderId);

      if (error) throw error;
      
      await fetchReminders();
      toast({
        title: !currentStatus ? "✅ Reminder Completed!" : "📝 Reminder Reopened",
        description: !currentStatus ? "Great job completing your task!" : "Reminder marked as pending again.",
      });
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast({
        title: "Error",
        description: "Failed to update reminder status.",
        variant: "destructive",
      });
    }
  };

  const deleteReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('business_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;
      
      await fetchReminders();
      toast({
        title: "🗑️ Reminder Deleted",
        description: "The reminder has been removed successfully.",
      });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        title: "Error",
        description: "Failed to delete reminder.",
        variant: "destructive",
      });
    }
  };

  const getFilteredReminders = () => {
    const today = new Date().toISOString().split('T')[0];
    
    switch (filter) {
      case 'pending':
        return reminders.filter(r => !r.is_completed);
      case 'completed':
        return reminders.filter(r => r.is_completed);
      case 'today':
        return reminders.filter(r => r.reminder_date.split('T')[0] === today);
      default:
        return reminders;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getUpcomingCount = () => {
    const now = new Date();
    return reminders.filter(r => 
      !r.is_completed && 
      new Date(r.reminder_date) >= now
    ).length;
  };

  const getOverdueCount = () => {
    const now = new Date();
    return reminders.filter(r => 
      !r.is_completed && 
      new Date(r.reminder_date) < now
    ).length;
  };

  if (!user) {
    return null;
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="p-6 pt-12">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Reminders
            </Button>
          </div>
          <ReminderForm onSuccess={handleReminderCreated} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="p-6 pt-12">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Business Reminders</h1>
            <p className="text-muted-foreground">Stay on top of your business tasks and deadlines</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Reminder
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Bell className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{reminders.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{getUpcomingCount()}</div>
              <div className="text-sm text-muted-foreground">Upcoming</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold">{getOverdueCount()}</div>
              <div className="text-sm text-muted-foreground">Overdue</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Check className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{reminders.filter(r => r.is_completed).length}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'pending', 'completed', 'today'] as const).map((filterType) => (
            <Button
              key={filterType}
              variant={filter === filterType ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filterType)}
              className="capitalize"
            >
              {filterType === 'all' ? 'All Reminders' : filterType}
            </Button>
          ))}
        </div>

        {/* Reminders List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading reminders...</p>
          </div>
        ) : (
          <RemindersList
            reminders={getFilteredReminders()}
            onToggleComplete={toggleReminderComplete}
            onDelete={deleteReminder}
            getPriorityColor={getPriorityColor}
          />
        )}
      </div>
    </div>
  );
};

export default Reminders;