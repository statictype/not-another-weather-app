import { DropletIcon, SnowflakeIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { WeatherForecast } from "@/api/types";
import { precipAmount, type PrecipAmount } from "@/lib/precip";
import { cn } from "@/lib/utils";

interface PrecipStripProps {
  today: WeatherForecast["today"] | undefined;
  className?: string;
}

/** Inside the LCP element, so the height is fixed from first paint. */
export function PrecipStrip({ today, className }: PrecipStripProps) {
  return (
    <div className={cn("flex h-8 items-center gap-2", className)}>
      {today === undefined ? (
        <span className="h-8 w-28 animate-pulse rounded-[0.75rem] bg-white/12" aria-hidden="true" />
      ) : (
        <>
          <Chip
            icon={DropletIcon}
            name="Chance of rain"
            chance={today.chanceOfRain}
            amount={today.willItRain ? precipAmount(today.totalPrecipMm, "mm") : null}
          />
          {today.willItSnow && (
            <Chip
              icon={SnowflakeIcon}
              name="Chance of snow"
              chance={today.chanceOfSnow}
              amount={precipAmount(today.totalSnowCm, "cm")}
            />
          )}
        </>
      )}
    </div>
  );
}

function Chip({
  icon: Icon,
  name,
  chance,
  amount,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  name: string;
  chance: number;
  amount: PrecipAmount | null;
}) {
  return (
    // `role="img"` gives the chip one accessible name instead of per-glyph output.
    <span
      role="img"
      aria-label={`${name}, ${chance} percent${amount ? `, ${amount.spoken}` : ""}`}
      className="hero-chip flex h-8 shrink-0 items-center gap-1.5 rounded-[0.75rem] border px-3 text-sm tracking-tight tabular-nums"
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      {chance}%
      {amount && (
        <>
          <span className="text-white/50" aria-hidden="true">
            ·
          </span>
          {amount.text}
        </>
      )}
    </span>
  );
}
