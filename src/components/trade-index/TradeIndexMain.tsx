import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  MapPin, 
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Package,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useTradeIndexData } from "@/hooks/useTradeIndexData";

const TradeIndexMain = () => {
  const { commodities, insights, loading, refreshData } = useTradeIndexData();
  const [selectedMarket1, setSelectedMarket1] = useState("makola");
  const [selectedMarket2, setSelectedMarket2] = useState("texpo");
  
  // Mock inventory data for compatibility
  const inventoryData = {
    rice: { stock: 2, unit: "bags" },
    beans: { stock: 0, unit: "cups" }, 
    tomato: { stock: 15, unit: "rubbers" }
  };

  const getInsightsSummary = () => {
    const highPriority = insights.filter(i => i.priority === 'high').length;
    const mediumPriority = insights.filter(i => i.priority === 'medium').length;
    const lowPriority = insights.filter(i => i.priority === 'low').length;
    
    return { highPriority, mediumPriority, lowPriority };
  };

  const { highPriority, mediumPriority, lowPriority } = getInsightsSummary();

  const getStockStatusIcon = (stock: number) => {
    if (stock === 0) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (stock <= 2) return <TrendingDown className="w-4 h-4 text-orange-600" />;
    return <TrendingUp className="w-4 h-4 text-green-600" />;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      rising: "bg-red-100 text-red-800 border-red-200",
      dropping: "bg-green-100 text-green-800 border-green-200", 
      stable: "bg-yellow-100 text-yellow-800 border-yellow-200"
    };
    
    return (
      <Badge variant="outline" className={colors[status as keyof typeof colors]}>
        {status}
      </Badge>
    );
  };

  const getBetterMarket = (price1: string | undefined, price2: string | undefined) => {
    // Handle undefined or null prices
    if (!price1 || !price2) return "unknown";
    
    const p1 = parseFloat(price1.replace('₵', '').replace(',', ''));
    const p2 = parseFloat(price2.replace('₵', '').replace(',', ''));
    
    // Handle invalid parsed numbers
    if (isNaN(p1) || isNaN(p2)) return "unknown";
    
    if (p1 < p2) return selectedMarket1;
    if (p2 < p1) return selectedMarket2;
    return "same";
  };

  const getTopMovers = () => {
    return marketCommodities
      .filter(c => c.trend !== "stable" && c.priceChange !== "₵0")
      .sort((a, b) => {
        const aChange = Math.abs(parseFloat((a.priceChange || '0').replace(/[₵+-]/g, '')));
        const bChange = Math.abs(parseFloat((b.priceChange || '0').replace(/[₵+-]/g, '')));
        return bChange - aChange;
      })
      .slice(0, 3);
  };

  const getInventoryRecommendation = (commodity: any) => {
    const name = commodity.name.toLowerCase();
    const stock = inventoryData[name as keyof typeof inventoryData];
    
    if (!stock) return null;
    
    if (stock.stock === 0) {
      return {
        message: `You're out of stock, market is ${commodity.status}, ${commodity.status === 'dropping' ? 'good time to buy' : 'prices rising - consider waiting or buy small quantities'}`,
        type: commodity.status === 'dropping' ? 'good' : 'warning'
      };
    }
    
    if (stock.stock <= 3) {
      return {
        message: `You only have ${stock.stock} ${stock.unit} left, restock ${commodity.status === 'rising' ? 'soon before prices rise further' : 'when market drops'}`,
        type: commodity.status === 'rising' ? 'urgent' : 'info'
      };
    }
    
    if (stock.stock > 3 && commodity.status === 'dropping') {
      return {
        message: `You still have ${stock.stock} ${stock.unit}. Market is falling, buy more at lower price`,
        type: 'opportunity'
      };
    }
    
    return null;
  };

  // Mock market data for main trade index with price ranges
  const marketCommodities = [
    { name: "Rice", unit: "bag", minPrice: "₵115.00", maxPrice: "₵125.00", avgPrice: "₵120.00", makolaPrice: "₵120.00", texpoPrice: "₵118.00", trend: "up", priceChange: "+₵5", status: "rising" },
    { name: "Maize", unit: "bag", minPrice: "₵80.00", maxPrice: "₵90.00", avgPrice: "₵85.00", makolaPrice: "₵85.00", texpoPrice: "₵87.00", trend: "down", priceChange: "-₵3", status: "dropping" },
    { name: "Beans", unit: "cup", minPrice: "₵7.50", maxPrice: "₵9.00", avgPrice: "₵8.25", makolaPrice: "₵8.50", texpoPrice: "₵8.20", trend: "up", priceChange: "+₵0.50", status: "rising" },
    { name: "Tomato", unit: "rubber", minPrice: "₵10.00", maxPrice: "₵14.00", avgPrice: "₵12.00", makolaPrice: "₵12.00", texpoPrice: "₵13.00", trend: "stable", priceChange: "₵0", status: "stable" },
    { name: "Onion", unit: "rubber", minPrice: "₵13.00", maxPrice: "₵16.00", avgPrice: "₵14.50", makolaPrice: "₵15.00", texpoPrice: "₵14.50", trend: "down", priceChange: "-₵1", status: "dropping" },
    { name: "Pepper", unit: "rubber", minPrice: "₵16.00", maxPrice: "₵20.00", avgPrice: "₵18.00", makolaPrice: "₵18.00", texpoPrice: "₵17.50", trend: "up", priceChange: "+₵2", status: "rising" },
    { name: "Palm Oil", unit: "bottle", minPrice: "₵22.00", maxPrice: "₵28.00", avgPrice: "₵25.00", makolaPrice: "₵25.00", texpoPrice: "₵26.00", trend: "up", priceChange: "+₵3", status: "rising" },
    { name: "Groundnut Oil", unit: "bottle", minPrice: "₵20.00", maxPrice: "₵24.00", avgPrice: "₵22.00", makolaPrice: "₵22.00", texpoPrice: "₵21.50", trend: "stable", priceChange: "₵0", status: "stable" }
  ];

  return (
    <div className="space-y-6">
      {/* Main Trade Index Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            📊 Trade Index - Market Overview
          </CardTitle>
          <div className="text-sm text-muted-foreground mt-2">
            <p>💡 <strong>Price Ranges Guide:</strong> Use Min price for buying opportunities, Max price for selling potential, Average price for market reference</p>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Price Range</TableHead>
                <TableHead>Average Price</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Weekly Change</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketCommodities.map((commodity) => (
                <TableRow key={commodity.name}>
                  <TableCell className="font-medium">{commodity.name}</TableCell>
                  <TableCell className="text-muted-foreground">per {commodity.unit}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{commodity.minPrice} - {commodity.maxPrice}</span>
                      <span className="text-xs text-muted-foreground">Min - Max</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">{commodity.avgPrice}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {commodity.trend === 'up' ? (
                        <ArrowUp className="w-4 h-4 text-red-600" />
                      ) : commodity.trend === 'down' ? (
                        <ArrowDown className="w-4 h-4 text-green-600" />
                      ) : (
                        <Minus className="w-4 h-4 text-gray-600" />
                      )}
                      <span className={`text-sm ${
                        commodity.trend === 'up' ? 'text-red-600' :
                        commodity.trend === 'down' ? 'text-green-600' :
                        'text-gray-600'
                      }`}>
                        {commodity.trend === 'up' ? 'Rising' :
                         commodity.trend === 'down' ? 'Falling' : 'Stable'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${
                      commodity.trend === 'up' ? 'text-red-600' :
                      commodity.trend === 'down' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {commodity.priceChange}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(commodity.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Market Comparison Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            🏪 Market Comparison
          </CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">First Market:</label>
              <Select value={selectedMarket1} onValueChange={setSelectedMarket1}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="makola">Makola Market</SelectItem>
                  <SelectItem value="texpo">Texpo Market</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-muted-foreground">vs</div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Second Market:</label>
              <Select value={selectedMarket2} onValueChange={setSelectedMarket2}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="makola">Makola Market</SelectItem>
                  <SelectItem value="texpo">Texpo Market</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>{selectedMarket1 === 'makola' ? 'Makola Market' : 'Texpo Market'}</TableHead>
                <TableHead>{selectedMarket2 === 'makola' ? 'Makola Market' : 'Texpo Market'}</TableHead>
                <TableHead>Better Deal</TableHead>
                <TableHead>Price Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketCommodities.map((commodity) => {
                const market1Price = selectedMarket1 === 'makola' ? commodity.makolaPrice : commodity.texpoPrice;
                const market2Price = selectedMarket2 === 'makola' ? commodity.makolaPrice : commodity.texpoPrice;
                const betterMarket = getBetterMarket(market1Price, market2Price);
                
                // Calculate price difference
                const price1 = parseFloat(market1Price.replace('₵', '').replace(',', ''));
                const price2 = parseFloat(market2Price.replace('₵', '').replace(',', ''));
                const difference = Math.abs(price1 - price2).toFixed(2);
                
                return (
                  <TableRow key={commodity.name}>
                    <TableCell className="font-medium">{commodity.name}</TableCell>
                    <TableCell className="text-muted-foreground">per {commodity.unit}</TableCell>
                    <TableCell className="font-semibold">{market1Price}</TableCell>
                    <TableCell className="font-semibold">{market2Price}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          betterMarket === "unknown" ? "bg-gray-100 text-gray-800 border-gray-200" :
                          betterMarket === selectedMarket1 ? "bg-green-100 text-green-800 border-green-200" :
                          betterMarket === selectedMarket2 ? "bg-green-100 text-green-800 border-green-200" :
                          "bg-yellow-100 text-yellow-800 border-yellow-200"
                        }
                      >
                        {betterMarket === "unknown" ? "⚪ No Data" :
                         betterMarket === selectedMarket1 ? `🟢 ${selectedMarket1 === 'makola' ? 'Makola' : 'Texpo'}` : 
                         betterMarket === selectedMarket2 ? `🟢 ${selectedMarket2 === 'makola' ? 'Makola' : 'Texpo'}` : 
                         "🟡 Same Price"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {difference === '0.00' ? 'Same' : `₵${difference}`}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Business Insights Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              📊 Your Business Insights
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : commodities.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <div className="text-2xl font-bold text-red-600 mb-1">{highPriority}</div>
                <div className="text-sm font-medium text-red-800 dark:text-red-200">🔴 Urgent Actions</div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">Need immediate attention</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-600 mb-1">{mediumPriority}</div>
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">🟡 Monitor</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Keep an eye on these</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-600 mb-1">{lowPriority}</div>
                <div className="text-sm font-medium text-green-800 dark:text-green-200">🟢 Opportunities</div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">Growth potential</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Start Trading to Get Insights</h3>
              <p className="text-muted-foreground">Record some sales and inventory to see personalized business insights here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tip */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-800 dark:text-yellow-200">💡 Smart Trading Tip</div>
              <p className="text-sm text-muted-foreground mt-1">
                {insights.length > 0 
                  ? insights[0].message.replace(/[🔴🟡🟢⚠️🎯💰]/g, '').trim()
                  : "Start recording your inventory and sales to get personalized trading recommendations!"
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Product Performance */}
      <Card>
        <CardHeader>
          <CardTitle>📈 Your Product Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : commodities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Stock Value</TableHead>
                  <TableHead>Monthly Sales</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commodities.map((commodity) => (
                  <TableRow key={commodity.name}>
                    <TableCell className="font-medium">{commodity.name}</TableCell>
                    <TableCell>{commodity.currentStock} {commodity.unit}s</TableCell>
                    <TableCell>₵{commodity.stockValue.toFixed(2)}</TableCell>
                    <TableCell>₵{commodity.salesThisMonth.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStockStatusIcon(commodity.currentStock)}
                        <span className={`text-sm ${
                          commodity.currentStock === 0 ? 'text-red-600' :
                          commodity.currentStock <= 2 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {commodity.currentStock === 0 ? 'Out of Stock' :
                           commodity.currentStock <= 2 ? 'Low Stock' :
                           'In Stock'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        commodity.salesThisMonth > commodity.averageCost * 5 ? 'default' :
                        commodity.salesThisMonth > 0 ? 'secondary' : 'outline'
                      }>
                        {commodity.salesThisMonth > commodity.averageCost * 5 ? 'Excellent' :
                         commodity.salesThisMonth > 0 ? 'Good' : 'No Sales'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Products Yet</h3>
              <p className="text-muted-foreground">Start by recording some inventory to see your product performance here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Movers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            🚀 Top Movers This Week vs Last Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getTopMovers().map((mover, index) => (
              <div key={mover.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{mover.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {mover.trend === 'up' ? '📈 Rising fast' : '📉 Cheapest in weeks'}
                    </div>
                  </div>
                </div>
                <div className={`text-right ${
                  mover.trend === 'up' ? 'text-red-600' : 'text-green-600'
                }`}>
                  <div className="font-semibold">{mover.priceChange}</div>
                  <div className="text-xs">
                    {mover.trend === 'up' ? 'vs last week' : 'price drop'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Market Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            💡 Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))
            ) : insights.length > 0 ? (
              insights.slice(0, 4).map((insight, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  insight.type === 'stock_low' || insight.type === 'restock_needed' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                  insight.type === 'sales_good' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' :
                  'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                }`}>
                  <div className={`text-sm font-medium ${
                    insight.type === 'stock_low' || insight.type === 'restock_needed' ? 'text-red-800 dark:text-red-200' :
                    insight.type === 'sales_good' ? 'text-green-800 dark:text-green-200' :
                    'text-blue-800 dark:text-blue-200'
                  }`}>
                    {insight.product}:
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {insight.message.replace(/[🔴🟡🟢⚠️🎯💰]/g, '').trim()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Insights Yet</h3>
                <p className="text-muted-foreground">Record sales and inventory data to get personalized market insights.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Linkages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            🔗 Inventory Linkages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {commodities.map((commodity) => {
              const recommendation = getInventoryRecommendation(commodity);
              if (!recommendation) return null;
              
              return (
                <div key={commodity.name} className={`p-3 rounded-lg border ${
                  recommendation.type === 'urgent' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                  recommendation.type === 'warning' ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800' :
                  recommendation.type === 'good' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' :
                  recommendation.type === 'opportunity' ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' :
                  'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {recommendation.type === 'urgent' && <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />}
                    {recommendation.type === 'opportunity' && <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />}
                    {recommendation.type === 'good' && <TrendingDown className="w-4 h-4 text-green-600 mt-0.5" />}
                    <div>
                      <div className="font-medium text-sm">{commodity.name}:</div>
                      <div className="text-sm text-muted-foreground">{recommendation.message}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeIndexMain;