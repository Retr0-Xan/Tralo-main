import { Coins, Package, ShoppingCart, FileBarChart, User, Bell, Receipt } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import MarketTip from "@/components/MarketTip";
import ActionButton from "@/components/ActionButton";
import Navigation from "@/components/Navigation";
import QRCodeSection from "@/components/QRCodeSection";
import TradeIndexInsights from "@/components/trade-index/TradeIndexInsights";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TraloLogo from "@/components/TraloLogo";
import { useHomeMetrics } from "@/hooks/useHomeMetrics";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import TrustScoreBadge from "@/components/TrustScoreBadge";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { todaysSales, monthlyGoodsTraded, currentStockValue, loading } = useHomeMetrics();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const formatCurrency = (amount: number, currency: string = "¢") => {
    return `${currency}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pt-12">
        <div className="flex flex-col gap-2">
          <TraloLogo />
          <h2 className="text-2xl font-semibold text-foreground">
            Hello, {user?.user_metadata?.owner_name || user?.email?.split('@')[0] || 'there'}
          </h2>
          <TrustScoreBadge size="md" />
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Profile
          </Button>
          <QRCodeSection />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <MetricCard
            title="Today's Sales"
            value={loading ? "..." : formatCurrency(todaysSales, "¢")}
            icon={Coins}
            iconBg="bg-accent text-accent-foreground"
          />
          <MetricCard
            title="Total Goods Traded (This Month)"
            value={loading ? "..." : formatCurrency(monthlyGoodsTraded, "¢")}
            icon={ShoppingCart}
            iconBg="bg-green-500 text-white"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 mb-6">
          <MetricCard
            title="Current Stock Value"
            value={loading ? "..." : formatCurrency(currentStockValue)}
            icon={Package}
            iconBg="bg-blue-500 text-white"
          />
        </div>
        
        <MarketTip />
      </div>

      {/* Action Buttons */}
      <div className="px-6 space-y-4 mb-8">
        <ActionButton
          label="Record Sale"
          icon={ShoppingCart}
          variant="primary"
          onClick={() => navigate("/sales")}
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
          label="Daily Trade Sales Summary"
          icon={FileBarChart}
          variant="secondary"
          onClick={() => navigate("/sales?tab=summary")}
        />
      </div>

      {/* Navigation */}
      <Navigation />
    </div>
  );
};

export default Index;
