import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductFlow {
  product_name: string;
  user_id: string;
  current_stock: number;
  sales_velocity: number;
  stock_changes: number[];
  days_since_last_sale: number;
  total_revenue: number;
  reorder_point: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting inventory insights analysis...');

    // Get all users with business profiles
    const { data: users } = await supabase
      .from('business_profiles')
      .select('user_id');

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing inventory for ${users.length} users`);
    let totalInsights = 0;

    for (const user of users) {
      console.log(`Analyzing inventory for user: ${user.user_id}`);
      
      // Get user's products and recent sales data
      const { data: products } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', user.user_id);

      const { data: recentSales } = await supabase
        .from('customer_purchases')
        .select('*')
        .eq('business_id', user.user_id)
        .gte('purchase_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('purchase_date', { ascending: false });

      if (!products || products.length === 0) {
        continue;
      }

      // Analyze each product's flow
      for (const product of products) {
        const productSales = recentSales?.filter(sale => 
          sale.product_name.toLowerCase().includes(product.product_name.toLowerCase()) ||
          product.product_name.toLowerCase().includes(sale.product_name.toLowerCase())
        ) || [];

        const insights = await generateProductInsights(product, productSales, supabase, user.user_id);
        totalInsights += insights.length;

        // Insert insights
        for (const insight of insights) {
          const { error } = await supabase
            .from('trade_insights')
            .insert(insight);

          if (error) {
            console.error('Error inserting insight:', error);
          }
        }
      }

      // Generate portfolio-level insights
      const portfolioInsights = await generatePortfolioInsights(products, recentSales || [], user.user_id);
      totalInsights += portfolioInsights.length;

      for (const insight of portfolioInsights) {
        const { error } = await supabase
          .from('trade_insights')
          .insert(insight);

        if (error) {
          console.error('Error inserting portfolio insight:', error);
        }
      }
    }

    console.log(`Inventory insights analysis completed. ${totalInsights} insights generated.`);

    return new Response(JSON.stringify({ 
      message: 'Inventory insights analysis completed', 
      users_analyzed: users.length,
      insights_generated: totalInsights 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in inventory insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateProductInsights(product: any, sales: any[], supabase: any, userId: string) {
  const insights = [];
  const now = new Date();
  
  // Calculate sales velocity (sales per day)
  const salesCount = sales.length;
  const salesVelocity = salesCount / 30; // sales per day over last 30 days
  
  // Calculate total revenue from this product
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
  
  // Days since last sale
  const lastSaleDate = sales.length > 0 ? new Date(sales[0].purchase_date) : null;
  const daysSinceLastSale = lastSaleDate ? 
    Math.floor((now.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;

  // Stock level analysis
  const currentStock = product.current_stock || 0;
  const reorderPoint = Math.max(Math.ceil(salesVelocity * 7), 5); // 7 days of sales as reorder point

  // Generate specific insights
  
  // 1. Critical Stock Alerts
  if (currentStock === 0 && salesVelocity > 0) {
    const potentialLoss = salesVelocity * 50; // Assume ¢50 avg profit per unit
    insights.push({
      user_id: userId,
      product_name: product.product_name,
      insight_type: 'stockout_alert',
      message: `🚨 URGENT: ${product.product_name} is completely out of stock! You're losing approximately ¢${potentialLoss.toFixed(0)} daily. Restock immediately to avoid further losses.`,
      priority: 'high'
    });
  } else if (currentStock <= reorderPoint && currentStock > 0 && salesVelocity > 0) {
    const daysLeft = Math.ceil(currentStock / salesVelocity);
    insights.push({
      user_id: userId,
      product_name: product.product_name,
      insight_type: 'low_stock_warning',
      message: `⚠️ CRITICAL: ${product.product_name} will run out in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} at current sales rate (${salesVelocity.toFixed(1)}/day). Order now!`,
      priority: 'high'
    });
  }

  // 2. Performance Insights
  if (salesVelocity > 1) {
    const weeklyRevenue = totalRevenue / 4; // Approximate weekly
    if (weeklyRevenue > 100) {
      insights.push({
        user_id: userId,
        product_name: product.product_name,
        insight_type: 'star_performer',
        message: `⭐ TOP EARNER: ${product.product_name} generates ¢${weeklyRevenue.toFixed(0)}/week! This is your business cornerstone - never let it stock out.`,
        priority: 'medium'
      });
    } else {
      insights.push({
        user_id: userId,
        product_name: product.product_name,
        insight_type: 'high_demand',
        message: `🔥 HIGH DEMAND: ${product.product_name} sells ${salesVelocity.toFixed(1)} units daily. Consider bulk purchasing for better margins.`,
        priority: 'medium'
      });
    }
  }

  // 3. Business Intelligence
  if (currentStock > 30 && salesVelocity < 0.2 && daysSinceLastSale > 21) {
    const tiedUpCapital = currentStock * 20; // Estimate ¢20 cost per unit
    insights.push({
      user_id: userId,
      product_name: product.product_name,
      insight_type: 'dead_stock',
      message: `💀 DEAD STOCK: ${product.product_name} (${currentStock} units) hasn't sold in ${daysSinceLastSale} days. ¢${tiedUpCapital} tied up! Consider clearance sale.`,
      priority: 'high'
    });
  } else if (currentStock > 10 && salesVelocity < 0.3 && daysSinceLastSale > 14) {
    insights.push({
      user_id: userId,
      product_name: product.product_name,
      insight_type: 'slow_moving',
      message: `🐌 SLOW MOVER: ${product.product_name} moving slowly (${daysSinceLastSale} days since last sale). Bundle with fast movers or offer discounts.`,
      priority: 'medium'
    });
  }

  // 4. Profit Optimization
  if (totalRevenue > 300 && salesCount > 10) {
    const avgSaleValue = totalRevenue / salesCount;
    insights.push({
      user_id: userId,
      product_name: product.product_name,
      insight_type: 'profit_optimization',
      message: `💎 PROFIT DRIVER: ${product.product_name} averages ¢${avgSaleValue.toFixed(0)} per sale with ${salesCount} transactions. Focus marketing efforts here!`,
      priority: 'low'
    });
  }

  // 5. Smart Reordering
  if (currentStock <= reorderPoint * 2 && salesVelocity > 0.3) {
    const daysSupply = currentStock / salesVelocity;
    const optimalOrder = Math.ceil(salesVelocity * 21); // 3 weeks supply
    const urgency = daysSupply <= 5 ? "URGENT" : "RECOMMENDED";
    
    insights.push({
      user_id: userId,
      product_name: product.product_name,
      insight_type: 'smart_reorder',
      message: `📊 ${urgency} REORDER: ${product.product_name} needs restocking. Current supply: ${daysSupply.toFixed(1)} days. Optimal order: ${optimalOrder} units for 3-week coverage.`,
      priority: daysSupply <= 5 ? 'high' : 'medium'
    });
  }

  // 6. Market Timing Insights
  const recentSalesCount = sales.filter(sale => {
    const saleDate = new Date(sale.purchase_date);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return saleDate >= weekAgo;
  }).length;

  if (recentSalesCount > salesCount * 0.6) {
    insights.push({
      user_id: userId,
      product_name: product.product_name,
      insight_type: 'trending_up',
      message: `📈 TRENDING: ${product.product_name} sales accelerating! ${recentSalesCount} of ${salesCount} sales in past week. Stock up before demand peaks!`,
      priority: 'medium'
    });
  }

  return insights;
}

