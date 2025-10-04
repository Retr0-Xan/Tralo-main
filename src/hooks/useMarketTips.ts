import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MarketTip {
  title: string;
  message: string;
  type: 'inventory' | 'sales' | 'performance' | 'opportunity' | 'cash_flow';
  priority: 'high' | 'medium' | 'low';
}

export const useMarketTips = () => {
  const [currentTip, setCurrentTip] = useState<MarketTip | null>(null);
  const { user } = useAuth();

  const generatePersonalizedTips = async (): Promise<MarketTip[]> => {
    if (!user) return [];

    try {
      const tips: MarketTip[] = [];
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get user's business profile
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!businessProfile) return [];

      // Get user's products and stock levels
      const { data: products } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', user.id);

      // Get recent sales
      const { data: recentSales } = await supabase
        .from('customer_purchases')
        .select('*')
        .eq('business_id', businessProfile.id)
        .gte('purchase_date', thirtyDaysAgo.toISOString());

      // Get today's sales
      const { data: todaySales } = await supabase
        .from('customer_purchases')
        .select('amount')
        .eq('business_id', businessProfile.id)
        .gte('purchase_date', today.toISOString().split('T')[0]);

      // Get this week's sales
      const { data: weekSales } = await supabase
        .from('customer_purchases')
        .select('amount')
        .eq('business_id', businessProfile.id)
        .gte('purchase_date', sevenDaysAgo.toISOString());

      const todayTotal = todaySales?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
      const weekTotal = weekSales?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
      const monthTotal = recentSales?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;

      // 1. Daily Performance Tips
      if (todayTotal === 0) {
        tips.push({
          title: "No Sales Today",
          message: "Start your day strong! Check your inventory and consider promoting your best-selling products.",
          type: 'sales',
          priority: 'high'
        });
      } else if (todayTotal > weekTotal / 7 * 1.5) {
        tips.push({
          title: "Great Sales Day!",
          message: `Today's sales (¢${todayTotal}) are 50% above average! Keep up the momentum.`,
          type: 'performance',
          priority: 'low'
        });
      }

      // 2. Inventory Management Tips
      if (products && products.length > 0) {
        const outOfStock = products.filter(p => (p.current_stock || 0) === 0);
        const lowStock = products.filter(p => (p.current_stock || 0) > 0 && (p.current_stock || 0) <= 5);
        
        if (outOfStock.length > 0) {
          tips.push({
            title: "Stock Alert",
            message: `${outOfStock.length} product${outOfStock.length > 1 ? 's are' : ' is'} out of stock. You might be losing sales!`,
            type: 'inventory',
            priority: 'high'
          });
        } else if (lowStock.length > 0) {
          tips.push({
            title: "Low Stock Warning",
            message: `${lowStock.length} product${lowStock.length > 1 ? 's have' : ' has'} low stock. Consider restocking soon.`,
            type: 'inventory',
            priority: 'medium'
          });
        }
      }

      // 3. Sales Trends and Opportunities
      if (recentSales && recentSales.length > 0) {
        // Find best-selling product
        const productSales = recentSales.reduce((acc, sale) => {
          const product = sale.product_name;
          acc[product] = (acc[product] || 0) + Number(sale.amount);
          return acc;
        }, {} as Record<string, number>);

        const bestProduct = Object.entries(productSales)
          .sort(([,a], [,b]) => b - a)[0];

        if (bestProduct && bestProduct[1] > monthTotal * 0.3) {
          tips.push({
            title: "Top Performer",
            message: `${bestProduct[0]} is your star product (¢${bestProduct[1].toFixed(0)} this month). Ensure it's well-stocked!`,
            type: 'opportunity',
            priority: 'medium'
          });
        }

        // Cash flow insight
        const avgDailySales = monthTotal / 30;
        if (avgDailySales > 0) {
          tips.push({
            title: "Cash Flow Insight",
            message: `Your average daily sales are ¢${avgDailySales.toFixed(0)}. You're on track for ¢${(avgDailySales * 30).toFixed(0)} this month.`,
            type: 'cash_flow',
            priority: 'low'
          });
        }
      }

      // 4. Business Growth Tips
      if (monthTotal < 500 && products && products.length > 0) {
        tips.push({
          title: "Growth Opportunity",
          message: "Consider adding complementary products or promotions to increase monthly revenue.",
          type: 'opportunity',
          priority: 'medium'
        });
      } else if (monthTotal > 2000) {
        tips.push({
          title: "Business Growth",
          message: `Excellent! ¢${monthTotal.toFixed(0)} monthly revenue shows strong business performance.`,
          type: 'performance',
          priority: 'low'
        });
      }

      return tips;
    } catch (error) {
      console.error('Error generating personalized tips:', error);
      return [];
    }
  };

  useEffect(() => {
    const fetchTips = async () => {
      const tips = await generatePersonalizedTips();
      
      if (tips.length > 0) {
        // Prioritize tips by priority level
        const prioritizedTips = [
          ...tips.filter(t => t.priority === 'high'),
          ...tips.filter(t => t.priority === 'medium'),
          ...tips.filter(t => t.priority === 'low')
        ];
        
        // Start with the highest priority tip
        setCurrentTip(prioritizedTips[0]);
        
        // Rotate tips every 12 seconds
        let currentIndex = 0;
        const interval = setInterval(() => {
          currentIndex = (currentIndex + 1) % prioritizedTips.length;
          setCurrentTip(prioritizedTips[currentIndex]);
        }, 12000);

        return interval;
      }
      return null;
    };

    let cleanup: NodeJS.Timeout | null = null;
    
    if (user) {
      fetchTips().then((interval) => {
        if (interval) cleanup = interval;
      });
    }

    return () => {
      if (cleanup) clearInterval(cleanup);
    };
  }, [user]);

  const getTipIcon = (type: string) => {
    switch (type) {
      case 'inventory': return '📦';
      case 'sales': return '💰';
      case 'performance': return '📈';
      case 'opportunity': return '🚀';
      case 'cash_flow': return '💳';
      default: return '💡';
    }
  };

  const getTipColor = (type: string) => {
    switch (type) {
      case 'inventory': return 'text-blue-600';
      case 'sales': return 'text-green-600';
      case 'performance': return 'text-purple-600';
      case 'opportunity': return 'text-orange-600';
      case 'cash_flow': return 'text-indigo-600';
      default: return 'text-foreground';
    }
  };

  return {
    currentTip,
    getTipIcon,
    getTipColor
  };
};