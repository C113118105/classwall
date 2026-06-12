"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";

import { ReviewSection } from "@/components/review-section";
import { getAnonId } from "@/lib/anon-id";
import { addLiked, hasLiked } from "@/lib/liked-store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/types/database";

type Props = {
  restaurant: Restaurant;
};

// 收藏瞬間的粒子噴發
const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
  const distance = 28 + Math.random() * 18;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    delay: Math.random() * 0.05,
  };
});

function RestaurantCardImpl({ restaurant }: Props) {
  const [pending, setPending] = useState(false);
  const [alreadyFaved, setAlreadyFaved] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const isPopular = restaurant.avg_rating >= 4.5;

  const tiltRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setAlreadyFaved(hasLiked(restaurant.id));
  }, [restaurant.id]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  function handleMouseMove(event: React.MouseEvent<HTMLElement>) {
    const el = tiltRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      const rotateX = (-y * 6).toFixed(2);
      const rotateY = (x * 6).toFixed(2);
      el.style.transform = `perspective(1000px) translateY(-3px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
  }

  function handleMouseLeave() {
    const el = tiltRef.current;
    if (!el) return;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    el.style.transform = "";
  }

  async function handleFavorite() {
    if (pending || alreadyFaved) return;
    setPending(true);
    setAlreadyFaved(true);
    setBurstKey((k) => k + 1);
    addLiked(restaurant.id);

    const { error } = await supabase.rpc("add_favorite", {
      rid: restaurant.id,
      anon: getAnonId(),
    });

    setPending(false);
    if (error) {
      console.error("收藏失敗", error);
      setAlreadyFaved(false);
    }
  }

  const stars = "⭐".repeat(Math.round(restaurant.avg_rating));

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
    >
      <div
        ref={tiltRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "group relative overflow-hidden rounded-2xl bg-card text-card-foreground",
          "border border-border/70 p-5 sm:p-6",
          "shadow-[0_1px_0_oklch(0.92_0.02_70_/_0.4),0_8px_24px_-12px_oklch(0.5_0.05_45_/_0.18)]",
          "transition-[transform,border-color,box-shadow] duration-300 ease-out",
          "hover:border-primary/40 hover:shadow-[0_4px_0_oklch(0.92_0.02_70_/_0.3),0_18px_40px_-16px_oklch(0.62_0.18_38_/_0.35)]",
          "will-change-transform",
          isPopular && "border-amber-400/40"
        )}
        style={{ transformStyle: "preserve-3d" }}
      >
        {isPopular ? (
          <span
            aria-hidden
            className="absolute left-0 top-5 bottom-5 w-[3px] rounded-full bg-linear-to-b from-amber-400 via-orange-400 to-red-400"
          />
        ) : null}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold">{restaurant.name}</h3>
            <p className="text-sm text-muted-foreground">{restaurant.location}</p>
            <p className="text-sm text-foreground/80">{restaurant.description}</p>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-lg">{stars}</span>
              <span className="text-sm font-medium">{restaurant.avg_rating.toFixed(1)}</span>
            </div>
          </div>

          {/* 收藏按鈕 + 粒子 */}
          <div className="relative">
            <AnimatePresence mode="wait" key={burstKey}>
              {alreadyFaved && burstKey > 0 && (
                <div aria-hidden className="absolute inset-0 pointer-events-none">
                  {PARTICLES.map((p, i) => (
                    <motion.span
                      key={i}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
                      transition={{
                        delay: p.delay,
                        duration: 0.6,
                        ease: "easeOut",
                      }}
                      className="absolute inset-0 flex items-center justify-center text-lg"
                    >
                      ❤️
                    </motion.span>
                  ))}
                </div>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              onClick={handleFavorite}
              disabled={pending || alreadyFaved}
              whileTap={{ scale: 0.9 }}
              whileHover={alreadyFaved ? undefined : { scale: 1.1 }}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full",
                "transition-colors duration-200",
                alreadyFaved
                  ? "bg-red-500/20 text-red-600 dark:text-red-400"
                  : "border border-border/70 bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary"
              )}
            >
              {alreadyFaved ? "❤️" : "🤍"}
            </motion.button>
          </div>
        </div>

        {/* 展開/收起評論 */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
        >
          <span>{expanded ? "收起" : "查看"} 評論</span>
          <span aria-hidden>{expanded ? "▲" : "▼"}</span>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="mt-4 border-t border-border/50 pt-4"
            >
              <ReviewSection restaurantId={restaurant.id} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

export const RestaurantCard = memo(RestaurantCardImpl);
