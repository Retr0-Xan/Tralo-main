import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  reminder_date: string;
  reminder_time?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  is_completed: boolean;
  is_notified: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting reminder notification check...');

    // Get current time
    const now = new Date();
    const currentTime = now.toISOString();
    
    // Calculate 30 minutes from now for early notification
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const thirtyMinutesFromNowStr = thirtyMinutesFromNow.toISOString();

    // Find reminders that:
    // 1. Are not completed
    // 2. Have not been notified yet
    // 3. Are due within the next 30 minutes OR are overdue
    const { data: dueReminders, error: fetchError } = await supabase
      .from('business_reminders')
      .select(`
        id,
        user_id,
        title,
        description,
        reminder_date,
        reminder_time,
        priority,
        category,
        is_completed,
        is_notified
      `)
      .eq('is_completed', false)
      .eq('is_notified', false)
      .lte('reminder_date', thirtyMinutesFromNowStr);

    if (fetchError) {
      console.error('Error fetching due reminders:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${dueReminders?.length || 0} due reminders`);

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No due reminders found',
          processed: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Process each reminder
    const notifications = [];
    for (const reminder of dueReminders) {
      try {
        // Create notification object
        const notification = {
          id: reminder.id,
          user_id: reminder.user_id,
          title: `⏰ Business Reminder: ${reminder.title}`,
          message: createNotificationMessage(reminder),
          priority: reminder.priority,
          category: reminder.category,
          reminder_date: reminder.reminder_date,
          created_at: currentTime
        };

        notifications.push(notification);

        // Mark reminder as notified
        const { error: updateError } = await supabase
          .from('business_reminders')
          .update({ is_notified: true })
          .eq('id', reminder.id);

        if (updateError) {
          console.error(`Error updating reminder ${reminder.id}:`, updateError);
        } else {
          console.log(`Successfully processed reminder: ${reminder.title}`);
        }

      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
      }
    }

    // In a real implementation, you would send these notifications via:
    // - Push notifications (using services like Firebase, OneSignal, etc.)
    // - Email notifications (using services like Resend, SendGrid, etc.)
    // - SMS notifications (using services like Twilio, etc.)
    // - In-app notifications (storing in a notifications table)

    // For now, we'll log the notifications and store them in a simple way
    console.log('Notifications to be sent:', notifications);

    // You could store notifications in a separate table for in-app display
    if (notifications.length > 0) {
      // Optional: Store notifications in database for in-app display
      // This would require creating a notifications table
      console.log(`Would send ${notifications.length} notifications`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${notifications.length} reminder notifications`,
        processed: notifications.length,
        notifications: notifications.map(n => ({
          title: n.title,
          user_id: n.user_id,
          priority: n.priority
        }))
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in reminder-notifications function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process reminder notifications',
        details: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function createNotificationMessage(reminder: Reminder): string {
  const reminderDate = new Date(reminder.reminder_date);
  const now = new Date();
  const isOverdue = reminderDate < now;
  
  let message = '';
  
  if (isOverdue) {
    const overdueDays = Math.floor((now.getTime() - reminderDate.getTime()) / (1000 * 60 * 60 * 24));
    if (overdueDays > 0) {
      message = `This reminder is ${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue. `;
    } else {
      message = 'This reminder is overdue. ';
    }
  } else {
    const minutesUntilDue = Math.floor((reminderDate.getTime() - now.getTime()) / (1000 * 60));
    if (minutesUntilDue <= 30) {
      message = `This reminder is due in ${minutesUntilDue} minute${minutesUntilDue !== 1 ? 's' : ''}. `;
    }
  }

  if (reminder.description) {
    message += `Details: ${reminder.description}`;
  }

  message += ` Priority: ${reminder.priority.toUpperCase()}`;

  return message;
}

/* 
TO USE THIS FUNCTION:

1. For manual testing, call it directly via HTTP POST to the function endpoint

2. For automated scheduling, set up a cron job in your Supabase database:
   - Enable pg_cron extension
   - Schedule function to run every 15 minutes using cron.schedule
   - Use net.http_post to call the function URL

3. Check scheduled jobs with: SELECT * FROM cron.job

4. Remove scheduled jobs with: SELECT cron.unschedule('job-name')
*/