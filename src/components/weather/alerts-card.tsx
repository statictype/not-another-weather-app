import { useState } from "react";
import { InfoIcon, OctagonAlertIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react";
import type { AlertSeverity, WeatherAlert } from "@/api/types";
import { DialogScroll } from "@/components/dialog-scroll";
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
 * The tile is one neutral plate at every severity (`.tile-alert`, declared in
 * `index.css` because `.bento-tile` sets `background` and `border` unlayered,
 * which a utility cannot override). Severity reaches the card through two
 * marks on that plate:
 *
 * - `mark` colors the icon. On the card the icon is drawn solid and stroked
 *   with the plate's own color, so the interior glyph knocks out of the
 *   silhouette and no ring is drawn around it. In the modal it stays a line
 *   icon — at 16px a knocked-out glyph is too small to read.
 * - `badge` fills the "+N more alerts" disc, and the modal's severity chip.
 */
const SEVERITY: Record<
  AlertSeverity,
  { icon: LucideIcon; word: string | null; mark: string; badge: string }
> = {
  extreme: {
    icon: OctagonAlertIcon,
    word: "Extreme",
    mark: "text-[var(--sev-extreme)]",
    badge: "bg-[var(--sev-extreme)] text-[var(--sev-extreme-on)]",
  },
  severe: {
    icon: TriangleAlertIcon,
    word: "Severe",
    mark: "text-[var(--sev-severe)]",
    badge: "bg-[var(--sev-severe)] text-[var(--sev-severe-on)]",
  },
  moderate: {
    icon: TriangleAlertIcon,
    word: "Moderate",
    mark: "text-[var(--sev-moderate)]",
    badge: "bg-[var(--sev-moderate)] text-[var(--sev-moderate-on)]",
  },
  minor: {
    icon: InfoIcon,
    word: "Minor",
    mark: "text-foreground/70",
    badge: "bg-foreground/70 text-background",
  },
  unknown: {
    icon: InfoIcon,
    word: null,
    mark: "text-foreground/70",
    badge: "bg-foreground/70 text-background",
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

  const { icon: Icon, word, mark, badge } = SEVERITY[top.severity];
  const extra = alerts.length - 1;
  const until = formatUntil(top.expires, tz);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="swap-in swap-d-2 bento-tile tile-alert relative flex w-full flex-col justify-center overflow-hidden p-6 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:col-span-4">
        <span
          aria-hidden="true"
          className="tile-alert-sweep pointer-events-none absolute inset-0"
        />

        <span className="relative flex w-full items-start gap-3.5">
          <Icon
            className={cn("mt-0.5 size-6 shrink-0", mark)}
            fill="currentColor"
            stroke="var(--alert-plate-solid)"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            {/* One size at every width: light is the headline weight, and it
                needs 20px to hold its stems. */}
            <span className="line-clamp-2 text-xl leading-snug font-light tracking-tight">
              {top.event}
            </span>
            {/* Steps down by size, not alpha — see The Step-Down Rule. */}
            {until && <span className="mt-1.5 block text-sm tracking-tight">{until}</span>}
          </span>
          {extra > 0 && (
            <span
              className={cn(
                "mt-1 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1",
                "text-[0.625rem] tabular-nums",
                badge,
              )}
              aria-hidden="true"
            >
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
        "glass-panel dialog-panel dialog-sheet grid max-h-[85svh] grid-rows-[auto_minmax(0,1fr)]",
        "gap-0 rounded-[2.25rem] border-0 p-0 text-foreground sm:max-w-xl",
        isNight && "night",
      )}
    >
      <DialogHeader className="border-b border-foreground/10 px-6 pt-6 pe-16 pb-5 text-left sm:px-8 sm:pt-8 sm:pe-20">
        <DialogTitle className="text-xl font-light tracking-tight">
          {alerts.length === 1 ? "Weather alert" : "Weather alerts"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {alerts.length === 1
            ? "1 active alert for this location, in the location's local time."
            : `${alerts.length} active alerts for this location, worst first, in the location's local time.`}
        </DialogDescription>
      </DialogHeader>

      <DialogScroll className="px-6 pb-6 sm:px-8 sm:pb-8">
        <div className="divide-y divide-foreground/10">
          {alerts.map((alert, i) => (
            <AlertEntry key={`${alert.event}-${alert.effective}-${i}`} alert={alert} tz={tz} />
          ))}
        </div>
      </DialogScroll>
    </DialogContent>
  );
}

function AlertEntry({ alert, tz }: { alert: WeatherAlert; tz: string }) {
  const { icon: Icon, word, mark, badge } = SEVERITY[alert.severity];
  const range = formatRange(alert.effective, alert.expires, tz);

  return (
    /* Tight inside an entry, generous between them: 6–16px internal steps
       against a 44px gap and a rule at the seam. The severity word and the
       window share one line — stacked, the chip sat alone on a line of its own
       and every entry read as four evenly-spaced rows. */
    <article className="py-5.5 first:pt-5 last:pb-1">
      <div className="flex items-start gap-2.5">
        <Icon className={cn("mt-1 size-4 shrink-0", mark)} strokeWidth={1.75} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base leading-snug tracking-tight text-balance">
            {alert.event || alert.headline || "Weather alert"}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {word && (
              <span className={cn("inline-block rounded-[0.75rem] px-2 py-0.5 text-xs", badge)}>
                {word}
              </span>
            )}
            {range && <span className="text-sm text-foreground/70">{range}</span>}
          </div>

          {alert.areas && <p className="mt-1.5 text-sm text-foreground/70">{alert.areas}</p>}
        </div>
      </div>

      {alert.desc && (
        <p className="mt-4 pl-6.5 text-sm leading-relaxed whitespace-pre-line">{alert.desc}</p>
      )}
      {/* A 2rem mark, not a full-width rule: at the same width and weight as
          the divider between entries, the "what to do" break read as a seam and
          every panel looked like a stack of equal rules. */}
      {alert.instruction && (
        <div className="mt-4 ml-6.5">
          <span aria-hidden="true" className="block h-px w-8 bg-foreground/25" />
          <p className="mt-3.5 text-sm leading-relaxed whitespace-pre-line">{alert.instruction}</p>
        </div>
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
