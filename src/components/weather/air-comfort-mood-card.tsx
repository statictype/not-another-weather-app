import { WindIcon } from "lucide-react";
import { airComfort, airComfortStyle } from "@/lib/air-comfort";

interface AirComfortMoodCardProps {
  tempC: number;
  feelsLikeC: number;
  dewpointC: number;
  humidity: number;
  windKph: number;
}

export function AirComfortMoodCard({
  tempC,
  feelsLikeC,
  dewpointC,
  humidity,
  windKph,
}: AirComfortMoodCardProps) {
  const { sentence, thermal, air } = airComfort({
    tempC,
    feelsLikeC,
    dewpointC,
    humidity,
  });
  const { bucketClass, background } = airComfortStyle({ thermal, air });

  return (
    <section
      className={`${bucketClass} swap-in swap-d-2 bento-tile relative flex flex-col overflow-hidden p-6`}
      style={{ background }}
    >
      <p className="label-section">Air comfort</p>

      <p className="mt-4 text-balance text-2xl leading-tight tracking-tight">{sentence}</p>
      <div className="mt-1.5 flex items-center gap-2 text-base tracking-tight text-foreground/55">
        <WindIcon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <span>{beaufort(windKph)}</span>
      </div>
    </section>
  );
}

function beaufort(kph: number): string {
  if (kph < 1) return "Calm";
  if (kph < 6) return "Light air";
  if (kph < 12) return "Light breeze";
  if (kph < 20) return "Gentle breeze";
  if (kph < 29) return "Moderate breeze";
  if (kph < 39) return "Fresh breeze";
  if (kph < 50) return "Strong breeze";
  if (kph < 62) return "Near gale";
  if (kph < 75) return "Gale";
  if (kph < 89) return "Strong gale";
  if (kph < 103) return "Storm";
  if (kph < 118) return "Violent storm";
  return "Hurricane";
}
