import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Network, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SupplyChainMetrics {
  product_name: string;
  total_received: number;
  total_sold: number;
  current_stock: number;
  days_in_inventory: number;
  turnover_rate: number;
  supplier_count: number;
  avg_unit_cost: number;
  total_investment: number;
  total_revenue: number;
  profit_margin: number;
  status: string;
  status_color: string;
}

interface Product {
  product_name: string;
}

export default function SupplyChainFlow() {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [metrics, setMetrics] = useState<Record<string, SupplyChainMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    fetchSupplyChainData();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data: receiptsData } = await supabase
        .from('inventory_receipts')
        .select('product_name')
        .order('product_name');

      const { data: productsData } = await supabase
        .from('user_products')
        .select('product_name')
        .order('product_name');

      // Combine and deduplicate products
      const allProducts = [
        ...(receiptsData?.map(r => ({ product_name: r.product_name })) || []),
        ...(productsData?.map(p => ({ product_name: p.product_name })) || [])
      ];

      const uniqueProducts = allProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.product_name === product.product_name)
      );

      setProducts(uniqueProducts);
      
      if (uniqueProducts.length > 0 && !selectedProduct) {
        setSelectedProduct(uniqueProducts[0].product_name);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSupplyChainData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.functions.invoke('supply-chain-analyzer', {
        body: { user_id: user.id }
      });

      if (data?.metrics) {
        setMetrics(data.metrics);
      } else {
        // Show empty state with sample data structure
        setMetrics({});
      }
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      toast({
        title: "Analyzing supply chain...",
        description: "Processing inventory flow data",
      });

      const { data } = await supabase.functions.invoke('supply-chain-analyzer', {
        body: { user_id: user.id }
      });

      if (data?.metrics) {
        setMetrics(data.metrics);
        toast({
          title: "Analysis complete",
          description: `Analyzed ${Object.keys(data.metrics).length} products with supply chain data`,
        });
      } else {
        toast({
          title: "No data found",
          description: "Start recording inventory receipts to analyze supply chain flow",
        });
      }
    } catch (error) {
      console.error('Error analyzing supply chain:', error);
      toast({
        title: "Error",
        description: "Failed to analyze supply chain data",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const currentMetrics = selectedProduct && metrics[selectedProduct] ? metrics[selectedProduct] : null;

  const getStatusColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'orange':
        return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200';
      case 'red':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'yellow':
        return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
  };

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
              {/* Supply Chain Flow Visualization */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 relative">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                    📦 From Suppliers
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {currentMetrics.total_received} units received
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    ¢{currentMetrics.total_investment.toFixed(2)} invested
                  </div>
                  <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 text-2xl">
                    →
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 relative">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    📊 In Inventory
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {currentMetrics.current_stock} units remaining
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {currentMetrics.days_in_inventory} days average age
                  </div>
                  <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 text-2xl">
                    →
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                  <div className="text-sm font-medium text-purple-800 dark:text-purple-200 flex items-center gap-2">
                    💰 Sold to Customers
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    {currentMetrics.total_sold} units sold
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">
                    ¢{currentMetrics.total_revenue.toFixed(2)} revenue
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className={`p-3 rounded-lg border ${getStatusColorClasses(currentMetrics.status_color)}`}>
                <div className="text-sm font-medium">
                  ⚡ Status: {currentMetrics.status}
                </div>
              </div>

              {/* Supply Chain Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="text-xs text-muted-foreground">Turnover Rate</div>
                  <div className="text-sm font-semibold">
                    {(currentMetrics.turnover_rate * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="text-xs text-muted-foreground">Profit Margin</div>
                  <div className="text-sm font-semibold">
                    {currentMetrics.profit_margin.toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="text-xs text-muted-foreground">Suppliers</div>
                  <div className="text-sm font-semibold">
                    {currentMetrics.supplier_count} suppliers
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="text-xs text-muted-foreground">Avg. Unit Cost</div>
                  <div className="text-sm font-semibold">
                    ¢{currentMetrics.avg_unit_cost.toFixed(2)}
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