-- Link inventory receipts/movements to expenses and auto-reverse expenses when stock is removed

-- Add expense_id column to inventory_receipts to track which expense funded the inventory
ALTER TABLE public.inventory_receipts 
ADD COLUMN expense_id UUID REFERENCES public.expenses(id);

-- Add expense_id column to inventory_movements to track expense-related movements
ALTER TABLE public.inventory_movements 
ADD COLUMN expense_id UUID REFERENCES public.expenses(id);

-- Add index for performance
CREATE INDEX idx_inventory_receipts_expense_id ON public.inventory_receipts(expense_id);
CREATE INDEX idx_inventory_movements_expense_id ON public.inventory_movements(expense_id);

-- Create function to auto-reverse expense when inventory is removed
CREATE OR REPLACE FUNCTION public.auto_reverse_expense_on_stock_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_expense_id UUID;
  v_expense_amount NUMERIC;
  v_expense_already_reversed BOOLEAN;
BEGIN
  -- Only process removals (sold, damaged, expired, adjusted with negative quantity)
  IF NEW.movement_type IN ('sold', 'damaged', 'expired', 'adjusted') THEN
    
    -- Check if this movement is linked to a receipt with an expense
    IF NEW.receipt_id IS NOT NULL THEN
      -- Get the expense_id from the receipt
      SELECT expense_id INTO v_expense_id
      FROM public.inventory_receipts
      WHERE id = NEW.receipt_id AND expense_id IS NOT NULL;
      
      IF v_expense_id IS NOT NULL THEN
        -- Check if the expense is already reversed
        SELECT is_reversed INTO v_expense_already_reversed
        FROM public.expenses
        WHERE id = v_expense_id;
        
        -- If expense exists and is not reversed, reverse it
        IF NOT COALESCE(v_expense_already_reversed, FALSE) THEN
          UPDATE public.expenses
          SET 
            is_reversed = TRUE,
            reversed_at = NOW(),
            reversal_reason = CONCAT(
              'Auto-reversed: Inventory removed (',
              NEW.movement_type,
              ') - ',
              NEW.product_name,
              ' (Qty: ',
              ABS(NEW.quantity),
              ')',
              CASE WHEN NEW.notes IS NOT NULL THEN CONCAT(' - ', NEW.notes) ELSE '' END
            )
          WHERE id = v_expense_id;
        END IF;
      END IF;
    END IF;
    
    -- Also check if the movement itself has an expense_id
    IF NEW.expense_id IS NOT NULL THEN
      SELECT is_reversed INTO v_expense_already_reversed
      FROM public.expenses
      WHERE id = NEW.expense_id;
      
      IF NOT COALESCE(v_expense_already_reversed, FALSE) THEN
        UPDATE public.expenses
        SET 
          is_reversed = TRUE,
          reversed_at = NOW(),
          reversal_reason = CONCAT(
            'Auto-reversed: Inventory removed (',
            NEW.movement_type,
            ') - ',
            NEW.product_name,
            ' (Qty: ',
            ABS(NEW.quantity),
            ')',
            CASE WHEN NEW.notes IS NOT NULL THEN CONCAT(' - ', NEW.notes) ELSE '' END
          )
        WHERE id = NEW.expense_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on inventory_movements
DROP TRIGGER IF EXISTS auto_reverse_expense_trigger ON public.inventory_movements;
CREATE TRIGGER auto_reverse_expense_trigger
AFTER INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.auto_reverse_expense_on_stock_removal();

COMMENT ON COLUMN public.inventory_receipts.expense_id IS 'Links to expense if this inventory was funded by a recorded expense';
COMMENT ON COLUMN public.inventory_movements.expense_id IS 'Links to expense if this movement relates to an expense-funded item';
COMMENT ON FUNCTION public.auto_reverse_expense_on_stock_removal() IS 'Automatically reverses expense when linked inventory is removed (sold, damaged, expired, adjusted)';
