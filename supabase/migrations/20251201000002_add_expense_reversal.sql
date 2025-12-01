-- Add reversal tracking to expenses table

-- Add columns to track expense reversals
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

-- Add comment
COMMENT ON COLUMN public.expenses.is_reversed IS 'Whether this expense has been reversed (one-time only)';
COMMENT ON COLUMN public.expenses.reversed_at IS 'Timestamp when the expense was reversed';
COMMENT ON COLUMN public.expenses.reversal_reason IS 'Reason for reversing the expense';

-- Create index for filtering reversed expenses
CREATE INDEX IF NOT EXISTS idx_expenses_reversed ON public.expenses(is_reversed, user_id);
