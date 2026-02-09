import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Printer, Download, CheckCircle, Phone, MapPin, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TraloLogo from "@/components/TraloLogo";

interface Product {
  name: string;
  amount: string;
  quantity: number;
}

const PurchaseMultiple = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const businessId = searchParams.get('business_id'); // Updated to match QR code parameter

  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([{ name: "", amount: "", quantity: 1 }]);
  const [customerData, setCustomerData] = useState({
    customerName: "",
    customerPhone: "",
    paymentMethod: "cash",
    notes: ""
  });

  useEffect(() => {
    const fetchBusinessProfile = async () => {
      if (!businessId) {
        toast({
          title: "Invalid Link",
          description: "This purchase link appears to be invalid.",
          variant: "destructive",
        });
        return;
      }

      try {
        const { data: profileData, error } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('id', businessId)
          .single();

        if (error) {
          throw error;
        }

        setBusinessProfile(profileData);
      } catch (error) {
        console.error('Error fetching business profile:', error);
        toast({
          title: "Business Not Found",
          description: "The business associated with this QR code could not be found.",
          variant: "destructive",
        });
      }
    };

    fetchBusinessProfile();
  }, [businessId]);

  const addProduct = () => {
    setProducts([...products, { name: "", amount: "", quantity: 1 }]);
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, field: keyof Product, value: string | number) => {
    const updatedProducts = products.map((product, i) =>
      i === index ? { ...product, [field]: value } : product
    );
    setProducts(updatedProducts);
  };

  const getTotalAmount = () => {
    return products.reduce((total, product) => {
      const amount = parseFloat(product.amount) || 0;
      return total + (amount * product.quantity);
    }, 0);
  };

  const handleSubmitPurchase = async () => {
    if (!businessProfile) {
      toast({
        title: "Business Error",
        description: "Business information not found.",
        variant: "destructive",
      });
      return;
    }

    // Validate products
    const validProducts = products.filter(p => p.name.trim() && parseFloat(p.amount) > 0);
    if (validProducts.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please add at least one product with name and amount.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const purchaseRecords = [];
      const totalAmount = getTotalAmount();

      // Save each product purchase to database
      for (const product of validProducts) {
        const productTotal = parseFloat(product.amount) * product.quantity;

        const { data: saleData, error: saleError } = await supabase
          .from('customer_purchases')
          .insert({
            business_id: businessProfile.id,
            product_name: product.name,
            amount: productTotal,
            quantity: product.quantity,
            customer_name: customerData.customerName || (customerData.customerPhone ? customerData.customerPhone : 'Walk-in Customer'),
            customer_phone: customerData.customerPhone || 'walk-in',
            payment_method: customerData.paymentMethod,
            purchase_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (saleError) throw saleError;
        purchaseRecords.push({ ...saleData, product, productTotal });
      }

      // Generate receipt document
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .insert({
          user_id: businessProfile.user_id,
          document_type: 'receipt',
          document_number: `REC-${Date.now().toString().slice(-6)}`,
          title: `Receipt - ${customerData.customerName || customerData.customerPhone || 'Customer'}`,
          customer_name: customerData.customerName || customerData.customerPhone || 'Walk-in Customer',
          total_amount: totalAmount,
          status: 'issued',
          content: {
            business: {
              name: businessProfile.business_name,
              address: businessProfile.business_address || '',
              phone: businessProfile.phone_number || '',
              email: businessProfile.email || '',
              registrationNumber: businessProfile.registration_number || '',
              slogan: businessProfile.slogan || ''
            },
            customer: {
              name: customerData.customerName,
              phone: customerData.customerPhone,
            },
            items: validProducts.map(product => ({
              name: product.name,
              quantity: product.quantity,
              unitPrice: parseFloat(product.amount),
              total: parseFloat(product.amount) * product.quantity
            })),
            totals: {
              subtotal: totalAmount,
              taxRate: 0,
              taxAmount: 0,
              total: totalAmount
            },
            notes: customerData.notes,
            generatedAt: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (documentError) throw documentError;

      setReceiptData({
        purchases: purchaseRecords,
        document: documentData,
        business: businessProfile,
        total: totalAmount
      });

      toast({
        title: "Purchase Recorded!",
        description: `${validProducts.length} products have been successfully recorded.`,
      });

    } catch (error) {
      console.error('Error recording purchase:', error);
      toast({
        title: "Error",
        description: "Failed to record purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleDownloadReceipt = () => {
    const receiptContent = generateReceiptHTML();
    const blob = new Blob([receiptContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receiptData.document.document_number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReceiptHTML = () => {
    const itemsHTML = products.filter(p => p.name.trim() && parseFloat(p.amount) > 0)
      .map(product => `
        <div class="item-row">
          <span>${product.name} (x${product.quantity})</span>
          <span>¢${(parseFloat(product.amount) * product.quantity).toFixed(2)}</span>
        </div>
      `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receiptData.document.document_number}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .business-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .item-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .total-row { font-weight: bold; border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="business-name">${businessProfile.business_name}</div>
          <div>${businessProfile.business_address || ''}</div>
          <div>${businessProfile.phone_number || ''}</div>
        </div>
        
        <div><strong>Receipt #:</strong> ${receiptData.document.document_number}</div>
        <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
        <div><strong>Customer:</strong> ${customerData.customerName || customerData.customerPhone || 'Walk-in Customer'}</div>
        
        <div style="margin: 20px 0;">
          ${itemsHTML}
          <div class="item-row total-row">
            <span>Total:</span>
            <span>¢${receiptData.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="footer">
          Thank you for your business!<br>
          <span class="brand">Powered by Tralo</span> - Business Management System
        </div>
      </body>
      </html>
    `;
  };

  if (!businessProfile && businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">Loading business information...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!businessProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              Invalid business link. Please check your QR code.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <TraloLogo />
          <h1 className="text-2xl font-bold mt-4">Multiple Products Purchase</h1>
        </div>

        {!receiptData ? (
          // Purchase Form
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {businessProfile.business_name}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {businessProfile.business_address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {businessProfile.business_address}
                  </div>
                )}
                {businessProfile.phone_number && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {businessProfile.phone_number}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Products Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Products/Services</Label>
                  <Button onClick={addProduct} size="sm" className="flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    Add Product
                  </Button>
                </div>

                {products.map((product, index) => (
                  <Card key={index} className="p-4 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <Label>Product/Service Name</Label>
                        <Input
                          placeholder="What did you buy?"
                          value={product.name}
                          onChange={(e) => updateProduct(index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Unit Price (¢)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={product.amount}
                          onChange={(e) => updateProduct(index, 'amount', e.target.value)}
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        {products.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeProduct(index)}
                            className="mb-0 h-10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-right text-sm text-muted-foreground">
                      Subtotal: ¢{((parseFloat(product.amount) || 0) * product.quantity).toFixed(2)}
                    </div>
                  </Card>
                ))}

                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <span className="text-green-600">¢{getTotalAmount().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Customer Information</Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Your Name (Optional)</Label>
                    <Input
                      placeholder="Your name"
                      value={customerData.customerName}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, customerName: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Phone Number (Optional)</Label>
                    <Input
                      placeholder="Your phone number"
                      value={customerData.customerPhone}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Payment Method</Label>
                  <Select onValueChange={(value) => setCustomerData(prev => ({ ...prev, paymentMethod: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mobile money">Mobile Money</SelectItem>
                      <SelectItem value="bank transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card payment">Card Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Additional notes"
                    value={customerData.notes}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <Button
                onClick={handleSubmitPurchase}
                className="w-full"
                disabled={loading || getTotalAmount() === 0}
              >
                {loading ? "Recording Purchase..." : "Record Purchase & Get Receipt"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Receipt Display
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Purchase Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Receipt #:</span>
                  <span>{receiptData.document.document_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Date:</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Customer:</span>
                  <span>{customerData.customerName || customerData.customerPhone || 'Walk-in Customer'}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Items Purchased:</h4>
                {products.filter(p => p.name.trim() && parseFloat(p.amount) > 0).map((product, index) => (
                  <div key={index} className="flex justify-between py-2 border-b last:border-b-0">
                    <div>
                      <span>{product.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">x{product.quantity}</span>
                    </div>
                    <span>¢{((parseFloat(product.amount) || 0) * product.quantity).toFixed(2)}</span>
                  </div>
                ))}

                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span>¢{receiptData.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handlePrintReceipt} className="flex-1" variant="outline">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button onClick={handleDownloadReceipt} className="flex-1" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground pt-4">
                Thank you for your business!<br />
                <span className="text-primary font-medium">Powered by Tralo</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PurchaseMultiple;