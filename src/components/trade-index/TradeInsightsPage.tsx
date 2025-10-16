import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Lightbulb, RefreshCw, Loader2, TrendingUp, PackageOpen, LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTradeIndexData } from "@/hooks/useTradeIndexData";
import { useMarketTips } from "@/hooks/useMarketTips";
import TradeIndexInsights from "./TradeIndexInsights";

const TradeInsightsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { commodities, insights: generatedInsights, loading, refreshData } = useTradeIndexData();
  const { currentTip, getTipIcon, getTipColor } = useMarketTips();
  const [analyzing, setAnalyzing] = useState(false);

  const triggerInventoryAnalysis = async () => {
    if (!user) return;

    setAnalyzing(true);
    try {
      toast({
        title: "Checking your inventory...",
        description: "Getting fresh insights for your business",
      });

      const { error } = await supabase.functions.invoke("supply-chain-analyzer", {
        body: { user_id: user.id },
      });

      if (error) throw error;

      await refreshData();

      toast({
        title: "Analysis done!",
        description: "Your data has been refreshed",
      });
    } catch (error) {
      console.error("Error analyzing inventory:", error);
      toast({
        title: "Error",
        description: "Could not analyze inventory. Try again later.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const prioritizedInsights = useMemo(() => {
    const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...generatedInsights]
      .sort((a, b) => (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3))
      .slice(0, 5);
  }, [generatedInsights]);

  const topPerformers = useMemo(() => {
    return [...commodities]
      .filter((item) => item.salesThisMonth > 0)
      .sort((a, b) => b.salesThisMonth - a.salesThisMonth)
      .slice(0, 3);
  }, [commodities]);

  const watchlistProducts = useMemo(() => {
    const freshnessThreshold = new Date();
    freshnessThreshold.setDate(freshnessThreshold.getDate() - 14);

    return [...commodities]
      .filter((item) => item.currentStock > 0 && (!item.lastSaleDate || new Date(item.lastSaleDate) < freshnessThreshold))
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 3);
  }, [commodities]);

  const inventoryLinkages = useMemo(() => {
    const results: { title: string; detail: string; tone: "risk" | "watch" | "positive" }[] = [];

    commodities.forEach((item) => {
      if (item.currentStock === 0) {
        results.push({
          title: `${item.name} out of stock`,
          detail: "Customers cannot purchase this product until you restock.",
          tone: "risk",
        });
        return;
      }

      if (item.currentStock <= 2 && item.salesThisMonth > (item.averageCost || 0) * 5) {
        results.push({
          title: `High demand + low stock: ${item.name}`,
          detail: "Sales are accelerating faster than supply. Plan a restock immediately.",
          tone: "risk",
        });
        return;
      }

      if (item.currentStock > 0 && item.salesThisMonth === 0) {
        results.push({
          title: `${item.name} is tying up cash`,
          detail: "Stock is available but not moving. Consider a promotion or bundle.",
          tone: "watch",
        });
        return;
      }

      if (item.salesThisMonth > (item.averageCost || 0) * 8) {
        results.push({
          title: `${item.name} driving revenue`,
          detail: "Strong sales activity suggests room to expand assortment or raise price.",
          tone: "positive",
        });
      }
    });

    return results.slice(0, 4);
  }, [commodities]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Trade Intelligence Hub
            </CardTitle>
            <CardDescription>
              Personalized tips, market signals, and supply chain linkages generated from your live business data.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={triggerInventoryAnalysis} disabled={analyzing}>
            {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Analyze Now
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-44 rounded-xl border border-dashed border-border/60 bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Smart Trading Tip
                  </CardTitle>
                  <CardDescription>AI-generated recommendations based on today&apos;s sales and inventory flow.</CardDescription>
                </CardHeader>
                <CardContent>
                  {currentTip ? (
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {getTipIcon(currentTip.type)} {currentTip.title}
                      </p>
                      <p className={`mt-2 text-sm leading-relaxed ${getTipColor(currentTip.type)}`}>
                        {currentTip.message}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Rotating tips update automatically as new sales roll in.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No tip available yet. Record sales or run an analysis to unlock personalized guidance.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Business Insights
                  </CardTitle>
                  <CardDescription>High-priority signals generated from your current product mix.</CardDescription>
                </CardHeader>
                <CardContent>
                  {prioritizedInsights.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No business alerts yet. Once your store records activity, recommendations will show up here.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {prioritizedInsights.map((insight) => (
                        <div key={`${insight.product}-${insight.type}`} className="rounded-lg border border-border/60 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{insight.product}</p>
                            <Badge
                              variant={
                                insight.priority === "high" ? "destructive" : insight.priority === "medium" ? "default" : "secondary"
                              }
                            >
                              {insight.priority}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{insight.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PackageOpen className="h-4 w-4 text-primary" />
                    Product Performance
                  </CardTitle>
                  <CardDescription>Compare the products pushing revenue versus those needing attention.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Top Movers</p>
                      <Separator className="my-2" />
                      {topPerformers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No sales recorded this month.</p>
                      ) : (
                        <div className="space-y-2">
                          {topPerformers.map((item, index) => (
                            <div key={`top-${item.name}-${index}`} className="rounded-lg border border-border/50 p-2">
                              <p className="text-sm font-semibold text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground">Sales this month: ¢{item.salesThisMonth.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Watchlist</p>
                      <Separator className="my-2" />
                      {watchlistProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No slow-moving inventory detected.</p>
                      ) : (
                        <div className="space-y-2">
                          {watchlistProducts.map((item, index) => (
                            <div key={`watch-${item.name}-${index}`} className="rounded-lg border border-border/50 p-2">
                              <p className="text-sm font-semibold text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground">In stock: {item.currentStock} • Sales this month: ¢{item.salesThisMonth.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    Inventory Linkages
                  </CardTitle>
                  <CardDescription>Connect product supply with real-time demand signals.</CardDescription>
                </CardHeader>
                <CardContent>
                  {inventoryLinkages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No critical linkages detected. Keep selling to unlock deeper supply chain insights.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {inventoryLinkages.map((item, index) => (
                        <div
                          key={`link-${item.title}-${index}`}
                          className={`rounded-lg border p-3 ${item.tone === "risk"
                              ? "border-destructive/40 bg-destructive/10 text-destructive"
                              : item.tone === "positive"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                        >
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="text-xs leading-relaxed">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <TradeIndexInsights
        title="Market Insights"
        description="Live intelligence generated from the trade_insights table and supply-chain analyzer."
        showAnalyzeButton={false}
      />
    </div>
  );
};

export default TradeInsightsPage;
