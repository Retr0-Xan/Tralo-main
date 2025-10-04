-- Create supply chain tracking tables

-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory receipts (goods received from suppliers)
CREATE TABLE public.inventory_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  product_name TEXT NOT NULL,
  quantity_received INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  batch_number TEXT,
  expiry_date DATE,
  received_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory movements (track how goods move through the system)
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  receipt_id UUID REFERENCES public.inventory_receipts(id),
  product_name TEXT NOT NULL,
  movement_type TEXT NOT NULL, -- 'received', 'sold', 'damaged', 'expired', 'adjusted'
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  customer_id TEXT, -- for sales movements
  sale_id TEXT, -- reference to customer_purchases
  movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own suppliers" 
ON public.suppliers 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own inventory receipts" 
ON public.inventory_receipts 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own inventory movements" 
ON public.inventory_movements 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX idx_inventory_receipts_user_id ON public.inventory_receipts(user_id);
CREATE INDEX idx_inventory_receipts_supplier ON public.inventory_receipts(supplier_id);
CREATE INDEX idx_inventory_receipts_product ON public.inventory_receipts(product_name);
CREATE INDEX idx_inventory_movements_user_id ON public.inventory_movements(user_id);
CREATE INDEX idx_inventory_movements_receipt ON public.inventory_movements(receipt_id);
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_name);
CREATE INDEX idx_inventory_movements_type ON public.inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_date ON public.inventory_movements(movement_date DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_receipts_updated_at
BEFORE UPDATE ON public.inventory_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();