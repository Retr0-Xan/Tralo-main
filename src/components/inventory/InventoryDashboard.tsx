import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [stockMetrics, setStockMetrics] = useState<StockMetrics>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recordingLoss, setRecordingLoss] = useState(false);
  const [lossProduct, setLossProduct] = useState("");
  const [lossQuantity, setLossQuantity] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [lossNotes, setLossNotes] = useState("");
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInventoryData();
    fetchBusinessProfile();
  }, [user]);

  const fetchBusinessProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profileData, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setBusinessProfile(profileData);
    } catch (error) {
      console.error('Error fetching business profile:', error);
    }
  };

  const fetchInventoryData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's business profile
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!businessProfile) return;

      // Get user products
      const { data: products } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', user.id)
        .order('product_name');

      // Get inventory receipts to calculate costs
      const { data: receipts } = await supabase
        .from('inventory_receipts')
        .select('product_name, unit_cost, quantity_received, total_cost')
        .eq('user_id', user.id);

      // Get recent sales data
      const { data: sales } = await supabase
        .from('customer_purchases')
        .select('product_name, amount, purchase_date')
        .eq('business_id', businessProfile.id)
        .gte('purchase_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (products) {
        const processedInventory = products.map(product => {
          // Calculate average costs from receipts
          const productReceipts = receipts?.filter(r => 
            r.product_name.toLowerCase() === product.product_name.toLowerCase()
          ) || [];
          
          const totalReceived = productReceipts.reduce((sum, r) => sum + r.quantity_received, 0);
          const totalCost = productReceipts.reduce((sum, r) => sum + (r.total_cost || 0), 0);
          const avgCostPrice = totalReceived > 0 ? totalCost / totalReceived : 0;

          // Calculate average selling price from sales
          const productSales = sales?.filter(s => 
            s.product_name.toLowerCase().includes(product.product_name.toLowerCase()) ||
            product.product_name.toLowerCase().includes(s.product_name.toLowerCase())
          ) || [];
          
          const totalSalesAmount = productSales.reduce((sum, s) => sum + Number(s.amount), 0);
          const avgSellingPrice = productSales.length > 0 ? totalSalesAmount / productSales.length : 0;

          // Calculate current stock value based on cost price from inventory receipts
          const currentValue = product.current_stock * (avgCostPrice || 0);

          // Determine status
          let status: 'healthy' | 'low' | 'out' | 'slow';
          let recommendation: string;

          if (product.current_stock === 0) {
            status = 'out';
            recommendation = `🚨 Out of stock - reorder ${product.product_name} immediately`;
          } else if (product.current_stock < 5) {
            status = 'low';
            recommendation = `⚠️ Low stock - only ${product.current_stock} ${product.product_name} remaining`;
          } else if (productSales.length === 0 && product.current_stock > 20) {
            status = 'slow';
            recommendation = `📊 ${product.product_name} moving slowly - consider promotion`;
          } else {
            status = 'healthy';
            recommendation = `✅ ${product.product_name} stock levels are healthy`;
          }

          return {
            id: product.id,
            product_name: product.product_name,
            current_stock: product.current_stock || 0,
            last_sale_date: product.last_sale_date,
            total_sales_this_month: product.total_sales_this_month || 0,
            avg_selling_price: avgSellingPrice,
            avg_cost_price: avgCostPrice,
            total_value: currentValue,
            status,
            recommendation
          } as InventoryItem;
        });

        setInventoryData(processedInventory);

        // Calculate metrics
        const metrics: StockMetrics = {
          totalItems: processedInventory.reduce((sum, item) => sum + item.current_stock, 0),
          totalValue: processedInventory.reduce((sum, item) => sum + item.total_value, 0),
          lowStockItems: processedInventory.filter(item => item.status === 'low').length,
          outOfStockItems: processedInventory.filter(item => item.status === 'out').length,
          totalRevenue: sales?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0
        };

        setStockMetrics(metrics);
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchInventoryData();
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

    setRecordingLoss(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const lossQty = parseInt(lossQuantity);

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
          .eq('user_id', user.id)
          .eq('product_name', lossProduct);

        // Record inventory movement
        await supabase
          .from('inventory_movements')
          .insert({
            user_id: user.id,
            product_name: lossProduct,
            movement_type: lossReason === 'damaged' ? 'damaged' : lossReason === 'expired' ? 'expired' : 'adjusted',
            quantity: -lossQty,
            notes: lossNotes || null
          });

        toast({
          title: "Loss recorded",
          description: `Recorded loss of ${lossQuantity} ${lossProduct}`,
        });

        // Reset form and refresh data
        setLossProduct("");
        setLossQuantity("");
        setLossReason("");
        setLossNotes("");
        await fetchInventoryData();
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

  if (loading) {
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
            disabled={refreshing}
          >
            {refreshing ? (
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
                    <TableCell>{item.current_stock} units</TableCell>
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
              <Select value={lossReason} onValueChange={setLossReason}>
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
            </div>
            <Textarea 
              placeholder="Additional notes about the loss..." 
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
            />
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