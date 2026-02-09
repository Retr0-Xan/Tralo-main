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
import { dispatchSalesDataUpdated } from "@/lib/sales-events";

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
  local_unit?: string;
  international_unit?: string;
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
  const [applyTaxes, setApplyTaxes] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'mobile money' | 'bank transfer'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid_in_full' | 'partial_payment' | 'credit'>('paid_in_full');
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<number | string>(0);

  // Current item being added
  const [selectedProduct, setSelectedProduct] = useState("");
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState("");
  const [quantity, setQuantity] = useState<number | string>(1);
  const [unitPrice, setUnitPrice] = useState<number | string>(0);
  const [discount, setDiscount] = useState<number | string>(0);

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
    // Convert string values to numbers for validation
    const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
    const unitPriceNum = typeof unitPrice === 'string' ? parseFloat(unitPrice) : unitPrice;
    const discountNum = typeof discount === 'string' ? parseFloat(discount) : discount;

    if ((!isCustomProduct && !selectedProduct) || (isCustomProduct && !customProductName) || !quantityNum || quantityNum <= 0 || !unitPriceNum || unitPriceNum <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    const productName = isCustomProduct ? customProductName : selectedProduct;
    let stockAvailable: number | undefined;

    if (!isCustomProduct) {
      const inventoryItem = inventoryProducts.find(p => p.product_name.toLowerCase() === selectedProduct.toLowerCase());
      stockAvailable = inventoryItem?.current_stock;

      if (inventoryItem && quantityNum > inventoryItem.current_stock) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${inventoryItem.current_stock} units available in stock.`,
          variant: "destructive",
        });
        return;
      }
    }

    const itemTotal = (quantityNum * unitPriceNum) - (discountNum || 0);

    const newItem: ProductItem = {
      id: Date.now().toString(),
      productName,
      quantity: quantityNum,
      unitPrice: unitPriceNum,
      discount: discountNum || 0,
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

  const calculateTotalTaxes = () => {
    if (!applyTaxes) return 0;
    // Combined tax rate: VAT 15% + NHIL 2.5% + GETFund 2.5% = 20%
    return calculateSubtotal() * 0.20;
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateTotalTaxes();
  };

  const saveSaleOnly = async () => {
    await processSale(false);
  };

  const generateAndDownloadReceipt = async () => {
    await processSale(true);
  };

  const processSale = async (generateDocument: boolean) => {
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

    const partialPaymentNum = typeof partialPaymentAmount === 'string' ? parseFloat(partialPaymentAmount) : partialPaymentAmount;

    if (paymentStatus === 'partial_payment' && (!partialPaymentNum || partialPaymentNum <= 0)) {
      toast({
        title: "Error",
        description: "Please enter a valid partial payment amount.",
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
      let customerId: string | null = null;
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
            .ilike('name', customerName)
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
          if (customerName && customerName.toLowerCase() !== (existingCustomer.name || '').toLowerCase()) {
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

      const resolvedPaymentMethod = paymentMethod === 'credit' || paymentStatus === 'credit' ? 'credit' : paymentMethod;

      // Process each sale item
      console.log('Processing sale items...');
      for (const item of salesItems) {
        console.log('Processing item:', item);

        const saleTimestamp = new Date().toISOString();

        // Calculate taxes for this item (proportional to item's share of subtotal)
        const itemSubtotalRatio = item.total / calculateSubtotal();
        const itemTotalTax = applyTaxes ? calculateTotalTaxes() * itemSubtotalRatio : 0;
        const itemVAT = applyTaxes ? itemTotalTax * (0.15 / 0.20) : 0;
        const itemNHIL = applyTaxes ? itemTotalTax * (0.025 / 0.20) : 0;
        const itemGETFund = applyTaxes ? itemTotalTax * (0.025 / 0.20) : 0;
        const itemCovid19 = 0; // COVID-19 levy removed in 2026

        // Get unit from inventory if available (prioritize local_unit)
        let unitDisplay = 'units';
        if (item.isFromInventory) {
          const { data: productData } = await supabase
            .from('user_products')
            .select('local_unit, international_unit')
            .eq('user_id', user!.id)
            .ilike('product_name', item.productName)
            .single();

          if (productData) {
            const product = productData as any;
            unitDisplay = product.local_unit || product.international_unit || 'units';
          }
        }

        // Record the purchase
        const { data: purchaseRecord, error: purchaseError } = await supabase
          .from('customer_purchases')
          .insert({
            business_id: businessProfile.id,
            product_name: item.productName,
            customer_name: customerName || (customerPhone ? customerPhone : 'Walk-in Customer'),
            customer_phone: customerPhone || 'walk-in',
            amount: item.total,
            quantity: item.quantity,
            payment_method: resolvedPaymentMethod,
            purchase_date: saleTimestamp,
            vat_amount: itemVAT,
            nhil_amount: itemNHIL,
            getfund_amount: itemGETFund,
            covid19_amount: itemCovid19,
            total_tax: itemTotalTax,
            amount_paid: paymentStatus === 'paid_in_full' ? item.total : (partialPaymentAmount || 0),
            payment_status: paymentStatus,
            payment_history: paymentStatus === 'paid_in_full'
              ? [{
                amount: item.total,
                date: saleTimestamp,
                payment_method: resolvedPaymentMethod,
              }]
              : (partialPaymentAmount && partialPaymentAmount > 0)
                ? [{
                  amount: partialPaymentAmount,
                  date: saleTimestamp,
                  payment_method: resolvedPaymentMethod,
                }]
                : [],
          })
          .select('id')
          .single();

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
              payment_method: resolvedPaymentMethod,
              sale_date: saleTimestamp,
              sale_id: purchaseRecord?.id || null,
            });

          if (saleError) {
            console.error('Customer sale insert error:', saleError);
            throw saleError;
          }
          console.log('Customer sale recorded');
        }

        if (item.isFromInventory) {
          setInventoryProducts((prev) =>
            prev.map((product) =>
              product.product_name.toLowerCase() === item.productName.toLowerCase()
                ? { ...product, current_stock: Math.max(0, Number(product.current_stock ?? 0) - item.quantity) }
                : product
            )
          );
        }
      }

      console.log('All items processed successfully');

      // Determine document type based on payment status
      const documentType = paymentStatus === 'paid_in_full' ? 'receipt' : 'invoice';
      const documentTitle = paymentStatus === 'paid_in_full' ? 'Receipt' :
        paymentStatus === 'credit' ? 'Invoice (Credit Sale)' :
          'Invoice (Partial Payment)';

      if (generateDocument) {
        console.log(`Generating ${documentType}...`);

        // Fetch unit information for each item from inventory
        const itemsWithUnits = await Promise.all(salesItems.map(async (item) => {
          let unitOfMeasure = 'units';
          if (item.isFromInventory) {
            const { data: productData } = await supabase
              .from('user_products')
              .select('local_unit, international_unit')
              .eq('user_id', user!.id)
              .ilike('product_name', item.productName)
              .single();

            if (productData) {
              const product = productData as any;
              unitOfMeasure = product.local_unit || product.international_unit || 'units';
            }
          }
          return { ...item, unitOfMeasure };
        }));

        // For paid_in_full: generate receipt only
        // For partial_payment: generate both receipt and invoice
        // For credit: generate invoice only
        const shouldGenerateReceipt = paymentStatus === 'paid_in_full' || paymentStatus === 'partial_payment';
        const shouldGenerateInvoice = paymentStatus === 'credit' || paymentStatus === 'partial_payment';

        // Generate receipt if needed
        if (shouldGenerateReceipt) {
          const receiptData = {
            businessProfile,
            items: itemsWithUnits,
            customer: {
              name: customerName || 'Walk-in Customer',
              phone: customerPhone || 'N/A'
            },
            subtotal: calculateSubtotal(),
            totalTax: calculateTotalTaxes(),
            total: grandTotal,
            paymentMethod,
            paymentStatus,
            partialPayment: paymentStatus === 'partial_payment' ? partialPaymentAmount : null,
            applyTaxes,
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

            console.log('Receipt generated successfully, data length:', data?.length);

            // Create blob from the HTML response and download
            const htmlContent = typeof data === 'string' ? data : JSON.stringify(data);
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `receipt_${Date.now()}.html`;
            document.body.appendChild(a);
            a.click();
            console.log('Receipt download triggered');

            // Clean up after a short delay
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              console.log('Receipt download cleanup complete');
            }, 100);
          } catch (receiptError) {
            console.error('Receipt generation error:', receiptError);
            // Don't block the sale if receipt generation fails
            toast({
              title: "Warning",
              description: "Sale saved but receipt generation failed. You can generate it later from Documents page.",
            });
          }
        }

        // Generate invoice if needed (credit or partial payment)
        if (shouldGenerateInvoice) {
          try {
            console.log(`Generating invoice for ${paymentStatus} sale...`);

            // Calculate due date (30 days from now by default)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);

            const partialPaymentNum = typeof partialPaymentAmount === 'string' ? parseFloat(partialPaymentAmount) : partialPaymentAmount;
            const invoiceNotes = paymentStatus === 'credit'
              ? (additionalNotes || 'Credit sale - Payment due within 30 days')
              : (additionalNotes || `Partial payment received: ¢${partialPaymentNum.toFixed(2)}. Balance: ¢${(grandTotal - partialPaymentNum).toFixed(2)}`);

            const invoiceData = {
              businessProfile,
              document: {
                documentNumber: `INV-${Date.now().toString().slice(-6)}`,
                date: new Date().toISOString().split('T')[0],
                dueDate: dueDate.toISOString().split('T')[0],
                customerName: customerName || 'Walk-in Customer',
                customerAddress: '',
                customerPhone: customerPhone || 'N/A',
                items: itemsWithUnits.map(item => ({
                  description: item.productName,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  discount: 0,
                  total: item.total
                })),
                subtotal: calculateSubtotal(),
                overallDiscount: 0,
                tax: calculateTotalTaxes(),
                total: grandTotal,
                paymentTerms: paymentStatus === 'credit' ? 'Payment due within 30 days' : 'Partial payment received',
                notes: invoiceNotes,
                includeVAT: applyTaxes
              }
            };

            const { data: invoiceHtml, error: invoiceError } = await supabase.functions.invoke('generate-invoice', {
              body: invoiceData,
            });

            if (invoiceError) {
              console.error('Invoice generation error:', invoiceError);
              throw invoiceError;
            }

            console.log('Invoice generated successfully');

            // Download the invoice
            const invoiceContent = typeof invoiceHtml === 'string' ? invoiceHtml : JSON.stringify(invoiceHtml);
            const invoiceBlob = new Blob([invoiceContent], { type: 'text/html;charset=utf-8' });
            const invoiceUrl = window.URL.createObjectURL(invoiceBlob);
            const invoiceLink = document.createElement('a');
            invoiceLink.style.display = 'none';
            invoiceLink.href = invoiceUrl;
            invoiceLink.download = `invoice_${Date.now()}.html`;
            document.body.appendChild(invoiceLink);
            invoiceLink.click();
            console.log('Invoice download triggered');

            // Clean up after a short delay
            setTimeout(() => {
              document.body.removeChild(invoiceLink);
              window.URL.revokeObjectURL(invoiceUrl);
              console.log('Invoice download cleanup complete');
            }, 200);
          } catch (invoiceError) {
            console.error('Invoice generation error:', invoiceError);
            const errorMsg = paymentStatus === 'partial_payment'
              ? "Receipt generated but invoice failed. You can generate it later from Documents page."
              : "Invoice generation failed. You can generate it later from Documents page.";
            toast({
              title: "Warning",
              description: errorMsg,
            });
          }
        }

        // Also save document record in database
        console.log(`Saving ${documentType} to documents table...`);
        const partialPaymentNum = typeof partialPaymentAmount === 'string' ? parseFloat(partialPaymentAmount) : partialPaymentAmount;

        const documentContent = {
          items: salesItems.map(item => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.total,
            isFromInventory: item.isFromInventory
          })),
          subtotal: calculateSubtotal(),
          totalTax: calculateTotalTaxes(),
          total: grandTotal,
          customer: { name: customerName, phone: customerPhone },
          paymentMethod,
          paymentStatus,
          amountPaid: paymentStatus === 'paid_in_full' ? grandTotal :
            paymentStatus === 'partial_payment' ? partialPaymentNum : 0,
          remainingBalance: paymentStatus === 'paid_in_full' ? 0 :
            paymentStatus === 'partial_payment' ? (grandTotal - partialPaymentNum) : grandTotal,
          partialPayment: paymentStatus === 'partial_payment' ? partialPaymentNum : null,
          applyTaxes,
          notes: additionalNotes,
          date: new Date().toISOString(),
          documentType: documentType,
        };

        const documentPrefix = documentType === 'receipt' ? 'RCP' : 'INV';
        const { error: docError } = await supabase
          .from('documents')
          .insert([{
            user_id: user!.id,
            document_type: documentType,
            document_number: `${documentPrefix}-${Date.now().toString().slice(-6)}`,
            title: `${documentTitle} - ${customerName || 'Walk-in Customer'}`,
            content: documentContent as any,
            total_amount: grandTotal,
            customer_name: customerName || 'Walk-in Customer',
            status: paymentStatus === 'paid_in_full' ? 'issued' : 'pending',
          }]);

        if (docError) {
          console.error('Document save error:', docError);
          throw docError;
        }

        console.log(`${documentType} saved to documents`);
      }

      const partialPaymentNum = typeof partialPaymentAmount === 'string' ? parseFloat(partialPaymentAmount) : partialPaymentAmount;
      const statusMessage = paymentStatus === 'credit' ? ' on credit' :
        paymentStatus === 'partial_payment' ? ` with partial payment of ¢${partialPaymentNum.toFixed(2)}` : '';

      console.log('=== SALE COMPLETED SUCCESSFULLY ===');
      console.log('Total Amount:', grandTotal);
      console.log('Payment Status:', paymentStatus);

      toast({
        title: "✅ Sale Saved Successfully!",
        description: `Sale of ¢${grandTotal.toFixed(2)} has been recorded${statusMessage}.${generateDocument ? ' Document generated!' : ''}`,
      });

      dispatchSalesDataUpdated();

      // Reset form
      setSalesItems([]);
      setCurrentStep(1);
      setCustomerName("");
      setCustomerPhone("");
      setApplyTaxes(false);
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

  const handleProductSelect = (value: string) => {
    if (value === "custom") {
      setIsCustomProduct(true);
      setSelectedProduct("");
      setUnitPrice("");
    } else {
      setIsCustomProduct(false);
      setSelectedProduct(value);
      const inventoryItem = inventoryProducts.find(p => p.product_name.toLowerCase() === value.toLowerCase());
      if (inventoryItem) {
        setUnitPrice(Number(inventoryItem.selling_price ?? 0));
      }
    }
  };

  // Show business profile completion prompt if not set up
  if (!businessProfile) {
    return (
      <div className="p-6">
        <Card className="border-2 border-primary/30 bg-primary/5 dark:bg-primary/15">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto dark:bg-primary/20">
                <Building className="w-8 h-8 text-primary dark:text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Complete Your Business Profile</h3>
                <p className="text-muted-foreground mb-4">
                  Before you can record sales, please complete your business profile with your business name, address, and contact details.
                </p>
              </div>
              <Button
                onClick={() => navigate("/profile")}
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
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Add Product Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Add Products to Sale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="product">Select Product</Label>
                <Select value={isCustomProduct ? "custom" : selectedProduct} onValueChange={handleProductSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from inventory or enter custom" />
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

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      setQuantity(value === '' ? '' : parseInt(value) || 1);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="unitPrice">Unit Price (¢)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => {
                      const value = e.target.value;
                      setUnitPrice(value === '' ? '' : parseFloat(value) || 0);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Discount (¢)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDiscount(value === '' ? '' : parseFloat(value) || 0);
                    }}
                  />
                </div>
              </div>

              {/* Item Total Preview */}
              {(() => {
                const qtyNum = typeof quantity === 'string' ? parseFloat(quantity) || 0 : quantity;
                const priceNum = typeof unitPrice === 'string' ? parseFloat(unitPrice) || 0 : unitPrice;
                const discNum = typeof discount === 'string' ? parseFloat(discount) || 0 : discount;
                const itemTotal = (qtyNum * priceNum) - discNum;

                return (qtyNum > 0 && priceNum > 0) && (
                  <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Item Total:</span>
                      <span className="text-xl font-bold text-primary">¢{itemTotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              <Button onClick={addProductToSale} className="w-full" size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Cart Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Cart
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {salesItems.length} {salesItems.length === 1 ? 'item' : 'items'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {salesItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No items in cart</p>
                  <p className="text-sm">Add products to begin</p>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {salesItems.map((item) => (
                      <div key={item.id} className="p-3 border rounded-lg bg-background hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.productName}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.quantity} × ¢{item.unitPrice.toFixed(2)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProductFromSale(item.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center">
                          {item.discount > 0 && (
                            <span className="text-xs text-muted-foreground">-¢{item.discount.toFixed(2)} discount</span>
                          )}
                          <span className="font-semibold text-sm ml-auto">¢{item.total.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cart Totals */}
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">¢{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">¢{calculateSubtotal().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    onClick={() => setCurrentStep(2)}
                    className="w-full"
                    size="lg"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Proceed to Checkout
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 2: Checkout - Customer Details and Payment
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Checkout - Complete Sale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    placeholder="Enter customer's name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Customer Phone</Label>
                  <Input
                    id="customerPhone"
                    placeholder="Enter phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special notes about this sale..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mobile money">Mobile Money</SelectItem>
                      <SelectItem value="bank transfer">Bank Transfer</SelectItem>
                      <SelectItem value="credit">Credit (Pay Later)</SelectItem>
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
                    placeholder="Amount paid"
                    value={partialPaymentAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPartialPaymentAmount(value === '' ? '' : parseFloat(value) || 0);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tax Options */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="applyTaxes"
                  checked={applyTaxes}
                  onCheckedChange={(checked) => setApplyTaxes(!!checked)}
                />
                <Label htmlFor="applyTaxes" className="cursor-pointer font-medium">
                  Apply Taxes (20% - VAT 15%, NHIL 2.5%, GETFund 2.5%)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Items List */}
              <div className="space-y-2">
                {salesItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span className="text-muted-foreground">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="font-medium">¢{item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">¢{calculateSubtotal().toFixed(2)}</span>
                </div>
                {applyTaxes && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxes (21%):</span>
                    <span className="font-medium">¢{calculateTotalTaxes().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">¢{calculateGrandTotal().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="flex-1"
              disabled={loading}
            >
              Back to Cart
            </Button>
            <Button
              onClick={saveSaleOnly}
              disabled={loading}
              variant="secondary"
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Save Sale"}
            </Button>
            <Button
              onClick={generateAndDownloadReceipt}
              disabled={loading}
              className="flex-1"
            >
              <Receipt className="w-4 h-4 mr-2" />
              {loading ? "Processing..." :
                paymentStatus === 'paid_in_full' ? "Complete & Get Receipt" :
                  paymentStatus === 'credit' ? "Complete & Get Invoice" :
                    "Complete & Get Documents"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesRecording;