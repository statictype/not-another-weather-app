import { DropletIcon, SnowflakeIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { WeatherForecast } from "@/api/types";
import { precipAmount, type PrecipAmount } from "@/lib/precip";
import { cn } from "@/lib/utils";

interface PrecipStripProps {
  /** Undefined until the forecast tier lands — the strip shimmers meanwhile. */
  today: WeatherForecast["today"] | undefined;
  className?: string;
}

/**
 * The day's precipitation, in the hero's left column under the clock.
 *
 * The left column is the "where and when" column — city, country, local time,
 * date. A whole-day figure belongs to that scope; the right column stays
 * purely what the sky is doing right now. Putting it here rather than in the
 * `NowCard` is the point: `daily_chance_of_rain` is not an instantaneous
 * reading and had no business sitting between two that are.
 *
 * Chips, not `<dt>`/`<dd>` rows. Icon plus value, no label text — a different
 * family from the Now card's list and the Air tile's list, so the readings the
 * hero evicted are not creeping back one row at a time.
 *
 * The chip is drawn by its rim and nothing else in day mode. White text over
 * the day gradient measures 5.05–5.35:1 where the strip sits; compositing a
 * white field at 8% alpha over that ground drops it to 4.12:1 and fails AA at
 * body size. A rim leaves the ground untouched. Night has the headroom and a
 * bare rim on near-black is faint, so `.night .hero-chip` adds a 5% fill.
 *
 * The strip is a late-arriving element inside the LCP element, so its height is
 * reserved from first paint and the values shimmer. It is never conditionally
 * mounted, and both chips are one row of the same height, so the strip measures
 * the same whether one chip renders or two.
 */
export function PrecipStrip({ today, className }: PrecipStripProps) {
  return (
    <div className={cn("flex h-8 items-center gap-2", className)}>
      {today === undefined ? (
        <span className="h-8 w-28 animate-pulse rounded-[0.75rem] bg-white/12" aria-hidden="true" />
      ) : (
        <>
          {/* Always, including 0%: "no rain today" is an answer, and its
              absence would be ambiguous with a missing payload. */}
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
  /**
   * The booleans upstream gate the amount, not the chance, so the chip
   * degrades correctly when the vendor disagrees with itself:
   * `chanceOfRain: 70` with `willItRain: false` prints `70%` and no amount
   * rather than a contradiction.
   */
  amount: PrecipAmount | null;
}) {
  return (
    // `role="img"` gives the chip one accessible name and suppresses the glyph
    // soup underneath it — the icon is the label, and "droplet 20 percent
    // middot 4 mm" is not what the label says.
    <span
      role="img"
      aria-label={`${name}, ${chance} percent${amount ? `, ${amount.spoken}` : ""}`}
      className="hero-chip flex h-8 shrink-0 items-center gap-1.5 rounded-[0.75rem] border px-3 text-sm tracking-tight tabular-nums"
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      {chance}%
      {amount && (
        <>
          {/* The same separator the clock line above it uses, so the two rows
              of the left column read as one voice. */}
          <span className="text-white/50" aria-hidden="true">
            ·
          </span>
          {amount.text}
        </>
      )}
    </span>
  );
}
