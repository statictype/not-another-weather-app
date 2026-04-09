import { ActivityIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UvCardProps {
  uv: number;
  isDay: boolean;
}

export function UvCard({ uv, isDay }: UvCardProps) {
  return (
    <section
      className={cn(
        "swap-in swap-d-5 bento-tile relative overflow-hidden p-7 sm:col-span-4 xl:col-span-2",
        !isDay && "tile-uv-off",
      )}
      style={{ background: isDay ? uvTint(uv) : undefined }}
    >
      <ActivityIcon
        className={cn(
          "absolute -right-6 -top-6 size-44",
          isDay ? "text-foreground/30" : "text-white/8",
        )}
        strokeWidth={0.9}
        aria-hidden="true"
      />
      <p
        className={cn(
          "font-display font-normal text-[10px] uppercase tracking-[0.2em] 2xl:text-xs",
          isDay ? "text-foreground/55" : "text-white/20",
        )}
      >
        UV index
      </p>
      <p
        className={cn(
          "font-display mt-4 text-5xl leading-none tracking-tight",
          !isDay && "text-white/15",
        )}
      >
        {isDay ? Math.round(uv) : "—"}
      </p>
      {isDay && (
        <p className="font-display font-normal text-foreground/65 mt-3 text-sm uppercase tracking-[0.16em]">
          {uvLabel(uv)}
        </p>
      )}
    </section>
  );
}

function uvLabel(uv: number): string {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

/** Pastel OKLCH gradients matching UV severity buckets (same style as .tile-*). */
function uvTint(uv: number): string {
  if (uv < 3)
    return "linear-gradient(160deg, oklch(0.94 0.09 150 / 0.95), oklch(0.88 0.12 155 / 0.7))";
  if (uv < 6)
    return "linear-gradient(160deg, oklch(0.95 0.10 115 / 0.95), oklch(0.90 0.13 110 / 0.7))";
  if (uv < 8)
    return "linear-gradient(160deg, oklch(0.95 0.11 90 / 0.95), oklch(0.89 0.14 85 / 0.7))";
  if (uv < 11)
    return "linear-gradient(160deg, oklch(0.92 0.12 60 / 0.95), oklch(0.84 0.15 45 / 0.7))";
  return "linear-gradient(160deg, oklch(0.88 0.13 30 / 0.95), oklch(0.78 0.17 20 / 0.75))";
}
