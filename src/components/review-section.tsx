"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { useReviews } from "@/lib/use-reviews";
import { cn } from "@/lib/utils";

type Props = {
  restaurantId: string;
};

export function ReviewSection({ restaurantId }: Props) {
  const { reviews, loading, error, addReview } = useReviews(restaurantId);
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    const { error } = await addReview(content.trim(), rating, imagePreview);

    setSubmitting(false);
    if (error) {
      setSubmitError(error);
    } else {
      setContent("");
      setRating(5);
      setImagePreview(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* 新增評論表單 */}
      <form onSubmit={handleSubmitReview} className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium">我的評分：</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRating(r)}
                className={cn(
                  "text-lg transition-transform",
                  rating >= r ? "scale-125" : "opacity-50"
                )}
              >
                ⭐
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{rating} 星</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="text-xs font-medium">評論附圖（可選）</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) {
                  setImagePreview(null);
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setImagePreview(reader.result as string);
                };
                reader.onerror = () => {
                  setImagePreview(null);
                };
                reader.readAsDataURL(file);
              }}
              className="mt-1 block w-full rounded-xl border border-border/60 bg-background/70 p-2 text-sm text-foreground file:cursor-pointer file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:text-primary"
            />
          </div>
          {imagePreview ? (
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-border/60 bg-muted/30 px-4 text-xs text-muted-foreground transition hover:bg-muted/50"
            >
              取消圖片
            </button>
          ) : null}
        </div>

        {imagePreview ? (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="評論附圖預覽"
              className="h-36 w-full object-cover"
            />
          </div>
        ) : null}

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="分享你的用餐心得..."
          maxLength={500}
          rows={2}
          disabled={submitting}
          className={cn(
            "resize-none border-border/50 bg-background/50 text-sm",
            "placeholder:text-muted-foreground/60"
          )}
        />

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {content.length}/500
          </span>
          <motion.button
            type="submit"
            disabled={submitting || !content.trim()}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2",
              "border border-primary/70 bg-primary/10 text-sm font-medium",
              "text-primary transition-all duration-200",
              "hover:bg-primary/20 hover:border-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {submitting ? "提交中…" : "提交評論"}
          </motion.button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            >
              {submitError}
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* 評論列表 */}
      <div className="space-y-2 border-t border-border/30 pt-3">
        {loading ? (
          <p className="text-xs text-muted-foreground">載入評論中…</p>
        ) : error ? (
          <p className="text-xs text-destructive">讀取評論失敗：{error}</p>
        ) : reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground/70">還沒有評論，成為第一位評論者吧</p>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-lg border border-border/30 bg-muted/20 p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium">{"⭐".repeat(review.rating)}</span>
                    <span className="text-xs text-muted-foreground">{review.rating}/5</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                      {review.content}
                    </p>
                    {review.image_url ? (
                      <div className="overflow-hidden rounded-2xl bg-card/70">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={review.image_url}
                          alt="評論圖片"
                          className="mt-3 h-40 w-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
