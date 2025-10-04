-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Set up cron jobs for automated insights
SELECT cron.schedule(
  'inventory-insights-every-4-hours',
  '0 */4 * * *', -- every 4 hours
  $$
  select
    net.http_post(
        url:='https://dsnzmsiydwspatbflhrt.supabase.co/functions/v1/inventory-insights',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Set up achievement tracking every 2 hours
SELECT cron.schedule(
  'achievement-tracker-every-2-hours',
  '0 */2 * * *', -- every 2 hours
  $$
  select
    net.http_post(
        url:='https://dsnzmsiydwspatbflhrt.supabase.co/functions/v1/achievement-tracker',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);