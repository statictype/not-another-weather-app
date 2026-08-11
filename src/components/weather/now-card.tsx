import { PersonStandingIcon, ThermometerIcon, UmbrellaIcon, WindIcon } from "lucide-react";
import type { ReactNode } from "react";
import { beaufort } from "@/lib/air-comfort";

interface NowCardProps {
  tempC: number;
  feelsLikeC: number;
  windKph: number;
  /** Undefined until the forecast tier lands — the rain row shimmers meanwhile. */
  chanceOfRain: number | undefined;
}

/**
 * The four readings that used to sit in the hero's foot. They moved out so the
 * hero carries only what it says in words; the numbers behind those words live
 * here, beside it.
 *
 * Same label/value idiom as the Air tile — icon and `.label-sub` on the left,
 * the reading right-aligned — so the two read as one family.
 */
export function NowCard({ tempC, feelsLikeC, windKph, chanceOfRain }: NowCardProps) {
  return (
    <section className="swap-in swap-d-2 bento-tile flex flex-col justify-center p-6 sm:col-span-12 xl:order-2 xl:col-span-4">
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
        <Metric
          icon={
            <UmbrellaIcon
              className="size-4 text-foreground/55"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          }
          label="Chance of rain"
          value={chanceOfRain === undefined ? null : `${chanceOfRain}%`}
        />
      </dl>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-2.5">
        {icon}
        <dt className="label-sub">{label}</dt>
      </div>
      {value === null ? (
        <dd className="h-4 w-12 animate-pulse rounded bg-foreground/10" aria-hidden="true" />
      ) : (
        <dd className="text-base tracking-tight">{value}</dd>
      )}
    </div>
  );
}
