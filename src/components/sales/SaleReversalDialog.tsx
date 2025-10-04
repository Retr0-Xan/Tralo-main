import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Undo2, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Sale {
  id: string;
  product_name: string;
  amount: number;
  customer_phone: string;
  payment_method: string;
  purchase_date: string;
}

const SaleReversalDialog = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  const fetchRecentSales = async () => {
    if (!user) return;
    
    setFetchingData(true);
    try {
      // Get business profile first
      const { data: profile, error: profileError } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error('Business profile not found');
      }

      // Get recent sales from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: salesData, error: salesError } = await supabase
        .from('customer_purchases')
        .select('*')
        .eq('business_id', profile.id)
        .gte('purchase_date', thirtyDaysAgo.toISOString())
        .order('purchase_date', { ascending: false })
        .limit(50);

      if (salesError) throw salesError;

      setSales(salesData || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast({
        title: "Error",
        description: "Failed to load sales data",
        variant: "destructive",
      });
    } finally {
      setFetchingData(false);
    }
  };

  const handleReverseSale = async () => {
    if (!selectedSale || !user) return;
    
    setLoading(true);
    try {
      // Generate reversal receipt number
      const { data: receiptNumber, error: numberError } = await supabase
        .rpc('generate_reversal_receipt_number', { user_uuid: user.id });

      if (numberError) throw numberError;

      // Create sale reversal record
      const { error: reversalError } = await supabase
        .from('sale_reversals')
        .insert({
          user_id: user.id,
          original_sale_id: selectedSale.id,
          reversal_reason: reversalReason,
          reversal_receipt_number: receiptNumber
        });

      if (reversalError) throw reversalError;

      // Update inventory - add back the stock
      const { error: inventoryError } = await supabase
        .from('inventory_movements')
        .insert({
          user_id: user.id,
          product_name: selectedSale.product_name,
          movement_type: 'returned',
          quantity: 1,
          unit_price: selectedSale.amount,
          customer_id: selectedSale.customer_phone,
          notes: `Sale reversal: ${reversalReason}`,
          movement_date: new Date().toISOString()
        });

      if (inventoryError) throw inventoryError;

      // Update user_products stock - get current values first
      const { data: currentProduct, error: fetchError } = await supabase
        .from('user_products')
        .select('current_stock, total_sales_this_month')
        .eq('user_id', user.id)
        .ilike('product_name', `%${selectedSale.product_name}%`)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (currentProduct) {
        const { error: productError } = await supabase
          .from('user_products')
          .update({
            current_stock: (currentProduct.current_stock || 0) + 1,
            total_sales_this_month: Math.max(0, (currentProduct.total_sales_this_month || 0) - selectedSale.amount),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .ilike('product_name', `%${selectedSale.product_name}%`);

        if (productError) throw productError;
      }

      toast({
        title: "Sale Reversed",
        description: `Sale reversed successfully. Reversal receipt: ${receiptNumber}`,
      });

      // Reset form
      setSelectedSale(null);
      setReversalReason("");
      
      // Refresh sales data
      fetchRecentSales();
    } catch (error) {
      console.error('Error reversing sale:', error);
      toast({
        title: "Error",
        description: "Failed to reverse sale",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentSales();
  }, [user]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Undo2 className="w-4 h-4" />
          Revert Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="w-5 h-5" />
            Revert Sale
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!selectedSale ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Recent Sales (Last 30 Days)</h3>
                <Button 
                  onClick={fetchRecentSales} 
                  variant="outline" 
                  size="sm"
                  disabled={fetchingData}
                >
                  {fetchingData ? "Loading..." : "Refresh"}
                </Button>
              </div>
              
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {sales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No recent sales found
                  </p>
                ) : (
                  sales.map((sale) => (
                    <Card 
                      key={sale.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{sale.product_name}</span>
                              <Badge variant="secondary">¢{sale.amount}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Customer: {sale.customer_phone} • {sale.payment_method}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(sale.purchase_date), 'MMM dd, yyyy h:mm a')}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            Select
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Sale Details</h3>
                <Button 
                  onClick={() => setSelectedSale(null)} 
                  variant="outline" 
                  size="sm"
                >
                  Back to List
                </Button>
              </div>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Product</Label>
                      <p className="text-lg">{selectedSale.product_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Amount</Label>
                      <p className="text-lg font-bold text-green-600">¢{selectedSale.amount}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Customer</Label>
                      <p>{selectedSale.customer_phone}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Payment Method</Label>
                      <p className="capitalize">{selectedSale.payment_method}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm font-medium">Sale Date</Label>
                      <p>{format(new Date(selectedSale.purchase_date), 'MMMM dd, yyyy h:mm a')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="reason">Reversal Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for reversing this sale..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleReverseSale}
                  disabled={loading || !reversalReason.trim()}
                  className="flex items-center gap-2"
                >
                  <Receipt className="w-4 h-4" />
                  {loading ? "Processing..." : "Reverse Sale & Generate Receipt"}
                </Button>
                <Button 
                  onClick={() => setSelectedSale(null)} 
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleReversalDialog;