import { PersonStandingIcon, ThermometerIcon, WindIcon } from "lucide-react";
import type { ReactNode } from "react";
import { beaufort } from "@/lib/air-comfort";

interface NowCardProps {
  tempC: number;
  feelsLikeC: number;
  windKph: number;
}

/**
 * The readings that used to sit in the hero's foot. They moved out so the hero
 * carries only what it says in words; the numbers behind those words live
 * here, beside it.
 *
 * Three of them, all instantaneous. `Chance of rain` was the fourth and is
 * gone: it is `day.daily_chance_of_rain`, a whole-day figure, and it sat under
 * a heading that says `Now` between two readings that are genuinely current.
 * It is in the hero's left column now, with the rest of the day's scope — see
 * `PrecipStrip`.
 *
 * Same label/value idiom as the Air tile — icon and `.label-sub` on the left,
 * the reading right-aligned — so the two read as one family.
 */
export function NowCard({ tempC, feelsLikeC, windKph }: NowCardProps) {
  return (
    <section className="swap-in swap-d-2 bento-tile flex flex-col justify-center p-6 sm:col-span-12 xl:flex-1">
      <p className="label-section">Now</p>

      <dl className="mt-4 divide-y divide-foreground/10">
        <Metric
          icon={
            <ThermometerIcon
              className="size-4 text-foreground/55"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          }
          label="Temperature"
          value={`${Math.round(tempC)}°C`}
        />
        <Metric
          icon={
            <PersonStandingIcon
              className="size-4 text-foreground/55"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          }
          label="Feels like"
          value={`${Math.round(feelsLikeC)}°`}
        />
        <Metric
          icon={
            <WindIcon className="size-4 text-foreground/55" strokeWidth={1.5} aria-hidden="true" />
          }
          label="Wind"
          value={beaufort(windKph)}
        />
      </dl>
    </section>
  );
}

/**
 * No shimmer branch: every reading here comes from the `current` tier, so all
 * three are present on first paint. The one that arrived late left with the
 * rain row.
 */
function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-2.5">
        {icon}
        <dt className="label-sub">{label}</dt>
      </div>
      <dd className="text-base tracking-tight">{value}</dd>
    </div>
  );
}
