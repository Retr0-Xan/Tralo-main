import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { subscribeToSalesDataUpdates } from "@/lib/sales-events";
import { fetchSalesAnalytics } from "@/lib/sales-analytics";

export interface InventoryOverviewItem {
    id: string;
    product_name: string;
    current_stock: number;
    local_unit?: string;
    international_unit?: string;
    last_sale_date?: string;
    total_sales_this_month: number;
    avg_selling_price?: number;
    avg_cost_price?: number;
    total_value: number;
    status: "healthy" | "low" | "out" | "slow";
    recommendation: string;
}

export interface InventoryStockMetrics {
    totalItems: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalRevenue: number;
}

export interface InventoryOverviewData {
    businessProfile: any | null;
    inventoryItems: InventoryOverviewItem[];
    stockMetrics: InventoryStockMetrics;
}

const buildInventoryOverview = async (userId: string): Promise<InventoryOverviewData> => {
    const { data: businessProfile } = await supabase
        .from("business_profiles")
        .select("id, business_name, business_address, phone_number")
        .eq("user_id", userId)
        .maybeSingle();

    if (!businessProfile) {
        return {
            businessProfile: null,
            inventoryItems: [],
            stockMetrics: {
                totalItems: 0,
                totalValue: 0,
                lowStockItems: 0,
                outOfStockItems: 0,
                totalRevenue: 0,
            },
        };
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [productsResp, receiptsResp, movementsResp, salesData] = await Promise.all([
        supabase.from("user_products").select("*").eq("user_id", userId).order("product_name"),
        supabase
            .from("inventory_receipts")
            .select("product_name, unit_cost, quantity_received, total_cost")
            .eq("user_id", userId),
        supabase
            .from("inventory_movements")
            .select("product_name, quantity, unit_price, movement_type")
            .eq("user_id", userId)
            .eq("movement_type", "received"),
        fetchSalesAnalytics(userId, {
            startDate: thirtyDaysAgo.toISOString(),
            includeReversed: false,
        }),
    ]);

    const products = productsResp.data || [];
    const receipts = receiptsResp.data || [];
    const movements = movementsResp.data || [];
    const sales = salesData;

    const inventoryItems: InventoryOverviewItem[] = products.map((product) => {
        const currentStock = Number(product.current_stock ?? 0);
        const productName = (product.product_name || "").toLowerCase();

        const productReceipts = receipts.filter(
            (r) => (r.product_name || "").toLowerCase() === productName
        );

        const totalReceived = productReceipts.reduce(
            (sum, r) => sum + Number(r.quantity_received ?? 0),
            0
        );
        const totalCost = productReceipts.reduce((sum, r) => {
            const receiptCost =
                r.total_cost ?? Number(r.unit_cost ?? 0) * Number(r.quantity_received ?? 0);
            return sum + Number(receiptCost ?? 0);
        }, 0);

        let avgCostPrice = totalReceived > 0 ? totalCost / totalReceived : 0;

        if (avgCostPrice === 0) {
            const productMovements = movements.filter(
                (m) => (m.product_name || "").toLowerCase() === productName
            );

            const totals = productMovements.reduce(
                (acc, movement) => {
                    const qty = Math.abs(Number(movement.quantity ?? 0));
                    const unitPrice = Number(movement.unit_price ?? 0);
                    return {
                        quantity: acc.quantity + qty,
                        cost: acc.cost + qty * unitPrice,
                    };
                },
                { quantity: 0, cost: 0 }
            );

            if (totals.quantity > 0 && totals.cost > 0) {
                avgCostPrice = totals.cost / totals.quantity;
            }
        }

        if (avgCostPrice === 0 && product.selling_price) {
            avgCostPrice = Number(product.selling_price);
        }

        const productSales = sales.filter((s) => {
            const saleName = (s.product_name || "").toLowerCase();
            return (
                (saleName.includes(productName) || productName.includes(saleName)) &&
                Number(s.effective_amount ?? s.amount ?? 0) > 0
            );
        });

        const totalSalesAmount = productSales.reduce(
            (sum, s) => sum + Number(s.effective_amount ?? s.amount ?? 0),
            0
        );
        const totalUnitsSold = productSales.reduce(
            (sum, s) => sum + Number(s.effective_quantity ?? s.quantity ?? 0),
            0
        );

        const avgSellingPrice = totalUnitsSold > 0
            ? totalSalesAmount / totalUnitsSold
            : Number(product.selling_price ?? 0) > 0
                ? Number(product.selling_price)
                : 0;

        const unitStockValue = Number(product.selling_price ?? 0) > 0
            ? Number(product.selling_price)
            : avgCostPrice || avgSellingPrice;

        const currentValue = currentStock * (unitStockValue || 0);

        let status: "healthy" | "low" | "out" | "slow";
        let recommendation: string;

        if (currentStock === 0) {
            status = "out";
            recommendation = `🚨 Out of stock - reorder ${product.product_name} immediately`;
        } else if (currentStock < 5) {
            status = "low";
            recommendation = `⚠️ Low stock - only ${currentStock} ${product.product_name} remaining`;
        } else if (productSales.length === 0 && currentStock > 20) {
            status = "slow";
            recommendation = `📊 ${product.product_name} moving slowly - consider promotion`;
        } else {
            status = "healthy";
            recommendation = `✅ ${product.product_name} stock levels are healthy`;
        }

        return {
            id: product.id,
            product_name: product.product_name,
            current_stock: currentStock,
            local_unit: (product as any).local_unit,
            international_unit: (product as any).international_unit,
            last_sale_date: product.last_sale_date,
            total_sales_this_month: Number(product.total_sales_this_month ?? 0),
            avg_selling_price: avgSellingPrice,
            avg_cost_price: avgCostPrice,
            total_value: currentValue,
            status,
            recommendation,
        };
    });

    const stockMetrics: InventoryStockMetrics = {
        totalItems: inventoryItems.reduce((sum, item) => sum + item.current_stock, 0),
        totalValue: inventoryItems.reduce((sum, item) => sum + item.total_value, 0),
        lowStockItems: inventoryItems.filter((item) => item.status === "low").length,
        outOfStockItems: inventoryItems.filter((item) => item.status === "out").length,
        totalRevenue: sales.reduce(
            (sum, sale) => sum + Number(sale.effective_amount ?? sale.amount ?? 0),
            0
        ),
    };

    return {
        businessProfile,
        inventoryItems,
        stockMetrics,
    };
};

export const inventoryOverviewQueryKey = (userId?: string | null) => [
    "inventory-overview",
    userId ?? "anonymous",
];

export const useInventoryOverview = () => {
    const { user } = useAuth();

    const query = useQuery({
        queryKey: inventoryOverviewQueryKey(user?.id),
        queryFn: () => buildInventoryOverview(user!.id),
        enabled: !!user?.id,
        staleTime: 30_000,
    });

    useEffect(() => {
        if (!user) {
            return;
        }
        const unsubscribe = subscribeToSalesDataUpdates(() => {
            query.refetch();
        });
        return unsubscribe;
    }, [user, query]);

    return query;
};
