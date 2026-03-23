import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { fetchSalesAnalytics, sumEffectiveAmount } from '@/lib/sales-analytics';

// ── Types ──────────────────────────────────────────────────────
export interface DayClosureData {
  date: string;
  revenue: number;
  cost: number;
  expenses: number;
  profit: number;
  totalSalesCount: number;
  cashSales: number;
  creditSales: number;
  creditAmount: number;
  cashAmount: number;
  starRating: number;
  starLabel: string;
  message: string;
  actionButton: { label: string; route: string };
  secondaryAction?: { label: string; route: string };
  topProducts: { name: string; quantity: number; revenue: number }[];
  slowProducts: { name: string; daysSinceLastSale: number }[];
  creditCustomers: { name: string; phone: string; amount: number }[];
}

export interface DayClosureHistory {
  date: string;
  profit: number;
  revenue: number;
  starRating: number;
}

// ── Star Rating Calculation ────────────────────────────────────
function calculateStarRating(params: {
  todayProfit: number;
  yesterdayProfit: number;
  cashSalesCount: number;
  creditSalesCount: number;
  totalSalesCount: number;
  creditIncreased: boolean;
  creditReduced: boolean;
  hasSlowStock: boolean;
  hasFastMovers: boolean;
}): { stars: number; label: string } {
  const {
    todayProfit,
    yesterdayProfit,
    cashSalesCount,
    creditSalesCount,
    totalSalesCount,
    creditIncreased,
    creditReduced,
    hasSlowStock,
    hasFastMovers,
  } = params;

  let stars = 3; // Start at 3

  // Factor 1: Profit vs yesterday (most important)
  if (todayProfit < 0) {
    stars -= 2;
  } else if (yesterdayProfit > 0 && todayProfit > yesterdayProfit * 1.1) {
    stars += 1;
  } else if (yesterdayProfit > 0 && todayProfit < yesterdayProfit * 0.9) {
    stars -= 1;
  }

  // Factor 2: Cash vs Credit mix
  if (totalSalesCount > 0) {
    const cashRatio = cashSalesCount / totalSalesCount;
    if (cashRatio >= 0.7) {
      stars += 1;
    } else if (cashRatio < 0.4) {
      stars -= 1;
    }
  }

  // Factor 3: Credit risk
  if (creditReduced) {
    stars += 0.5;
  } else if (creditIncreased) {
    stars -= 1;
  }

  // Factor 4: Inventory movement
  if (hasFastMovers) {
    stars += 0.5;
  } else if (hasSlowStock) {
    stars -= 0.5;
  }

  // Clamp to 1-5
  stars = Math.max(1, Math.min(5, Math.round(stars)));

  const labels: Record<number, string> = {
    1: 'Tough day',
    2: 'Under pressure',
    3: 'Okay day',
    4: 'Good day',
    5: 'Strong day',
  };

  return { stars, label: labels[stars] };
}

