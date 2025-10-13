import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, DollarSign, X, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToSalesDataUpdates } from "@/lib/sales-events";

const ClientValueRatioDisplay = () => {
  const { user } = useAuth();
  const [ratioData, setRatioData] = useState({
    clientCount: 0,
    totalSalesValue: 0,
    ratio: 0
  });
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const calculateRatio = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!businessProfile) {
        setLoading(false);
        return;
      }

      const { data: sales } = await supabase
        .from('customer_purchases')
        .select('customer_phone, amount')
        .eq('business_id', businessProfile.id)
        .gte('purchase_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (sales) {
        const filteredSales = sales.filter((sale) => Number(sale.amount) > 0);

        const uniqueCustomers = filteredSales.length;
        const totalValue = filteredSales.reduce((sum, sale) => sum + Number(sale.amount), 0);
        const ratio = uniqueCustomers > 0 ? totalValue / uniqueCustomers : 0;

        setRatioData({
          clientCount: uniqueCustomers,
          totalSalesValue: totalValue,
          ratio: ratio
        });

        await supabase
          .from('client_value_ratios')
          .upsert({
            user_id: user.id,
            date: new Date().toISOString().split('T')[0],
            client_count: uniqueCustomers,
            total_sales_value: totalValue,
            ratio: ratio
          }, {
            onConflict: 'user_id,date'
          });
      }
    } catch (error) {
      console.error('Error calculating client-value ratio:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    calculateRatio();
  }, [calculateRatio]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const unsubscribe = subscribeToSalesDataUpdates(() => {
      calculateRatio();
    });
    return unsubscribe;
  }, [user, calculateRatio]);

  const getRatioColor = (ratio: number) => {
    if (ratio >= 100) return "text-emerald-600 dark:text-emerald-400";
    if (ratio >= 50) return "text-green-600 dark:text-green-400";
    if (ratio >= 25) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRatioLabel = (ratio: number) => {
    if (ratio >= 100) return "Excellent";
    if (ratio >= 50) return "Good";
    if (ratio >= 25) return "Fair";
    return "Needs Improvement";
  };

  if (!isVisible) return null;

  if (loading) {
    return (
      <Card className="fixed bottom-4 left-4 w-72 md:w-80 bg-background/95 backdrop-blur-sm border shadow-lg z-40">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 left-4 z-40 rounded-full w-12 h-12 p-0"
        variant="default"
      >
        <TrendingUp className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 w-72 md:w-80 bg-background/95 backdrop-blur-sm border shadow-lg z-40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Client-Value Ratio</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={getRatioColor(ratioData.ratio)}>
              {getRatioLabel(ratioData.ratio)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsVisible(false)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Clients</div>
              <div className="font-semibold">{ratioData.clientCount}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Sales</div>
              <div className="font-semibold">¢{ratioData.totalSalesValue.toFixed(0)}</div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Avg per Client:</span>
            <span className={`font-bold text-lg ${getRatioColor(ratioData.ratio)}`}>
              ¢{ratioData.ratio.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Last 30 days • <span className="text-primary">Powered by Tralo</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientValueRatioDisplay;