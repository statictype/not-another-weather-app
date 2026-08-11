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
 * Severity, as one table. The union comes from the wire (`AlertSeverity`),
 * so adding a severity upstream is a compile error here rather than a silent
 * fallthrough.
 *
 * Three visual steps, not five: the warm ramp reads as filled / tinted /
 * muted, and the icon shape separates the two that share a step. Colour is
 * never the only carrier — `word` is spoken to screen readers on the plate
 * and printed as a chip in the modal, and the event text says it in English
 * either way. `unknown` has no word because the provider did not send one;
 * inventing "Unknown severity" would be louder than the truth.
 *
 * `tile` is the card's whole surface, since the card is the tile. All three
 * steps are variant classes in `index.css`, declared beside `.tile-wind` and
 * `.tile-astro` because `.bento-tile` sets `background` and `border`
 * unlayered and a utility cannot override either. `.tile-alert-plain` takes
 * no warm hue — it is a neutral rim, there so a `minor` advisory still reads
 * as its own surface rather than as one more glass tile.
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
  /**
   * Worst-first, as the worker sorted them. Undefined until the forecast tier
   * lands, and empty for most locations on most days — either way the card is
   * absent, with no placeholder and no skeleton.
   */
  alerts: readonly WeatherAlert[] | undefined;
  /** IANA zone of the located city — alert times are its times, not the reader's. */
  tz: string;
  /**
   * The modal is portalled onto `<body>`, outside the `.night` root, so it
   * carries the class itself rather than inheriting the cascade.
   */
  isNight: boolean;
}

/**
 * The top tile of the right column, above `NowCard`. It is the only tile that
 * can be absent: no alerts means no card, and the column collapses back to
 * the Now card alone beside the hero.
 *
 * One tile, always. The worst alert is named in full and the rest are a `+N`
 * count — five stacked rows would be a wall of near-duplicate provider text,
 * and the tile's height would then move with `alerts.length`. Everything else
 * is one click away in the modal.
 *
 * The trigger *is* the tile: no pane around a plate around a row. It is the
 * only tile in the system that is a control, so it is also the only one
 * without a `.label-section` header — the hazard is named at headline size
 * across the full width, and a label reading "Alerts" above it would repeat
 * what the tile already is.
 */
export function AlertsCard({ alerts, tz, isNight }: AlertsCardProps) {
  const [open, setOpen] = useState(false);
  const top = alerts?.[0];
  if (!alerts || !top) return null;

  const { icon: Icon, word, tile } = SEVERITY[top.severity];
  const extra = alerts.length - 1;
  const until = formatUntil(top.expires, tz);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Centred rather than top-aligned: the grid's `minmax(150px,auto)` row
          floor is taller than the content, so below `xl` the tile would
          otherwise hold it against the top edge over a void. */}
      <DialogTrigger
        className={cn(
          "swap-in swap-d-2 bento-tile group flex w-full flex-col justify-center p-6 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:col-span-12",
          tile,
        )}
      >
        <span className="flex w-full items-start gap-3.5">
          <Icon className="mt-0.5 size-6 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            {/* Headline size, the same rung the hero's condition line uses.
                Clamped at two lines so a provider string like "Extreme Heat
                Warning for the Metropolitan Area" reads instead of truncating
                mid-word, and the tile's height still has a ceiling. */}
            <span className="line-clamp-2 text-lg leading-snug font-light tracking-tight underline-offset-4 decoration-1 group-hover:underline xl:text-xl">
              {top.event}
            </span>
            {/* The step down is size, never alpha: over `--alert-fill` the ink
                measures 5.20:1 in day, and fading it would drop below AA. */}
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
      {/* The header holds still; only the list below it scrolls, because a
          US NWS `desc` runs several hundred words. */}
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

/** Empty strings are omitted rather than rendered as blank rows — several
 *  providers send `instruction: ""` and `areas: ""`. */
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

/**
 * Alert windows are stated in the located city's time, matching the hero
 * clock — a warning that expires at 9 pm expires at 9 pm *there*. The end
 * drops its date when it lands on the same local day as the start.
 *
 * Returns `null` when neither bound parses, so the line is omitted rather
 * than printed as a dash.
 */
function formatRange(effective: string, expires: string, tz: string): string | null {
  const from = parseInstant(effective);
  const to = parseInstant(expires);
  if (from === null && to === null) return null;
  if (from === null) return `Until ${formatStamp(to as number, tz, true)}`;
  if (to === null) return `From ${formatStamp(from, tz, true)}`;
  const sameDay = formatDay(from, tz) === formatDay(to, tz);
  return `${formatStamp(from, tz, true)} – ${formatStamp(to, tz, !sameDay)}`;
}

/**
 * The card states only when the worst alert ends; the full window is in the
 * modal. The date is printed only when the end is not today in the city's
 * zone, so the common case reads "Until 9:00 pm" and the plate's second line
 * stays one short phrase.
 *
 * Returns `null` when the bound is missing or unparseable, and when the zone
 * itself is rejected, so the line is omitted rather than printed as
 * "Until —".
 */
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

/** `withDate` off yields just "9:00 pm", matching the hero's lowercase clock. */
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
