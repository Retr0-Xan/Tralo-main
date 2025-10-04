import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Printer, Download, CheckCircle, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TraloLogo from "@/components/TraloLogo";

const Purchase = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const businessId = searchParams.get('b');
  
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [purchaseData, setPurchaseData] = useState({
    productName: "",
    amount: "",
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
        console.log('Fetching business profile for ID:', businessId);
        
        const { data: profileData, error } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('id', businessId)
          .single();

        console.log('Business profile data:', profileData);
        console.log('Business profile error:', error);

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

  const handleInputChange = (field: string, value: string) => {
    setPurchaseData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitPurchase = async () => {
    if (!businessProfile || !purchaseData.productName || !purchaseData.amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in product name and amount.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Save purchase to database
      const { data: saleData, error: saleError } = await supabase
        .from('customer_purchases')
        .insert({
          business_id: businessProfile.id,
          product_name: purchaseData.productName,
          amount: parseFloat(purchaseData.amount),
          customer_phone: purchaseData.customerPhone || 'Walk-in Customer',
          payment_method: purchaseData.paymentMethod,
          purchase_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Generate receipt document
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .insert({
          user_id: businessProfile.user_id,
          document_type: 'receipt',
          document_number: `REC-${Date.now().toString().slice(-6)}`,
          title: `Receipt - ${purchaseData.customerName || purchaseData.customerPhone || 'Customer'}`,
          customer_name: purchaseData.customerName || purchaseData.customerPhone || 'Walk-in Customer',
          total_amount: parseFloat(purchaseData.amount),
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
              name: purchaseData.customerName,
              phone: purchaseData.customerPhone,
            },
            items: [{
              name: purchaseData.productName,
              quantity: 1,
              unitPrice: parseFloat(purchaseData.amount),
              total: parseFloat(purchaseData.amount)
            }],
            totals: {
              subtotal: parseFloat(purchaseData.amount),
              taxRate: 0,
              taxAmount: 0,
              total: parseFloat(purchaseData.amount)
            },
            notes: purchaseData.notes,
            generatedAt: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (documentError) throw documentError;

      setReceiptData({
        ...saleData,
        document: documentData,
        business: businessProfile
      });

      toast({
        title: "Purchase Recorded!",
        description: "Your purchase has been successfully recorded.",
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
        <div><strong>Date:</strong> ${new Date(receiptData.purchase_date).toLocaleDateString()}</div>
        <div><strong>Customer:</strong> ${purchaseData.customerName || purchaseData.customerPhone || 'Walk-in Customer'}</div>
        
        <div style="margin: 20px 0;">
          <div class="item-row">
            <span>${purchaseData.productName}</span>
            <span>¢${parseFloat(purchaseData.amount).toFixed(2)}</span>
          </div>
          <div class="item-row total-row">
            <span>Total:</span>
            <span>¢${parseFloat(purchaseData.amount).toFixed(2)}</span>
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
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <TraloLogo />
          <h1 className="text-2xl font-bold mt-4">Quick Purchase</h1>
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
            <CardContent className="space-y-4">
              <div>
                <Label>Product/Service</Label>
                <Input 
                  placeholder="What did you buy?"
                  value={purchaseData.productName}
                  onChange={(e) => handleInputChange("productName", e.target.value)}
                />
              </div>

              <div>
                <Label>Amount (¢)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={purchaseData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                />
              </div>

              <div>
                <Label>Your Name (Optional)</Label>
                <Input 
                  placeholder="Your name"
                  value={purchaseData.customerName}
                  onChange={(e) => handleInputChange("customerName", e.target.value)}
                />
              </div>

              <div>
                <Label>Phone Number (Optional)</Label>
                <Input 
                  placeholder="Your phone number"
                  value={purchaseData.customerPhone}
                  onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select onValueChange={(value) => handleInputChange("paymentMethod", value)}>
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
                  value={purchaseData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate(`/purchase-multiple?b=${businessId}`)}
                  variant="outline" 
                  className="flex-1"
                >
                  Multiple Products
                </Button>
                <Button 
                  onClick={handleSubmitPurchase} 
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? "Recording..." : "Record & Get Receipt"}
                </Button>
              </div>
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
              {/* Receipt Content */}
              <div className="print:block hidden">
                <div className="text-center border-b pb-4 mb-4">
                  <div className="text-lg font-bold">{businessProfile.business_name}</div>
                  <div className="text-sm">{businessProfile.business_address}</div>
                  <div className="text-sm">{businessProfile.phone_number}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Receipt #:</span>
                  <span>{receiptData.document.document_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Date:</span>
                  <span>{new Date(receiptData.purchase_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Customer:</span>
                  <span>{purchaseData.customerName || purchaseData.customerPhone || 'Walk-in Customer'}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between py-2">
                  <span>{purchaseData.productName}</span>
                  <span>¢{parseFloat(purchaseData.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>¢{parseFloat(purchaseData.amount).toFixed(2)}</span>
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

export default Purchase;