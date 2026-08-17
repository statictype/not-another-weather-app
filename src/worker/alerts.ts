import { ALERT_SEVERITIES, type AlertSeverity, type WeatherAlert } from "@/lib/schemas";

export const MAX_ALERTS = 5;

const SEVERITY_ALIASES = {
  extreme: ["red"],
  severe: ["orange"],
  moderate: ["yellow"],
  minor: ["green"],
  unknown: [],
} as const satisfies Record<AlertSeverity, readonly string[]>;

const BY_ALIAS: ReadonlyMap<string, AlertSeverity> = new Map(
  ALERT_SEVERITIES.flatMap((severity) =>
    [severity, ...SEVERITY_ALIASES[severity]].map((alias) => [alias, severity] as const),
  ),
);

export function normalizeSeverity(raw: string): AlertSeverity {
  return BY_ALIAS.get(raw.trim().toLowerCase()) ?? "unknown";
}

export function severityRank(severity: AlertSeverity): number {
  return ALERT_SEVERITIES.indexOf(severity);
}

export function sortAndCapAlerts(alerts: readonly WeatherAlert[]): WeatherAlert[] {
  return [...alerts]
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    .slice(0, MAX_ALERTS);
}
