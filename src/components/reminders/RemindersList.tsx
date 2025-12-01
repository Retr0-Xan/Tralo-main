import { format, isToday, isPast, isThisWeek } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { Reminder } from "@/types/reminder";

interface RemindersListProps {
  reminders: Reminder[];
  onToggleComplete: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
  getPriorityColor: (priority: string) => string;
  highlightedId?: string | null;
  setReminderRef?: (id: string, element: HTMLDivElement | null) => void;
}

const RemindersList = ({
  reminders,
  onToggleComplete,
  onDelete,
  getPriorityColor,
  highlightedId,
  setReminderRef
}: RemindersListProps) => {

  const formatReminderDate = (dateString: string, timeString?: string) => {
    const date = new Date(dateString);
    const dateFormat = isToday(date) ? "'Today'" :
      isThisWeek(date) ? "EEEE" :
        "MMM dd, yyyy";

    let formatted = format(date, dateFormat);

    if (timeString) {
      formatted += ` at ${timeString}`;
    }

    return formatted;
  };

  const getReminderStatus = (reminder: Reminder) => {
    if (reminder.is_completed) return 'completed';

    const reminderDate = new Date(reminder.reminder_date);
    const now = new Date();

    if (isPast(reminderDate)) return 'overdue';
    if (isToday(reminderDate)) return 'today';
    return 'upcoming';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'today':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'overdue':
        return 'bg-red-50 border-red-200';
      case 'today':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-background border-border';
    }
  };

  if (reminders.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No reminders found</h3>
        <p className="text-muted-foreground mb-4">
          Create your first business reminder to stay organized and never miss important tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reminders.map((reminder) => {
        const status = getReminderStatus(reminder);

        const isHighlighted = highlightedId === reminder.id;

        return (
          <Card
            key={reminder.id}
            ref={(el) => setReminderRef?.(reminder.id, el)}
            className={`transition-all duration-200 ${getStatusColor(status)} ${reminder.is_completed ? 'opacity-70' : ''
              } ${isHighlighted ? 'ring-4 ring-primary ring-offset-2 shadow-lg' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(status)}
                    <h3 className={`font-semibold text-foreground ${reminder.is_completed ? 'line-through' : ''
                      }`}>
                      {reminder.title}
                    </h3>
                  </div>

                  {reminder.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {reminder.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      📅 {formatReminderDate(reminder.reminder_date, reminder.reminder_time || undefined)}
                    </Badge>

                    <Badge variant={getPriorityColor(reminder.priority) as any} className="text-xs">
                      {reminder.priority.toUpperCase()}
                    </Badge>

                    <Badge variant="secondary" className="text-xs capitalize">
                      {reminder.category}
                    </Badge>

                    {reminder.recurring_type !== 'none' && (
                      <Badge variant="outline" className="text-xs">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        {reminder.recurring_type}
                      </Badge>
                    )}

                    {status === 'overdue' && !reminder.is_completed && (
                      <Badge variant="destructive" className="text-xs">
                        OVERDUE
                      </Badge>
                    )}

                    {status === 'today' && !reminder.is_completed && (
                      <Badge variant="default" className="text-xs">
                        TODAY
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={reminder.is_completed ? "default" : "outline"}
                    size="sm"
                    onClick={() => onToggleComplete(reminder.id, reminder.is_completed)}
                    className="shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(reminder.id)}
                    className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RemindersList;