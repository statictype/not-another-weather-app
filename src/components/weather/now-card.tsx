import { useState } from "react";
import {
  BubblesIcon,
  CloudIcon,
  DropletsIcon,
  EyeIcon,
  Maximize2Icon,
  PersonStandingIcon,
  ThermometerIcon,
  WindIcon,
  type LucideIcon,
} from "lucide-react";
import type { CurrentConditions } from "@/api/types";
import { DialogScroll } from "@/components/dialog-scroll";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { airComfort, beaufort } from "@/lib/air-comfort";
import { cn } from "@/lib/utils";

interface Reading {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  faceValue?: string;
}

const FACE = new Set(["temp", "feels", "wind"]);

function readingsOf(c: CurrentConditions): Reading[] {
  return [
    { key: "temp", icon: ThermometerIcon, label: "Temperature", value: `${Math.round(c.tempC)}°C` },
    {
      key: "feels",
      icon: PersonStandingIcon,
      label: "Feels like",
      value: `${Math.round(c.feelsLikeC)}°`,
    },
    { key: "dew", icon: BubblesIcon, label: "Dew", value: `${Math.round(c.dewpointC)}°` },
    { key: "humidity", icon: DropletsIcon, label: "Humidity", value: `${c.humidity}%` },
    { key: "cloud", icon: CloudIcon, label: "Cloud", value: `${c.cloud}%` },
    {
      key: "wind",
      icon: WindIcon,
      label: "Wind",
      value: `${Math.round(c.windKph)} km/h ${c.windDir} · ${beaufort(c.windKph)}`,
      faceValue: beaufort(c.windKph),
    },
    {
      key: "visibility",
      icon: EyeIcon,
      label: "Visibility",
      value: `${Math.round(c.visibilityKm)} km`,
    },
  ];
}

interface NowCardProps {
  current: CurrentConditions;
}

export function NowCard({ current }: NowCardProps) {
  const [open, setOpen] = useState(false);
  const { sentence } = airComfort(current);
  const readings = readingsOf(current);
  const face = readings.filter((r) => FACE.has(r.key));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "swap-in swap-d-2 bento-tile tile-wind group relative w-full overflow-hidden p-6 text-left",
            "flex flex-col justify-center gap-5",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            "xl:flex-1",
          )}
        >
          <span
            aria-hidden="true"
            className="tile-wind-sweep pointer-events-none absolute inset-0"
          />

          <span className="relative flex items-center justify-between gap-3">
            <span className="label-section">Now</span>
            <Maximize2Icon
              className="size-4 shrink-0 text-foreground/70 transition-colors group-hover:text-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </span>

          <span className="relative flex flex-col gap-5 md:flex-row md:items-center md:gap-10 xl:flex-col xl:items-stretch xl:gap-5">
            {/* The dashboard's second voice after the hero city, and the one
                thing on it that answers the question in words. 24px at every
                width, because the figures are 24px at every width and no
                figure outranks the sentence. No `tracking-tight` either: this
                is the only light type the system sets at 24px across a full
                line, and -0.055em closed the words up. */}
            <span className="block text-2xl leading-tight font-light text-balance md:flex-1">
              {sentence}
            </span>

            <span className="block divide-y divide-foreground/10 md:w-[340px] md:shrink-0 xl:w-auto">
              {face.map((r) => (
                <FaceRow key={r.key} reading={r} />
              ))}
            </span>
          </span>

          <span className="sr-only">Show all current readings</span>
        </button>
      </DialogTrigger>

      <NowDialog sentence={sentence} readings={readings} isNight={current.timeOfDay === "night"} />
    </Dialog>
  );
}

function FaceRow({ reading }: { reading: Reading }) {
  const { icon: Icon, label, value, faceValue } = reading;
  return (
    <span className="flex items-center justify-between gap-3 py-3">
      <span className="flex items-center gap-2.5">
        <Icon className="size-4 shrink-0 text-foreground/70" strokeWidth={1.5} aria-hidden="true" />
        <span className="label-sub">{label}</span>
      </span>
      <span className="text-base tracking-tight">{faceValue ?? value}</span>
    </span>
  );
}

function NowDialog({
  sentence,
  readings,
  isNight,
}: {
  sentence: string;
  readings: Reading[];
  isNight: boolean;
}) {
  return (
    <DialogContent
      className={cn(
        "glass-panel dialog-panel dialog-sheet grid max-h-[85svh] grid-rows-[auto_minmax(0,1fr)]",
        "gap-0 rounded-[2.25rem] border-0 p-0 text-foreground sm:max-w-md",
        isNight && "night",
      )}
    >
      {/* The title clears the close control's 36px pane rather than running
          under it, and the rule is what the rows scroll beneath. */}
      <DialogHeader className="border-b border-foreground/10 px-6 pt-6 pe-16 pb-5 text-left sm:px-8 sm:pt-8 sm:pe-20">
        <DialogTitle className="text-xl font-light tracking-tight text-balance">
          {sentence}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Every current reading for this location.
        </DialogDescription>
      </DialogHeader>

      <DialogScroll className="px-6 pt-2 pb-6 sm:px-8 sm:pb-8">
        <dl className="divide-y divide-foreground/10">
          {readings.map(({ key, icon: Icon, label, value }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3.5">
              <dt className="flex items-center gap-2.5">
                <Icon
                  className="size-4 shrink-0 text-foreground/70"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span className="label-sub">{label}</span>
              </dt>
              <dd className="text-right text-base tracking-tight tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </DialogScroll>
    </DialogContent>
  );
}
