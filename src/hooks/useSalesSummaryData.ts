import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToSalesDataUpdates } from '@/lib/sales-events';
import { fetchSalesAnalytics, sumEffectiveAmount } from '@/lib/sales-analytics';

interface SummaryData {
  revenue: string;
  cost: string;
  expenses: string;
  miscellaneous: string;
  credit: string;
  moneyOwed: string;
  profit: string;
}

interface PerformanceInsight {
  type: 'success' | 'warning' | 'info';
  message: string;
  icon: string;
}

export const useSalesSummaryData = () => {
  const { user } = useAuth();
  const [summaryData, setSummaryData] = useState<Record<string, SummaryData>>({});
  const [performanceInsights, setPerformanceInsights] = useState<PerformanceInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const calculatePeriodData = useCallback(async (startDate: Date, endDate: Date): Promise<SummaryData> => {
    try {
      if (!user) {
        return {
          revenue: "0.00",
          cost: "0.00",
          expenses: "0.00",
          miscellaneous: "0.00",
          credit: "0.00",
          moneyOwed: "0.00",
          profit: "0.00"
        };
      }

      const sales = await fetchSalesAnalytics(user.id, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeReversed: false
      });

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, category')
        .eq('user_id', user.id)
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0]);

      // Fetch inventory costs
      const { data: inventoryData } = await supabase
        .from('inventory_receipts')
        .select('total_cost')
        .eq('user_id', user.id)
        .gte('received_date', startDate.toISOString())
        .lte('received_date', endDate.toISOString());

      // Calculate totals
      const validSales = sales.filter((sale) => Number(sale.effective_amount ?? sale.amount ?? 0) > 0);

      const totalRevenue = sumEffectiveAmount(validSales);

      console.log('=== Sales Summary Calculation Debug ===');
      console.log('Period:', startDate.toISOString(), 'to', endDate.toISOString());
      console.log('Total Revenue:', totalRevenue);
      console.log('Sales count:', validSales.length);

      // Separate credit and cash sales with proper partial payment tracking
      const fullCreditSales = validSales
        .filter((sale) => sale.payment_method === 'credit')
        .reduce((sum, sale) => sum + Number(sale.outstanding_credit_amount ?? sale.effective_amount ?? sale.amount ?? 0), 0);

      const partialPaymentOutstanding = validSales.reduce((sum, sale) => {
        if (sale.has_partial_payment) {
          const saleAmount = Number(sale.effective_amount ?? sale.amount ?? 0);
          return sum + saleAmount * 0.5;
        }
        return sum;
      }, 0);

      const totalCreditOutstanding = fullCreditSales + partialPaymentOutstanding;

      const inventoryCost = inventoryData?.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0) || 0;
      const operatingExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const miscellaneous = 0; // Can be calculated from other expense categories

      console.log('Inventory Cost (receipts in period):', inventoryCost);
      console.log('Inventory receipts count:', inventoryData?.length || 0);
      console.log('Operating Expenses:', operatingExpenses);
      console.log('Expenses count:', expenses?.length || 0);

      const profit = totalRevenue - inventoryCost - operatingExpenses - miscellaneous;

      console.log('Calculated Profit:', profit);
      console.log('Formula: Revenue(' + totalRevenue + ') - InventoryCost(' + inventoryCost + ') - Expenses(' + operatingExpenses + ')');
      console.log('======================================');

      return {
        revenue: totalRevenue.toFixed(2),
        cost: inventoryCost.toFixed(2),
        expenses: operatingExpenses.toFixed(2),
        miscellaneous: miscellaneous.toFixed(2),
        credit: fullCreditSales.toFixed(2),
        moneyOwed: partialPaymentOutstanding.toFixed(2),
        profit: profit.toFixed(2)
      };

    } catch (error) {
      console.error('Error calculating period data:', error);
      return {
        revenue: "0.00",
        cost: "0.00",
        expenses: "0.00",
        miscellaneous: "0.00",
        credit: "0.00",
        moneyOwed: "0.00",
        profit: "0.00"
      };
    }
  }, [user]);

  const generatePerformanceInsights = (data: SummaryData, period: string) => {
    const insights: PerformanceInsight[] = [];
    const revenue = parseFloat(data.revenue);
    const profit = parseFloat(data.profit);
    const credit = parseFloat(data.credit);
    const cost = parseFloat(data.cost);

    // Profit margin insight
    if (revenue > 0) {
      const profitMargin = (profit / revenue) * 100;
      if (profitMargin > 30) {
        insights.push({
          type: 'success',
          message: `🎯 Excellent profit margin! You're maintaining ${profitMargin.toFixed(1)}% profitability ${period}.`,
          icon: '🎯'
        });
      } else if (profitMargin > 15) {
        insights.push({
          type: 'info',
          message: `📈 Good profit margin of ${profitMargin.toFixed(1)}%. Consider optimizing costs to improve further.`,
          icon: '📈'
        });
      } else if (profitMargin > 0) {
        insights.push({
          type: 'warning',
          message: `⚠️ Low profit margin of ${profitMargin.toFixed(1)}%. Review your pricing and cost structure.`,
          icon: '⚠️'
        });
      } else {
        insights.push({
          type: 'warning',
          message: `🔴 Negative profit margin. Urgent review of costs and pricing needed.`,
          icon: '🔴'
        });
      }
    }

    // Credit sales insight
    if (credit > 0) {
      const creditRatio = (credit / revenue) * 100;
      if (creditRatio > 50) {
        insights.push({
          type: 'warning',
          message: `⚠️ High credit sales (${creditRatio.toFixed(1)}% of revenue). Follow up on collections to improve cash flow.`,
          icon: '⚠️'
        });
      } else if (creditRatio > 25) {
        insights.push({
          type: 'info',
          message: `💳 Moderate credit sales (${creditRatio.toFixed(1)}% of revenue). Monitor payment timelines.`,
          icon: '💳'
        });
      }
    }

    // Cost-to-revenue ratio insight
    if (revenue > 0 && cost > 0) {
      const costRatio = (cost / revenue) * 100;
      if (costRatio > 70) {
        insights.push({
          type: 'warning',
          message: `💸 High cost ratio (${costRatio.toFixed(1)}%). Look for better suppliers or negotiate prices.`,
          icon: '💸'
        });
      } else if (costRatio < 40) {
        insights.push({
          type: 'success',
          message: `💰 Great cost management! Your cost-to-revenue ratio is ${costRatio.toFixed(1)}%.`,
          icon: '💰'
        });
      }
    }

    // Growth insight for non-today periods
    if (period !== 'today' && revenue > 0) {
      insights.push({
        type: 'info',
        message: `📊 Total revenue ${period} is ¢${revenue.toFixed(2)}. Track trends to identify growth opportunities.`,
        icon: '📊'
      });
    }

    return insights;
  };

  const fetchSummaryData = useCallback(async () => {
    setLoading(true);

    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const overallStart = new Date(2020, 0, 1); // Far back date

      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      const endOfWeek = new Date(weekStart);
      endOfWeek.setDate(weekStart.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const endOfQuarter = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
      endOfQuarter.setHours(23, 59, 59, 999);

      const endOfYear = new Date(now.getFullYear(), 11, 31);
      endOfYear.setHours(23, 59, 59, 999);

      const endOfOverall = new Date();
      endOfOverall.setHours(23, 59, 59, 999);

      const periods = {
        today: await calculatePeriodData(today, endOfToday),
        week: await calculatePeriodData(weekStart, endOfWeek),
        month: await calculatePeriodData(monthStart, endOfMonth),
        quarter: await calculatePeriodData(quarterStart, endOfQuarter),
        year: await calculatePeriodData(yearStart, endOfYear),
        overall: await calculatePeriodData(overallStart, endOfOverall)
      };

      setSummaryData(periods);
      setPerformanceInsights(generatePerformanceInsights(periods.month, 'this month'));
    } catch (error) {
      console.error('Error fetching summary data:', error);
    } finally {
      setLoading(false);
    }
  }, [calculatePeriodData]);

  const refreshData = useCallback(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  useEffect(() => {
    if (user) {
      fetchSummaryData();
    }
  }, [user, fetchSummaryData]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const unsubscribe = subscribeToSalesDataUpdates(() => {
      fetchSummaryData();
    });
    return unsubscribe;
  }, [user, fetchSummaryData]);

  return {
    summaryData,
    performanceInsights,
    loading,
    refreshData
  };
};