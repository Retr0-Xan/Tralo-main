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
import { dispatchSalesDataUpdated } from "@/lib/sales-events";
import { fetchSalesAnalytics } from "@/lib/sales-analytics";

interface Sale {
  id: string;
  product_name: string;
  amount: number;
  effective_amount: number;
  quantity: number;
  effective_quantity: number;
  customer_phone: string;
  payment_method: string;
  purchase_date: string;
  is_reversed: boolean;
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
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const analytics = await fetchSalesAnalytics(user.id, {
        startDate: thirtyDaysAgo.toISOString(),
        includeReversed: false,
        limit: 100,
      });

      const filteredSales: Sale[] = analytics
        .filter((sale) => Number(sale.effective_amount ?? sale.amount ?? 0) > 0 && !sale.is_reversed)
        .map((sale) => ({
          id: sale.sale_id,
          product_name: sale.product_name,
          amount: Number(sale.amount ?? 0),
          effective_amount: Number(sale.effective_amount ?? sale.amount ?? 0),
          quantity: Number(sale.quantity ?? 1),
          effective_quantity: Number(sale.effective_quantity ?? sale.quantity ?? 1),
          customer_phone: sale.customer_phone ?? "walk-in",
          payment_method: sale.payment_method ?? "cash",
          purchase_date: sale.purchase_date,
          is_reversed: sale.is_reversed,
        }));

      setSales(filteredSales);
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
      const trimmedReason = reversalReason.trim();

      // Generate reversal receipt number
      const { data: receiptNumber, error: numberError } = await supabase
        .rpc('generate_reversal_receipt_number', { user_uuid: user.id });

      if (numberError) throw numberError;
      if (!receiptNumber) {
        throw new Error('Failed to generate reversal receipt number.');
      }

      // Create sale reversal record
      const { error: reversalError } = await supabase
        .from('sale_reversals')
        .insert({
          user_id: user.id,
          original_sale_id: selectedSale.id,
          reversal_reason: trimmedReason,
          reversal_receipt_number: receiptNumber,
          reversal_date: new Date().toISOString()
        });

      if (reversalError) throw reversalError;

      // Fetch any inventory movements linked to this sale to determine quantities
      const { data: saleMovements, error: movementFetchError } = await supabase
        .from('inventory_movements')
        .select('product_name, quantity, unit_price, selling_price, customer_id')
        .eq('user_id', user.id)
        .eq('sale_id', selectedSale.id)
        .eq('movement_type', 'sold');

      if (movementFetchError) throw movementFetchError;

      let totalQuantityReturned = 0;
      let totalSaleAmount = 0;

      const reversalTimestamp = new Date().toISOString();

      if (saleMovements && saleMovements.length > 0) {
        for (const movement of saleMovements) {
          const quantityValue = Number(movement.quantity ?? 0);
          const quantityToRestore = quantityValue > 0 ? quantityValue : 1;
          const sellingPrice = Number(
            movement.selling_price ??
            movement.unit_price ??
            selectedSale.effective_amount ??
            selectedSale.amount
          );

          const { error: inventoryError } = await supabase
            .from('inventory_movements')
            .insert({
              user_id: user.id,
              product_name: movement.product_name,
              movement_type: 'returned',
              quantity: quantityToRestore,
              unit_price: movement.unit_price,
              selling_price: sellingPrice,
              customer_id: movement.customer_id,
              sale_id: selectedSale.id,
              notes: `Sale reversal: ${trimmedReason}`,
              movement_date: reversalTimestamp
            });

          if (inventoryError) throw inventoryError;

          const { data: productRecord, error: fetchError } = await supabase
            .from('user_products')
            .select('id, current_stock, total_sales_this_month')
            .eq('user_id', user.id)
            .ilike('product_name', `%${movement.product_name}%`)
            .maybeSingle();

          if (fetchError) throw fetchError;

          if (productRecord) {
            const updatedStock = Number(productRecord.current_stock ?? 0) + quantityToRestore;
            const updatedSalesTotal = Math.max(0, Number(productRecord.total_sales_this_month ?? 0) - (sellingPrice * quantityToRestore));

            const { error: productError } = await supabase
              .from('user_products')
              .update({
                current_stock: updatedStock,
                total_sales_this_month: updatedSalesTotal,
                updated_at: reversalTimestamp
              })
              .eq('id', productRecord.id);

            if (productError) throw productError;
          }

          totalQuantityReturned += quantityToRestore;
          totalSaleAmount += sellingPrice * quantityToRestore;
        }
      }

