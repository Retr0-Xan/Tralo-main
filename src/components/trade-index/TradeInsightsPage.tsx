import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign,
  RefreshCw,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTradeIndexData } from "@/hooks/useTradeIndexData";

interface TradeInsight {
  id: string;
  product_name: string;
  insight_type: string;
  message: string;
  priority: string;
  is_read: boolean;
  created_at: string;
}

const TradeInsightsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { commodities, insights: tradeInsights, loading: tradeLoading, refreshData } = useTradeIndexData();
  const [insights, setInsights] = useState<TradeInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, [user]);

  const fetchInsights = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('trade_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setInsights(data || []);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerInventoryAnalysis = async () => {
    if (!user) return;
    
    setAnalyzing(true);
    try {
      toast({
        title: "Checking your inventory...",
        description: "Getting fresh insights for your business",
      });

      const { error } = await supabase.functions.invoke('supply-chain-analyzer', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      await fetchInsights();
      await refreshData();
      
      toast({
        title: "Analysis done!",
        description: "Your insights have been updated",
      });
    } catch (error) {
      console.error('Error analyzing inventory:', error);
      toast({
        title: "Error",
        description: "Could not analyze inventory. Try again later.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const markAsRead = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('trade_insights')
        .update({ is_read: true })
        .eq('id', insightId);

      if (error) throw error;

      setInsights(prev => prev.map(insight => 
        insight.id === insightId ? { ...insight, is_read: true } : insight
      ));

      toast({
        title: "Noted!",
        description: "Insight marked as read",
      });
    } catch (error) {
      console.error('Error marking insight as read:', error);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'low_stock': return AlertTriangle;
      case 'high_sales': return TrendingUp;
      case 'slow_movement': return TrendingDown;
      case 'price_optimization': return DollarSign;
      case 'restock_needed': return Package;
      default: return Lightbulb;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-green-100 text-green-800 border-green-200"
    };
    
    return (
      <Badge variant="outline" className={colors[priority as keyof typeof colors] || colors.medium}>
        {priority}
      </Badge>
    );
  };

  if (loading || tradeLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              💡 Your Business Insights
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={triggerInventoryAnalysis}
              disabled={analyzing}
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Analyze Now
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Get smart insights about your products, sales patterns, and inventory levels to make better business decisions.
          </p>
        </CardContent>
      </Card>

      {/* Product Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            📊 Your Product Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commodities.length > 0 ? (
              commodities.slice(0, 5).map((commodity, index) => (
                <div key={index} className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{commodity.name}</h4>
                    <Badge variant={commodity.currentStock > 10 ? "default" : "destructive"}>
                      {commodity.currentStock} in stock
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Avg Cost:</span>
                      <span className="ml-2 font-medium">¢{commodity.averageCost.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stock Value:</span>
                      <span className="ml-2 font-medium">¢{commodity.stockValue.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Sales:</span>
                      <span className="ml-2 font-medium">{commodity.totalSales} units</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">This Month:</span>
                      <span className="ml-2 font-medium">{commodity.salesThisMonth} units</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Start selling products to see performance insights</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Market Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            📈 Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tradeInsights.length > 0 ? (
              tradeInsights.map((insight, index) => (
                <div 
                  key={index}
                  className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                >
                  <p className="text-sm text-blue-800 dark:text-blue-200">{insight.message}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No market insights available yet. Record more sales to see trends.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Linkages & Trade Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            🔗 Inventory & Trade Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-4">
              {insights.map((insight) => {
                const Icon = getInsightIcon(insight.insight_type);
                return (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      insight.is_read 
                        ? 'bg-muted/30 border-border' 
                        : 'bg-muted border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{insight.product_name}</h4>
                          {getPriorityBadge(insight.priority)}
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                          {!insight.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(insight.id)}
                            >
                              Mark as Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No insights yet. Click "Analyze Now" to check your inventory.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeInsightsPage;
