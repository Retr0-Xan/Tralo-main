import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Network, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SupplyChainMetrics {
  // Stage 1: From Suppliers
  unitsReceived: number;
  totalInvested: number;
  supplierCount: number;

  // Stage 2: Inventory
  unitsRemaining: number;
  avgInventoryAge: number;

  // Stage 3: Sold to Customers
  unitsSold: number;
  revenue: number;
  avgSellingPrice: number;

  // Product Insights
  turnoverRate: number;
  turnoverTimes: number;
  profitMargin: number;
  avgUnitCost: number;
  breakEvenPoint: number;

  // Status
  status: string;
  statusColor: string;
  statusEmoji: string;
}interface Product {
  product_name: string;
}

export default function SupplyChainFlow() {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [metrics, setMetrics] = useState<Record<string, SupplyChainMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      fetchProducts();
      fetchSupplyChainData();
    }
  }, [user?.id]);

  const fetchProducts = async () => {
    if (!user?.id) return;

    try {
      const { data: productsData } = await supabase
        .from('user_products')
        .select('product_name')
        .eq('user_id', user.id)
        .order('product_name');

      const uniqueProducts = productsData?.map(p => ({ product_name: p.product_name })) || [];
      setProducts(uniqueProducts);

      if (uniqueProducts.length > 0 && !selectedProduct) {
        setSelectedProduct(uniqueProducts[0].product_name);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSupplyChainData = async () => {
    if (!user?.id) return;

    try {
      // Get business profile
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!businessProfile) {
        setMetrics({});
        setLoading(false);
        return;
      }

      // Get all products
      const { data: allProducts } = await supabase
        .from('user_products')
        .select('product_name, current_stock, selling_price')
        .eq('user_id', user.id);

      if (!allProducts || allProducts.length === 0) {
        setMetrics({});
        setLoading(false);
        return;
      }

      const metricsData: Record<string, SupplyChainMetrics> = {};

      // Calculate metrics for each product
      for (const product of allProducts) {
        const productName = product.product_name;
        const productNameLower = productName.toLowerCase();

        // Stage 1: From Suppliers - Get receipts data
        const { data: receipts } = await supabase
          .from('inventory_receipts')
          .select('quantity_received, total_cost, unit_cost, received_date, supplier_id')
          .eq('user_id', user.id)
          .ilike('product_name', productName);

        const unitsReceived = receipts?.reduce((sum, r) => sum + Number(r.quantity_received || 0), 0) || 0;
        const totalInvested = receipts?.reduce((sum, r) => {
          const cost = r.total_cost || (Number(r.unit_cost || 0) * Number(r.quantity_received || 0));
          return sum + Number(cost);
        }, 0) || 0;
        const uniqueSuppliers = new Set(receipts?.map(r => r.supplier_id).filter(Boolean));
        const supplierCount = uniqueSuppliers.size;

        // Calculate average inventory age (days since first receipt)
        let avgInventoryAge = 0;
        if (receipts && receipts.length > 0) {
          const sortedReceipts = receipts
            .filter(r => r.received_date)
            .sort((a, b) => new Date(a.received_date!).getTime() - new Date(b.received_date!).getTime());

          if (sortedReceipts.length > 0) {
            const oldestDate = new Date(sortedReceipts[0].received_date!);
            const now = new Date();
            avgInventoryAge = Math.floor((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        // Stage 3: Sold to Customers - Get comprehensive sales data from sales_analytics view
        // This includes all sales with reversals properly handled
        const { data: sales } = await supabase
          .from('sales_analytics')
          .select('effective_quantity, effective_amount')
          .eq('user_id', user.id)
          .ilike('product_name', productName)
          .eq('is_reversed', false);

        // Also check inventory_movements for any sales recorded there
        const { data: movements } = await supabase
          .from('inventory_movements')
          .select('quantity, unit_price')
          .eq('user_id', user.id)
          .eq('movement_type', 'sold')
          .ilike('product_name', productName);

        // Combine sales from both sources
        const unitsSoldFromSales = sales?.reduce((sum, s) => sum + Number(s.effective_quantity || 0), 0) || 0;
        const revenueFromSales = sales?.reduce((sum, s) => sum + Number(s.effective_amount || 0), 0) || 0;

        const unitsSoldFromMovements = movements?.reduce((sum, m) => sum + Math.abs(Number(m.quantity || 0)), 0) || 0;
        const revenueFromMovements = movements?.reduce((sum, m) => {
          const qty = Math.abs(Number(m.quantity || 0));
          const price = Number(m.unit_price || 0);
          return sum + (qty * price);
        }, 0) || 0;

        const unitsSold = unitsSoldFromSales + unitsSoldFromMovements;
        const revenue = revenueFromSales + revenueFromMovements;
        const avgSellingPrice = unitsSold > 0 ? revenue / unitsSold : Number(product.selling_price || 0);

        // Stage 2: Inventory
        const unitsRemaining = Number(product.current_stock || 0);

        // Product Insights
        const avgUnitCost = unitsReceived > 0 ? totalInvested / unitsReceived : 0;
        const turnoverTimes = unitsReceived > 0 ? unitsSold / unitsReceived : 0;
        const turnoverRate = turnoverTimes * 100;

        const costOfGoodsSold = avgUnitCost * unitsSold;
        const profitMargin = revenue > 0 ? ((revenue - costOfGoodsSold) / revenue) * 100 : 0;

        // Break-even point: units needed to recover total investment
        const breakEvenPoint = avgSellingPrice > 0 ? Math.ceil(totalInvested / avgSellingPrice) : 0;

        // Determine status based on stock levels and turnover
        let status = '';
        let statusColor = '';
        let statusEmoji = '';

        if (unitsRemaining === 0) {
          status = 'Out of Stock';
          statusColor = 'red';
          statusEmoji = '🔴';
        } else if (unitsRemaining < 5) {
          status = 'Low Stock';
          statusColor = 'orange';
          statusEmoji = '⚠️';
        } else if (turnoverTimes >= 1.5) {
          status = 'Fast-moving item';
          statusColor = 'green';
          statusEmoji = '🔥';
        } else if (turnoverTimes >= 0.5) {
          status = 'Normal movement';
          statusColor = 'blue';
          statusEmoji = '✅';
        } else if (turnoverTimes > 0) {
          status = 'Slow-moving item';
          statusColor = 'yellow';
          statusEmoji = '🐌';
        } else {
          status = 'No sales yet';
          statusColor = 'gray';
          statusEmoji = '⏳';
        }

        metricsData[productName] = {
          unitsReceived,
          totalInvested,
          supplierCount,
          unitsRemaining,
          avgInventoryAge,
          unitsSold,
          revenue,
          avgSellingPrice,
          turnoverRate,
          turnoverTimes,
          profitMargin,
          avgUnitCost,
          breakEvenPoint,
          status,
          statusColor,
          statusEmoji,
        };
      }

      setMetrics(metricsData);
    } catch (error) {
      console.error('Error fetching supply chain data:', error);
      toast({
        title: "Info",
        description: "Start receiving inventory from suppliers to see supply chain analytics",
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeSupplyChain = async () => {
    setAnalyzing(true);
    await fetchSupplyChainData();
    setAnalyzing(false);
    toast({
      title: "Analysis complete",
      description: `Analyzed ${Object.keys(metrics).length} products`,
    });
  };

  const currentMetrics = selectedProduct && metrics[selectedProduct] ? metrics[selectedProduct] : null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            🔗 Supply Chain Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            🔗 Supply Chain Flow
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={analyzeSupplyChain}
            disabled={analyzing}
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Analyze
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Product Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Product to View Supply Chain:</label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="bg-background border border-border">
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                {products.map((product) => (
                  <SelectItem key={product.product_name} value={product.product_name}>
                    {product.product_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {Object.keys(metrics).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No supply chain data available yet.</p>
              <p className="text-sm">Start recording inventory receipts from suppliers to track supply chain flow.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={analyzeSupplyChain}
              >
                Check for Data
              </Button>
            </div>
          ) : currentMetrics ? (
            <>
              {/* STAGE 1 — From Suppliers */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Stage 1 — From Suppliers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <div className="text-xs text-green-600 dark:text-green-400 mb-1">Units Received</div>
                    <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                      {currentMetrics.unitsReceived.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <div className="text-xs text-green-600 dark:text-green-400 mb-1">Total Invested</div>
                    <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                      ¢{currentMetrics.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <div className="text-xs text-green-600 dark:text-green-400 mb-1"># of Suppliers</div>
                    <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                      {currentMetrics.supplierCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* STAGE 2 — Inventory */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Stage 2 — Inventory</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Units Remaining</div>
                    <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                      {currentMetrics.unitsRemaining.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Avg Inventory Age</div>
                    <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                      {currentMetrics.avgInventoryAge} days
                    </div>
                  </div>
                </div>
              </div>

              {/* STAGE 3 — Sold to Customers */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Stage 3 — Sold to Customers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                    <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Units Sold</div>
                    <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                      {currentMetrics.unitsSold.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                    <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Revenue</div>
                    <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                      ¢{currentMetrics.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                    <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Avg Selling Price</div>
                    <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                      ¢{currentMetrics.avgSellingPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* STATUS */}
              <div className={`p-4 rounded-lg border-2 ${currentMetrics.statusColor === 'green' ? 'bg-green-50 dark:bg-green-950 border-green-500 dark:border-green-600' :
                  currentMetrics.statusColor === 'orange' ? 'bg-orange-50 dark:bg-orange-950 border-orange-500 dark:border-orange-600' :
                    currentMetrics.statusColor === 'red' ? 'bg-red-50 dark:bg-red-950 border-red-500 dark:border-red-600' :
                      currentMetrics.statusColor === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-500 dark:border-yellow-600' :
                        currentMetrics.statusColor === 'blue' ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 dark:border-blue-600' :
                          'bg-gray-50 dark:bg-gray-950 border-gray-500 dark:border-gray-600'
                }`}>
                <div className="text-lg font-bold">
                  {currentMetrics.statusEmoji} Status: {currentMetrics.status}
                </div>
              </div>

              {/* PRODUCT INSIGHTS */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Product Insights</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Stock Turnover</div>
                    <div className="text-lg font-semibold">
                      {currentMetrics.turnoverTimes.toFixed(2)}×
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      (You sold this item {currentMetrics.turnoverTimes.toFixed(2)} times)
                    </div>
                    <div className="text-xs font-medium mt-2">
                      {currentMetrics.statusEmoji} {currentMetrics.status}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Profit Margin</div>
                    <div className="text-lg font-semibold">
                      {currentMetrics.profitMargin.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Avg Unit Cost</div>
                    <div className="text-lg font-semibold">
                      ¢{currentMetrics.avgUnitCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Break-even Point</div>
                    <div className="text-lg font-semibold">
                      {currentMetrics.breakEvenPoint} units
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 italic">
                      Units to sell to recover your investment
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>No supply chain data for selected product.</p>
              <p className="text-sm">Record inventory receipts for this product to see metrics.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}