import Image from "next/image";

export function NightMarketMap() {
  return (
    <section
      aria-labelledby="night-market-map-title"
      className="rounded-[2rem] border border-border/70 bg-card/65 p-6 shadow-[0_28px_80px_-44px_oklch(0.22_0.05_25/0.55)] backdrop-blur-md"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            要 chill 高雄 · 商圈夜食篇
          </p>
          <h2
            id="night-market-map-title"
            className="font-display text-3xl tracking-tight sm:text-4xl"
          >
            夜市地圖
          </h2>
        </div>

        <span className="inline-flex items-center self-start rounded-full bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent sm:self-auto">
          商圈夜食風
        </span>
      </div>

      <div className="relative aspect-[760/520] overflow-hidden rounded-[1.75rem] border border-border/50 bg-[#FFF8F2] shadow-inner">
        <Image
          src="/night-market-map.jfif"
          alt="要 chill 高雄商圈夜食篇插畫風地圖"
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 760px"
        />
      </div>
    </section>
  );
}
