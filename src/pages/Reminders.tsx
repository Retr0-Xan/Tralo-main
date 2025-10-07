import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Bell, Loader2 } from "lucide-react";
import { isToday, isPast } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReminderForm from "@/components/reminders/ReminderForm";
import RemindersList from "@/components/reminders/RemindersList";
import { PageHeader } from "@/components/layout/PageHeader";

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

type FilterType = 'all' | 'pending' | 'completed' | 'today';

type ReminderRow = {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  priority: string | null;
  category: string;
  is_completed: boolean;
  is_notified: boolean;
  recurring_type: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
};

const Reminders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchReminders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('reminder_date', { ascending: true });

      if (error) throw error;

      const typedData = (data as ReminderRow[] | null) ?? [];
      const normalized: Reminder[] = typedData.map(({ user_id: _userId, ...reminder }) => ({
        ...reminder,
        description: reminder.description ?? undefined,
        reminder_time: reminder.reminder_time ?? undefined,
        priority: (reminder.priority ?? 'medium') as Reminder['priority'],
        recurring_type: (reminder.recurring_type ?? 'none') as Reminder['recurring_type'],
      }));

      setReminders(normalized);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast({
        title: "Unable to load reminders",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }

    fetchReminders();
  }, [fetchReminders, user]);

  const handleReminderCreated = () => {
    setShowForm(false);
    fetchReminders();
    toast({
      title: "Reminder added",
      description: "We'll keep you updated when it's due.",
    });
  };

  const toggleReminderComplete = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('business_reminders')
        .update({ is_completed: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setReminders((prev) =>
        prev.map((reminder) =>
          reminder.id === id ? { ...reminder, is_completed: !currentStatus } : reminder
        )
      );

      toast({
        title: !currentStatus ? "Reminder completed" : "Reminder reopened",
        description: !currentStatus
          ? "Great job closing this task."
          : "We'll keep tracking this reminder.",
      });
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast({
        title: "Update failed",
        description: "We couldn't update the reminder status. Please retry.",
        variant: "destructive",
      });
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('business_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
      toast({
        title: "Reminder removed",
        description: "The reminder has been deleted from your board.",
      });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        title: "Deletion failed",
        description: "We couldn't delete the reminder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const { upcomingCount, overdueCount, completedCount } = useMemo(() => {
    const counts = {
      upcomingCount: 0,
      overdueCount: 0,
      completedCount: 0,
    };

    reminders.forEach((reminder) => {
      if (reminder.is_completed) {
        counts.completedCount += 1;
        return;
      }

      const reminderDate = new Date(reminder.reminder_date);

      if (isPast(reminderDate) && !isToday(reminderDate)) {
        counts.overdueCount += 1;
      } else {
        counts.upcomingCount += 1;
      }
    });

    return counts;
  }, [reminders]);

  const filteredReminders = useMemo(() => {
    switch (filter) {
      case 'pending':
        return reminders.filter((reminder) => !reminder.is_completed);
      case 'completed':
        return reminders.filter((reminder) => reminder.is_completed);
      case 'today':
        return reminders.filter((reminder) => isToday(new Date(reminder.reminder_date)));
      default:
        return reminders;
    }
  }, [filter, reminders]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const filterLabelMap: Record<FilterType, string> = {
    all: 'All tasks',
    pending: 'Pending tasks',
    completed: 'Completed tasks',
    today: 'Due today',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        title="Business Reminders"
        description="Coordinate supplier follow-ups, restocks, and financial checkpoints."
        actions={
          <Button onClick={() => setShowForm((prev) => !prev)} className="rounded-xl">
            {showForm ? (
              "Close Planner"
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" /> New Reminder
              </>
            )}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Upcoming</CardTitle>
              <CardDescription>Scheduled from today onward</CardDescription>
            </div>
            <span className="rounded-xl bg-primary/10 px-3 py-1 text-lg font-semibold text-primary">
              {upcomingCount}
            </span>
          </CardHeader>
        </Card>
        <Card className="rounded-2xl border border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Overdue</CardTitle>
              <CardDescription>Needs immediate attention</CardDescription>
            </div>
            <span className="rounded-xl bg-destructive/10 px-3 py-1 text-lg font-semibold text-destructive">
              {overdueCount}
            </span>
          </CardHeader>
        </Card>
        <Card className="rounded-2xl border border-green-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Completed</CardTitle>
              <CardDescription>Closed out follow-ups</CardDescription>
            </div>
            <span className="rounded-xl bg-green-100 px-3 py-1 text-lg font-semibold text-green-700">
              {completedCount}
            </span>
          </CardHeader>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border/70">
        <CardHeader className="gap-2">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Reminder Board</CardTitle>
              <CardDescription>{reminders.length} reminders managed</CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">
              {filterLabelMap[filter]}
            </Badge>
          </div>
          {!showForm && (
            <div className="flex flex-wrap gap-2 pt-2">
              {(['all', 'pending', 'completed', 'today'] as const).map((filterType) => (
                <Button
                  key={filterType}
                  size="sm"
                  variant={filter === filterType ? 'default' : 'outline'}
                  className="rounded-xl capitalize"
                  onClick={() => setFilter(filterType)}
                >
                  {filterType === 'all' ? 'All' : filterType}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {showForm ? (
            <ReminderForm onSuccess={handleReminderCreated} />
          ) : loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Loading reminders...</p>
            </div>
          ) : (
            <RemindersList
              reminders={filteredReminders}
              onToggleComplete={toggleReminderComplete}
              onDelete={deleteReminder}
              getPriorityColor={getPriorityColor}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reminders;