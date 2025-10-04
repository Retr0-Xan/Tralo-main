import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ConversionHistory {
  originalProduct: string;
  convertedProduct: string;
  unit: string;
}

const StockConversionDialog = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [conversionHistory, setConversionHistory] = useState<ConversionHistory[]>([]);
  const [showNewProductInput, setShowNewProductInput] = useState(false);
  const [showLossConfirmation, setShowLossConfirmation] = useState(false);
  const [pendingConversion, setPendingConversion] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    originalProduct: "",
    originalQuantity: "",
    newProduct: "",
    newQuantity: "",
    unit: "",
    costPrice: "",
    sellingPrice: ""
  });

  useEffect(() => {
    if (open) {
      fetchProducts();
      fetchConversionHistory();
    }
  }, [open, user]);

  const fetchProducts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', user.id)
        .gt('current_stock', 0)
        .order('product_name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchConversionHistory = async () => {
    if (!user) return;
    
    try {
      // Get conversion history from inventory_movements notes
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('notes, product_name')
        .eq('user_id', user.id)
        .eq('movement_type', 'conversion')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const history: ConversionHistory[] = [];
      data?.forEach(item => {
        try {
          if (item.notes) {
            const parsed = JSON.parse(item.notes);
            history.push({
              originalProduct: parsed.originalProduct || "",
              convertedProduct: parsed.convertedProduct || item.product_name,
              unit: parsed.unit || ""
            });
          }
        } catch (e) {
          // Skip invalid JSON
        }
      });
      
      setConversionHistory(history);
    } catch (error) {
      console.error('Error fetching conversion history:', error);
    }
  };

  const handleConvert = async () => {
    if (!user || !formData.originalProduct || !formData.originalQuantity || 
        !formData.newProduct || !formData.newQuantity) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const originalQty = parseFloat(formData.originalQuantity);
    const newQty = parseFloat(formData.newQuantity);

    if (isNaN(originalQty) || originalQty <= 0 || isNaN(newQty) || newQty <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter valid quantities",
        variant: "destructive",
      });
      return;
    }

    // Check if original product has enough stock
    const originalProduct = products.find(p => p.id === formData.originalProduct);
    if (!originalProduct || originalProduct.current_stock < originalQty) {
      toast({
        title: "Not Enough Stock",
        description: `Only ${originalProduct?.current_stock || 0} units available`,
        variant: "destructive",
      });
      return;
    }

    // Get the cost price of the original product
    const { data: receiptsData } = await supabase
      .from('inventory_receipts')
      .select('unit_cost, total_cost, quantity_received')
      .eq('user_id', user.id)
      .ilike('product_name', originalProduct.product_name);

    // Calculate weighted average cost price
    let originalCostPrice = 0;
    if (receiptsData && receiptsData.length > 0) {
      const totalCost = receiptsData.reduce((sum, r) => sum + Number(r.total_cost || 0), 0);
      const totalQty = receiptsData.reduce((sum, r) => sum + Number(r.quantity_received || 0), 0);
      originalCostPrice = totalQty > 0 ? totalCost / totalQty : 0;
    }

    // Store conversion data and show confirmation dialog
    setPendingConversion({
      originalProduct,
      originalQty,
      newQty,
      originalCostPrice
    });
    setShowLossConfirmation(true);
  };

  const executeConversion = async (recordAsLoss: boolean) => {
    if (!user || !pendingConversion) return;

    const { originalProduct, originalQty, newQty, originalCostPrice } = pendingConversion;
    
    setLoading(true);

    try {
      // 1. Deduct from original product
      const { error: deductError } = await supabase
        .from('user_products')
        .update({ 
          current_stock: originalProduct.current_stock - originalQty,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.originalProduct);

      if (deductError) throw deductError;

      // 2. Record conversion movement for original product
      const conversionNotes = JSON.stringify({
        originalProduct: originalProduct.product_name,
        convertedProduct: formData.newProduct,
        originalQuantity: originalQty,
        newQuantity: newQty,
        unit: formData.unit
      });

      await supabase.from('inventory_movements').insert({
        user_id: user.id,
        product_name: originalProduct.product_name,
        movement_type: 'conversion',
        quantity: originalQty,
        movement_date: new Date().toISOString(),
        notes: conversionNotes
      });

      // 3. Add or update new converted product
      const { data: existingProduct } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', user.id)
        .ilike('product_name', formData.newProduct)
        .single();

      if (existingProduct) {
        // Update existing product
        await supabase
          .from('user_products')
          .update({ 
            current_stock: existingProduct.current_stock + newQty,
            selling_price: formData.sellingPrice ? parseFloat(formData.sellingPrice) : existingProduct.selling_price,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProduct.id);
      } else {
        // Create new product
        await supabase.from('user_products').insert({
          user_id: user.id,
          product_name: formData.newProduct,
          current_stock: newQty,
          selling_price: formData.sellingPrice ? parseFloat(formData.sellingPrice) : null
        });
      }

      // 4. Record inventory receipt for the new product
      await supabase.from('inventory_receipts').insert({
        user_id: user.id,
        product_name: formData.newProduct,
        quantity_received: newQty,
        unit_cost: formData.costPrice ? parseFloat(formData.costPrice) : 0,
        total_cost: formData.costPrice ? parseFloat(formData.costPrice) * newQty : 0,
        received_date: new Date().toISOString()
      });

      // 5. If user chose to record as loss, create an expense entry
      if (recordAsLoss && originalCostPrice > 0) {
        const lossAmount = originalCostPrice * originalQty;
        
        const { data: expenseNumber } = await supabase
          .rpc('generate_expense_number', { user_uuid: user.id });

        await supabase.from('expenses').insert({
          user_id: user.id,
          expense_number: expenseNumber || 'EXP-001',
          vendor_name: 'Stock Conversion Loss',
          category: 'Stock Conversion',
          amount: lossAmount,
          expense_date: new Date().toISOString().split('T')[0],
          description: `Cost loss from converting ${originalQty} ${originalProduct.product_name} to ${newQty} ${formData.newProduct}`,
          notes: `Original product cost: ¢${originalCostPrice.toFixed(2)} per unit`,
          payment_method: 'N/A',
          status: 'recorded'
        });
      }

      toast({
        title: "Stock Converted Successfully",
        description: recordAsLoss 
          ? `${originalQty} ${originalProduct.product_name} converted to ${newQty} ${formData.newProduct}. Cost recorded as expense.`
          : `${originalQty} ${originalProduct.product_name} converted to ${newQty} ${formData.newProduct}`,
      });

      // Reset form
      setFormData({
        originalProduct: "",
        originalQuantity: "",
        newProduct: "",
        newQuantity: "",
        unit: "",
        costPrice: "",
        sellingPrice: ""
      });
      setShowNewProductInput(false);
      setShowLossConfirmation(false);
      setPendingConversion(null);
      setOpen(false);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error converting stock:', error);
      toast({
        title: "Conversion Failed",
        description: "Failed to convert stock. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Convert Stock
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Convert Stock to Another Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="originalProduct">Product to Convert *</Label>
            <Select 
              value={formData.originalProduct} 
              onValueChange={(value) => setFormData({...formData, originalProduct: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product to convert" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.product_name} (Stock: {product.current_stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Original Quantity */}
          <div className="space-y-2">
            <Label htmlFor="originalQuantity">Quantity to Convert *</Label>
            <Input
              id="originalQuantity"
              type="number"
              step="0.01"
              placeholder="Enter quantity"
              value={formData.originalQuantity}
              onChange={(e) => setFormData({...formData, originalQuantity: e.target.value})}
            />
          </div>

          {/* New Product */}
          <div className="space-y-2">
            <Label htmlFor="newProduct">New Product Name *</Label>
            {!showNewProductInput && conversionHistory.length > 0 ? (
              <div className="space-y-2">
                <Select 
                  value={formData.newProduct} 
                  onValueChange={(value) => {
                    if (value === "__new__") {
                      setShowNewProductInput(true);
                      setFormData({...formData, newProduct: ""});
                    } else {
                      const history = conversionHistory.find(h => h.convertedProduct === value);
                      setFormData({
                        ...formData, 
                        newProduct: value,
                        unit: history?.unit || formData.unit
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select from previous conversions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">+ Enter New Product</SelectItem>
                    {Array.from(new Set(conversionHistory.map(h => h.convertedProduct))).map((product) => (
                      <SelectItem key={product} value={product}>{product}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setShowNewProductInput(true)}
                  className="p-0 h-auto"
                >
                  Or type a new product name
                </Button>
              </div>
            ) : (
              <Input
                id="newProduct"
                placeholder="e.g., Bottled Water"
                value={formData.newProduct}
                onChange={(e) => setFormData({...formData, newProduct: e.target.value})}
              />
            )}
          </div>

          {/* New Product Quantity */}
          <div className="space-y-2">
            <Label htmlFor="newQuantity">New Product Quantity *</Label>
            <Input
              id="newQuantity"
              type="number"
              step="0.01"
              placeholder="How many units produced"
              value={formData.newQuantity}
              onChange={(e) => setFormData({...formData, newQuantity: e.target.value})}
            />
          </div>

          {/* Unit */}
          <div className="space-y-2">
            <Label htmlFor="unit">Unit (e.g., kg, liters, pieces)</Label>
            <Input
              id="unit"
              placeholder="e.g., bottles, bags, pieces"
              value={formData.unit}
              onChange={(e) => setFormData({...formData, unit: e.target.value})}
            />
          </div>

          {/* Cost and Selling Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost Price per Unit (¢)</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.costPrice}
                onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price per Unit (¢)</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleConvert} disabled={loading} className="flex-1">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Convert Stock
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showLossConfirmation} onOpenChange={setShowLossConfirmation}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Record Conversion Cost as Loss?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingConversion && (
              <>
                The cost price of the original product ({pendingConversion.originalProduct?.product_name}) is approximately <strong>¢{pendingConversion.originalCostPrice.toFixed(2)}</strong> per unit.
                <br /><br />
                Converting <strong>{pendingConversion.originalQty}</strong> units will result in a total cost of <strong>¢{(pendingConversion.originalCostPrice * pendingConversion.originalQty).toFixed(2)}</strong>.
                <br /><br />
                Would you like to record this cost as an expense (loss) in your financial records?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setShowLossConfirmation(false);
            executeConversion(false);
          }}>
            No, Don't Record
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            setShowLossConfirmation(false);
            executeConversion(true);
          }}>
            Yes, Record as Loss
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default StockConversionDialog;
