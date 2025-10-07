import { TrendingUp, Loader2 } from "lucide-react";
import { useMarketTips } from "@/hooks/useMarketTips";

const MarketTip = () => {
  const { currentTip, getTipIcon, getTipColor } = useMarketTips();

  if (!currentTip) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Market Intelligence</p>
            <p className="text-xs text-muted-foreground">Fetching actionable insights…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="pointer-events-none absolute -right-10 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Market Intelligence</p>
          <h3 className="mt-1 text-base font-semibold text-foreground md:text-lg">
            {getTipIcon(currentTip.type)} {currentTip.title}
          </h3>
          <p className={`mt-3 text-sm leading-relaxed md:text-base ${getTipColor(currentTip.type)}`}>
            {currentTip.message}
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
            Updated every 10 seconds • Powered by Tralo insights
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketTip;