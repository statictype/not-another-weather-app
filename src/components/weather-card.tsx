import { DropletsIcon, ThermometerIcon, UmbrellaIcon, WindIcon } from "lucide-react";
import type { WeatherResponse } from "@/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WeatherCardProps {
  data: WeatherResponse;
  /** When true, the card is being refreshed in the background. */
  isStale?: boolean;
}

export function WeatherCard({ data, isStale = false }: WeatherCardProps) {
  const { location, current, today } = data;

  return (
    <Card
      className={cn("transition-opacity duration-200", isStale && "opacity-60")}
      aria-busy={isStale}
    >
      <CardHeader>
        <CardTitle className="font-serif text-3xl tracking-tight">
          {location.name}
          {location.country && (
            <span className="text-muted-foreground ml-2 text-base font-sans font-normal">
              {location.country}
            </span>
          )}
        </CardTitle>
        {location.region && location.region !== location.name && (
          <CardDescription>{location.region}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div className="font-serif text-7xl tracking-tighter leading-none">
            {Math.round(current.tempC)}
            <span className="text-3xl text-muted-foreground align-top ml-1">°C</span>
          </div>
          <div className="space-y-1">
            <div className="text-lg">{current.conditionText}</div>
            <div className="text-muted-foreground text-sm">
              Feels like {Math.round(current.feelsLikeC)}°<span className="mx-2">·</span>
              {current.timeOfDay === "day" ? "Day" : "Night"}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            icon={<ThermometerIcon className="size-4" aria-hidden="true" />}
            label="Min / Max"
            value={`${Math.round(today.minC)}° / ${Math.round(today.maxC)}°`}
          />
          <Stat
            icon={<WindIcon className="size-4" aria-hidden="true" />}
            label="Wind"
            value={`${Math.round(current.windKph)} km/h ${current.windDir}`}
          />
          <Stat
            icon={<DropletsIcon className="size-4" aria-hidden="true" />}
            label="Humidity"
            value={`${current.humidity}%`}
          />
          <Stat
            icon={<UmbrellaIcon className="size-4" aria-hidden="true" />}
            label="Rain"
            value={`${today.chanceOfRain}%`}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function Stat({ icon, label, value }: StatProps) {
  return (
    <div className="bg-secondary/40 rounded-lg p-3">
      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-base font-medium">{value}</dd>
    </div>
  );
}
