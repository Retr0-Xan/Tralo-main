import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { subscribeToSalesDataUpdates } from "@/lib/sales-events";

interface CommodityData {
  name: string;
  unit: string;
  currentStock: number;
  averageCost: number;
  totalSales: number;
  lastSaleDate: string | null;
  stockValue: number;
  salesThisMonth: number;
  trend?: 'up' | 'down' | 'flat';
  priceChange?: string;
  makolaPrice?: string;
  texpoPrice?: string;
}

interface MarketInsight {
  type: 'stock_low' | 'sales_good' | 'restock_needed' | 'profit_good';
  message: string;
  priority: 'high' | 'medium' | 'low';
  product: string;
}

export const useTradeIndexData = () => {
  const { user } = useAuth();
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTradeData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user's business profile
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!businessProfile) {
        setLoading(false);
        return;
      }

      // Get inventory data
      const { data: inventory } = await supabase
        .from('inventory_receipts')
        .select('product_name, quantity_received, unit_cost, total_cost')
        .eq('user_id', user.id);

      // Get sales data
      const { data: sales } = await supabase
        .from('customer_purchases')
        .select('product_name, amount, purchase_date')
        .eq('business_id', businessProfile.id);

      // Get current stock levels
      const { data: products } = await supabase
        .from('user_products')
        .select('product_name, current_stock, total_sales_this_month, last_sale_date')
        .eq('user_id', user.id);

      // Process data to create commodity insights
      const commodityMap = new Map<string, CommodityData>();

      // Process inventory data
      inventory?.forEach(item => {
        const name = item.product_name.toLowerCase();
        if (!commodityMap.has(name)) {
          commodityMap.set(name, {
            name: item.product_name,
            unit: 'unit',
            currentStock: 0,
            averageCost: 0,
            totalSales: 0,
            lastSaleDate: null,
            stockValue: 0,
            salesThisMonth: 0
          });
        }

        const commodity = commodityMap.get(name)!;
        commodity.currentStock += item.quantity_received;
        commodity.averageCost = item.unit_cost || 0;
        commodity.stockValue += item.total_cost || 0;
      });

      // Process sales data
      const filteredSales = (sales || []).filter((sale) => Number(sale.amount) > 0);

      filteredSales.forEach(sale => {
        const name = sale.product_name.toLowerCase();
        if (commodityMap.has(name)) {
          const commodity = commodityMap.get(name)!;
          commodity.totalSales += Number(sale.amount);

          // Check if sale is this month
          const saleDate = new Date(sale.purchase_date);
          const now = new Date();
          if (saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear()) {
            commodity.salesThisMonth += Number(sale.amount);
          }
        }
      });

      // Update with current stock levels
      products?.forEach(product => {
        const name = product.product_name.toLowerCase();
        if (commodityMap.has(name)) {
          const commodity = commodityMap.get(name)!;
          commodity.currentStock = product.current_stock || 0;
          commodity.salesThisMonth = Number(product.total_sales_this_month || 0);
          commodity.lastSaleDate = product.last_sale_date;
        }
      });

      const commoditiesArray = Array.from(commodityMap.values());
      setCommodities(commoditiesArray);

      // Generate insights
      const generatedInsights: MarketInsight[] = [];

      commoditiesArray.forEach(commodity => {
        // Low stock alert
        if (commodity.currentStock <= 2 && commodity.currentStock > 0) {
          generatedInsights.push({
            type: 'stock_low',
            message: `⚠️ ${commodity.name} stock is low (${commodity.currentStock} units). Consider restocking soon.`,
            priority: 'high',
            product: commodity.name
          });
        }

        // Out of stock alert
        if (commodity.currentStock === 0) {
          generatedInsights.push({
            type: 'restock_needed',
            message: `🔴 ${commodity.name} is out of stock. Restock immediately to avoid lost sales.`,
            priority: 'high',
            product: commodity.name
          });
        }

        // Good sales performance
        if (commodity.salesThisMonth > commodity.averageCost * 10) {
          generatedInsights.push({
            type: 'sales_good',
            message: `🎯 ${commodity.name} is performing well this month! Sales: ¢${commodity.salesThisMonth.toFixed(2)}`,
            priority: 'medium',
            product: commodity.name
          });
        }

        // Profit insights
        if (commodity.totalSales > commodity.stockValue * 2) {
          generatedInsights.push({
            type: 'profit_good',
            message: `💰 ${commodity.name} shows excellent profit margins. Consider expanding this product line.`,
            priority: 'low',
            product: commodity.name
          });
        }
      });

      setInsights(generatedInsights);

    } catch (error) {
      console.error('Error fetching trade data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTradeData();
  }, [fetchTradeData]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const unsubscribe = subscribeToSalesDataUpdates(() => {
      fetchTradeData();
    });
    return unsubscribe;
  }, [user, fetchTradeData]);

  const refreshData = () => {
    setLoading(true);
    fetchTradeData();
  };

  return {
    commodities,
    insights,
    loading,
    refreshData
  };
};