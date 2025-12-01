import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { subscribeToSalesDataUpdates } from "@/lib/sales-events";
import { fetchSalesAnalytics } from "@/lib/sales-analytics";

interface WatchlistItem {
  id: string;
  product_name: string;
  target_price: number;
  current_price: number;
  alert_enabled: boolean;
  user_id: string;
  created_at: string;
}

interface ProductPrice {
  name: string;
  currentPrice: number;
  trend: 'up' | 'down' | 'flat';
  priceChange: number;
}

export const useWatchlistData = () => {
  const { user } = useAuth();
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlistData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user's products and their recent sales to calculate current prices
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sales = await fetchSalesAnalytics(user.id, {
        startDate: thirtyDaysAgo.toISOString(),
        includeReversed: false
      });

      // Calculate current prices from recent sales
      const productPrices = new Map<string, { price: number, oldPrice: number, count: number }>();

      // Get prices from last 30 days
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

      sales.forEach(sale => {
        const saleDate = new Date(sale.purchase_date);
        const price = Number(sale.effective_amount ?? sale.amount ?? 0);

        if (!productPrices.has(sale.product_name)) {
          productPrices.set(sale.product_name, { price: 0, oldPrice: 0, count: 0 });
        }

        const product = productPrices.get(sale.product_name)!;

        if (saleDate >= fifteenDaysAgo) {
          // Recent price (last 15 days)
          product.price = (product.price * product.count + price) / (product.count + 1);
          product.count++;
        } else if (saleDate >= thirtyDaysAgo) {
          // Older price (15-30 days ago) for comparison
          product.oldPrice = price;
        }
      });

      // Convert to available products with trend analysis
      const available: ProductPrice[] = [];
      productPrices.forEach((data, name) => {
        const currentPrice = data.price > 0 ? data.price : data.oldPrice;
        let trend: 'up' | 'down' | 'flat' = 'flat';
        let priceChange = 0;

        if (data.price > 0 && data.oldPrice > 0) {
          const change = data.price - data.oldPrice;
          priceChange = change;
          if (Math.abs(change) > 1) {
            trend = change > 0 ? 'up' : 'down';
          }
        }

        available.push({
          name,
          currentPrice,
          trend,
          priceChange
        });
      });

      setAvailableProducts(available);

      // For now, we'll use a simple in-memory watchlist since we don't have a watchlist table
      // In a real app, you'd have a watchlist table in Supabase
      const mockWatchlist: WatchlistItem[] = available.slice(0, 3).map((product, index) => ({
        id: `watch_${index}`,
        product_name: product.name,
        target_price: product.currentPrice * 0.8, // 20% lower than current price
        current_price: product.currentPrice,
        alert_enabled: true,
        user_id: user.id,
        created_at: new Date().toISOString()
      }));

      setWatchlistItems(mockWatchlist);

    } catch (error) {
      console.error('Error fetching watchlist data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addToWatchlist = async (productName: string, targetPrice: number) => {
    const product = availableProducts.find(p => p.name.toLowerCase() === productName.toLowerCase());
    if (!product || !user) return;

    const newItem: WatchlistItem = {
      id: `watch_${Date.now()}`,
      product_name: productName,
      target_price: targetPrice,
      current_price: product.currentPrice,
      alert_enabled: true,
      user_id: user.id,
      created_at: new Date().toISOString()
    };

    setWatchlistItems(prev => [...prev, newItem]);
  };

  const removeFromWatchlist = (itemId: string) => {
    setWatchlistItems(prev => prev.filter(item => item.id !== itemId));
  };

  const toggleAlert = (itemId: string) => {
    setWatchlistItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, alert_enabled: !item.alert_enabled } : item
      )
    );
  };

  useEffect(() => {
    fetchWatchlistData();
  }, [fetchWatchlistData]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const unsubscribe = subscribeToSalesDataUpdates(() => {
      fetchWatchlistData();
    });
    return unsubscribe;
  }, [user, fetchWatchlistData]);

  return {
    watchlistItems,
    availableProducts,
    loading,
    addToWatchlist,
    removeFromWatchlist,
    toggleAlert,
    refreshData: fetchWatchlistData
  };
};