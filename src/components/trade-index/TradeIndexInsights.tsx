import { useState, useEffect } from "react";
import { TrendingUp, AlertTriangle, TrendingDown, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TradeInsight {
  id: string;
  product_name: string;
  insight_type: string;
  message: string;
  priority: string;
  is_read: boolean;
  created_at: string;
}

interface TradeIndexInsightsProps {
  title?: string;
  description?: string;
  showAnalyzeButton?: boolean;
}

const TradeIndexInsights = ({
  title = "Trade & Inventory Insights",
  description = "Market intelligence and inventory flow analysis based on your business data",
  showAnalyzeButton = true,
}: TradeIndexInsightsProps) => {
  const [insights, setInsights] = useState<TradeInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchInsights();

      // Set up real-time updates for insights
      const channel = supabase
        .channel('trade-insights-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trade_insights',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Real-time insight update:', payload);
            fetchInsights(); // Refresh insights when changes occur
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const triggerInventoryAnalysis = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to analyze inventory",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Analyzing inventory...",
        description: "Generating fresh insights based on your inventory flow",
      });

      const { data, error } = await supabase.functions.invoke('supply-chain-analyzer', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Analysis complete",
          description: `Generated ${data.insights?.length || 0} new inventory insights`,
        });

        // Refresh insights after analysis
        fetchInsights();
      }
    } catch (error) {
      console.error('Error triggering inventory analysis:', error);
      toast({
        title: "Error",
        description: "Failed to analyze inventory. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchInsights = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

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
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('trade_insights')
        .update({ is_read: true })
        .eq('id', insightId);

      if (error) throw error;

      setInsights(prev =>
        prev.map(insight =>
          insight.id === insightId
            ? { ...insight, is_read: true }
            : insight
        )
      );

      toast({
        title: "Insight marked as read",
        description: "The insight has been marked as read successfully.",
      });
    } catch (error) {
      console.error('Error marking insight as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark insight as read.",
        variant: "destructive",
      });
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'stock_advice':
      case 'low_stock_warning':
      case 'reorder_suggestion':
        return <TrendingUp className="w-5 h-5" />;
      case 'price_alert':
      case 'stockout_alert':
        return <AlertTriangle className="w-5 h-5" />;
      case 'demand_change':
      case 'slow_moving':
        return <TrendingDown className="w-5 h-5" />;
      case 'high_demand':
      case 'profit_driver':
      case 'achievement_unlocked':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trade Index Insights</CardTitle>
          <CardDescription>Loading market insights...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
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
            <TrendingUp className="w-5 h-5" />
            {title}
          </div>
          {showAnalyzeButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={triggerInventoryAnalysis}
            >
              Analyze Inventory
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No insights available yet.</p>
              <p className="text-sm">Record some sales and inventory changes to get personalized insights.</p>
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={triggerInventoryAnalysis}
                >
                  Generate Insights
                </Button>
              )}
            </div>
          ) : (
            insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border transition-all ${insight.is_read ? 'bg-muted/50' : 'bg-background border-primary/20'
                  }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-full ${insight.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                        insight.priority === 'medium' ? 'bg-orange-100 text-orange-600' :
                          'bg-muted text-muted-foreground'
                      }`}>
                      {getInsightIcon(insight.insight_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{insight.product_name}</h4>
                        <Badge variant={getPriorityColor(insight.priority) as any}>
                          {insight.priority}
                        </Badge>
                        {!insight.is_read && (
                          <Badge variant="outline">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {insight.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(insight.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  {!insight.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(insight.id)}
                    >
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeIndexInsights;