import { useState } from "react";
import { TrendingUp, Eye, Lightbulb, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import TradeIndexMain from "@/components/trade-index/TradeIndexMain";
import TradeIndexWatchlist from "@/components/trade-index/TradeIndexWatchlist";
import TradeInsightsPage from "@/components/trade-index/TradeInsightsPage";

const TradeIndex = () => {
  const [activeTab, setActiveTab] = useState<"index" | "watchlist" | "insights">("index");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Radar}
        title="Trade Index Intelligence"
        description="Monitor market movements, watchlist signals, and AI-generated insights."
      />

      <Card className="rounded-2xl border border-border/70">
        <div className="flex flex-wrap gap-2 border-b border-border/60 bg-muted/30 p-2">
          <Button
            size="sm"
            variant={activeTab === "index" ? "default" : "ghost"}
            onClick={() => setActiveTab("index")}
            className="rounded-xl px-4 py-2"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Trade Index
          </Button>
          <Button
            size="sm"
            variant={activeTab === "watchlist" ? "default" : "ghost"}
            onClick={() => setActiveTab("watchlist")}
            className="rounded-xl px-4 py-2"
          >
            <Eye className="mr-2 h-4 w-4" />
            Watchlist
          </Button>
          <Button
            size="sm"
            variant={activeTab === "insights" ? "default" : "ghost"}
            onClick={() => setActiveTab("insights")}
            className="rounded-xl px-4 py-2"
          >
            <Lightbulb className="mr-2 h-4 w-4" />
            Trade Insights
          </Button>
        </div>
        <CardContent className="px-4 py-6 md:px-6 space-y-6">
          {activeTab === "index" && <TradeIndexMain />}
          {activeTab === "watchlist" && <TradeIndexWatchlist />}
          {activeTab === "insights" && <TradeInsightsPage />}
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeIndex;