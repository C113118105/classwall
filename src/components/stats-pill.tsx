"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number | string;
  accent?: boolean;
};

// 0 → target 的平滑滾動（easeOutCubic）
// 隔離在子元件，rAF 觸發的 setState 不會傳染到父層
function useCountUp(target: number | string, duration = 700) {
  const numTarget = typeof target === "string" ? parseFloat(target) : target;
  const [value, setValue] = useState(numTarget);
  const rafRef = useRef<number | undefined>(undefined);
  const fromRef = useRef(numTarget);

  useEffect(() => {
    const from = fromRef.current;
    if (from === numTarget) return;

    const start = performance.now();
    const delta = numTarget - from;

    function step(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + delta * eased);
      setValue(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = numTarget;
      }
    }
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [numTarget, duration]);

  return value;
}

export function StatsPill({ label, value, accent = false }: Props) {
  const display = useCountUp(value);
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 backdrop-blur-md px-3 py-1.5 text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-display text-base tabular-nums",
          accent && "text-primary"
        )}
      >
        {display}
      </span>
    </span>
  );
}
