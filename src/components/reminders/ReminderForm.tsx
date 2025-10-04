import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const reminderSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  reminder_date: z.string().min(1, "Date is required"),
  reminder_time: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  category: z.string().min(1, "Category is required"),
  recurring_type: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly'])
});

interface ReminderFormProps {
  onSuccess: () => void;
}

const ReminderForm = ({ onSuccess }: ReminderFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reminder_date: "",
    reminder_time: "",
    priority: "medium" as const,
    category: "general",
    recurring_type: "none" as const
  });

  const categories = [
    'general',
    'meetings',
    'payments',
    'inventory',
    'marketing',
    'staff',
    'taxes',
    'maintenance',
    'suppliers',
    'customers'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    try {
      reminderSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please check the form for errors and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create reminders.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create reminder date with time
      let reminderDateTime = formData.reminder_date;
      if (formData.reminder_time) {
        reminderDateTime = `${formData.reminder_date}T${formData.reminder_time}:00.000Z`;
      } else {
        reminderDateTime = `${formData.reminder_date}T09:00:00.000Z`; // Default to 9 AM
      }

      const { error } = await supabase
        .from('business_reminders')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description || null,
          reminder_date: reminderDateTime,
          reminder_time: formData.reminder_time || null,
          priority: formData.priority,
          category: formData.category,
          recurring_type: formData.recurring_type
        });

      if (error) throw error;

      // Reset form
      setFormData({
        title: "",
        description: "",
        reminder_date: "",
        reminder_time: "",
        priority: "medium",
        category: "general",
        recurring_type: "none"
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Error",
        description: "Failed to create reminder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          Create New Business Reminder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Reminder Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="e.g., Pay supplier invoice, Team meeting..."
              className={errors.title ? "border-destructive" : ""}
              maxLength={100}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Additional details about this reminder..."
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {formData.description.length}/500 characters
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reminder_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Reminder Date *
              </Label>
              <Input
                id="reminder_date"
                type="date"
                value={formData.reminder_date}
                onChange={(e) => handleInputChange("reminder_date", e.target.value)}
                min={today}
                className={errors.reminder_date ? "border-destructive" : ""}
              />
              {errors.reminder_date && (
                <p className="text-sm text-destructive">{errors.reminder_date}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder_time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Reminder Time (Optional)
              </Label>
              <Input
                id="reminder_time"
                type="time"
                value={formData.reminder_time}
                onChange={(e) => handleInputChange("reminder_time", e.target.value)}
              />
            </div>
          </div>

          {/* Priority and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority Level</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') => handleInputChange("priority", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low Priority</SelectItem>
                  <SelectItem value="medium">🟡 Medium Priority</SelectItem>
                  <SelectItem value="high">🔴 High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange("category", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="capitalize">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurring */}
          <div className="space-y-2">
            <Label>Recurring</Label>
            <Select
              value={formData.recurring_type}
              onValueChange={(value: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly') => 
                handleInputChange("recurring_type", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Creating..." : "Create Reminder"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReminderForm;