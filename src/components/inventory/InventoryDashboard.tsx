import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Eye, Network, DollarSign, AlertTriangle, TrendingUp, TrendingDown, Trophy, Trash2, Lightbulb, RefreshCw, Loader2, ShoppingCart, Send, FileText, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import AchievementsSection from "./AchievementsSection";
import SupplyChainFlow from "./SupplyChainFlow";
import TrustScoreBadge from "@/components/TrustScoreBadge";
import OrderStockDialog from "./OrderStockDialog";
import ShareMessageGenerator from "@/components/ShareMessageGenerator";
import StockConversionDialog from "./StockConversionDialog";
import { useAuth } from "@/hooks/useAuth";
import { useInventoryOverview, inventoryOverviewQueryKey } from "@/hooks/useInventoryOverview";
import { useQueryClient } from "@tanstack/react-query";
import { homeMetricsQueryKey } from "@/hooks/useHomeMetrics";

interface InventoryItem {
  id: string;
  product_name: string;
  current_stock: number;
  last_sale_date?: string;
  total_sales_this_month: number;
  avg_selling_price?: number;
  avg_cost_price?: number;
  total_value: number;
  status: 'healthy' | 'low' | 'out' | 'slow';
  recommendation: string;
}

interface StockMetrics {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalRevenue: number;
}

const InventoryDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useInventoryOverview();
  const businessProfile = data?.businessProfile;
  const inventoryData = data?.inventoryItems ?? [];
  const stockMetrics = data?.stockMetrics ?? {
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalRevenue: 0
  };
  const [recordingLoss, setRecordingLoss] = useState(false);
  const [lossProduct, setLossProduct] = useState("");
  const [lossQuantity, setLossQuantity] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [customLossReason, setCustomLossReason] = useState("");
  const [isCustomLossReason, setIsCustomLossReason] = useState(false);
  const [lossNotes, setLossNotes] = useState("");
  const [recordAsExpense, setRecordAsExpense] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const { toast } = useToast();

  const refreshData = async () => {
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: homeMetricsQueryKey(user.id) });
    }
    await refetch();
    toast({
      title: "Data refreshed",
      description: "Inventory data has been updated",
    });
  };

  const handleRecordLoss = async () => {
    if (!lossProduct || !lossQuantity || !lossReason) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (isCustomLossReason && !customLossReason.trim()) {
      toast({
        title: "Error",
        description: "Please enter a custom loss reason",
        variant: "destructive",
      });
      return;
    }

    setRecordingLoss(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const lossQty = parseInt(lossQuantity);
      const finalLossReason = isCustomLossReason ? customLossReason : lossReason;

      // Update product stock
      const { data: product } = await supabase
        .from('user_products')
        .select('current_stock')
        .eq('user_id', user.id)
        .eq('product_name', lossProduct)
        .single();

      if (product) {
        const newStock = Math.max(0, product.current_stock - lossQty);

        await supabase
          .from('user_products')
          .update({
            current_stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', authUser.id)
          .eq('product_name', lossProduct);

        // Record inventory movement
        await supabase
          .from('inventory_movements')
          .insert({
            user_id: authUser.id,
            product_name: lossProduct,
            movement_type: lossReason === 'damaged' ? 'damaged' : lossReason === 'expired' ? 'expired' : 'adjusted',
            quantity: -lossQty,
            notes: lossNotes || null
          });

        // Record as expense if toggled
        if (recordAsExpense) {
          // Get product cost to calculate expense amount
          const { data: productData } = await supabase
            .from('user_products')
            .select('selling_price')
            .eq('user_id', authUser.id)
            .eq('product_name', lossProduct)
            .single();

          const estimatedValue = productData?.selling_price
            ? Number(productData.selling_price) * lossQty
            : 0;

          // Record expense
          await supabase
            .from('expenses')
            .insert({
              user_id: authUser.id,
              category: 'Loss/Damage',
              amount: estimatedValue,
              description: `${finalLossReason.charAt(0).toUpperCase() + finalLossReason.slice(1)} - ${lossProduct} (${lossQty} units)${lossNotes ? ': ' + lossNotes : ''}`,
              expense_date: new Date().toISOString()
            });
        }

        toast({
          title: "Loss recorded",
          description: `Recorded loss of ${lossQuantity} ${lossProduct}${recordAsExpense ? ' as expense' : ''}`,
        });

        // Reset form and refresh data
        setLossProduct("");
        setLossQuantity("");
        setLossReason("");
        setCustomLossReason("");
        setIsCustomLossReason(false);
        setLossNotes("");
        setRecordAsExpense(false);
        if (authUser.id) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: inventoryOverviewQueryKey(authUser.id) }),
            queryClient.invalidateQueries({ queryKey: homeMetricsQueryKey(authUser.id) })
          ]);
        }
      }
    } catch (error) {
      console.error('Error recording loss:', error);
      toast({
        title: "Error",
        description: "Failed to record loss",
        variant: "destructive",
      });
    } finally {
      setRecordingLoss(false);
    }
  };

  const handleOrderStock = () => {
    setOrderDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: "default",
      low: "destructive",
      out: "destructive",
      slow: "secondary"
    } as const;

    const labels = {
      healthy: "Healthy Stock",
      low: "Low Stock",
      out: "Out of Stock",
      slow: "Slow Moving"
    };

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return `¢${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading inventory data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventory Dashboard</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">Monitor your stock levels and insights</p>
            <TrustScoreBadge size="sm" />
          </div>
        </div>
        <div className="flex gap-2">
          <StockConversionDialog onSuccess={refreshData} />
          <Button
            variant="default"
            size="sm"
            onClick={handleOrderStock}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Order Stock
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Stock Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{stockMetrics.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Stock Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stockMetrics.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-orange-500">{stockMetrics.lowStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">30-Day Sales</p>
                  <p className="text-2xl font-bold">{formatCurrency(stockMetrics.totalRevenue)}</p>
                </div>
              </div>
              {/* Performance indicator would go here based on previous period comparison */}
              <div className="text-right">
                {stockMetrics.totalRevenue > 0 ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Good</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm font-medium">Track sales</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            📦 Current Stock Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No inventory items found.</p>
              <p className="text-sm">Start by adding products to your inventory.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Stock Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.current_stock} {item.local_unit || item.international_unit || 'units'}</TableCell>
                    <TableCell>{formatCurrency(item.total_value)}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs">
                      {item.recommendation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Smart Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            📊 Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {stockMetrics.outOfStockItems > 0 && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">
                  🚨 You have {stockMetrics.outOfStockItems} product(s) out of stock. Customers may be looking for these items!
                </p>
              </div>
            )}
            {stockMetrics.lowStockItems > 0 && (
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  ⚠️ {stockMetrics.lowStockItems} product(s) are running low. Consider restocking soon.
                </p>
              </div>
            )}
            {stockMetrics.totalValue > 1000 && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  💰 Your inventory is valued at {formatCurrency(stockMetrics.totalValue)}. Great stock management!
                </p>
              </div>
            )}
            {inventoryData.length === 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-sm">
                  📈 Start adding products to your inventory to see personalized insights and recommendations!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Share Message Generator */}
      <ShareMessageGenerator
        businessName={businessProfile?.business_name || "Your Business"}
        location={businessProfile?.business_address || "Your Location"}
        phoneNumber={businessProfile?.phone_number || "Your Phone Number"}
        items={inventoryData.map(item => ({
          name: item.product_name,
          price: item.avg_selling_price?.toFixed(2) || "0.00",
          unit: "unit"
        }))}
        type="inventory"
      />

      {/* Supply Chain Flow */}
      <SupplyChainFlow />

      {/* Achievements */}
      <AchievementsSection />

      {/* Record Loss/Damage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Record Loss/Damage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={lossProduct} onValueChange={setLossProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  {inventoryData.map((item) => (
                    <SelectItem key={item.id} value={item.product_name}>
                      {item.product_name} ({item.current_stock} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Quantity lost"
                type="number"
                value={lossQuantity}
                onChange={(e) => setLossQuantity(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={lossReason}
                onValueChange={(value) => {
                  setLossReason(value);
                  setIsCustomLossReason(value === "other");
                  if (value !== "other") {
                    setCustomLossReason("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Reason for loss" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="theft">Theft</SelectItem>
                  <SelectItem value="spoiled">Spoiled</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {isCustomLossReason && (
                <Input
                  placeholder="Enter custom loss reason"
                  value={customLossReason}
                  onChange={(e) => setCustomLossReason(e.target.value)}
                />
              )}
            </div>
            <Textarea
              placeholder="Additional notes about the loss..."
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recordAsExpense"
                checked={recordAsExpense}
                onCheckedChange={(checked) => setRecordAsExpense(!!checked)}
              />
              <Label
                htmlFor="recordAsExpense"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Record this loss as an expense
              </Label>
            </div>
            <Button
              onClick={handleRecordLoss}
              disabled={recordingLoss || !lossProduct || !lossQuantity || !lossReason}
              className="flex items-center gap-2"
            >
              {recordingLoss ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {recordingLoss ? 'Recording...' : 'Record Loss'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Order Stock Dialog */}
      <OrderStockDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        inventoryData={inventoryData}
      />
    </div>
  );
};

export default InventoryDashboard;