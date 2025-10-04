import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Printer, Download, CheckCircle, Phone, MapPin, Plus, X, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TraloLogo from "@/components/TraloLogo";
import { shareViaWhatsApp, formatReceiptMessage } from "@/lib/whatsapp";

interface Product {
  name: string;
  amount: string;
  quantity: number;
}

const CustomerPurchase = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const businessId = searchParams.get('business_id');
  
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
  }, [businessId, toast]);

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
            customer_phone: customerData.customerPhone || 'Walk-in Customer',
            payment_method: customerData.paymentMethod,
            purchase_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (saleError) throw saleError;
        purchaseRecords.push({ ...saleData, product, productTotal });
      }

      // Generate receipt
      const receiptContent = {
        business: {
          name: businessProfile.business_name,
          address: businessProfile.business_address || '',
          phone: businessProfile.phone_number || '',
          email: businessProfile.email || '',
        },
        customer: {
          name: customerData.customerName || 'Walk-in Customer',
          phone: customerData.customerPhone || 'N/A',
        },
        items: validProducts.map(product => ({
          name: product.name,
          quantity: product.quantity,
          unitPrice: parseFloat(product.amount),
          total: parseFloat(product.amount) * product.quantity
        })),
        totals: {
          subtotal: totalAmount,
          total: totalAmount
        },
        notes: customerData.notes,
        date: new Date().toISOString(),
        receiptNumber: `REC-${Date.now().toString().slice(-6)}`
      };

      setReceiptData({
        purchases: purchaseRecords,
        receipt: receiptContent,
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

  const downloadReceipt = async () => {
    if (!receiptData) return;

    try {
      const { data, error } = await supabase.functions.invoke('generate-receipt', {
        body: {
          businessProfile: receiptData.business,
          items: receiptData.receipt.items,
          customer: receiptData.receipt.customer,
          subtotal: receiptData.receipt.totals.subtotal,
          total: receiptData.receipt.totals.total,
          paymentMethod: customerData.paymentMethod,
          notes: receiptData.receipt.notes,
          receiptNumber: receiptData.receipt.receiptNumber,
          date: receiptData.receipt.date
        }
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        // Download the PDF
        const link = document.createElement('a');
        link.href = data.pdfUrl;
        link.download = `receipt-${receiptData.receipt.receiptNumber}.pdf`;
        link.click();
        
        toast({
          title: "Receipt Downloaded",
          description: "Your receipt has been generated and downloaded successfully.",
        });
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: "Download Failed",
        description: "Could not generate receipt. Please try again.",
        variant: "destructive",
      });
    }
  };

  const shareViaWhatsAppNew = async () => {
    if (!receiptData) return;
    
    const message = formatReceiptMessage({
      businessName: receiptData.business.business_name,
      receiptNumber: receiptData.receipt.receiptNumber,
      customerName: receiptData.receipt.customer.name,
      date: new Date(receiptData.receipt.date).toLocaleDateString(),
      items: receiptData.receipt.items,
      total: receiptData.total,
      paymentMethod: customerData.paymentMethod
    });

    const success = await shareViaWhatsApp({
      message,
      maxLength: 1000,
      useWebVersion: true,
      delay: 200
    });

    if (!success) {
      toast({
        title: "WhatsApp Share",
        description: "If WhatsApp didn't open, the message has been copied to your clipboard.",
        variant: "default",
      });
    }
  };

  if (!businessProfile && businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading business information...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!businessProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <X className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Invalid Business Link</h2>
              <p>Please check your QR code and try again.</p>
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
          <h1 className="text-2xl font-bold mt-4">Customer Purchase</h1>
          <p className="text-muted-foreground">Record your purchase and get instant receipt</p>
        </div>

        {!receiptData ? (
          // Purchase Form
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {businessProfile.business_name}
              </CardTitle>
              <div className="text-sm text-muted-foreground space-y-1">
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
                <Badge variant="secondary" className="w-fit">
                  ✅ Tralo Verified Business
                </Badge>
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
                    {product.name && product.amount && (
                      <div className="mt-2 text-right text-sm font-medium">
                        Subtotal: ¢{((parseFloat(product.amount) || 0) * product.quantity).toFixed(2)}
                      </div>
                    )}
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
                <Label className="text-base font-medium">Your Information (Optional)</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Your Name</Label>
                    <Input 
                      placeholder="Your name"
                      value={customerData.customerName}
                      onChange={(e) => setCustomerData(prev => ({...prev, customerName: e.target.value}))}
                    />
                  </div>

                  <div>
                    <Label>Phone Number</Label>
                    <Input 
                      placeholder="Your phone number"
                      value={customerData.customerPhone}
                      onChange={(e) => setCustomerData(prev => ({...prev, customerPhone: e.target.value}))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Payment Method</Label>
                  <Select 
                    value={customerData.paymentMethod}
                    onValueChange={(value) => setCustomerData(prev => ({...prev, paymentMethod: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mobile money">Mobile Money</SelectItem>
                      <SelectItem value="bank transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card payment">Card Payment</SelectItem>
                      <SelectItem value="credit">Credit (Pay Later)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea 
                    placeholder="Additional notes"
                    value={customerData.notes}
                    onChange={(e) => setCustomerData(prev => ({...prev, notes: e.target.value}))}
                  />
                </div>
              </div>

              <Button 
                onClick={handleSubmitPurchase} 
                className="w-full"
                disabled={loading || getTotalAmount() === 0}
              >
                {loading ? "Recording Purchase..." : "Complete Purchase & Get Receipt"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Receipt Display
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Purchase Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="font-semibold mb-2">Receipt #{receiptData.receipt.receiptNumber}</h3>
                <div className="space-y-1 text-sm">
                  <div><strong>Business:</strong> {receiptData.business.business_name}</div>
                  <div><strong>Customer:</strong> {receiptData.receipt.customer.name}</div>
                  <div><strong>Date:</strong> {new Date(receiptData.receipt.date).toLocaleDateString()}</div>
                  <div><strong>Payment:</strong> {customerData.paymentMethod}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Items Purchased:</h4>
                {receiptData.receipt.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>{item.name} x{item.quantity}</span>
                    <span className="font-medium">¢{item.total.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 bg-primary text-primary-foreground rounded font-bold">
                  <span>Total:</span>
                  <span>¢{receiptData.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button onClick={downloadReceipt} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Receipt
                </Button>
                <Button onClick={shareViaWhatsAppNew} variant="outline" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
                  <Share2 className="w-4 h-4" />
                  Share via WhatsApp
                </Button>
                <Button onClick={() => window.print()} variant="outline" className="flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground mt-4">
                <p>Thank you for your business!</p>
                <Badge variant="secondary" className="mt-2">
                  Powered by Tralo - Business Management System
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomerPurchase;