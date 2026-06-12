"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { Restaurant } from "@/types/database";

const DEFAULT_PAGE_SIZE = 10;

// 統一排序規則：先按評分降冪，同評分時新的在前
function sortByRating(list: Restaurant[]): Restaurant[] {
  return [...list].sort((a, b) => {
    if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * 分頁載入 restaurants + Realtime 訂閱
 */
export function useRestaurants(pageSize = DEFAULT_PAGE_SIZE) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const offsetRef = useRef(0);
  const idSetRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const isFirst = offsetRef.current === 0;
    if (isFirst) setLoading(true);
    else setLoadingMore(true);

    const from = offsetRef.current;
    const to = from + pageSize - 1;

    const { data, error: fetchError } = await supabase
      .from("restaurants")
      .select("*")
      .order("avg_rating", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    inFlightRef.current = false;

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const batch = (data ?? []).filter((r) => {
      if (idSetRef.current.has(r.id)) return false;
      idSetRef.current.add(r.id);
      return true;
    });

    setRestaurants((prev) => sortByRating([...prev, ...batch]));
    offsetRef.current = from + (data?.length ?? 0);
    setHasMore((data?.length ?? 0) === pageSize);
    setLoading(false);
    setLoadingMore(false);
  }, [pageSize]);

  useEffect(() => {
    loadMore();

    const channel = supabase
      .channel("restaurants-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "restaurants" },
        (payload) => {
          const next = payload.new as Restaurant;
          if (idSetRef.current.has(next.id)) return;
          idSetRef.current.add(next.id);
          setRestaurants((prev) => sortByRating([next, ...prev]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "restaurants" },
        (payload) => {
          const next = payload.new as Restaurant;
          setRestaurants((prev) =>
            sortByRating(prev.map((r) => (r.id === next.id ? next : r)))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "restaurants" },
        (payload) => {
          const old = payload.old as Pick<Restaurant, "id">;
          idSetRef.current.delete(old.id);
          setRestaurants((prev) => prev.filter((r) => r.id !== old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { restaurants, loading, loadingMore, hasMore, error, loadMore };
}
