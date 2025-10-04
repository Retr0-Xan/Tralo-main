import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface HomeMetrics {
  todaysSales: number;
  monthlyGoodsTraded: number;
  currentStockValue: number;
  loading: boolean;
  error: string | null;
}

export const useHomeMetrics = (): HomeMetrics => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<HomeMetrics>({
    todaysSales: 0,
    monthlyGoodsTraded: 0,
    currentStockValue: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) {
        setMetrics({
          todaysSales: 0,
          monthlyGoodsTraded: 0,
          currentStockValue: 0,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        setMetrics(prev => ({ ...prev, loading: true, error: null }));

        // Get user's business profile first
        const { data: businessProfile } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!businessProfile) {
          setMetrics({
            todaysSales: 0,
            monthlyGoodsTraded: 0,
            currentStockValue: 0,
            loading: false,
            error: null,
          });
          return;
        }

        // Get today's date range
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        // Fetch today's sales for this user's business
        const { data: salesData, error: salesError } = await supabase
          .from('customer_purchases')
          .select('amount')
          .eq('business_id', businessProfile.id)
          .gte('purchase_date', startOfDay.toISOString())
          .lt('purchase_date', endOfDay.toISOString());

        if (salesError) throw salesError;

        const todaysSales = salesData?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;

        // Get month date range for monthly goods traded
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Fetch this month's sales for goods traded calculation (total sales value)
        const { data: monthlySalesData, error: monthlySalesError } = await supabase
          .from('customer_purchases')
          .select('amount')
          .eq('business_id', businessProfile.id)
          .gte('purchase_date', startOfMonth.toISOString())
          .lte('purchase_date', endOfMonth.toISOString());

        if (monthlySalesError) throw monthlySalesError;

        // This represents the total value of goods traded/sold this month
        const monthlyGoodsTraded = monthlySalesData?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;

        // Fetch current products with their actual stock from user_products
        const { data: productsData, error: productsError } = await supabase
          .from('user_products')
          .select('product_name, current_stock')
          .eq('user_id', user.id)
          .gt('current_stock', 0);

        if (productsError) throw productsError;

        // For each product, get weighted average cost from inventory receipts
        let currentStockValue = 0;

        if (productsData && productsData.length > 0) {
          for (const product of productsData) {
            // Get all receipts for this product
            const { data: receiptsData } = await supabase
              .from('inventory_receipts')
              .select('unit_cost, total_cost, quantity_received')
              .eq('user_id', user.id)
              .ilike('product_name', product.product_name);

            if (receiptsData && receiptsData.length > 0) {
              // Calculate weighted average cost
              const totalCost = receiptsData.reduce((sum, r) => sum + Number(r.total_cost || 0), 0);
              const totalQty = receiptsData.reduce((sum, r) => sum + Number(r.quantity_received || 0), 0);
              const avgCostPerUnit = totalQty > 0 ? totalCost / totalQty : 0;

              // Add to total stock value: current_stock × average_cost_per_unit
              currentStockValue += product.current_stock * avgCostPerUnit;
            }
          }
        }

        setMetrics({
          todaysSales,
          monthlyGoodsTraded,
          currentStockValue,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching home metrics:', error);
        setMetrics(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch metrics',
        }));
      }
    };

    fetchMetrics();
  }, [user]);

  return metrics;
};