-- Create tables for trade index insights and documents functionality

-- Table for user inventory/products to link with trade index
CREATE TABLE public.user_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  current_stock INTEGER DEFAULT 0,
  last_sale_date TIMESTAMP WITH TIME ZONE,
  total_sales_this_month DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for trade index insights/advice
CREATE TABLE public.trade_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  insight_type TEXT NOT NULL, -- 'stock_advice', 'price_alert', 'demand_change'
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for generated documents
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL, -- 'receipt', 'invoice', 'waybill', 'purchase_order', 'financial_statement', 'sales_report'
  document_number TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- Store document data as JSON
  file_url TEXT, -- For generated PDF files
  status TEXT DEFAULT 'draft', -- 'draft', 'issued', 'completed'
  total_amount DECIMAL(10,2),
  customer_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_products
CREATE POLICY "Users can manage their own products" 
ON public.user_products 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for trade_insights
CREATE POLICY "Users can view their own insights" 
ON public.trade_insights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create insights for users" 
ON public.trade_insights 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can mark insights as read" 
ON public.trade_insights 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for documents
CREATE POLICY "Users can manage their own documents" 
ON public.documents 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_products_updated_at
BEFORE UPDATE ON public.user_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_user_products_user_id ON public.user_products(user_id);
CREATE INDEX idx_trade_insights_user_id ON public.trade_insights(user_id);
CREATE INDEX idx_trade_insights_created_at ON public.trade_insights(created_at DESC);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_type ON public.documents(document_type);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);