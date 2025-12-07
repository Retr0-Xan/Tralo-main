import {
  Coins,
  Package,
  ShoppingCart,
  FileBarChart,
  TrendingUp,
  Bell,
  Receipt,
  LayoutDashboard,
  DollarSign,
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
  const { todaysSales, monthlyGoodsTraded, currentStockValue, monthlyProfit, loading } = useHomeMetrics();

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

      <section className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          title="Monthly Profit"
          value={loading ? "Calculating…" : formatCurrency(Math.round(monthlyProfit), "¢")}
          icon={DollarSign}
          helperText="Revenue minus cost of goods"
        />
        <MetricCard
          title="Avg. Daily Revenue"
          value={loading ? "Updating…" : formatCurrency(Math.round(averageDailySales), "¢")}
          icon={TrendingUp}
          helperText="Month-to-date performance"
        />
      </section>

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-7">
        <div className="space-y-4 sm:space-y-6 lg:col-span-4">
          <Card className="rounded-xl sm:rounded-2xl border border-border/70">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Executive Snapshot</CardTitle>
              <CardDescription className="text-sm">Monitor real-time market signals and performance insights.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              <MarketTip />
              <div className="rounded-xl sm:rounded-2xl border border-dashed border-border/70 bg-muted/20 p-3 sm:p-4 text-sm text-muted-foreground">
                Keep an eye on suppliers with delayed restocks and prioritize high-demand items for replenishment.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl sm:rounded-2xl border border-border/70">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Trade Index Highlights</CardTitle>
              <CardDescription className="text-sm">Latest intelligence from your watchlist and sector benchmarks.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <TradeIndexInsights />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 sm:space-y-6 lg:col-span-3">
          <Card className="rounded-xl sm:rounded-2xl border border-border/70">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
              <CardDescription className="text-sm">Launch operational workflows in a single click.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6">
              <ActionButton label="Record Sale" icon={ShoppingCart} onClick={() => navigate("/sales")}
                variant="primary"
              />
              <ActionButton
                label="Record Expense"
                icon={Receipt}
                variant="secondary"
                onClick={() => navigate("/expenses")}
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

          <Card className="rounded-xl sm:rounded-2xl border border-border/70">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Customer Engagement</CardTitle>
              <CardDescription className="text-sm">Share your smart QR code and track trust performance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
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