// ── Message Templates ──────────────────────────────────────────
function getBusinessMessage(stars: number, context: {
  creditHigh: boolean;
  lossDay: boolean;
  lowMargin: boolean;
  hasSlowStock: boolean;
}): string {
  const { creditHigh, lossDay, lowMargin, hasSlowStock } = context;

  if (lossDay) {
    const msgs = [
      "Today was tough. Don't worry — let's fix it step by step.",
      "Today was slow. You sold little and cash was low.",
      "Your business needs attention tomorrow. Let's look at what happened.",
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  if (stars <= 2) {
    if (creditHigh) {
      return "You sold today, but money didn't really come in. Too many people bought on credit.";
    }
    if (hasSlowStock) {
      return "Some items are not selling and holding your money. Let's clear them.";
    }
    return "Today's sales didn't cover enough costs. Let's see where the money went.";
  }

  if (stars === 3) {
    if (creditHigh) {
      return "Today was okay, but many people bought on credit. Try to collect before giving more.";
    }
    if (lowMargin) {
      return "Nothing bad, nothing great. Let's check if you can improve your prices tomorrow.";
    }
    return "You stayed afloat today. Tomorrow can be better.";
  }

  if (stars === 4) {
    if (creditHigh) {
      return "Sales were good, but some money is still outside. Try pushing more cash sales tomorrow.";
    }
    return "You made profit today. Keep an eye on customers who owe you.";
  }

  // 5 stars
  const msgs5 = [
    "Today was a strong day. Sales moved well and cash came in.",
    "You did well today. Your money came in clean.",
    "Good balance today — sales, profit, and cash all healthy.",
  ];
  return msgs5[Math.floor(Math.random() * msgs5.length)];
}

// ── Action Button Logic ────────────────────────────────────────
function getActionButton(context: {
  stars: number;
  creditHigh: boolean;
  lossDay: boolean;
  lowMargin: boolean;
  hasSlowStock: boolean;
}): { label: string; route: string } {
  const { creditHigh, lossDay, lowMargin, hasSlowStock, stars } = context;

  if (lossDay) {
    return { label: 'See What Went Wrong', route: '/sales?tab=summary' };
  }
  if (creditHigh) {
    return { label: 'View Credit Customers', route: '/sales?tab=customers' };
  }
  if (lowMargin) {
    return { label: 'Review Prices', route: '/inventory' };
  }
  if (hasSlowStock) {
    return { label: 'View Slow Stock', route: '/inventory' };
  }
  if (stars >= 4) {
    return { label: 'See What Worked Today', route: '/sales?tab=history&period=today' };
  }
  return { label: 'View Today\'s Sales', route: '/sales?tab=history&period=today' };
}

function getSecondaryAction(context: {
  stars: number;
  creditHigh: boolean;
  lossDay: boolean;
}): { label: string; route: string } | undefined {
  if (context.lossDay) {
    return { label: 'Check Expenses', route: '/expenses' };
  }
  if (context.creditHigh && context.stars >= 3) {
    return { label: 'See Cash vs Credit', route: '/sales?tab=summary' };
  }
  return undefined;
}

// ── Local Storage Helpers ──────────────────────────────────────
function getClosureKey(userId: string, date: string) {
  return `tralo_day_closure_${userId}_${date}`;
}

function getClosureHistoryKey(userId: string) {
  return `tralo_day_closures_${userId}`;
}

function saveDayClosure(userId: string, data: DayClosureData) {
  localStorage.setItem(getClosureKey(userId, data.date), JSON.stringify(data));

  // Also append to history
  const historyKey = getClosureHistoryKey(userId);
  const existing: DayClosureHistory[] = JSON.parse(localStorage.getItem(historyKey) || '[]');
  const filtered = existing.filter(h => h.date !== data.date);
  filtered.push({
    date: data.date,
    profit: data.profit,
    revenue: data.revenue,
    starRating: data.starRating,
  });
  // Keep last 90 days
  filtered.sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem(historyKey, JSON.stringify(filtered.slice(0, 90)));
}

function getDayClosure(userId: string, date: string): DayClosureData | null {
  const stored = localStorage.getItem(getClosureKey(userId, date));
  return stored ? JSON.parse(stored) : null;
}

// ── Main Hook ──────────────────────────────────────────────────
export function useCloseForDay() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [closureData, setClosureData] = useState<DayClosureData | null>(null);
  const [isClosed, setIsClosed] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Check if today is already closed
  useEffect(() => {
    if (user) {
      const existing = getDayClosure(user.id, todayStr);
      if (existing) {
        setClosureData(existing);
        setIsClosed(true);
      }
    }
  }, [user, todayStr]);

  const closeDay = useCallback(async (): Promise<DayClosureData | null> => {
    if (!user) return null;

    // Check if already closed
    const existing = getDayClosure(user.id, todayStr);
    if (existing) {
      setClosureData(existing);
      setIsClosed(true);
      return existing;
    }

    setLoading(true);

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);

      // Yesterday for comparison
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(yesterdayStart);
      yesterdayEnd.setHours(23, 59, 59, 999);

      // Fetch today's sales
      const todaySales = await fetchSalesAnalytics(user.id, {
        startDate: todayStart.toISOString(),
        endDate: todayEnd.toISOString(),
        includeReversed: false,
      });

      // Fetch yesterday's sales for comparison
      const yesterdaySales = await fetchSalesAnalytics(user.id, {
        startDate: yesterdayStart.toISOString(),
        endDate: yesterdayEnd.toISOString(),
        includeReversed: false,
      });

      // Revenue
      const todayRevenue = sumEffectiveAmount(todaySales);
      const yesterdayRevenue = sumEffectiveAmount(yesterdaySales);

      // Cash vs Credit
      const cashSales = todaySales.filter(s => s.payment_method !== 'credit');
      const creditSalesList = todaySales.filter(s => s.payment_method === 'credit' || s.is_credit_sale);
      const cashAmount = sumEffectiveAmount(cashSales);
      const creditAmount = sumEffectiveAmount(creditSalesList);

      // Expenses today
      const expensesQuery = supabase
        .from('expenses')
        .select('amount, category')
        .eq('user_id', user.id);
      const { data: expensesData } = await (expensesQuery as any)
        .eq('is_reversed', false)
        .gte('expense_date', todayStr)
        .lte('expense_date', todayStr);

      const totalExpenses = (expensesData as any[] | null)?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0;

      // Inventory cost (receipts today)
      const { data: inventoryData } = await supabase
        .from('inventory_receipts')
        .select('total_cost')
        .eq('user_id', user.id)
        .gte('received_date', todayStart.toISOString())
        .lte('received_date', todayEnd.toISOString());

      const inventoryCost = inventoryData?.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0) || 0;

      // Profit
      const todayProfit = todayRevenue - inventoryCost - totalExpenses;
      const yesterdayProfit = yesterdayRevenue - 0; // Simplified for comparison

      // Recalculate yesterday profit properly
      const yExpQuery = supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id);
      const { data: yExpenses } = await (yExpQuery as any)
        .eq('is_reversed', false)
        .gte('expense_date', yesterdayStart.toISOString().split('T')[0])
        .lte('expense_date', yesterdayStart.toISOString().split('T')[0]);

      const { data: yInventory } = await supabase
        .from('inventory_receipts')
        .select('total_cost')
        .eq('user_id', user.id)
        .gte('received_date', yesterdayStart.toISOString())
        .lte('received_date', yesterdayEnd.toISOString());

      const yExpTotal = yExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const yInvCost = yInventory?.reduce((sum, i) => sum + (Number(i.total_cost) || 0), 0) || 0;
      const actualYesterdayProfit = yesterdayRevenue - yExpTotal - yInvCost;

      // Top products today
      const productMap: Record<string, { quantity: number; revenue: number }> = {};
      todaySales.forEach(s => {
        const name = s.product_name || 'Unknown';
        if (!productMap[name]) productMap[name] = { quantity: 0, revenue: 0 };
        productMap[name].quantity += Number(s.effective_quantity ?? s.quantity ?? 0);
        productMap[name].revenue += Number(s.effective_amount ?? s.amount ?? 0);
      });

      const topProducts = Object.entries(productMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Slow stock check
      const { data: stockItems } = await supabase
        .from('user_products')
        .select('product_name, last_sale_date, current_stock')
        .eq('user_id', user.id)
        .gt('current_stock', 0);

      const slowProducts = ((stockItems as any[] | null) || [])
        .filter((item: any) => {
          if (!item.last_sale_date) return true;
          const daysSince = Math.floor((Date.now() - new Date(item.last_sale_date).getTime()) / (1000 * 60 * 60 * 24));
          return daysSince > 7;
        })
        .map((item: any) => ({
          name: item.product_name as string,
          daysSinceLastSale: item.last_sale_date
            ? Math.floor((Date.now() - new Date(item.last_sale_date).getTime()) / (1000 * 60 * 60 * 24))
            : 999,
        }))
        .sort((a: any, b: any) => b.daysSinceLastSale - a.daysSinceLastSale)
        .slice(0, 5);

      // Credit customers
      const creditCustomers = creditSalesList.map(s => ({
        name: s.customer_name || 'Unknown',
        phone: s.customer_phone || '',
        amount: Number(s.effective_amount ?? s.amount ?? 0),
      }));

      // Aggregate credit customers by phone
      const creditMap: Record<string, { name: string; phone: string; amount: number }> = {};
      creditCustomers.forEach(c => {
        const key = c.phone || c.name;
        if (!creditMap[key]) creditMap[key] = { ...c };
        else creditMap[key].amount += c.amount;
      });
      const aggregatedCredit = Object.values(creditMap).sort((a, b) => b.amount - a.amount);

      // Credit trend
      const yCreditSales = yesterdaySales.filter(s => s.payment_method === 'credit' || s.is_credit_sale);
      const yCreditAmount = sumEffectiveAmount(yCreditSales);
      const creditIncreased = creditAmount > yCreditAmount * 1.2;
      const creditReduced = creditAmount < yCreditAmount * 0.8;

      // Determine context flags
      const totalSalesCount = todaySales.length;
      const creditHigh = totalSalesCount > 0 && (creditSalesList.length / totalSalesCount) > 0.35;
      const lossDay = todayProfit < 0;
      const margin = todayRevenue > 0 ? todayProfit / todayRevenue : 0;
      const lowMargin = margin > 0 && margin < 0.15;
      const hasSlowStock = slowProducts.length > 2;
      const hasFastMovers = topProducts.length > 0 && topProducts[0].quantity >= 5;

      // Calculate star rating
      const { stars, label } = calculateStarRating({
        todayProfit,
        yesterdayProfit: actualYesterdayProfit,
        cashSalesCount: cashSales.length,
        creditSalesCount: creditSalesList.length,
        totalSalesCount,
        creditIncreased,
        creditReduced,
        hasSlowStock,
        hasFastMovers,
      });

      // Get message and actions
      const message = getBusinessMessage(stars, { creditHigh, lossDay, lowMargin, hasSlowStock });
      const actionButton = getActionButton({ stars, creditHigh, lossDay, lowMargin, hasSlowStock });
      const secondaryAction = getSecondaryAction({ stars, creditHigh, lossDay });

      const closureResult: DayClosureData = {
        date: todayStr,
        revenue: todayRevenue,
        cost: inventoryCost,
        expenses: totalExpenses,
        profit: todayProfit,
        totalSalesCount,
        cashSales: cashSales.length,
        creditSales: creditSalesList.length,
        creditAmount,
        cashAmount,
        starRating: stars,
        starLabel: label,
        message,
        actionButton,
        secondaryAction,
        topProducts,
        slowProducts,
        creditCustomers: aggregatedCredit,
      };

      // Save and lock the day
      saveDayClosure(user.id, closureResult);
      setClosureData(closureResult);
      setIsClosed(true);

      return closureResult;
    } catch (error) {
      console.error('Error closing day:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, todayStr]);

  const getYesterdayClosure = useCallback((): DayClosureData | null => {
    if (!user) return null;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getDayClosure(user.id, yesterday.toISOString().split('T')[0]);
  }, [user]);

  const getClosureHistory = useCallback((): DayClosureHistory[] => {
    if (!user) return [];
    const historyKey = getClosureHistoryKey(user.id);
    return JSON.parse(localStorage.getItem(historyKey) || '[]');
  }, [user]);

  return {
    closeDay,
    closureData,
    isClosed,
    loading,
    getYesterdayClosure,
    getClosureHistory,
  };
}
