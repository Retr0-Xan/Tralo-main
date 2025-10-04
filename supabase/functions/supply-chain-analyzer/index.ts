import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupplyChainMetrics {
  product_name: string;
  total_received: number;
  total_sold: number;
  current_stock: number;
  days_in_inventory: number;
  turnover_rate: number;
  supplier_count: number;
  avg_unit_cost: number;
  total_investment: number;
  total_revenue: number;
  profit_margin: number;
  status: string;
  status_color: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, product_name } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing supply chain for user: ${user_id}, product: ${product_name || 'all'}`);

    let productFilter = {};
    if (product_name) {
      productFilter = { product_name };
    }

    // Get inventory receipts
    const { data: receipts } = await supabase
      .from('inventory_receipts')
      .select(`
        *,
        suppliers (name, location)
      `)
      .eq('user_id', user_id)
      .match(productFilter)
      .order('received_date', { ascending: false });

    // Get inventory movements
    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('user_id', user_id)
      .match(productFilter)
      .order('movement_date', { ascending: false });

    // Get customer purchases for revenue calculation
    // First get business profile to get correct business_id
    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user_id)
      .single();

    let sales = [];
    if (businessProfile) {
      const { data: salesData } = await supabase
        .from('customer_purchases')
        .select('*')
        .eq('business_id', businessProfile.id)
        .order('purchase_date', { ascending: false });
      sales = salesData || [];
    }

    if (!receipts && !movements) {
      return new Response(JSON.stringify({ 
        metrics: null, 
        message: 'No supply chain data found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate metrics for each product or specific product
    const metrics = calculateSupplyChainMetrics(receipts || [], movements || [], sales);

    // Generate insights based on metrics
    const insights = await generateSupplyChainInsights(metrics, user_id, supabase);

    return new Response(JSON.stringify({ 
      metrics,
      insights,
      summary: {
        total_products: Object.keys(metrics).length,
        total_investment: Object.values(metrics).reduce((sum: number, m: any) => sum + m.total_investment, 0),
        total_revenue: Object.values(metrics).reduce((sum: number, m: any) => sum + m.total_revenue, 0),
        insights_generated: insights.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in supply chain analyzer:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateSupplyChainMetrics(receipts: any[], movements: any[], sales: any[]): Record<string, SupplyChainMetrics> {
  const productMetrics: Record<string, SupplyChainMetrics> = {};

  // Process receipts to get base data
  receipts.forEach(receipt => {
    const productName = receipt.product_name;
    
    if (!productMetrics[productName]) {
      productMetrics[productName] = {
        product_name: productName,
        total_received: 0,
        total_sold: 0,
        current_stock: 0,
        days_in_inventory: 0,
        turnover_rate: 0,
        supplier_count: 0,
        avg_unit_cost: 0,
        total_investment: 0,
        total_revenue: 0,
        profit_margin: 0,
        status: 'Active',
        status_color: 'green'
      };
    }

    const metrics = productMetrics[productName];
    metrics.total_received += receipt.quantity_received;
    metrics.total_investment += Number(receipt.total_cost || 0);
  });

  // Process movements to track flow
  movements.forEach(movement => {
    const productName = movement.product_name;
    
    if (!productMetrics[productName]) {
      productMetrics[productName] = {
        product_name: productName,
        total_received: 0,
        total_sold: 0,
        current_stock: 0,
        days_in_inventory: 0,
        turnover_rate: 0,
        supplier_count: 0,
        avg_unit_cost: 0,
        total_investment: 0,
        total_revenue: 0,
        profit_margin: 0,
        status: 'Active',
        status_color: 'green'
      };
    }

    const metrics = productMetrics[productName];
    
    if (movement.movement_type === 'sold') {
      metrics.total_sold += Math.abs(movement.quantity);
      metrics.total_revenue += Number(movement.unit_price || 0) * Math.abs(movement.quantity);
    }
  });

  // Calculate derived metrics
  Object.keys(productMetrics).forEach(productName => {
    const metrics = productMetrics[productName];
    
    // Current stock calculation
    metrics.current_stock = metrics.total_received - metrics.total_sold;
    
    // Average unit cost
    if (metrics.total_received > 0) {
      metrics.avg_unit_cost = metrics.total_investment / metrics.total_received;
    }
    
    // Turnover rate (how many times inventory has been sold)
    if (metrics.total_received > 0) {
      metrics.turnover_rate = metrics.total_sold / metrics.total_received;
    }
    
    // Profit margin
    if (metrics.total_revenue > 0) {
      const totalCostOfGoodsSold = metrics.avg_unit_cost * metrics.total_sold;
      metrics.profit_margin = ((metrics.total_revenue - totalCostOfGoodsSold) / metrics.total_revenue) * 100;
    }
    
    // Days in inventory (simplified calculation)
    const oldestReceipt = receipts
      .filter(r => r.product_name === productName)
      .sort((a, b) => new Date(a.received_date).getTime() - new Date(b.received_date).getTime())[0];
    
    if (oldestReceipt) {
      const daysAgo = Math.floor((Date.now() - new Date(oldestReceipt.received_date).getTime()) / (1000 * 60 * 60 * 24));
      metrics.days_in_inventory = daysAgo;
    }
    
    // Status determination
    if (metrics.current_stock === 0) {
      metrics.status = 'Out of Stock';
      metrics.status_color = 'red';
    } else if (metrics.current_stock < 10) {
      metrics.status = 'Low Stock';
      metrics.status_color = 'orange';
    } else if (metrics.turnover_rate < 0.3) {
      metrics.status = 'Slow Moving';
      metrics.status_color = 'yellow';
    } else if (metrics.turnover_rate > 0.8) {
      metrics.status = 'Fast Moving';
      metrics.status_color = 'green';
    } else {
      metrics.status = 'Normal';
      metrics.status_color = 'blue';
    }
    
    // Count unique suppliers
    const productReceipts = receipts.filter(r => r.product_name === productName);
    const uniqueSuppliers = new Set(productReceipts.map(r => r.supplier_id));
    metrics.supplier_count = uniqueSuppliers.size;
  });

  return productMetrics;
}

async function generateSupplyChainInsights(metrics: Record<string, SupplyChainMetrics>, userId: string, supabase: any) {
  const insights = [];
  const now = new Date().toISOString();

  // Clean up old insights first to avoid duplicates
  try {
    await supabase
      .from('trade_insights')
      .delete()
      .eq('user_id', userId)
      .in('insight_type', ['supply_chain_low_stock', 'supply_chain_slow_moving', 'supply_chain_star_product', 'supply_chain_risk', 'stockout_alert', 'high_demand', 'margin_warning', 'getting_started']);
  } catch (error) {
    console.error('Error cleaning old insights:', error);
  }

  // If no products, encourage getting started
  if (Object.keys(metrics).length === 0) {
    insights.push({
      user_id: userId,
      product_name: 'Getting Started',
      insight_type: 'getting_started',
      message: '🎯 Ready to grow your business? Start by recording inventory receipts and sales to get personalized insights!',
      priority: 'low',
      created_at: now
    });
  }

  Object.values(metrics).forEach(metric => {
    // Stockout alerts (highest priority)
    if (metric.current_stock <= 0 && metric.total_sold > 0) {
      insights.push({
        user_id: userId,
        product_name: metric.product_name,
        insight_type: 'stockout_alert',
        message: `🚨 URGENT: ${metric.product_name} is out of stock! You've sold ${metric.total_sold} units. Restock immediately to avoid lost sales.`,
        priority: 'high',
        created_at: now
      });
    }
    // Low stock alerts
    else if (metric.current_stock <= 5 && metric.current_stock > 0 && metric.turnover_rate > 0.3) {
      insights.push({
        user_id: userId,
        product_name: metric.product_name,
        insight_type: 'supply_chain_low_stock',
        message: `⚠️ ${metric.product_name} is running low (${metric.current_stock} units left). Based on your sales pattern, consider reordering soon.`,
        priority: 'high',
        created_at: now
      });
    }

    // High demand products needing more stock
    if (metric.turnover_rate > 0.7 && metric.current_stock < 15) {
      insights.push({
        user_id: userId,
        product_name: metric.product_name,
        insight_type: 'high_demand',
        message: `📈 ${metric.product_name} is in high demand! Consider increasing stock levels to maximize sales opportunities.`,
        priority: 'medium',
        created_at: now
      });
    }

    // Slow moving inventory
    if (metric.days_in_inventory > 30 && metric.current_stock > 10 && metric.turnover_rate < 0.3) {
      insights.push({
        user_id: userId,
        product_name: metric.product_name,
        insight_type: 'supply_chain_slow_moving',
        message: `📦 ${metric.product_name} has been sitting for ${metric.days_in_inventory} days with low sales. Consider promotional pricing or bundling strategies.`,
        priority: 'medium',
        created_at: now
      });
    }

    // Star performing products
    if (metric.turnover_rate > 0.6 && metric.profit_margin > 20 && metric.total_revenue > 100) {
      insights.push({
        user_id: userId,
        product_name: metric.product_name,
        insight_type: 'supply_chain_star_product',
        message: `⭐ ${metric.product_name} is a star performer! ${metric.profit_margin.toFixed(1)}% margin, ¢${metric.total_revenue.toFixed(0)} revenue. Focus on this product!`,
        priority: 'low',
        created_at: now
      });
    }

    // Low margin warnings
    if (metric.profit_margin < 10 && metric.profit_margin > 0 && metric.total_revenue > 50) {
      insights.push({
        user_id: userId,
        product_name: metric.product_name,
        insight_type: 'margin_warning',
        message: `💰 ${metric.product_name} has low profit margin (${metric.profit_margin.toFixed(1)}%). Review your pricing or negotiate better supplier costs.`,
        priority: 'medium',
        created_at: now
      });
    }

    // Supplier dependency risk
    if (metric.supplier_count === 1 && metric.total_revenue > 200) {
      insights.push({
        user_id: userId,
        product_name: metric.product_name,
        insight_type: 'supply_chain_risk',
        message: `⚠️ ${metric.product_name} depends on one supplier but generates significant revenue. Consider finding backup suppliers to reduce risk.`,
        priority: 'medium',
        created_at: now
      });
    }
  });

  // Insert insights into database
  const insertPromises = insights.map(async (insight) => {
    try {
      return await supabase
        .from('trade_insights')
        .insert(insight);
    } catch (error) {
      console.error('Error inserting supply chain insight:', error);
      return null;
    }
  });

  await Promise.all(insertPromises);
  console.log(`Generated ${insights.length} insights for user ${userId}`);

  return insights;
}