async function generatePortfolioInsights(products: any[], sales: any[], userId: string) {
  const insights = [];
  
  // Portfolio-level analysis
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.current_stock || 0), 0);
  const stockedProducts = products.filter(p => (p.current_stock || 0) > 0).length;
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
  const stockoutProducts = products.filter(p => (p.current_stock || 0) === 0).length;
  
  // Calculate business health metrics
  const avgDailyRevenue = totalRevenue / 30;
  const stockTurnover = totalRevenue / (totalStock * 10); // Assume avg cost ¢10/unit
  
  // 1. Critical Business Alerts
  if (stockoutProducts >= totalProducts * 0.5) {
    const missedRevenue = stockoutProducts * avgDailyRevenue * 0.3;
    insights.push({
      user_id: userId,
      product_name: 'Business Health',
      insight_type: 'critical_stockouts',
      message: `🚨 BUSINESS CRISIS: ${stockoutProducts}/${totalProducts} products out of stock! Estimated daily loss: ¢${missedRevenue.toFixed(0)}. Immediate restocking required!`,
      priority: 'high'
    });
  } else if (stockoutProducts > 0) {
    insights.push({
      user_id: userId,
      product_name: 'Inventory Management',
      insight_type: 'stockout_warning',
      message: `⚠️ ATTENTION: ${stockoutProducts} product${stockoutProducts > 1 ? 's are' : ' is'} out of stock. Customer dissatisfaction risk increasing. Restock priority items.`,
      priority: 'high'
    });
  }

  // 2. Revenue Intelligence
  const salesByProduct = sales.reduce((acc, sale) => {
    acc[sale.product_name] = (acc[sale.product_name] || 0) + Number(sale.amount);
    return acc;
  }, {} as Record<string, number>);
  
  const productPerformance = Object.entries(salesByProduct)
    .sort(([,a], [,b]) => (b as number) - (a as number));
    
  if (productPerformance.length > 0) {
    const [topProduct, topRevenue] = productPerformance[0];
    const concentrationRatio = (topRevenue as number) / totalRevenue;
    
    if (concentrationRatio > 0.7) {
      insights.push({
        user_id: userId,
        product_name: 'Business Risk',
        insight_type: 'dangerous_concentration',
        message: `⚡ HIGH RISK: ${topProduct} generates ${(concentrationRatio * 100).toFixed(0)}% of revenue (¢${(topRevenue as number).toFixed(0)}). Business extremely vulnerable - diversify URGENTLY!`,
        priority: 'high'
      });
    } else if (concentrationRatio > 0.4) {
      const monthlyProjection = (topRevenue as number) * 1.2; // Project growth
      insights.push({
        user_id: userId,
        product_name: 'Revenue Strategy',
        insight_type: 'revenue_concentration',
        message: `🎯 REVENUE FOCUS: ${topProduct} is your cash cow (${(concentrationRatio * 100).toFixed(0)}% of revenue). Projected monthly: ¢${monthlyProjection.toFixed(0)}. Never let it stock out!`,
        priority: 'medium'
      });
    }
  }

  // 3. Growth Opportunities
  if (totalProducts < 5 && avgDailyRevenue > 30) {
    const growthPotential = avgDailyRevenue * 2 * 30; // Double revenue potential
    insights.push({
      user_id: userId,
      product_name: 'Growth Strategy',
      insight_type: 'expansion_opportunity',
      message: `🚀 SCALE UP: Only ${totalProducts} products generating ¢${totalRevenue.toFixed(0)}/month. Add 3-5 complementary items to reach ¢${growthPotential.toFixed(0)}/month!`,
      priority: 'medium'
    });
  } else if (totalProducts > 15 && stockTurnover < 2) {
    insights.push({
      user_id: userId,
      product_name: 'Efficiency Warning',
      insight_type: 'product_bloat',
      message: `📊 FOCUS NEEDED: ${totalProducts} products with low turnover (${stockTurnover.toFixed(1)}x). Cut underperformers and focus on winners for better profits.`,
      priority: 'medium'
    });
  }

  // 4. Financial Health Insights
  const estimatedCapitalTied = totalStock * 15; // Estimate ¢15 avg cost
  const capitalEfficiency = totalRevenue / estimatedCapitalTied;
  
  if (capitalEfficiency < 0.5) {
    insights.push({
      user_id: userId,
      product_name: 'Financial Health',
      insight_type: 'capital_efficiency',
      message: `💰 CAPITAL ALERT: ¢${estimatedCapitalTied.toFixed(0)} tied in inventory generating only ¢${totalRevenue.toFixed(0)} revenue. Efficiency: ${(capitalEfficiency * 100).toFixed(0)}%. Optimize stock levels!`,
      priority: 'medium'
    });
  } else if (capitalEfficiency > 2) {
    insights.push({
      user_id: userId,
      product_name: 'Business Success',
      insight_type: 'excellent_efficiency',
      message: `🏆 EXCELLENT PERFORMANCE: Capital efficiency at ${(capitalEfficiency * 100).toFixed(0)}%! Your ¢${estimatedCapitalTied.toFixed(0)} investment generating ¢${totalRevenue.toFixed(0)}. Keep this up!`,
      priority: 'low'
    });
  }

  // 5. Market Position Insights
  if (totalRevenue > 2000) {
    const marketPosition = totalRevenue > 5000 ? "MARKET LEADER" : "STRONG PERFORMER";
    insights.push({
      user_id: userId,
      product_name: 'Market Position',
      insight_type: 'market_success',
      message: `👑 ${marketPosition}: ¢${totalRevenue.toFixed(0)} monthly revenue puts you in top tier! Consider premium products or market expansion.`,
      priority: 'low'
    });
  } else if (totalRevenue < 500 && totalProducts > 0) {
    insights.push({
      user_id: userId,
      product_name: 'Growth Priority',
      insight_type: 'revenue_building',
      message: `🌱 GROWTH MODE: ¢${totalRevenue.toFixed(0)} monthly revenue. Focus on customer acquisition and product promotion to reach ¢1000+ target.`,
      priority: 'medium'
    });
  }

  return insights;
}