      if (totalQuantityReturned === 0) {
        totalQuantityReturned = Number(selectedSale.effective_quantity ?? selectedSale.quantity ?? 1);
      }

      if (totalSaleAmount === 0) {
        totalSaleAmount = Number(selectedSale.effective_amount ?? selectedSale.amount);
      }

      // Mark original sale as reversed by zeroing the amount and tagging the payment method
      const { error: purchaseUpdateError } = await supabase
        .from('customer_purchases')
        .update({
          amount: 0,
          quantity: 0,
          payment_method: 'reversed'
        })
        .eq('id', selectedSale.id);

      if (purchaseUpdateError) throw purchaseUpdateError;

      const { error: customerSalesUpdateError } = await supabase
        .from('customer_sales')
        .update({
          total_amount: 0,
          quantity: 0,
          payment_method: 'reversed'
        })
        .eq('sale_id', selectedSale.id);

      if (customerSalesUpdateError) throw customerSalesUpdateError;

      if (selectedSale.customer_phone && selectedSale.customer_phone.toLowerCase() !== 'walk-in') {
        const { data: customerRecord, error: customerFetchError } = await supabase
          .from('customers')
          .select('id, total_purchases, total_sales_count')
          .eq('user_id', user.id)
          .eq('phone_number', selectedSale.customer_phone)
          .maybeSingle();

        if (customerFetchError) throw customerFetchError;

        if (customerRecord) {
          const updatedTotal = Math.max(0, Number(customerRecord.total_purchases ?? 0) - Number(totalSaleAmount));
          const updatedCount = Math.max(0, Number(customerRecord.total_sales_count ?? 0) - 1);

          const { error: customerUpdateError } = await supabase
            .from('customers')
            .update({
              total_purchases: updatedTotal,
              total_sales_count: updatedCount
            })
            .eq('id', customerRecord.id);

          if (customerUpdateError) throw customerUpdateError;
        }
      }

      const reversalDocumentContent = {
        items: [
          {
            item_name: selectedSale.product_name,
            quantity: totalQuantityReturned,
            unit_price:
              totalQuantityReturned > 0
                ? Number(totalSaleAmount) / totalQuantityReturned
                : Number(selectedSale.effective_amount ?? selectedSale.amount),
            total_price: Number(totalSaleAmount)
          }
        ],
        notes: trimmedReason,
        original_sale_id: selectedSale.id,
        original_amount: Number(selectedSale.effective_amount ?? selectedSale.amount),
        payment_method: selectedSale.payment_method,
        customer: {
          phone: selectedSale.customer_phone
        },
        reversed_at: reversalTimestamp
      };

      const { error: reversalDocError } = await supabase
        .from('documents')
        .insert([{
          user_id: user.id,
          document_type: 'reversal_receipt',
          document_number: receiptNumber,
          title: `Reversal - ${selectedSale.product_name}`,
          content: reversalDocumentContent as any,
          total_amount: Number(totalSaleAmount),
          customer_name: selectedSale.customer_phone || 'Walk-in Customer',
          status: 'issued'
        }]);

      if (reversalDocError) throw reversalDocError;

      toast({
        title: "Sale Reversed",
        description: `Sale reversed successfully. Reversal receipt: ${receiptNumber}`,
      });

      dispatchSalesDataUpdated();

      // Reset form
      setSelectedSale(null);
      setReversalReason("");

      // Remove sale from local list
      setSales((prev) => prev.filter((sale) => sale.id !== selectedSale.id));

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
                              <Badge variant="secondary">¢{sale.effective_amount || sale.amount}</Badge>
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
                      <Label className="text-sm font-medium">Quantity</Label>
                      <p className="text-lg">{selectedSale.effective_quantity || selectedSale.quantity}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Amount</Label>
                      <p className="text-lg font-bold text-green-600">¢{selectedSale.effective_amount || selectedSale.amount}</p>
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