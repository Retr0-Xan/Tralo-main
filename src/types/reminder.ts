export interface Reminder {
    id: string;
    title: string;
    description?: string;
    reminder_date: string;
    reminder_time?: string;
    priority: "low" | "medium" | "high";
    category: string;
    is_completed: boolean;
    is_notified: boolean;
    recurring_type: "none" | "daily" | "weekly" | "monthly" | "yearly";
    created_at: string;
    updated_at: string;
}

export interface ReminderRow {
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
}
