-- Create business_notes table for storing user's business notes
CREATE TABLE IF NOT EXISTS public.business_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for business notes
CREATE POLICY "Users can manage their own notes" 
ON public.business_notes 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_business_notes_user_id ON public.business_notes(user_id);
CREATE INDEX idx_business_notes_updated_at ON public.business_notes(updated_at DESC);