import { useState } from "react";
import { TrendingUp, Eye, Lightbulb, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import TradeIndexMain from "@/components/trade-index/TradeIndexMain";
import TradeIndexWatchlist from "@/components/trade-index/TradeIndexWatchlist";
import TradeInsightsPage from "@/components/trade-index/TradeInsightsPage";

const TradeIndex = () => {
  const [activeTab, setActiveTab] = useState<"index" | "watchlist" | "insights">("index");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="p-6 pt-12">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-6">Trade Index</h1>
        
        {/* Toggle Bar */}
        <div className="flex bg-muted rounded-lg p-1 mb-6">
          <Button
            variant={activeTab === "index" ? "default" : "ghost"}
            onClick={() => setActiveTab("index")}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Trade Index
          </Button>
          <Button
            variant={activeTab === "watchlist" ? "default" : "ghost"}
            onClick={() => setActiveTab("watchlist")}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Watchlist
          </Button>
          <Button
            variant={activeTab === "insights" ? "default" : "ghost"}
            onClick={() => setActiveTab("insights")}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            Trade Insights
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 space-y-6">
        {activeTab === "index" && <TradeIndexMain />}
        {activeTab === "watchlist" && <TradeIndexWatchlist />}
        {activeTab === "insights" && <TradeInsightsPage />}
      </div>
    </div>
  );
};

export default TradeIndex;