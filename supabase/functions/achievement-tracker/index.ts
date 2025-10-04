import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AchievementCriteria {
  type: string;
  count?: number;
  amount?: number;
  days?: number;
  period?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting achievement tracking process...');

    // Get all users with business profiles
    const { data: users } = await supabase
      .from('business_profiles')
      .select('user_id');

    if (!users) {
      console.log('No users found');
      return new Response(JSON.stringify({ message: 'No users found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Checking achievements for ${users.length} users`);

    // Get all achievement definitions
    const { data: achievements } = await supabase
      .from('achievement_definitions')
      .select('*');

    if (!achievements) {
      console.log('No achievement definitions found');
      return new Response(JSON.stringify({ message: 'No achievements defined' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalUnlocked = 0;

    // Check achievements for each user
    for (const user of users) {
      console.log(`Checking achievements for user: ${user.user_id}`);
      
      // Get user's existing achievements
      const { data: existingAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_code')
        .eq('user_id', user.user_id);

      const unlockedCodes = existingAchievements?.map(a => a.achievement_code) || [];

      // Check each achievement
      for (const achievement of achievements) {
        if (unlockedCodes.includes(achievement.code)) {
          continue; // Already unlocked
        }

        const criteria = achievement.criteria as AchievementCriteria;
        let shouldUnlock = false;
        let progressData = {};

        try {
          switch (criteria.type) {
            case 'first_sale':
              const { count: saleCount } = await supabase
                .from('customer_purchases')
                .select('id', { count: 'exact' })
                .eq('business_id', user.user_id);
              
              shouldUnlock = (saleCount || 0) > 0;
              progressData = { sales_count: saleCount };
              break;

            case 'monthly_sales':
              const startOfMonth = new Date();
              startOfMonth.setDate(1);
              startOfMonth.setHours(0, 0, 0, 0);
              
              const { count: monthlySales } = await supabase
                .from('customer_purchases')
                .select('id', { count: 'exact' })
                .eq('business_id', user.user_id)
                .gte('purchase_date', startOfMonth.toISOString());
              
              shouldUnlock = (monthlySales || 0) >= criteria.count!;
              progressData = { sales_this_month: monthlySales, target: criteria.count };
              break;

            case 'weekly_profit':
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              
              const { data: weeklyPurchases } = await supabase
                .from('customer_purchases')
                .select('amount')
                .eq('business_id', user.user_id)
                .gte('purchase_date', weekAgo.toISOString());
              
              const weeklyTotal = weeklyPurchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
              shouldUnlock = weeklyTotal >= criteria.amount!;
              progressData = { weekly_profit: weeklyTotal, target: criteria.amount };
              break;

            case 'total_profit':
              const { data: allPurchases } = await supabase
                .from('customer_purchases')
                .select('amount')
                .eq('business_id', user.user_id);
              
              const totalProfit = allPurchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
              shouldUnlock = totalProfit >= criteria.amount!;
              progressData = { total_profit: totalProfit, target: criteria.amount };
              break;

            case 'product_variety':
              const { count: productCount } = await supabase
                .from('user_products')
                .select('id', { count: 'exact' })
                .eq('user_id', user.user_id)
                .gt('current_stock', 0);
              
              shouldUnlock = (productCount || 0) >= criteria.count!;
              progressData = { active_products: productCount, target: criteria.count };
              break;

            case 'customer_count':
              const { data: uniqueCustomers } = await supabase
                .from('customer_purchases')
                .select('customer_phone')
                .eq('business_id', user.user_id);
              
              const uniqueCount = new Set(uniqueCustomers?.map(c => c.customer_phone)).size;
              shouldUnlock = uniqueCount >= criteria.count!;
              progressData = { unique_customers: uniqueCount, target: criteria.count };
              break;

            case 'no_stockouts':
              const daysAgo = new Date();
              daysAgo.setDate(daysAgo.getDate() - criteria.days!);
              
              const { count: recentStockouts } = await supabase
                .from('user_products')
                .select('id', { count: 'exact' })
                .eq('user_id', user.user_id)
                .eq('current_stock', 0)
                .gte('updated_at', daysAgo.toISOString());
              
              shouldUnlock = (recentStockouts || 0) === 0;
              progressData = { stockouts_in_period: recentStockouts, target_days: criteria.days };
              break;

            case 'product_sellouts':
              // This is more complex - would need to track when products hit 0 stock
              // For now, we'll check if any product has been restocked multiple times
              const { data: products } = await supabase
                .from('user_products')
                .select('product_name, updated_at')
                .eq('user_id', user.user_id);
              
              // Simple heuristic: if user has products and frequent updates, likely restocking
              const recentUpdates = products?.filter(p => {
                const updateDate = new Date(p.updated_at);
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return updateDate > monthAgo;
              }).length || 0;
              
              shouldUnlock = recentUpdates >= criteria.count!;
              progressData = { recent_restocks: recentUpdates, target: criteria.count };
              break;

            case 'consecutive_sales_days':
              // Complex calculation - would need daily sales tracking
              // For now, check if user has consistent sales activity
              const { data: recentSales } = await supabase
                .from('customer_purchases')
                .select('purchase_date')
                .eq('business_id', user.user_id)
                .order('purchase_date', { ascending: false })
                .limit(criteria.days!);
              
              if (recentSales && recentSales.length >= Math.min(10, criteria.days!)) {
                // If they have sales spread over the period, consider it consistent
                shouldUnlock = true;
                progressData = { recent_sales_days: recentSales.length, target: criteria.days };
              }
              break;

            case 'value_increase':
              // Check if inventory value has been increasing
              const { data: inventoryData } = await supabase
                .from('user_products')
                .select('current_stock, updated_at')
                .eq('user_id', user.user_id)
                .order('updated_at', { ascending: false });
              
              if (inventoryData && inventoryData.length > 0) {
                const totalStock = inventoryData.reduce((sum, item) => sum + (item.current_stock || 0), 0);
                shouldUnlock = totalStock > 0; // Simple check for now
                progressData = { total_stock: totalStock };
              }
              break;
          }

          if (shouldUnlock) {
            console.log(`Unlocking achievement: ${achievement.code} for user: ${user.user_id}`);
            
            const { error } = await supabase
              .from('user_achievements')
              .insert({
                user_id: user.user_id,
                achievement_code: achievement.code,
                progress_data: progressData
              });

            if (error) {
              console.error(`Error unlocking achievement ${achievement.code}:`, error);
            } else {
              totalUnlocked++;
              
              // Create a notification/insight about the achievement
              await supabase
                .from('trade_insights')
                .insert({
                  user_id: user.user_id,
                  product_name: 'Achievement',
                  insight_type: 'achievement_unlocked',
                  message: `🎉 Achievement Unlocked: ${achievement.title}! ${achievement.description}`,
                  priority: 'high'
                });
            }
          }
        } catch (error) {
          console.error(`Error checking achievement ${achievement.code} for user ${user.user_id}:`, error);
        }
      }
    }

    console.log(`Achievement tracking completed. ${totalUnlocked} new achievements unlocked.`);

    return new Response(JSON.stringify({ 
      message: 'Achievement tracking completed', 
      users_checked: users.length,
      achievements_unlocked: totalUnlocked 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in achievement tracker:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});