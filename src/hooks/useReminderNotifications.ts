import { useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow, isValid } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Reminder, ReminderRow } from "@/types/reminder";

const REFRESH_INTERVAL_MS = 60_000;
const CHECK_INTERVAL_MS = 60_000;
const APPROACHING_WINDOW_MINUTES = 15;
const APPROACHING_WINDOW_MS = APPROACHING_WINDOW_MINUTES * 60_000;
const INITIAL_TOAST_DELAY_MS = 900;
const INITIAL_TOAST_STAGGER_MS = 900;

type NotificationState = {
  approaching: boolean;
  due: boolean;
};

const normalizeReminderRow = (row: ReminderRow): Reminder => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  reminder_date: row.reminder_date,
  reminder_time: row.reminder_time ?? undefined,
  priority: (row.priority ?? "medium") as Reminder["priority"],
  category: row.category,
  is_completed: row.is_completed ?? false,
  is_notified: row.is_notified ?? false,
  recurring_type: (row.recurring_type ?? "none") as Reminder["recurring_type"],
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const parseReminderDateTime = (reminder: Reminder) => {
  const hasTime = Boolean(reminder.reminder_time);

  if (hasTime) {
    const candidate = new Date(`${reminder.reminder_date}T${reminder.reminder_time}`);
    if (isValid(candidate)) {
      return { date: candidate, hasTime };
    }
  }

  const fallback = new Date(reminder.reminder_date);
  return { date: isValid(fallback) ? fallback : null, hasTime: false };
};

const formatDueLabel = (reminder: Reminder) => {
  const { date, hasTime } = parseReminderDateTime(reminder);
  if (!date) {
    return "No due date set";
  }

  return hasTime ? format(date, "PP • p") : format(date, "PP");
};

export const useReminderNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const hasShownInitialRef = useRef(false);
  const notifiedRef = useRef<Map<string, NotificationState>>(new Map());
  const initialTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!user) {
      setReminders([]);
      hasShownInitialRef.current = false;
      notifiedRef.current = new Map();
      initialTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      initialTimeoutsRef.current = [];
      return;
    }

    let isActive = true;

    const loadReminders = async () => {
      try {
        const { data, error } = await supabase
          .from("business_reminders")
          .select("*")
          .eq("user_id", user.id)
          .order("reminder_date", { ascending: true });

        if (error) throw error;
        if (!isActive) return;

        const rows = (data ?? []) as ReminderRow[];
        const normalized = rows.map(normalizeReminderRow);

        setReminders(normalized);

        const knownIds = new Set(normalized.map((item) => item.id));
        notifiedRef.current.forEach((_, id) => {
          if (!knownIds.has(id)) {
            notifiedRef.current.delete(id);
          }
        });
      } catch (err) {
        console.error("Failed to load reminders for notifications", err);
      }
    };

    loadReminders();
    const refreshTimer = window.setInterval(loadReminders, REFRESH_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(refreshTimer);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !reminders.length || hasShownInitialRef.current) {
      return;
    }

    const pending = reminders.filter((reminder) => !reminder.is_completed);
    if (!pending.length) {
      hasShownInitialRef.current = true;
      return;
    }

    const timeouts: number[] = [];
    const now = Date.now();

    pending.forEach((reminder, index) => {
      const timeoutId = window.setTimeout(() => {
        toast({
          title: reminder.title,
          description: `Due ${formatDueLabel(reminder)}`,
        });
      }, INITIAL_TOAST_DELAY_MS + index * INITIAL_TOAST_STAGGER_MS);

      timeouts.push(timeoutId);

      const { date } = parseReminderDateTime(reminder);
      if (date) {
        const diff = date.getTime() - now;
        const current = notifiedRef.current.get(reminder.id) ?? { approaching: false, due: false };

        if (diff <= 0) {
          current.due = true;
          current.approaching = true;
        } else if (diff <= APPROACHING_WINDOW_MS) {
          current.approaching = true;
        }

        notifiedRef.current.set(reminder.id, current);
      }
    });

    initialTimeoutsRef.current = timeouts;
    hasShownInitialRef.current = true;

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [reminders, user, toast]);

  useEffect(() => {
    if (!user || !reminders.length) {
      return;
    }

    const checkReminders = () => {
      const now = Date.now();

      reminders.forEach((reminder) => {
        if (reminder.is_completed) {
          notifiedRef.current.delete(reminder.id);
          return;
        }

        const { date } = parseReminderDateTime(reminder);
        if (!date) {
          return;
        }

        const diff = date.getTime() - now;
        const state = notifiedRef.current.get(reminder.id) ?? { approaching: false, due: false };

        if (diff <= 0 && !state.due) {
          toast({
            title: `${reminder.title} is due now`,
            description: `Scheduled for ${formatDueLabel(reminder)}`,
            variant: "destructive",
          });

          state.due = true;
          state.approaching = true;
          notifiedRef.current.set(reminder.id, state);
          return;
        }

        if (diff > 0 && diff <= APPROACHING_WINDOW_MS && !state.approaching) {
          toast({
            title: `Upcoming: ${reminder.title}`,
            description: `${formatDueLabel(reminder)} (${formatDistanceToNow(date, { addSuffix: true })})`,
          });

          state.approaching = true;
          notifiedRef.current.set(reminder.id, state);
        }
      });
    };

    checkReminders();
    const intervalId = window.setInterval(checkReminders, CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [reminders, user, toast]);
};
