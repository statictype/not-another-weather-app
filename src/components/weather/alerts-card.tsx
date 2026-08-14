import { useState } from "react";
import { InfoIcon, OctagonAlertIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react";
import type { AlertSeverity, WeatherAlert } from "@/api/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * `tile` classes live in `index.css`, not as utilities: `.bento-tile` sets
 * `background` and `border` unlayered, which a utility cannot override.
 */
const SEVERITY: Record<
  AlertSeverity,
  { icon: LucideIcon; word: string | null; tile: string; chip: string; modalIcon: string }
> = {
  extreme: {
    icon: OctagonAlertIcon,
    word: "Extreme",
    tile: "tile-alert-fill text-[var(--alert-fill-ink)]",
    chip: "bg-[var(--alert-fill)] text-[var(--alert-fill-ink)]",
    modalIcon: "text-[var(--alert-ink)]",
  },
  severe: {
    icon: TriangleAlertIcon,
    word: "Severe",
    tile: "tile-alert-tint text-[var(--alert-ink)]",
    chip: "bg-[var(--alert-wash)] text-[var(--alert-ink)]",
    modalIcon: "text-[var(--alert-ink)]",
  },
  moderate: {
    icon: TriangleAlertIcon,
    word: "Moderate",
    tile: "tile-alert-plain text-[var(--alert-ink-muted)]",
    chip: "bg-[var(--alert-wash)] text-[var(--alert-ink-muted)]",
    modalIcon: "text-[var(--alert-ink-muted)]",
  },
  minor: {
    icon: InfoIcon,
    word: "Minor",
    tile: "tile-alert-plain text-foreground/70",
    chip: "bg-foreground/8 text-foreground/70",
    modalIcon: "text-foreground/70",
  },
  unknown: {
    icon: InfoIcon,
    word: null,
    tile: "tile-alert-plain text-foreground/70",
    chip: "bg-foreground/8 text-foreground/70",
    modalIcon: "text-foreground/70",
  },
};

interface AlertsCardProps {
  alerts: readonly WeatherAlert[] | undefined;
  tz: string;
  /** The modal portals onto `<body>`, outside the `.night` root, so it needs the class itself. */
  isNight: boolean;
}

export function AlertsCard({ alerts, tz, isNight }: AlertsCardProps) {
  const [open, setOpen] = useState(false);
  const top = alerts?.[0];
  if (!alerts || !top) return null;

  const { icon: Icon, word, tile } = SEVERITY[top.severity];
  const extra = alerts.length - 1;
  const until = formatUntil(top.expires, tz);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          "swap-in swap-d-2 bento-tile group flex w-full flex-col justify-center p-6 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:col-span-4",
          tile,
        )}
      >
        <span className="flex w-full items-start gap-3.5">
          <Icon className="mt-0.5 size-6 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-lg leading-snug font-light tracking-tight underline-offset-4 decoration-1 group-hover:underline xl:text-xl">
              {top.event}
            </span>
            {/* Steps down by size, not alpha: over `--alert-fill`, fading drops below AA. */}
            {until && <span className="mt-1.5 block text-sm tracking-tight">{until}</span>}
          </span>
          {extra > 0 && (
            <span className="mt-0.5 shrink-0 text-sm tabular-nums" aria-hidden="true">
              +{extra}
            </span>
          )}
        </span>
        <span className="sr-only">
          {word ? `${word} severity. ` : ""}
          {alerts.length === 1 ? "1 active alert" : `${alerts.length} active alerts`}. Show details.
        </span>
      </DialogTrigger>

      <AlertsDialog alerts={alerts} tz={tz} isNight={isNight} />
    </Dialog>
  );
}

function AlertsDialog({
  alerts,
  tz,
  isNight,
}: Omit<AlertsCardProps, "alerts"> & { alerts: readonly WeatherAlert[] }) {
  return (
    <DialogContent
      className={cn(
        "glass-panel grid max-h-[85svh] grid-rows-[auto_minmax(0,1fr)] gap-0 rounded-[2.25rem]",
        "border-0 p-0 text-foreground sm:max-w-xl",
        isNight && "night",
      )}
    >
      <DialogHeader className="px-6 pt-6 pb-4 text-left sm:px-8 sm:pt-8">
        <DialogTitle className="text-xl font-light tracking-tight">
          {alerts.length === 1 ? "Weather alert" : "Weather alerts"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {alerts.length === 1
            ? "1 active alert for this location, in the location's local time."
            : `${alerts.length} active alerts for this location, worst first, in the location's local time.`}
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8">
        <div className="divide-y divide-foreground/10">
          {alerts.map((alert, i) => (
            <AlertEntry key={`${alert.event}-${alert.effective}-${i}`} alert={alert} tz={tz} />
          ))}
        </div>
      </div>
    </DialogContent>
  );
}

function AlertEntry({ alert, tz }: { alert: WeatherAlert; tz: string }) {
  const { icon: Icon, word, chip, modalIcon } = SEVERITY[alert.severity];
  const range = formatRange(alert.effective, alert.expires, tz);

  return (
    <article className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2.5">
        <Icon
          className={cn("mt-1 size-4 shrink-0", modalIcon)}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-base leading-snug tracking-tight text-balance">
            {alert.event || alert.headline || "Weather alert"}
          </h3>
          {word && (
            <span className={cn("mt-1.5 inline-block rounded-[0.75rem] px-2 py-0.5 text-xs", chip)}>
              {word}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1 pl-6.5">
        {range && <p className="text-sm text-foreground/70">{range}</p>}
        {alert.areas && <p className="text-sm text-foreground/70">{alert.areas}</p>}
      </div>

      {alert.desc && (
        <p className="mt-3 pl-6.5 text-sm leading-relaxed whitespace-pre-line">{alert.desc}</p>
      )}
      {alert.instruction && (
        <p className="mt-3 ml-6.5 border-t border-foreground/10 pt-3 text-sm leading-relaxed whitespace-pre-line">
          {alert.instruction}
        </p>
      )}
    </article>
  );
}

function formatRange(effective: string, expires: string, tz: string): string | null {
  const from = parseInstant(effective);
  const to = parseInstant(expires);
  if (from === null && to === null) return null;
  if (from === null) return `Until ${formatStamp(to as number, tz, true)}`;
  if (to === null) return `From ${formatStamp(from, tz, true)}`;
  const sameDay = formatDay(from, tz) === formatDay(to, tz);
  return `${formatStamp(from, tz, true)} – ${formatStamp(to, tz, !sameDay)}`;
}

function formatUntil(expires: string, tz: string): string | null {
  const to = parseInstant(expires);
  if (to === null) return null;
  const sameDay = formatDay(Date.now(), tz) === formatDay(to, tz);
  const stamp = formatStamp(to, tz, !sameDay);
  return stamp === "—" ? null : `Until ${stamp}`;
}

function parseInstant(iso: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

function formatDay(t: number, tz: string): string {
  try {
    return new Date(t).toLocaleDateString("en-CA", { timeZone: tz });
  } catch {
    return "";
  }
}

function formatStamp(t: number, tz: string, withDate: boolean): string {
  const d = new Date(t);
  try {
    const time = d
      .toLocaleTimeString("en-US", {
        timeZone: tz,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
    if (!withDate) return time;
    const date = d.toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `${date}, ${time}`;
  } catch {
    return "—";
  }
}
