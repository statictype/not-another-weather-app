import { SnowflakeIcon, UmbrellaIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { DayPrecip } from "@/api/types";
import { precipAmount, type PrecipAmount } from "@/lib/precip";
import { cn } from "@/lib/utils";

interface PrecipStripProps {
  day: DayPrecip | undefined;
  className?: string;
}

/** One line per kind of precipitation, under the day column it belongs to.
 *  The rain line always renders, so a day's height does not depend on whether
 *  it snows. Each line carries its amount whenever upstream reports one that
 *  rounds above zero, `willItRain` / `willItSnow` notwithstanding. */
export function PrecipStrip({ day, className }: PrecipStripProps) {
  const snow = precipAmount(day?.totalSnowCm ?? 0, "cm");

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {day === undefined ? (
        <span className="h-5 w-16 animate-pulse rounded bg-foreground/10" aria-hidden="true" />
      ) : (
        <>
          <Line
            icon={UmbrellaIcon}
            name="Chance of rain"
            chance={day.chanceOfRain}
            amount={precipAmount(day.totalPrecipMm, "mm")}
          />
          {(day.willItSnow || snow) && (
            <Line
              icon={SnowflakeIcon}
              name="Chance of snow"
              chance={day.chanceOfSnow}
              amount={snow}
            />
          )}
        </>
      )}
    </div>
  );
}

function Line({
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
    // `role="img"` gives the line one accessible name instead of per-glyph output.
    <span
      role="img"
      aria-label={`${name}, ${chance} percent${amount ? `, ${amount.spoken}` : ""}`}
      className="flex h-5 items-center gap-1.5 text-sm text-foreground/70 tabular-nums"
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      {chance}%
      {amount && (
        <>
          <span className="text-foreground/40" aria-hidden="true">
            ·
          </span>
          {amount.text}
        </>
      )}
    </span>
  );
}
