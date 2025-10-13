import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type SalesAnalyticsRow = Tables<"sales_analytics">;

export interface SalesFilterOptions {
    startDate?: string;
    endDate?: string;
    businessId?: string;
    includeReversed?: boolean;
    limit?: number;
}

export const fetchSalesAnalytics = async (
    userId: string,
    options: SalesFilterOptions = {}
): Promise<SalesAnalyticsRow[]> => {
    let query = supabase
        .from("sales_analytics")
        .select("*")
        .eq("user_id", userId)
        .order("purchase_date", { ascending: false });

    if (options.businessId) {
        query = query.eq("business_id", options.businessId);
    }

    if (options.startDate) {
        query = query.gte("purchase_date", options.startDate);
    }

    if (options.endDate) {
        query = query.lte("purchase_date", options.endDate);
    }

    if (!options.includeReversed) {
        query = query.eq("is_reversed", false);
    }

    if (options.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return data ?? [];
};

export const fetchSalesAnalyticsById = async (
    userId: string,
    saleId: string
): Promise<SalesAnalyticsRow | null> => {
    const { data, error } = await supabase
        .from("sales_analytics")
        .select("*")
        .eq("user_id", userId)
        .eq("sale_id", saleId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data ?? null;
};

export const sumEffectiveAmount = (rows: SalesAnalyticsRow[]): number => {
    return rows.reduce((sum, row) => sum + Number(row.effective_amount ?? 0), 0);
};

export const sumEffectiveQuantity = (rows: SalesAnalyticsRow[]): number => {
    return rows.reduce((sum, row) => sum + Number(row.effective_quantity ?? 0), 0);
};

export const filterByDateRange = (
    rows: SalesAnalyticsRow[],
    start: Date,
    end: Date
): SalesAnalyticsRow[] => {
    const startTime = start.getTime();
    const endTime = end.getTime();
    return rows.filter((row) => {
        const saleDate = new Date(row.purchase_date).getTime();
        return saleDate >= startTime && saleDate <= endTime;
    });
};
