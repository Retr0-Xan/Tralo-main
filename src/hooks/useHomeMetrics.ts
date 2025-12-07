import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToSalesDataUpdates } from "@/lib/sales-events";

interface HomeMetricsResult {
  todaysSales: number;
  monthlyGoodsTraded: number;
  currentStockValue: number;
  monthlyProfit: number;
}

interface HomeMetrics extends HomeMetricsResult {
  loading: boolean;
  error: string | null;
}

const fetchHomeMetrics = async (userId: string): Promise<HomeMetricsResult> => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const [todaysSalesResult, monthlySalesResult, productsResult, receiptsResult, movementsResult] = await Promise.all([
    supabase
      .from("sales_analytics")
      .select("effective_amount")
      .eq("user_id", userId)
      .eq("is_reversed", false)
      .gte("purchase_date", startOfDay.toISOString())
      .lt("purchase_date", endOfDay.toISOString()),
    supabase
      .from("sales_analytics")
      .select("effective_amount, product_name, effective_quantity")
      .eq("user_id", userId)
      .eq("is_reversed", false)
      .gte("purchase_date", startOfMonth.toISOString())
      .lt("purchase_date", startOfNextMonth.toISOString()),
    supabase
      .from("user_products")
      .select("product_name, current_stock, selling_price, last_sale_date")
      .eq("user_id", userId)
      .gt("current_stock", 0),
    supabase
      .from("inventory_receipts")
      .select("product_name, unit_cost, quantity_received, total_cost")
      .eq("user_id", userId),
    supabase
      .from("inventory_movements")
      .select("product_name, quantity, unit_price, movement_type")
      .eq("user_id", userId)
      .eq("movement_type", "received"),
  ]);

  if (todaysSalesResult.error) {
    throw todaysSalesResult.error;
  }

  if (monthlySalesResult.error) {
    throw monthlySalesResult.error;
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  if (receiptsResult.error) {
    throw receiptsResult.error;
  }

  if (movementsResult.error) {
    throw movementsResult.error;
  }

  const todaysSales = (todaysSalesResult.data ?? []).reduce((sum, sale) => {
    const amount = Number((sale as { effective_amount: number }).effective_amount ?? 0);
    return amount > 0 ? sum + amount : sum;
  }, 0);
  const monthlyGoodsTraded = (monthlySalesResult.data ?? []).reduce((sum, sale) => {
    const amount = Number((sale as { effective_amount: number }).effective_amount ?? 0);
    return amount > 0 ? sum + amount : sum;
  }, 0);

  let currentStockValue = 0;

  const receipts = receiptsResult.data ?? [];
  const movementReceipts = movementsResult.data ?? [];

  if (productsResult.data && productsResult.data.length > 0) {
    for (const product of productsResult.data) {
      const productName = (product.product_name ?? "").toLowerCase();

      const productReceipts = receipts.filter((receipt) => (receipt.product_name ?? "").toLowerCase() === productName);

      const totalReceiptQuantity = productReceipts.reduce(
        (sum, receipt) => sum + Number(receipt.quantity_received ?? 0),
        0,
      );
      const totalReceiptCost = productReceipts.reduce((sum, receipt) => {
        const derivedCost =
          receipt.total_cost ?? Number(receipt.unit_cost ?? 0) * Number(receipt.quantity_received ?? 0);
        return sum + Number(derivedCost ?? 0);
      }, 0);

      let averageCostPerUnit = totalReceiptQuantity > 0 ? totalReceiptCost / totalReceiptQuantity : 0;

      if (averageCostPerUnit === 0) {
        const productMovements = movementReceipts.filter(
          (movement) => (movement.product_name ?? "").toLowerCase() === productName,
        );

        const movementTotals = productMovements.reduce(
          (acc, movement) => {
            const quantity = Math.abs(Number(movement.quantity ?? 0));
            const unitPrice = Number(movement.unit_price ?? 0);
            return {
              quantity: acc.quantity + quantity,
              cost: acc.cost + quantity * unitPrice,
            };
          },
          { quantity: 0, cost: 0 },
        );

        if (movementTotals.quantity > 0 && movementTotals.cost > 0) {
          averageCostPerUnit = movementTotals.cost / movementTotals.quantity;
        }
      }

      if (averageCostPerUnit === 0 && product.selling_price) {
        averageCostPerUnit = Number(product.selling_price);
      }

      // Use selling price when available (matches inventory analytics calculation)
      const unitStockValue = Number(product.selling_price ?? 0) > 0
        ? Number(product.selling_price)
        : averageCostPerUnit;

      currentStockValue += Number(product.current_stock ?? 0) * unitStockValue;
    }
  }

  // Calculate monthly profit (Revenue - COGS)
  let monthlyCOGS = 0;

  if (monthlySalesResult.data && monthlySalesResult.data.length > 0) {
    for (const sale of monthlySalesResult.data) {
      const productName = (sale.product_name ?? "").toLowerCase();
      const quantitySold = Number(sale.effective_quantity ?? 0);

      if (quantitySold === 0) continue;

      // Find cost from receipts
      const productReceipts = receipts.filter((receipt) =>
        (receipt.product_name ?? "").toLowerCase() === productName
      );

      const totalReceiptQuantity = productReceipts.reduce(
        (sum, receipt) => sum + Number(receipt.quantity_received ?? 0),
        0,
      );
      const totalReceiptCost = productReceipts.reduce((sum, receipt) => {
        const derivedCost =
          receipt.total_cost ?? Number(receipt.unit_cost ?? 0) * Number(receipt.quantity_received ?? 0);
        return sum + Number(derivedCost ?? 0);
      }, 0);

      let costPerUnit = totalReceiptQuantity > 0 ? totalReceiptCost / totalReceiptQuantity : 0;

      // Fallback to movements if no receipt data
      if (costPerUnit === 0) {
        const productMovements = movementReceipts.filter(
          (movement) => (movement.product_name ?? "").toLowerCase() === productName,
        );

        const movementTotals = productMovements.reduce(
          (acc, movement) => {
            const quantity = Math.abs(Number(movement.quantity ?? 0));
            const unitPrice = Number(movement.unit_price ?? 0);
            return {
              quantity: acc.quantity + quantity,
              cost: acc.cost + quantity * unitPrice,
            };
          },
          { quantity: 0, cost: 0 },
        );

        if (movementTotals.quantity > 0 && movementTotals.cost > 0) {
          costPerUnit = movementTotals.cost / movementTotals.quantity;
        }
      }

      // Add to COGS
      monthlyCOGS += costPerUnit * quantitySold;
    }
  }

  const monthlyProfit = monthlyGoodsTraded - monthlyCOGS;

  return {
    todaysSales,
    monthlyGoodsTraded,
    currentStockValue,
    monthlyProfit,
  };
};

export const homeMetricsQueryKey = (userId?: string | null) => ["home-metrics", userId ?? "anonymous"];

export const useHomeMetrics = (): HomeMetrics => {
  const { user } = useAuth();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: homeMetricsQueryKey(user?.id),
    queryFn: () => fetchHomeMetrics(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) {
      return;
    }
    const unsubscribe = subscribeToSalesDataUpdates(() => {
      refetch();
    });
    return unsubscribe;
  }, [user, refetch]);

  if (!user) {
    return {
      todaysSales: 0,
      monthlyGoodsTraded: 0,
      currentStockValue: 0,
      monthlyProfit: 0,
      loading: false,
      error: null,
    };
  }

  return {
    todaysSales: data?.todaysSales ?? 0,
    monthlyGoodsTraded: data?.monthlyGoodsTraded ?? 0,
    currentStockValue: data?.currentStockValue ?? 0,
    monthlyProfit: data?.monthlyProfit ?? 0,
    loading: isLoading || isFetching,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to fetch home metrics"
      : null,
  };
};