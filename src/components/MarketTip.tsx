import { TrendingUp, Loader2 } from "lucide-react";
import { useMarketTips } from "@/hooks/useMarketTips";

const MarketTip = () => {
  const { currentTip, getTipIcon, getTipColor } = useMarketTips();

  if (!currentTip) {
    return (
      <div className="bg-card hover:bg-card-hover border border-border rounded-xl p-6 shadow-card transition-all duration-300">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-muted rounded-lg mb-4">
          <Loader2 className="w-6 h-6 text-foreground animate-spin" />
        </div>
        <h3 className="text-card-foreground/80 text-sm font-medium mb-2">Market Tip</h3>
        <p className="text-card-foreground text-lg font-semibold leading-relaxed">
          Loading market insights...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card hover:bg-card-hover border border-border rounded-xl p-6 shadow-card transition-all duration-300">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-muted rounded-lg mb-4">
        <TrendingUp className="w-6 h-6 text-foreground" />
      </div>
      <h3 className="text-card-foreground/80 text-sm font-medium mb-2">
        {getTipIcon(currentTip.type)} {currentTip.title}
      </h3>
      <p className={`text-lg font-semibold leading-relaxed ${getTipColor(currentTip.type)}`}>
        {currentTip.message}
      </p>
      <div className="mt-3 text-xs text-muted-foreground">
        Based on current market trends • Updates every 10s
      </div>
    </div>
  );
};

export default MarketTip;