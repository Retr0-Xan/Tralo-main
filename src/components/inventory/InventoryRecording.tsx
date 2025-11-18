import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Sparkles, Trash2, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import SupplierForm from "./SupplierForm";
import { useQueryClient } from "@tanstack/react-query";
import { inventoryOverviewQueryKey } from "@/hooks/useInventoryOverview";
import { homeMetricsQueryKey } from "@/hooks/useHomeMetrics";

interface BulkInventoryItem {
  id: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
}

const InventoryRecording = () => {
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [batchNumber, setBatchNumber] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [supplierNotes, setSupplierNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [customUnit, setCustomUnit] = useState("");
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [internationalUnit, setInternationalUnit] = useState("");
  const [localUnit, setLocalUnit] = useState("");
  const [recordAsExpense, setRecordAsExpense] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkInventoryItem[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const popularCommodities = [
    "Rice", "Beans", "Gari", "Tomatoes", "Onions", "Pepper", "Fish", "Chicken",
    "Beef", "Plantain", "Yam", "Cassava", "Maize", "Groundnuts", "Palm Oil"
  ];

  const internationalUnits = ["kg", "g", "liters", "ml", "pieces", "meters", "cm"];

  const localUnits = [
    "olonka", "cup", "bowl", "bucket", "bag", "sack", "rubber", "bottle", "gallon",
    "drum", "barrel", "piece", "heap", "pile", "basket", "crate", "box", "packet",
    "roll", "tuber", "ton", "unit", "head", "slab", "cut", "portion", "bundle",
    "finger", "hand", "bunch", "pan", "basin", "trip", "board", "yard", "bale",
    "dozen", "pair", "set", "tin"
  ];

  const productCategories = [
    "Electronics", "Staples", "Vegetables", "Fruits", "Meat & Fish", "Dairy",
    "Beverages", "Household Items", "Personal Care", "Clothing", "Tools", "Other"
  ];

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const addToBulkList = () => {
    const finalProductName = productName || (selectedProduct !== 'custom' ? selectedProduct : '');

    if (!finalProductName.trim() || !quantity.trim()) {
      toast({
        title: "Error",
        description: "Product name and quantity are required",
        variant: "destructive",
      });
      return;
    }

    const newItem: BulkInventoryItem = {
      id: Date.now().toString(),
      productName: finalProductName.trim(),
      quantity: parseInt(quantity),
      costPrice: costPrice ? parseFloat(costPrice) : 0,
      sellingPrice: sellingPrice ? parseFloat(sellingPrice) : 0,
    };

    setBulkItems([...bulkItems, newItem]);

    // Reset single item form
    setProductName("");
    setQuantity("");
    setCostPrice("");
    setSellingPrice("");
    setSelectedProduct("");

    toast({
      title: "Item Added",
      description: `${finalProductName} added to bulk list`,
    });
  };

  const removeFromBulkList = (itemId: string) => {
    setBulkItems(bulkItems.filter(item => item.id !== itemId));
    toast({
      title: "Item Removed",
      description: "Item removed from bulk list",
    });
  };

  const processBulkInventory = async () => {
    if (bulkItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the bulk list",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');
      const userId = authUser.id;

      let successCount = 0;
      let errorCount = 0;

      for (const item of bulkItems) {
        try {
          // Check if product exists
          const { data: existingProduct } = await supabase
            .from('user_products')
            .select('*')
            .eq('user_id', userId)
            .eq('product_name', item.productName)
            .single();

          if (existingProduct) {
            // Update existing product
            const updateData: any = {
              current_stock: (existingProduct.current_stock || 0) + item.quantity,
              updated_at: new Date().toISOString()
            };

            if (item.sellingPrice > 0) {
              updateData.selling_price = item.sellingPrice;
            }

            await supabase
              .from('user_products')
              .update(updateData)
              .eq('id', existingProduct.id);
          } else {
            // Create new product
            const insertData: any = {
              user_id: userId,
              product_name: item.productName,
              current_stock: item.quantity
            };

            if (item.sellingPrice > 0) {
              insertData.selling_price = item.sellingPrice;
            }

            await supabase
              .from('user_products')
              .insert(insertData);
          }

          // Create inventory movement record
          await supabase
            .from('inventory_movements')
            .insert({
              user_id: userId,
              product_name: item.productName,
              movement_type: 'received',
              quantity: item.quantity,
              unit_price: item.costPrice || null,
              notes: 'Bulk inventory entry'
            });

          successCount++;
        } catch (error) {
          console.error(`Error processing ${item.productName}:`, error);
          errorCount++;
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryOverviewQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: homeMetricsQueryKey(userId) })
      ]);

      if (errorCount === 0) {
        toast({
          title: "🎉 Bulk Inventory Added Successfully!",
          description: `Added ${successCount} product${successCount > 1 ? 's' : ''} to inventory`,
        });
      } else {
        toast({
          title: "Bulk Entry Completed with Errors",
          description: `Success: ${successCount}, Failed: ${errorCount}`,
          variant: "destructive",
        });
      }

      // Reset bulk list
      setBulkItems([]);
      setIsBulkMode(false);

    } catch (error) {
      console.error('Error processing bulk inventory:', error);
      toast({
        title: "Error",
        description: "Failed to process bulk inventory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBulkMode) {
      addToBulkList();
      return;
    }

    const finalProductName = productName || (selectedProduct !== 'custom' ? selectedProduct : '');

    if (!finalProductName.trim() || !quantity.trim()) {
      toast({
        title: "Error",
        description: "Product name and quantity are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');
      const userId = authUser.id;

      const quantityNum = parseInt(quantity);
      const unitCostNum = unitCost ? parseFloat(unitCost) : (costPrice ? parseFloat(costPrice) : 0);
      const totalCost = quantityNum * unitCostNum;

      // Create or update user_products
      const { data: existingProduct } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', userId)
        .eq('product_name', finalProductName.trim())
        .single();

      if (existingProduct) {
        // Update existing product - include selling price
        const updateData: any = {
          current_stock: (existingProduct.current_stock || 0) + quantityNum,
          updated_at: new Date().toISOString()
        };

        // Only update selling price if provided
        if (sellingPrice && parseFloat(sellingPrice) > 0) {
          updateData.selling_price = parseFloat(sellingPrice);
        }

        await supabase
          .from('user_products')
          .update(updateData)
          .eq('id', existingProduct.id);
      } else {
        // Create new product - include selling price
        const insertData: any = {
          user_id: userId,
          product_name: finalProductName.trim(),
          current_stock: quantityNum
        };

        // Only add selling price if provided
        if (sellingPrice && parseFloat(sellingPrice) > 0) {
          insertData.selling_price = parseFloat(sellingPrice);
        }

        await supabase
          .from('user_products')
          .insert(insertData);
      }

      // Create inventory receipt if supplier info is provided
      let receiptId = null;
      if (selectedSupplier) {
        const { data: receipt, error: receiptError } = await supabase
          .from('inventory_receipts')
          .insert({
            user_id: userId,
            supplier_id: selectedSupplier,
            product_name: finalProductName.trim(),
            quantity_received: quantityNum,
            unit_cost: unitCostNum || null,
            total_cost: totalCost || null,
            batch_number: batchNumber.trim() || null,
            expiry_date: expiryDate || null,
            received_date: new Date().toISOString()
          })
          .select('id')
          .single();

        if (receiptError) throw receiptError;
        receiptId = receipt?.id;
      }

      // Create inventory movement record
      await supabase
        .from('inventory_movements')
        .insert({
          user_id: userId,
          receipt_id: receiptId,
          product_name: finalProductName.trim(),
          movement_type: 'received',
          quantity: quantityNum,
          unit_price: unitCostNum || null,
          notes: supplierNotes.trim() || null
        });

      // Create expense record if requested
      if (recordAsExpense && totalCost > 0) {
        const supplierName = suppliers.find(s => s.id === selectedSupplier)?.name || 'Unknown Supplier';

        // Generate expense number
        const { data: expenseNumberData } = await supabase.rpc('generate_expense_number', {
          user_uuid: userId
        });

        await supabase
          .from('expenses')
          .insert({
            user_id: userId,
            expense_number: expenseNumberData || 'EXP-001',
            expense_date: new Date().toISOString().split('T')[0],
            amount: totalCost,
            vendor_name: supplierName,
            category: 'Inventory Purchase',
            description: `Purchase of ${quantity} ${finalProductName}`,
            notes: supplierNotes.trim() || null,
            payment_method: 'cash'
          });
      }

      toast({
        title: "🎉 Product Added Successfully!",
        description: recordAsExpense
          ? `Added ${quantity} ${finalProductName} to inventory and recorded as expense. Keep growing your business!`
          : `Added ${quantity} ${finalProductName} to inventory. Keep growing your business!`,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryOverviewQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: homeMetricsQueryKey(userId) })
      ]);

      // Reset form
      setProductName("");
      setQuantity("");
      setCostPrice("");
      setSellingPrice("");
      setSelectedSupplier("");
      setBatchNumber("");
      setUnitCost("");
      setExpiryDate("");
      setSupplierNotes("");
      setSelectedProduct("");
      setSelectedCategory("");
      setInternationalUnit("");
      setLocalUnit("");
      setCustomUnit("");
      setIsCustomUnit(false);
      setRecordAsExpense(false);

    } catch (error) {
      console.error('Error recording inventory:', error);
      toast({
        title: "Error",
        description: "Failed to record inventory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isBulkMode ? 'Add Multiple Products (Bulk)' : 'Add New Product to Inventory'}
          </CardTitle>
          <Button
            type="button"
            variant={isBulkMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setIsBulkMode(!isBulkMode);
              if (!isBulkMode) {
                // Reset single form when switching to bulk
                setProductName("");
                setQuantity("");
                setCostPrice("");
                setSellingPrice("");
                setSelectedProduct("");
              }
            }}
          >
            <List className="w-4 h-4 mr-2" />
            {isBulkMode ? 'Switch to Single' : 'Add Bulk'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isBulkMode && bulkItems.length > 0 && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Bulk Items ({bulkItems.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bulkItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                  <div className="flex-1">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-sm text-muted-foreground">
                      Qty: {item.quantity} | Cost: ¢{item.costPrice.toFixed(2)} | Selling: ¢{item.sellingPrice.toFixed(2)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromBulkList(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                onClick={processBulkInventory}
                disabled={loading}
                className="w-full mt-4"
              >
                {loading ? 'Processing...' : `Save All ${bulkItems.length} Items to Inventory`}
              </Button>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Choose from popular items or type custom name" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                {popularCommodities.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
                <SelectItem value="custom">Type Custom Product...</SelectItem>
              </SelectContent>
            </Select>
            {(selectedProduct === 'custom' || selectedProduct === '') && (
              <Input
                placeholder="Type custom product name here..."
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            )}
          </div>

          {/* Units Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>International Standard Unit</Label>
              <Select value={internationalUnit} onValueChange={setInternationalUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  {internationalUnits.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Local Standard Unit</Label>
              <Select value={localUnit} onValueChange={(value) => {
                setLocalUnit(value);
                setIsCustomUnit(value === "custom");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select local unit" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  {localUnits.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Unit...</SelectItem>
                </SelectContent>
              </Select>
              {isCustomUnit && (
                <Input
                  placeholder="Enter your custom unit of measurement"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost-price">Cost Price (¢)</Label>
              <Input
                id="cost-price"
                type="number"
                placeholder="0.00"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling-price">Selling Price (¢)</Label>
              <Input
                id="selling-price"
                type="number"
                placeholder="0.00"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Initial Quantity</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Product Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                {productCategories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Supplier Information (Optional) */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Supplier Information (Optional)</Label>
              <SupplierForm onSupplierAdded={() => fetchSuppliers()}>
                <Button variant="outline" size="sm" type="button">
                  <Plus className="w-4 h-4 mr-2" />
                  New Supplier
                </Button>
              </SupplierForm>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} {supplier.location && `- ${supplier.location}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Batch/Lot number"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Unit cost (¢)"
                type="number"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
              <Input
                placeholder="Expiry date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <Textarea
              placeholder="Additional supplier notes..."
              rows={2}
              value={supplierNotes}
              onChange={(e) => setSupplierNotes(e.target.value)}
            />
          </div>

          {/* Record as Expense Option */}
          <div className="flex items-center space-x-2 border-t pt-4">
            <Checkbox
              id="record-as-expense"
              checked={recordAsExpense}
              onCheckedChange={(checked) => setRecordAsExpense(checked === true)}
            />
            <Label
              htmlFor="record-as-expense"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Record this inventory purchase as an expense
            </Label>
          </div>
          {recordAsExpense && (
            <p className="text-sm text-muted-foreground">
              This will also create an expense record for the total cost of this inventory purchase.
            </p>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full flex items-center gap-2"
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
            {loading
              ? 'Adding to Inventory...'
              : isBulkMode
                ? 'Add to Bulk List'
                : 'Add Product to Inventory 🚀'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default InventoryRecording;