import {
  Coins,
  Package,
  ShoppingCart,
  FileBarChart,
  TrendingUp,
  Bell,
  Receipt,
  LayoutDashboard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MetricCard from "@/components/MetricCard";
import MarketTip from "@/components/MarketTip";
import ActionButton from "@/components/ActionButton";
import QRCodeSection from "@/components/QRCodeSection";
import TradeIndexInsights from "@/components/trade-index/TradeIndexInsights";
import { useHomeMetrics } from "@/hooks/useHomeMetrics";
import { useAuth } from "@/hooks/useAuth";
import TrustScoreBadge from "@/components/TrustScoreBadge";
import { PageHeader } from "@/components/layout/PageHeader";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { todaysSales, monthlyGoodsTraded, currentStockValue, loading } = useHomeMetrics();

  const formatCurrency = (amount: number, currency: string = "¢") => {
    return `${currency}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const ownerName = user?.user_metadata?.owner_name || user?.email?.split("@")[0] || "there";
  const averageDailySales = monthlyGoodsTraded > 0 ? monthlyGoodsTraded / new Date().getDate() : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description={`Welcome back, ${ownerName}. Review today's performance and next steps.`}
        actions={<TrustScoreBadge size="md" />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Today's Sales"
          value={loading ? "Updating…" : formatCurrency(todaysSales, "¢")}
          icon={Coins}
          helperText="Cash & digital channels"
        />
        <MetricCard
          title="Goods Traded (Month)"
          value={loading ? "Updating…" : formatCurrency(monthlyGoodsTraded, "¢")}
          icon={ShoppingCart}
          helperText="Inclusive of wholesales"
        />
        <MetricCard
          title="Current Stock Value"
          value={loading ? "Calculating…" : formatCurrency(currentStockValue)}
          icon={Package}
          helperText="Based on inventory records"
        />
        <MetricCard
          title="Avg. Daily Revenue"
          value={loading ? "Updating…" : formatCurrency(Math.round(averageDailySales), "¢")}
          icon={TrendingUp}
          helperText="Month-to-date performance"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-7">
        <div className="space-y-6 lg:col-span-4">
          <Card className="rounded-2xl border border-border/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Executive Snapshot</CardTitle>
              <CardDescription>Monitor real-time market signals and performance insights.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MarketTip />
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                Keep an eye on suppliers with delayed restocks and prioritize high-demand items for replenishment.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Trade Index Highlights</CardTitle>
              <CardDescription>Latest intelligence from your watchlist and sector benchmarks.</CardDescription>
            </CardHeader>
            <CardContent>
              <TradeIndexInsights />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <Card className="rounded-2xl border border-border/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Quick Actions</CardTitle>
              <CardDescription>Launch operational workflows in a single click.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ActionButton label="Record Sale" icon={ShoppingCart} onClick={() => navigate("/sales")}
                variant="primary"
              />
              <ActionButton
                label="Record Expense"
                icon={Receipt}
                variant="secondary"
                onClick={() => navigate("/sales?tab=expenses")}
              />
              <ActionButton
                label="Business Reminders"
                icon={Bell}
                variant="secondary"
                onClick={() => navigate("/reminders")}
              />
              <ActionButton
                label="Daily Sales Summary"
                icon={FileBarChart}
                variant="secondary"
                onClick={() => navigate("/sales?tab=summary")}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Customer Engagement</CardTitle>
              <CardDescription>Share your smart QR code and track trust performance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4">
                <p className="text-sm font-medium text-foreground">Digital Trust Score</p>
                <div className="mt-2"><TrustScoreBadge size="lg" /></div>
              </div>
              <QRCodeSection />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
