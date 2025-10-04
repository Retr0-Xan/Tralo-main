import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Bell,
  Star,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWatchlistData } from "@/hooks/useWatchlistData";
import ProductRequestForm from "@/components/forms/ProductRequestForm";

const TradeIndexWatchlist = () => {
  const { toast } = useToast();
  const { 
    watchlistItems, 
    availableProducts, 
    loading, 
    addToWatchlist, 
    removeFromWatchlist, 
    toggleAlert, 
    refreshData 
  } = useWatchlistData();

  const handleRemoveFromWatchlist = (id: string) => {
    removeFromWatchlist(id);
    toast({
      title: "🗑️ Removed from Watchlist",
      description: "Item has been removed from your watchlist.",
    });
  };

  const handleToggleAlert = (id: string) => {
    toggleAlert(id);
    toast({
      title: "🔔 Alert Updated", 
      description: "Price alert settings have been updated.",
    });
  };

  const handleAddToWatchlist = (product: any) => {
    addToWatchlist(product.name, product.currentPrice * 0.9); // 10% lower target
    toast({
      title: "⭐ Added to Watchlist",
      description: `${product.name} has been added to your watchlist.`,
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-red-600" />;
      case "down": return <TrendingDown className="w-4 h-4 text-green-600" />;
      case "flat": return <Minus className="w-4 h-4 text-yellow-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
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

  const getTargetStatus = (current: string, target: string) => {
    const currentVal = parseFloat(current.replace('₵', '').replace(',', ''));
    const targetVal = parseFloat(target.replace('₵', '').replace(',', ''));
    
    if (targetVal === 0) return { status: "not-set", text: "Set target", color: "gray" };
    if (currentVal <= targetVal) return { status: "reached", text: "Target reached!", color: "green" };
    if (currentVal > targetVal * 1.1) return { status: "far", text: "Far from target", color: "red" };
    return { status: "close", text: "Close to target", color: "yellow" };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Watchlist</h2>
          <p className="text-muted-foreground">Track prices for your key products</p>
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
      </div>

      {/* Active Alerts Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            📢 Active Price Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {watchlistItems.filter(item => item.alert_enabled).length}
              </div>
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Active Alerts</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {watchlistItems.filter(item => {
                  const target = getTargetStatus(`₵${item.current_price}`, `₵${item.target_price}`);
                  return target.status === "reached";
                }).length}
              </div>
              <div className="text-sm font-medium text-green-800 dark:text-green-200">Targets Reached</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {watchlistItems.filter(item => item.current_price > item.target_price).length}
              </div>
              <div className="text-sm font-medium text-orange-800 dark:text-orange-200">Above Target</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Watchlist Table */}
      <Card>
        <CardHeader>
          <CardTitle>⭐ Your Watchlist</CardTitle>
        </CardHeader>
        <CardContent>
          {watchlistItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commodity</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Target Price</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alert</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlistItems.map((item) => {
                  const targetStatus = getTargetStatus(`₵${item.current_price}`, `₵${item.target_price}`);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-sm text-muted-foreground">per unit</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">₵{item.current_price.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>₵{item.target_price.toFixed(2)}</div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              targetStatus.color === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
                              targetStatus.color === 'red' ? 'bg-red-100 text-red-800 border-red-200' :
                              targetStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-gray-100 text-gray-800 border-gray-200'
                            }`}
                          >
                            {targetStatus.text}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTrendIcon('flat')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Active</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAlert(item.id)}
                          className={item.alert_enabled ? "text-blue-600" : "text-gray-400"}
                        >
                          <Bell className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFromWatchlist(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No items in watchlist</h3>
              <p className="text-gray-600 dark:text-gray-400">Add commodities below to start tracking prices</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add to Watchlist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            ➕ Add to Watchlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availableProducts.filter(product => 
                  !watchlistItems.some(watchItem => watchItem.product_name === product.name)
                ).map((product) => (
                  <div key={product.name} className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">per unit</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">₵{product.currentPrice.toFixed(2)}</div>
                        {product.priceChange !== 0 && (
                          <div className={`text-xs ${
                            product.trend === 'up' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {product.trend === 'up' ? '+' : ''}₵{product.priceChange.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleAddToWatchlist(product)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Watchlist
                    </Button>
                  </div>
                ))}
              </div>
              
              {availableProducts.filter(product => 
                !watchlistItems.some(watchItem => watchItem.product_name === product.name)
              ).length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Products Available</h3>
                  <p className="text-gray-600 dark:text-gray-400">Start recording sales to see products you can track</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Price Alert Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            💡 Alert Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                📱 Set target prices to get notified when it's the right time to buy
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                🎯 Use historical low prices as your target for maximum savings
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⏰ Check your watchlist daily to catch the best deals
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Request Form */}
      <ProductRequestForm />
    </div>
  );
};

export default TradeIndexWatchlist;