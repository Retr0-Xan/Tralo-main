import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface HomeMetricsResult {
  todaysSales: number;
  monthlyGoodsTraded: number;
  currentStockValue: number;
}

interface HomeMetrics extends HomeMetricsResult {
  loading: boolean;
  error: string | null;
}

const fetchHomeMetrics = async (userId: string): Promise<HomeMetricsResult> => {
  const { data: businessProfile, error: businessProfileError } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (businessProfileError) {
    throw businessProfileError;
  }

  if (!businessProfile) {
    return {
      todaysSales: 0,
      monthlyGoodsTraded: 0,
      currentStockValue: 0,
    };
  }

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const [todaysSalesResult, monthlySalesResult, productsResult, receiptsResult, movementsResult] = await Promise.all([
    supabase
      .from("customer_purchases")
      .select("amount")
      .eq("business_id", businessProfile.id)
      .gte("purchase_date", startOfDay.toISOString())
      .lt("purchase_date", endOfDay.toISOString()),
    supabase
      .from("customer_purchases")
      .select("amount")
      .eq("business_id", businessProfile.id)
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

  const todaysSales = todaysSalesResult.data?.reduce((sum, sale) => sum + Number(sale.amount), 0) ?? 0;
  const monthlyGoodsTraded = monthlySalesResult.data?.reduce(
    (sum, sale) => sum + Number(sale.amount),
    0,
  ) ?? 0;

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

      currentStockValue += Number(product.current_stock ?? 0) * averageCostPerUnit;
    }
  }

  return {
    todaysSales,
    monthlyGoodsTraded,
    currentStockValue,
  };
};

export const homeMetricsQueryKey = (userId?: string | null) => ["home-metrics", userId ?? "anonymous"];

export const useHomeMetrics = (): HomeMetrics => {
  const { user } = useAuth();

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: homeMetricsQueryKey(user?.id),
    queryFn: () => fetchHomeMetrics(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  if (!user) {
    return {
      todaysSales: 0,
      monthlyGoodsTraded: 0,
      currentStockValue: 0,
      loading: false,
      error: null,
    };
  }

  return {
    todaysSales: data?.todaysSales ?? 0,
    monthlyGoodsTraded: data?.monthlyGoodsTraded ?? 0,
    currentStockValue: data?.currentStockValue ?? 0,
    loading: isLoading || isFetching,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to fetch home metrics"
      : null,
  };
};