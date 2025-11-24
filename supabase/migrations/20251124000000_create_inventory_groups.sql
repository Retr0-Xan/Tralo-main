-- Create inventory groups feature

-- Inventory groups table
CREATE TABLE public.inventory_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_group_name_per_user UNIQUE(user_id, group_name)
);

-- Inventory group items table
CREATE TABLE public.inventory_group_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.inventory_groups(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  cost_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  international_unit TEXT,
  local_unit TEXT,
  custom_unit TEXT,
  category TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  batch_number TEXT,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_group_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_groups
CREATE POLICY "Users can manage their own inventory groups" 
ON public.inventory_groups 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for inventory_group_items
CREATE POLICY "Users can manage items in their own inventory groups" 
ON public.inventory_group_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.inventory_groups
    WHERE inventory_groups.id = inventory_group_items.group_id
    AND inventory_groups.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inventory_groups
    WHERE inventory_groups.id = inventory_group_items.group_id
    AND inventory_groups.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_inventory_groups_user_id ON public.inventory_groups(user_id);
CREATE INDEX idx_inventory_groups_name ON public.inventory_groups(group_name);
CREATE INDEX idx_inventory_group_items_group_id ON public.inventory_group_items(group_id);
CREATE INDEX idx_inventory_group_items_product ON public.inventory_group_items(product_name);

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_groups_updated_at
BEFORE UPDATE ON public.inventory_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_group_items_updated_at
BEFORE UPDATE ON public.inventory_group_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
