import { PersonStandingIcon, ThermometerIcon, WindIcon } from "lucide-react";
import type { ReactNode } from "react";
import { beaufort } from "@/lib/air-comfort";

interface NowCardProps {
  tempC: number;
  feelsLikeC: number;
  windKph: number;
}

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
