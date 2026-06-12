"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const MAX = 500;
const CHIPS = ["推薦愛店", "全民可見", "即時同步"];

export function RestaurantForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  const length = description.length;
  const ratio = Math.min(length / MAX, 1);
  const nearLimit = ratio >= 0.85;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nameT = name.trim();
    const descT = description.trim();
    const locT = location.trim();
    if (!nameT || !locT) return;

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("restaurants")
      .insert({ name: nameT, description: descT, location: locT });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName("");
    setDescription("");
    setLocation("");
    setFlashKey((k) => k + 1);
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "relative rounded-3xl border border-border/70 bg-card/70 backdrop-blur-md",
        "p-5 sm:p-7",
        "shadow-[0_1px_0_oklch(0.92_0.02_70_/_0.5),0_24px_48px_-20px_oklch(0.5_0.05_45_/_0.18)]"
      )}
    >
      {/* 三個提示 chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CHIPS.map((c, i) => (
          <motion.span
            key={c}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.06 }}
            className={cn(
              "inline-flex items-center rounded-full border border-border/60",
              "bg-muted/40 px-2.5 py-1 text-[11px] tracking-wider text-muted-foreground"
            )}
          >
            {c}
          </motion.span>
        ))}
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="店名"
          maxLength={100}
          disabled={submitting}
          className={cn(
            "w-full border-transparent bg-transparent text-[15px] leading-relaxed",
            "px-0 focus-visible:ring-0 focus-visible:border-transparent",
            "placeholder:text-muted-foreground/60"
          )}
        />

        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="位置（例：六合夜市）"
          disabled={submitting}
          className={cn(
            "w-full border-transparent bg-transparent text-[15px] leading-relaxed",
            "px-0 focus-visible:ring-0 focus-visible:border-transparent",
            "placeholder:text-muted-foreground/60"
          )}
        />

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="介紹這家店..."
          maxLength={MAX}
          rows={3}
          disabled={submitting}
          className={cn(
            "resize-none border-transparent bg-transparent text-[15px] leading-relaxed",
            "px-0 focus-visible:ring-0 focus-visible:border-transparent",
            "placeholder:text-muted-foreground/60"
          )}
        />
      </div>

      {/* 字數進度條 */}
      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-[3px] flex-1 overflow-hidden rounded-full bg-muted"
          aria-hidden
        >
          <motion.div
            initial={false}
            animate={{ width: `${ratio * 100}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
            className={cn(
              "h-full rounded-full",
              nearLimit
                ? "bg-linear-to-r from-amber-400 via-orange-400 to-rose-400"
                : "bg-linear-to-r from-cyan-400 via-blue-400 to-purple-400"
            )}
          />
        </div>
        <span
          className={cn(
            "min-w-12 text-right text-xs font-mono tracking-wide",
            nearLimit ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
          )}
        >
          {length}/{MAX}
        </span>
      </div>

      {/* 錯誤訊息 */}
      <AnimatePresence mode="wait" initial={false}>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 按鈕 */}
      <div className="mt-4 flex gap-2">
        <motion.button
          type="submit"
          disabled={submitting || !name.trim() || !location.trim()}
          whileTap={{ scale: 0.98 }}
          whileHover={submitting ? undefined : { y: -1 }}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-6 py-2.5",
            "border border-primary bg-primary text-primary-foreground",
            "text-sm font-medium transition-all duration-200",
            "hover:shadow-lg hover:shadow-primary/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {submitting ? (
            <>
              <motion.span
                aria-hidden
                animate={{ rotate: 360 }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="h-3.5 w-3.5 rounded-full border-2 border-foreground/40 border-t-primary-foreground"
              />
              <span>提交中…</span>
            </>
          ) : (
            <>
              <span>分享美食</span>
              <span aria-hidden>→</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.form>
  );
}
