/**
 * Single source of truth for alert severity.
 *
 * Upstream's `severity` is an unconstrained string: the vendor aggregates
 * national providers and the documentation enumerates no values. Observed
 * vocabularies include CAP names (`Extreme`, `Severe`, `Moderate`, `Minor`,
 * `Unknown`) from the US NWS, Meteoalarm awareness colours, and empty
 * strings. One table below carries both the accepted spellings and the rank,
 * so the union in `@/lib/schemas`, the normalizer, and the sort order cannot
 * drift from each other.
 *
 * Normalization is worker-side by design. The client receives the closed
 * union already sorted worst-first and renders `alerts[0]` as the top alert
 * without owning a rank table.
 */

import { ALERT_SEVERITIES, type AlertSeverity, type WeatherAlert } from "@/lib/schemas";

/**
 * Descriptions run to several kilobytes each and providers frequently emit
 * near-duplicates for overlapping zones. Five bounds the payload without
 * losing anything a reader would act on.
 */
export const MAX_ALERTS = 5;

/**
 * Rank is the array position in `ALERT_SEVERITIES` — worst first, `unknown`
 * last. Aliases are matched case-insensitively after trimming; the CAP name
 * itself is always one of them.
 */
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

/** Anything unrecognised, including `""`, becomes `unknown`. */
export function normalizeSeverity(raw: string): AlertSeverity {
  return BY_ALIAS.get(raw.trim().toLowerCase()) ?? "unknown";
}

export function severityRank(severity: AlertSeverity): number {
  return ALERT_SEVERITIES.indexOf(severity);
}

/**
 * Worst first, then capped. `Array.prototype.sort` is stable, so alerts of
 * equal severity keep the order upstream sent them.
 */
export function sortAndCapAlerts(alerts: readonly WeatherAlert[]): WeatherAlert[] {
  return [...alerts]
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    .slice(0, MAX_ALERTS);
}
