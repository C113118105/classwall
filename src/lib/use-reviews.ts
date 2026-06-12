"use client";

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { Review } from "@/types/database";

/**
 * 載入單一餐廳的評論 + Realtime 訂閱
 */
export function useReviews(restaurantId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await supabase
        .from("reviews")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setReviews(data ?? []);
      }
      setLoading(false);
    }

    load();

    // Realtime：只訂閱該餐廳的評論
    const channel = supabase
      .channel(`reviews-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reviews",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const next = payload.new as Review;
          setReviews((prev) =>
            prev.some((a) => a.id === next.id) ? prev : [...prev, next]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const addReview = useCallback(
    async (
      content: string,
      rating: number,
      image_url: string | null = null
    ) => {
      const trimmed = content.trim();
      if (!trimmed) return { error: "評論不能為空" };
      if (rating < 1 || rating > 5) return { error: "評分必須在 1-5 之間" };

      const { error: insertError } = await supabase.from("reviews").insert({
        restaurant_id: restaurantId,
        content: trimmed,
        rating,
        image_url,
      });

      if (insertError) return { error: insertError.message };

      // 更新平均評分
      await supabase.rpc("update_restaurant_rating", { rid: restaurantId });

      return { error: null };
    },
    [restaurantId]
  );

  return { reviews, loading, error, addReview };
}
