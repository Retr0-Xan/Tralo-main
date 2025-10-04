import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, ShoppingCart, Plus, Trash2, Receipt, Save, Building, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProductItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  isFromInventory: boolean;
  stockAvailable?: number;
}

interface InventoryProduct {
  id: string;
  product_name: string;
  current_stock: number;
  selling_price: number;
}

const SalesRecording = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  
  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const [salesItems, setSalesItems] = useState<ProductItem[]>([]);
  
  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [includeVAT, setIncludeVAT] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'mobile money' | 'bank transfer'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid_in_full' | 'partial_payment' | 'credit'>('paid_in_full');
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<number>(0);

  // Current item being added
  const [selectedProduct, setSelectedProduct] = useState("");
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch business profile - use maybeSingle to avoid error if not exists
        const { data: profileData, error: profileError } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching business profile:', profileError);
        }
        
        setBusinessProfile(profileData);

        // Fetch inventory products
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('user_products')
          .select('*')
          .eq('user_id', user.id)
          .gt('current_stock', 0);

        if (inventoryError) {
          console.error('Error fetching inventory:', inventoryError);
        }
        
        setInventoryProducts(inventoryData || []);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [user]);

  const addProductToSale = () => {
    if ((!isCustomProduct && !selectedProduct) || (isCustomProduct && !customProductName) || quantity <= 0 || unitPrice <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    let productName = isCustomProduct ? customProductName : selectedProduct;
    let stockAvailable: number | undefined;
    
    if (!isCustomProduct) {
      const inventoryItem = inventoryProducts.find(p => p.product_name === selectedProduct);
      stockAvailable = inventoryItem?.current_stock;
      
      if (inventoryItem && quantity > inventoryItem.current_stock) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${inventoryItem.current_stock} units available in stock.`,
          variant: "destructive",
        });
        return;
      }
    }

    const itemTotal = (quantity * unitPrice) - discount;
    
    const newItem: ProductItem = {
      id: Date.now().toString(),
      productName,
      quantity,
      unitPrice,
      discount,
      total: itemTotal,
      isFromInventory: !isCustomProduct,
      stockAvailable
    };

    setSalesItems([...salesItems, newItem]);
    
    // Reset form but keep payment method and status
    setSelectedProduct("");
    setIsCustomProduct(false);
    setCustomProductName("");
    setQuantity(1);
    setUnitPrice(0);
    setDiscount(0);

    toast({
      title: "Product Added",
      description: `${productName} has been added to the sale.`,
    });
  };

  const removeProductFromSale = (itemId: string) => {
    setSalesItems(salesItems.filter(item => item.id !== itemId));
    toast({
      title: "Product Removed",
      description: "Product has been removed from the sale.",
    });
  };

  const calculateSubtotal = () => {
    return salesItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateVAT = () => {
    return includeVAT ? calculateSubtotal() * 0.125 : 0;
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateVAT();
  };

  const saveSaleOnly = async () => {
    await processSale(false);
  };

  const generateAndDownloadReceipt = async () => {
    await processSale(true);
  };

  const processSale = async (generateReceipt: boolean) => {
    console.log('=== STARTING SALE PROCESS ===');
    console.log('Sales Items:', salesItems);
    console.log('Business Profile:', businessProfile);
    console.log('User:', user);
    
    if (salesItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product to the sale.",
        variant: "destructive",
      });
      return;
    }

    if (paymentStatus === 'partial_payment' && partialPaymentAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter the partial payment amount.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      if (!user?.id) {
        throw new Error('You must be logged in to record sales');
      }
      
      if (!businessProfile) {
        throw new Error('Business profile not found. Please complete your business profile first.');
      }
      
      if (!businessProfile.id) {
        throw new Error('Business profile ID is missing. Please contact support.');
      }
      
      console.log('Validation passed, proceeding with sale...');

      const grandTotal = calculateGrandTotal();

      // Handle customer creation/update if phone or name provided
      let customerId = null;
      if (customerPhone || customerName) {
        // Check for existing customer by phone number OR name
        let existingCustomer = null;
        
        if (customerPhone) {
          const { data } = await supabase
            .from('customers')
            .select('id, total_purchases, name, phone_number')
            .eq('user_id', user!.id)
            .eq('phone_number', customerPhone)
            .single();
          existingCustomer = data;
        }
        
        // If not found by phone and we have a name, try finding by name
        if (!existingCustomer && customerName) {
          const { data } = await supabase
            .from('customers')
            .select('id, total_purchases, name, phone_number')
            .eq('user_id', user!.id)
            .eq('name', customerName)
            .single();
          existingCustomer = data;
        }

        const grandTotal = calculateGrandTotal();
        
        if (!existingCustomer) {
          // Create new customer - don't set totals, the trigger will handle that
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              user_id: user!.id,
              phone_number: customerPhone || null,
              name: customerName || null,
              first_purchase_date: new Date().toISOString(),
              last_purchase_date: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (customerError) throw customerError;
          customerId = newCustomer.id;
        } else {
          // Update existing customer with any new information
          customerId = existingCustomer.id;
          const updateData: any = {
            last_purchase_date: new Date().toISOString(),
          };
          
          // Update name if provided and different
          if (customerName && customerName !== existingCustomer.name) {
            updateData.name = customerName;
          }
          
          // Update phone if provided and different
          if (customerPhone && customerPhone !== existingCustomer.phone_number) {
            updateData.phone_number = customerPhone;
          }

          await supabase
            .from('customers')
            .update(updateData)
            .eq('id', customerId);
        }
      }

      // Process each sale item
      console.log('Processing sale items...');
      for (const item of salesItems) {
        console.log('Processing item:', item);
        
        // Record the purchase
        const { error: purchaseError } = await supabase
          .from('customer_purchases')
          .insert({
            business_id: businessProfile.id,
            product_name: item.productName,
            customer_phone: customerPhone || 'walk-in',
            amount: item.total,
            payment_method: paymentMethod === 'credit' || paymentStatus === 'credit' ? 'credit' : paymentMethod,
            purchase_date: new Date().toISOString(),
          });

        if (purchaseError) {
          console.error('Purchase insert error:', purchaseError);
          throw purchaseError;
        }
        
        console.log('Item recorded successfully');

        // Record detailed customer sale if customer info provided
        if (customerId) {
          console.log('Recording customer sale for customer ID:', customerId);
          const { error: saleError } = await supabase
            .from('customer_sales')
            .insert({
              user_id: user!.id,
              customer_id: customerId,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_amount: item.total,
              payment_method: paymentMethod === 'credit' || paymentStatus === 'credit' ? 'credit' : paymentMethod,
              sale_date: new Date().toISOString(),
            });

          if (saleError) {
            console.error('Customer sale insert error:', saleError);
            throw saleError;
          }
          console.log('Customer sale recorded');
        }
      }
      
      console.log('All items processed successfully');

      if (generateReceipt) {
        console.log('Generating receipt...');
        // Generate and download receipt using edge function
        const receiptData = {
          businessProfile,
          items: salesItems,
          customer: {
            name: customerName || 'Walk-in Customer',
            phone: customerPhone || 'N/A'
          },
          subtotal: calculateSubtotal(),
          vat: calculateVAT(),
          total: grandTotal,
          paymentMethod,
          paymentStatus,
          partialPayment: paymentStatus === 'partial_payment' ? partialPaymentAmount : null,
          includeVAT,
          notes: additionalNotes,
          date: new Date().toISOString()
        };

        try {
          console.log('Calling generate-receipt edge function with data:', receiptData);
          const { data, error } = await supabase.functions.invoke('generate-receipt', {
            body: receiptData,
          });

          if (error) {
            console.error('Receipt generation error:', error);
            throw error;
          }
          
          console.log('Receipt generated successfully');

          // Create blob from the HTML response and download
          const blob = new Blob([data], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `receipt_${Date.now()}.html`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('Receipt downloaded');
        } catch (receiptError) {
          console.error('Receipt generation error:', receiptError);
          // Don't block the sale if receipt generation fails
          toast({
            title: "Warning",
            description: "Sale saved but receipt generation failed. You can generate it later from Documents page.",
          });
        }

        // Also save receipt record in database
        console.log('Saving receipt to documents table...');
        const receiptContent = {
          items: salesItems.map(item => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.total,
            isFromInventory: item.isFromInventory
          })),
          subtotal: calculateSubtotal(),
          vat: calculateVAT(),
          total: grandTotal,
          customer: { name: customerName, phone: customerPhone },
          paymentMethod,
          paymentStatus,
          partialPayment: paymentStatus === 'partial_payment' ? partialPaymentAmount : null,
          includeVAT,
          notes: additionalNotes,
          date: new Date().toISOString()
        };

        const { error: docError } = await supabase
          .from('documents')
          .insert([{
            user_id: user!.id,
            document_type: 'receipt',
            document_number: `RCP-${Date.now().toString().slice(-6)}`,
            title: `Receipt - ${customerName || 'Walk-in Customer'}`,
            content: receiptContent as any,
            total_amount: grandTotal,
            customer_name: customerName || 'Walk-in Customer',
            status: 'issued'
          }]);

        if (docError) {
          console.error('Document save error:', docError);
          throw docError;
        }
        
        console.log('Receipt saved to documents');
      }

      const statusMessage = paymentStatus === 'credit' ? ' on credit' : 
                           paymentStatus === 'partial_payment' ? ` with partial payment of ¢${partialPaymentAmount.toFixed(2)}` : '';
      
      console.log('=== SALE COMPLETED SUCCESSFULLY ===');
      console.log('Total Amount:', grandTotal);
      console.log('Payment Status:', paymentStatus);
      
      toast({
        title: "✅ Sale Saved Successfully!",
        description: `Sale of ¢${grandTotal.toFixed(2)} has been recorded${statusMessage}.${generateReceipt ? ' Receipt generated!' : ''}`,
      });

      // Reset form
      setSalesItems([]);
      setCurrentStep(1);
      setCustomerName("");
      setCustomerPhone("");
      setIncludeVAT(false);
      setAdditionalNotes("");
      setPaymentMethod('cash');
      setPaymentStatus('paid_in_full');
      setPartialPaymentAmount(0);
      
      console.log('Form reset complete');

    } catch (error: any) {
      console.error('Error saving sale:', error);
      
      // Provide more detailed error message
      let errorMessage = "Failed to save sale. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelection = async (value: string) => {
    if (value === "custom") {
      setIsCustomProduct(true);
      setSelectedProduct("");
      setUnitPrice(0);
    } else {
      setIsCustomProduct(false);
      setSelectedProduct(value);
      const inventoryItem = inventoryProducts.find(p => p.product_name === value);
      if (inventoryItem) {
        // Try to get last sale price for this product
        try {
          const { data: lastSale } = await supabase
            .from('customer_purchases')
            .select('amount')
            .eq('product_name', value)
            .order('purchase_date', { ascending: false })
            .limit(1)
            .single();
          
          setUnitPrice(lastSale?.amount || inventoryItem.selling_price || 0);
        } catch (error) {
          // Fallback to inventory selling price
          setUnitPrice(inventoryItem.selling_price || 0);
        }
      }
    }
  };

  // Show business profile completion prompt if not set up
  if (!businessProfile) {
    return (
      <div className="p-6">
        <Card className="border-2 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                <Building className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Complete Your Business Profile</h3>
                <p className="text-muted-foreground mb-4">
                  Before you can record sales, please complete your business profile with your business name, address, and contact details.
                </p>
              </div>
              <Button 
                onClick={() => navigate("/profile")}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <User className="w-4 h-4 mr-2" />
                Complete Profile Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Record New Sale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {salesItems.length > 0 && (
            <Button 
              onClick={() => setCurrentStep(2)}
              className="w-full mb-4"
            >
              Continue to Customer Details ({salesItems.length} item{salesItems.length > 1 ? 's' : ''})
            </Button>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Product to Sale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="product">Product</Label>
                <Select value={isCustomProduct ? "custom" : selectedProduct} onValueChange={handleProductSelection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select from stock or choose custom" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryProducts.map((product) => (
                      <SelectItem key={product.id} value={product.product_name}>
                        {product.product_name} - {product.current_stock} in stock
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Enter Custom Product</SelectItem>
                  </SelectContent>
                </Select>
                {isCustomProduct && (
                  <Input
                    className="mt-2"
                    placeholder="Enter custom product name"
                    value={customProductName}
                    onChange={(e) => setCustomProductName(e.target.value)}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor="unitPrice">Unit Selling Price (¢)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  />
                  {!isCustomProduct && selectedProduct && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-filled from last sale price
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="discount">Discount (¢)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Total Value Display */}
              {(quantity > 0 && unitPrice > 0) && (
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total Sale Value</p>
                    <p className="text-2xl font-bold text-primary">
                      ¢{((quantity * unitPrice) - discount).toFixed(2)}
                    </p>
                    {discount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Subtotal: ¢{(quantity * unitPrice).toFixed(2)} - Discount: ¢{discount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="mobile money">Mobile Money</SelectItem>
                      <SelectItem value="bank transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={(value: any) => setPaymentStatus(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid_in_full">Paid in Full</SelectItem>
                      <SelectItem value="partial_payment">Partial Payment</SelectItem>
                      <SelectItem value="credit">Credit (Pay Later)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {paymentStatus === 'partial_payment' && (
                <div>
                  <Label htmlFor="partialAmount">Partial Payment Amount (¢)</Label>
                  <Input
                    id="partialAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={partialPaymentAmount}
                    onChange={(e) => setPartialPaymentAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about this sale..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={addProductToSale} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product to Sale
                </Button>
                <Button 
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                  className="w-full"
                  disabled={salesItems.length === 0}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Proceed to Customer Details
                </Button>
              </div>
            </CardContent>
          </Card>

          {salesItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sale Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {salesItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.quantity} × ¢{item.unitPrice.toFixed(2)} 
                          {item.discount > 0 && ` - ¢${item.discount.toFixed(2)} discount`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">¢{item.total.toFixed(2)}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeProductFromSale(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>¢{calculateSubtotal().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          Customer Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customerName">Customer Name (Optional)</Label>
            <Input
              id="customerName"
              placeholder="Customer's name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="customerPhone">Customer Phone (Optional)</Label>
            <Input
              id="customerPhone"
              placeholder="Customer's phone number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeVAT"
            checked={includeVAT}
            onCheckedChange={(checked) => setIncludeVAT(!!checked)}
          />
          <Label htmlFor="includeVAT">Include VAT (12.5%)</Label>
          <span className="text-sm text-muted-foreground">If applicable to your business</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sale Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {salesItems.map((item) => (
              <div key={item.id} className="flex justify-between py-1">
                <span>Product: </span>
                <span>{item.productName}</span>
              </div>
            ))}
            <div className="flex justify-between py-1">
              <span>Quantity: </span>
              <span>{salesItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Subtotal: </span>
              <span>¢{calculateSubtotal().toFixed(2)}</span>
            </div>
            {includeVAT && (
              <div className="flex justify-between py-1">
                <span>VAT (12.5%): </span>
                <span>¢{calculateVAT().toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 font-bold text-lg border-t pt-2">
              <span>Total: </span>
              <span>¢{calculateGrandTotal().toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(1)}
            className="flex-1"
          >
            Back
          </Button>
          <Button 
            onClick={saveSaleOnly}
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save Sale Only"}
          </Button>
          <Button 
            onClick={generateAndDownloadReceipt}
            disabled={loading}
            className="flex-1"
          >
            <Receipt className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Generate & Download Receipt"}
          </Button>
        </div>

        <Button 
          onClick={() => setCurrentStep(1)}
          variant="secondary"
          className="w-full"
        >
          Review Sale Details
        </Button>
      </CardContent>
    </Card>
  );
};

export default SalesRecording;