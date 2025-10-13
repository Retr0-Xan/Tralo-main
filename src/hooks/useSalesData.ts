import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { subscribeToSalesDataUpdates } from "@/lib/sales-events";
import {
  fetchSalesAnalytics,
  sumEffectiveAmount,
  sumEffectiveQuantity
} from "@/lib/sales-analytics";

interface SalesMetrics {
  todaySales: string;
  weekSales: string;
  monthSales: string;
  itemsSoldToday: number;
  bestSellerWeek: { product: string; quantity: number };
  slowSellerWeek: { product: string; quantity: number };
}

interface CashFlow {
  totalCash: string;
  pending: string;
  debtCleared: string;
}

interface SalesBreakdownItem {
  item: string;
  unitsSold: number;
  revenue: string;
  status: string;
}

interface SalesTrend {
  product: string;
  trend: string;
  isPositive: boolean | null;
}

interface TradeInsight {
  message: string;
  product_name: string;
  insight_type: string;
  priority: string;
}

export const useSalesData = () => {
  const { user } = useAuth();
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    todaySales: "0.00",
    weekSales: "0.00",
    monthSales: "0.00",
    itemsSoldToday: 0,
    bestSellerWeek: { product: "No sales", quantity: 0 },
    slowSellerWeek: { product: "No sales", quantity: 0 }
  });
  const [cashFlow, setCashFlow] = useState<CashFlow>({
    totalCash: "0.00",
    pending: "0.00",
    debtCleared: "0.00"
  });
  const [salesBreakdown, setSalesBreakdown] = useState<SalesBreakdownItem[]>([]);
  const [salesTrends, setSalesTrends] = useState<SalesTrend[]>([]);
  const [tradeInsights, setTradeInsights] = useState<TradeInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (amount: number): string => {
    return amount.toFixed(2);
  };

  const getProductStatus = (quantity: number, revenue: number): string => {
    if (quantity >= 20) return "Fast Mover";
    if (quantity >= 10) return "Stable";
    if (quantity >= 5) return "Running Low";
    if (quantity >= 2) return "Slow Mover";
    return "Very Slow";
  };

  const fetchSalesData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastWeekEnd = new Date(weekStart.getTime() - 1);

      const allSales = await fetchSalesAnalytics(user.id, { includeReversed: false });

      if (allSales.length === 0) {
        setSalesMetrics({
          todaySales: "0.00",
          weekSales: "0.00",
          monthSales: "0.00",
          itemsSoldToday: 0,
          bestSellerWeek: { product: "No sales", quantity: 0 },
          slowSellerWeek: { product: "No sales", quantity: 0 }
        });
        setCashFlow({ totalCash: "0.00", pending: "0.00", debtCleared: "0.00" });
        setSalesBreakdown([]);
        setSalesTrends([]);
        return;
      }

      // Calculate today's sales
      const todaySales = allSales.filter((sale) =>
        new Date(sale.purchase_date) >= todayStart
      );
      const todayRevenue = sumEffectiveAmount(todaySales);
      const todayItemsSold = sumEffectiveQuantity(todaySales);

      // Calculate week's sales
      const weekSales = allSales.filter((sale) =>
        new Date(sale.purchase_date) >= weekStart
      );
      const weekRevenue = sumEffectiveAmount(weekSales);

      // Calculate month's sales
      const monthSales = allSales.filter((sale) =>
        new Date(sale.purchase_date) >= monthStart
      );
      const monthRevenue = sumEffectiveAmount(monthSales);

      // Calculate last week's sales for comparison
      const lastWeekSales = allSales.filter((sale) => {
        const saleDate = new Date(sale.purchase_date);
        return saleDate >= lastWeekStart && saleDate <= lastWeekEnd;
      });

      // Product analysis for this week
      const productStats = weekSales.reduce((acc, sale) => {
        const product = sale.product_name;
        const quantity = Number(sale.effective_quantity ?? sale.quantity ?? 0);
        const revenue = Number(sale.effective_amount ?? sale.amount ?? 0);

        if (!acc[product]) {
          acc[product] = { quantity: 0, revenue: 0 };
        }

        acc[product].quantity += quantity;
        acc[product].revenue += revenue;
        return acc;
      }, {} as Record<string, { quantity: number; revenue: number }>);

      // Last week product stats for trend comparison
      const lastWeekProductStats = lastWeekSales.reduce((acc, sale) => {
        const product = sale.product_name;
        const quantity = Number(sale.effective_quantity ?? sale.quantity ?? 0);
        const revenue = Number(sale.effective_amount ?? sale.amount ?? 0);

        if (!acc[product]) {
          acc[product] = { quantity: 0, revenue: 0 };
        }
        acc[product].quantity += quantity;
        acc[product].revenue += revenue;
        return acc;
      }, {} as Record<string, { quantity: number; revenue: number }>);

      // Find best and slow sellers
      const productEntries = Object.entries(productStats) as Array<[
        string,
        { quantity: number; revenue: number }
      ]>;
      const sortedByQuantity = [...productEntries].sort((a, b) => b[1].quantity - a[1].quantity);

      const bestSeller = sortedByQuantity[0] || ["No sales", { quantity: 0, revenue: 0 }];
      const slowSeller = sortedByQuantity[sortedByQuantity.length - 1] || ["No sales", { quantity: 0, revenue: 0 }];

      // Create sales breakdown
      const breakdown: SalesBreakdownItem[] = productEntries.map(([product, stats]) => ({
        item: product,
        unitsSold: stats.quantity,
        revenue: formatCurrency(stats.revenue),
        status: getProductStatus(stats.quantity, stats.revenue)
      })).sort((a, b) => b.unitsSold - a.unitsSold); // Sort by quantity for proper top/slow movers

      // Calculate trends
      const trends: SalesTrend[] = Object.keys(productStats).map(product => {
        const currentWeekQuantity = productStats[product]?.quantity || 0;
        const lastWeekQuantity = lastWeekProductStats[product]?.quantity || 0;

        let trend: string;
        let isPositive: boolean | null;

        if (lastWeekQuantity === 0 && currentWeekQuantity > 0) {
          trend = "New product this week";
          isPositive = true;
        } else if (lastWeekQuantity === 0) {
          trend = "No sales data for comparison";
          isPositive = null;
        } else {
          const percentChange = ((currentWeekQuantity - lastWeekQuantity) / lastWeekQuantity) * 100;
          if (Math.abs(percentChange) < 5) {
            trend = "Steady sales, no significant change";
            isPositive = null;
          } else if (percentChange > 0) {
            trend = `Sales increased ${Math.round(percentChange)}% vs last week`;
            isPositive = true;
          } else {
            trend = `Sales dropped ${Math.round(Math.abs(percentChange))}% vs last week`;
            isPositive = false;
          }
        }

        return { product, trend, isPositive };
      }).slice(0, 5); // Limit to top 5 products

      // Calculate cash flow with real credit/debt data
      const cashSales = allSales.filter((sale) => sale.payment_method !== 'credit');
      const creditSales = allSales.filter((sale) => sale.payment_method === 'credit');

      // For this week's cash flow
      const weekCashSales = weekSales.filter((sale) => sale.payment_method !== 'credit');
      const weekCreditSales = weekSales.filter((sale) => sale.payment_method === 'credit');

      const weeklyTotalCash = sumEffectiveAmount(weekCashSales);
      const weeklyPendingCredit = weekCreditSales.reduce(
        (sum, sale) => sum + Number(sale.outstanding_credit_amount ?? sale.effective_amount ?? 0),
        0
      );

      // Calculate debt cleared more comprehensively
      // Look for actual credit transactions and subsequent payments
      let weeklyDebtCleared = 0;

      // Check the customers table for actual credit tracking
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id);

      if (customers) {
        // For each customer, check if they have outstanding credit and recent payments
        for (const customer of customers) {
          // Get their credit sales
          const customerCreditSales = allSales.filter((sale) =>
            sale.customer_phone === customer.phone_number &&
            sale.payment_method === 'credit'
          );

          // Get their recent payments (non-credit sales that could be debt payments)
          const customerPayments = allSales.filter((sale) =>
            sale.customer_phone === customer.phone_number &&
            sale.payment_method !== 'credit' &&
            new Date(sale.purchase_date) >= weekStart
          );

          // Simple heuristic: if customer has made payments this week and has outstanding credit,
          // consider some of those payments as debt settlement
          if (customerCreditSales.length > 0 && customerPayments.length > 0) {
            const totalCredit = customerCreditSales.reduce(
              (sum, sale) => sum + Number(sale.outstanding_credit_amount ?? sale.effective_amount ?? 0),
              0
            );
            const weeklyPayments = sumEffectiveAmount(customerPayments);

            // Consider up to 50% of this week's payments as potential debt settlement
            // This is a conservative approach since we don't have explicit debt payment tracking
            weeklyDebtCleared += Math.min(weeklyPayments * 0.3, totalCredit);
          }
        }
      }

      setSalesMetrics({
        todaySales: formatCurrency(todayRevenue),
        weekSales: formatCurrency(weekRevenue),
        monthSales: formatCurrency(monthRevenue),
        itemsSoldToday: todayItemsSold,
        bestSellerWeek: { product: bestSeller[0], quantity: bestSeller[1].quantity },
        slowSellerWeek: { product: slowSeller[0], quantity: slowSeller[1].quantity }
      });

      setCashFlow({
        totalCash: formatCurrency(weeklyTotalCash),
        pending: formatCurrency(weeklyPendingCredit),
        debtCleared: formatCurrency(weeklyDebtCleared)
      });

      setSalesBreakdown(breakdown);
      setSalesTrends(trends);

      // Fetch trade insights
      const { data: insights } = await supabase
        .from('trade_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (insights) {
        setTradeInsights(insights);
      }

      // Generate dynamic trade insights based on sales data
      const dynamicInsights: TradeInsight[] = [];

      if (breakdown.length > 0) {
        const topProduct = breakdown[0];
        const fastMovers = breakdown.filter(item => item.status === "Fast Mover");
        const slowMovers = breakdown.filter(item => item.status === "Very Slow" || item.status === "Slow Mover");

        if (fastMovers.length > 0) {
          dynamicInsights.push({
            message: `${topProduct.item} is selling fast (${topProduct.unitsSold} units this week). Check trade index for optimal restocking prices.`,
            product_name: topProduct.item,
            insight_type: 'restock_alert',
            priority: 'high'
          });
        }

        if (slowMovers.length > 0) {
          const slowProduct = slowMovers[0];
          dynamicInsights.push({
            message: `${slowProduct.item} has slow sales (${slowProduct.unitsSold} units). Consider price adjustments or check market demand trends.`,
            product_name: slowProduct.item,
            insight_type: 'pricing_alert',
            priority: 'medium'
          });
        }

        // Market trend insight
        const risingTrends = trends.filter(t => t.isPositive === true);
        const fallingTrends = trends.filter(t => t.isPositive === false);

        if (risingTrends.length > 0) {
          dynamicInsights.push({
            message: `${risingTrends[0].product} shows increasing demand. Monitor market prices for profitable restocking opportunities.`,
            product_name: risingTrends[0].product,
            insight_type: 'market_trend',
            priority: 'medium'
          });
        }

        if (fallingTrends.length > 0) {
          dynamicInsights.push({
            message: `${fallingTrends[0].product} sales are declining. Check if market prices have increased affecting customer demand.`,
            product_name: fallingTrends[0].product,
            insight_type: 'demand_alert',
            priority: 'medium'
          });
        }
      }

      // Combine database insights with dynamic insights
      const combinedInsights = [...(insights || []), ...dynamicInsights].slice(0, 5);
      setTradeInsights(combinedInsights);

    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const unsubscribe = subscribeToSalesDataUpdates(() => {
      fetchSalesData();
    });
    return unsubscribe;
  }, [user, fetchSalesData]);

  return {
    salesMetrics,
    cashFlow,
    salesBreakdown,
    salesTrends,
    tradeInsights,
    loading,
    refreshData: fetchSalesData
  };
};