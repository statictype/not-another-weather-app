import { type CSSProperties, useCallback, useMemo, useState } from "react";
import { airComfortStyle } from "@/lib/air-comfort";
import {
  AC_ANCHORS,
  AC_PARAMS,
  AIR_HUMID_PCT,
  type AirComfortBucket,
  type AirComfortMode,
  type AirLabel,
  type ThermalLabel,
  THERMAL_BUCKETS as BUCKETS,
} from "@/lib/air-comfort-palette";
import {
  cssColorToRgb,
  type HSB,
  hexToRgb,
  hsbToRgb,
  rgbToHex,
  rgbToHsb,
  shiftHueHex,
} from "@/lib/color";
import { HsbPicker } from "./hsb-picker";

const AIR_LABELS = [
  "Very dry",
  "Dry",
  "Slightly dry",
  "Comfortable",
  "Slightly humid",
  "Humid",
  "Very humid",
  "Damp",
] as const satisfies readonly AirLabel[];

type Mode = AirComfortMode;
type CellKey = `${AirComfortBucket}-${AirLabel}`;
type CellMap = Partial<Record<CellKey, string>>;
type RowHueMap = Partial<Record<AirComfortBucket, number>>;

interface ModeData {
  cells: CellMap;
  rowHue: RowHueMap;
}

type Persisted = Record<Mode, ModeData>;

const STORAGE_KEY = "oasis.mood-preview.v1";
const MODES = ["day", "night"] as const satisfies readonly Mode[];

function loadCommitted(): Persisted {
  if (typeof localStorage === "undefined") return emptyPersisted();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPersisted();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyPersisted();
    const obj = parsed as Record<string, unknown>;
    return {
      day: pickModeData(obj.day),
      night: pickModeData(obj.night),
    };
  } catch {
    return emptyPersisted();
  }
}

function emptyPersisted(): Persisted {
  return { day: { cells: {}, rowHue: {} }, night: { cells: {}, rowHue: {} } };
}

function pickModeData(value: unknown): ModeData {
  if (!value || typeof value !== "object") return { cells: {}, rowHue: {} };
  const obj = value as Record<string, unknown>;
  if ("cells" in obj || "rowHue" in obj) {
    return { cells: pickStringMap(obj.cells), rowHue: pickNumberMap(obj.rowHue) };
  }
  // Backwards-compat: pre-rowHue shape stored cells directly under `day`/`night`.
  return { cells: pickStringMap(obj), rowHue: {} };
}

function pickStringMap(value: unknown): CellMap {
  if (!value || typeof value !== "object") return {};
  const out: CellMap = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k as CellKey] = v;
  }
  return out;
}

function pickNumberMap(value: unknown): RowHueMap {
  if (!value || typeof value !== "object") return {};
  const out: RowHueMap = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k as AirComfortBucket] = v;
  }
  return out;
}

function persistCommitted(committed: Persisted) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(committed));
  } catch {
    // quota or disabled — silent ignore
  }
}

// Resolve the cell's rendered base color (dry/humid mix at the air-axis
// position, then base-darken) to a hex seed for the picker, so it starts at
// the value the user actually sees. Anchors and params come straight from the
// palette module; the browser does the one oklch color-mix we can't do in JS.
function probeBaseColor(bucket: AirComfortBucket, air: AirLabel, mode: Mode): string {
  if (typeof document === "undefined") return "#888888";
  const { dry, humid } = AC_ANCHORS[mode][bucket];
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;";
  probe.style.backgroundColor = `color-mix(in oklch, color-mix(in oklch, ${dry}, ${humid} ${AIR_HUMID_PCT[air]}%), black ${AC_PARAMS[mode].baseDarken})`;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).backgroundColor;
  document.body.removeChild(probe);
  const rgb = cssColorToRgb(computed);
  return rgb ? rgbToHex(rgb) : "#888888";
}

export function MoodPreview() {
  const [mode, setMode] = useState<Mode>("day");
  const [committed, setCommitted] = useState<Persisted>(loadCommitted);
  // Draft holds user-edited cell values not yet committed. Probed values do
  // NOT populate cell draft — they only feed the picker's initial position.
  const [cellDraft, setCellDraft] = useState<Record<Mode, CellMap>>({ day: {}, night: {} });
  const [rowDraft, setRowDraft] = useState<Record<Mode, RowHueMap>>({ day: {}, night: {} });
  // Cache of probed cell defaults per (mode, key) — picker initialization only.
  const [probed, setProbed] = useState<Record<Mode, CellMap>>({ day: {}, night: {} });
  const [selected, setSelected] = useState<{ bucket: AirComfortBucket; air: AirLabel } | null>(
    null,
  );

  const ensureProbed = useCallback((bucket: AirComfortBucket, air: AirLabel, m: Mode) => {
    setProbed((prev) => {
      const key = cellKey(bucket, air);
      if (prev[m][key] !== undefined) return prev;
      const value = probeBaseColor(bucket, air, m);
      return { ...prev, [m]: { ...prev[m], [key]: value } };
    });
  }, []);

  const modifiedCount = useMemo(() => {
    let count = 0;
    for (const m of MODES) {
      for (const [k, v] of Object.entries(cellDraft[m])) {
        if (v !== undefined && v !== committed[m].cells[k as CellKey]) count++;
      }
      for (const [k, v] of Object.entries(rowDraft[m])) {
        if (v !== undefined && v !== (committed[m].rowHue[k as AirComfortBucket] ?? 0)) count++;
      }
    }
    return count;
  }, [cellDraft, rowDraft, committed]);

  const handleCellClick = useCallback(
    (bucket: AirComfortBucket, air: AirLabel) => {
      ensureProbed(bucket, air, mode);
      setSelected({ bucket, air });
    },
    [ensureProbed, mode],
  );

  const toggleMode = useCallback(() => {
    const next: Mode = mode === "day" ? "night" : "day";
    setMode(next);
    if (selected) ensureProbed(selected.bucket, selected.air, next);
  }, [mode, selected, ensureProbed]);

  const handlePickerChange = useCallback(
    (hsb: HSB) => {
      if (!selected) return;
      const hex = rgbToHex(hsbToRgb(hsb));
      const key = cellKey(selected.bucket, selected.air);
      setCellDraft((prev) => ({ ...prev, [mode]: { ...prev[mode], [key]: hex } }));
    },
    [selected, mode],
  );

  const handleRowHueChange = useCallback(
    (bucket: AirComfortBucket, degrees: number) => {
      setRowDraft((prev) => ({ ...prev, [mode]: { ...prev[mode], [bucket]: degrees } }));
    },
    [mode],
  );

  const handleCommit = useCallback(() => {
    if (!selected) return;
    const key = cellKey(selected.bucket, selected.air);
    const value = cellDraft[mode][key];
    if (value === undefined) return;
    setCommitted((prev) => {
      const next: Persisted = {
        ...prev,
        [mode]: { ...prev[mode], cells: { ...prev[mode].cells, [key]: value } },
      };
      persistCommitted(next);
      return next;
    });
    setCellDraft((prev) => {
      const nextMode = { ...prev[mode] };
      delete nextMode[key];
      return { ...prev, [mode]: nextMode };
    });
  }, [selected, cellDraft, mode]);

  const handleCommitRow = useCallback(
    (bucket: AirComfortBucket) => {
      const value = rowDraft[mode][bucket];
      if (value === undefined) return;
      setCommitted((prev) => {
        const next: Persisted = {
          ...prev,
          [mode]: { ...prev[mode], rowHue: { ...prev[mode].rowHue, [bucket]: value } },
        };
        persistCommitted(next);
        return next;
      });
      setRowDraft((prev) => {
        const nextMode = { ...prev[mode] };
        delete nextMode[bucket];
        return { ...prev, [mode]: nextMode };
      });
    },
    [rowDraft, mode],
  );

  const handleRevertRow = useCallback(
    (bucket: AirComfortBucket) => {
      setRowDraft((prev) => {
        const nextMode = { ...prev[mode] };
        delete nextMode[bucket];
        return { ...prev, [mode]: nextMode };
      });
    },
    [mode],
  );

  const handleCommitAll = useCallback(() => {
    setCommitted((prev) => {
      const next: Persisted = {
        day: { cells: { ...prev.day.cells }, rowHue: { ...prev.day.rowHue } },
        night: { cells: { ...prev.night.cells }, rowHue: { ...prev.night.rowHue } },
      };
      for (const m of MODES) {
        for (const [k, v] of Object.entries(cellDraft[m])) {
          if (v !== undefined) next[m].cells[k as CellKey] = v;
        }
        for (const [k, v] of Object.entries(rowDraft[m])) {
          if (v !== undefined) next[m].rowHue[k as AirComfortBucket] = v;
        }
      }
      persistCommitted(next);
      return next;
    });
    setCellDraft({ day: {}, night: {} });
    setRowDraft({ day: {}, night: {} });
  }, [cellDraft, rowDraft]);

  const handleRevert = useCallback(() => {
    if (!selected) return;
    const key = cellKey(selected.bucket, selected.air);
    setCellDraft((prev) => {
      const nextMode = { ...prev[mode] };
      delete nextMode[key];
      return { ...prev, [mode]: nextMode };
    });
  }, [selected, mode]);

  const pickerHsb = useMemo<HSB | null>(() => {
    if (!selected) return null;
    const key = cellKey(selected.bucket, selected.air);
    const hex = cellDraft[mode][key] ?? committed[mode].cells[key] ?? probed[mode][key];
    if (!hex) return null;
    const rgb = hexToRgb(hex);
    return rgb ? rgbToHsb(rgb) : null;
  }, [selected, cellDraft, committed, probed, mode]);

  const selectedKey = selected ? cellKey(selected.bucket, selected.air) : null;
  const isSelectedModified =
    selectedKey !== null &&
    cellDraft[mode][selectedKey] !== undefined &&
    cellDraft[mode][selectedKey] !== committed[mode].cells[selectedKey];

  return (
    <div
      className={`text-foreground relative min-h-screen overflow-x-hidden${
        mode === "night" ? " night" : ""
      }`}
    >
      <div className={`sky${mode === "night" ? " night" : ""}`} aria-hidden="true" />

      <div
        className={`relative z-10 mx-auto w-full max-w-[1400px] px-5 py-6 sm:px-8 sm:py-10 ${
          selected ? "pb-[60vh] lg:pb-10 lg:pr-[24rem]" : "pb-10"
        }`}
      >
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
              Air comfort
            </p>
            <h1 className="font-display mt-2 text-balance text-3xl tracking-tight sm:text-4xl">
              Mood palette
            </h1>
            <p className="mt-2 max-w-prose text-sm text-foreground/60">
              Drag a row's hue slider to rotate that bucket's color family. Click any cell to tweak
              its base in HSB. Committed values persist to localStorage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleMode}
              aria-pressed={mode === "night"}
              className="font-display rounded-full border border-foreground/15 bg-foreground/5 px-4 py-2 text-sm font-medium tracking-tight transition hover:bg-foreground/10"
            >
              {mode === "night" ? "☾ Night" : "☀ Day"}
            </button>
            <button
              type="button"
              onClick={handleCommitAll}
              disabled={modifiedCount === 0}
              className="font-display rounded-full bg-foreground px-4 py-2 text-sm font-medium tracking-tight text-background transition hover:bg-foreground/85 disabled:cursor-not-allowed disabled:bg-foreground/20 disabled:text-foreground/40"
            >
              Commit all{modifiedCount > 0 ? ` (${modifiedCount})` : ""}
            </button>
            <a
              href="/"
              className="font-display rounded-full border border-foreground/15 px-4 py-2 text-sm font-medium tracking-tight transition hover:bg-foreground/5"
            >
              ← Back
            </a>
          </div>
        </header>

        <div className="space-y-10">
          {BUCKETS.map(({ bucket, thermals }) => {
            const draftOffset = rowDraft[mode][bucket];
            const committedOffset = committed[mode].rowHue[bucket] ?? 0;
            const effectiveOffset = draftOffset ?? committedOffset;
            const a = AC_ANCHORS[mode][bucket];
            const rowAnchors =
              effectiveOffset !== 0
                ? {
                    dry: shiftHueHex(a.dry, effectiveOffset),
                    humid: shiftHueHex(a.humid, effectiveOffset),
                  }
                : null;
            const isRowModified = draftOffset !== undefined && draftOffset !== committedOffset;
            return (
              <BucketRow
                key={bucket}
                bucket={bucket}
                thermals={thermals}
                draftMap={cellDraft[mode]}
                committedMap={committed[mode].cells}
                selectedKey={selectedKey}
                onCellClick={handleCellClick}
                hueOffset={effectiveOffset}
                rowAnchors={rowAnchors}
                isRowModified={isRowModified}
                onRowHueChange={handleRowHueChange}
                onCommitRow={handleCommitRow}
                onRevertRow={handleRevertRow}
              />
            );
          })}
        </div>
      </div>

      {selected && pickerHsb && (
        <aside className="card-surface fixed bottom-4 left-4 right-4 z-30 max-h-[55vh] overflow-y-auto rounded-2xl border border-foreground/15 p-5 shadow-2xl lg:bottom-auto lg:left-auto lg:right-6 lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-80">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-[10px] font-medium uppercase tracking-[0.2em] text-foreground/55">
                Editing — {mode}
              </p>
              <p className="font-display mt-1 text-base font-medium tracking-tight">
                {selected.bucket} · {selected.air}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
              }}
              className="rounded-full p-1 text-foreground/55 hover:bg-foreground/10 hover:text-foreground"
              aria-label="Close picker"
            >
              ✕
            </button>
          </div>

          <HsbPicker value={pickerHsb} onChange={handlePickerChange} />

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleCommit}
              disabled={!isSelectedModified}
              className="font-display flex-1 rounded-full bg-foreground px-4 py-2 text-sm font-medium tracking-tight text-background transition hover:bg-foreground/85 disabled:cursor-not-allowed disabled:bg-foreground/20 disabled:text-foreground/40"
            >
              Commit
            </button>
            <button
              type="button"
              onClick={handleRevert}
              disabled={!isSelectedModified}
              className="font-display rounded-full border border-foreground/15 px-4 py-2 text-sm font-medium tracking-tight transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Revert
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

function cellKey(bucket: AirComfortBucket, air: AirLabel): CellKey {
  return `${bucket}-${air}`;
}

interface BucketRowProps {
  bucket: AirComfortBucket;
  thermals: readonly ThermalLabel[];
  draftMap: CellMap;
  committedMap: CellMap;
  selectedKey: CellKey | null;
  onCellClick: (bucket: AirComfortBucket, air: AirLabel) => void;
  hueOffset: number;
  rowAnchors: { dry: string; humid: string } | null;
  isRowModified: boolean;
  onRowHueChange: (bucket: AirComfortBucket, degrees: number) => void;
  onCommitRow: (bucket: AirComfortBucket) => void;
  onRevertRow: (bucket: AirComfortBucket) => void;
}

function BucketRow({
  bucket,
  thermals,
  draftMap,
  committedMap,
  selectedKey,
  onCellClick,
  hueOffset,
  rowAnchors,
  isRowModified,
  onRowHueChange,
  onCommitRow,
  onRevertRow,
}: BucketRowProps) {
  const hueTrack =
    "linear-gradient(to right, hsl(0,100%,50%) 0%, hsl(60,100%,50%) 17%, hsl(120,100%,50%) 33%, hsl(180,100%,50%) 50%, hsl(240,100%,50%) 67%, hsl(300,100%,50%) 83%, hsl(360,100%,50%) 100%)";

  return (
    <section>
      <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-display text-lg font-medium uppercase tracking-[0.18em]">{bucket}</h2>
        <span className="text-xs text-foreground/55">{thermals.join(" · ")}</span>

        <div className="ml-auto flex items-center gap-2">
          <span className="font-display text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/55">
            Hue
          </span>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={Math.round(hueOffset)}
            onChange={(e) => {
              onRowHueChange(bucket, Number(e.target.value));
            }}
            className="hsb-slider w-40 sm:w-56"
            style={{ background: hueTrack }}
            aria-label={`${bucket} row hue offset`}
          />
          <span
            className={`w-14 text-right font-mono text-xs ${
              isRowModified ? "text-amber-500" : "text-foreground/70"
            }`}
          >
            {hueOffset > 0 ? "+" : ""}
            {Math.round(hueOffset)}°
          </span>
          {isRowModified && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onCommitRow(bucket);
                }}
                className="font-display rounded-full bg-foreground px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-background transition hover:bg-foreground/85"
              >
                Commit
              </button>
              <button
                type="button"
                onClick={() => {
                  onRevertRow(bucket);
                }}
                className="font-display rounded-full border border-foreground/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition hover:bg-foreground/5"
                aria-label="Revert row hue"
              >
                Revert
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {AIR_LABELS.map((air) => {
          const key = cellKey(bucket, air);
          const draftVal = draftMap[key];
          const committedVal = committedMap[key];
          const baseOverride = draftVal ?? committedVal;
          const isSelected = selectedKey === key;
          const isModified = draftVal !== undefined && draftVal !== committedVal;
          return (
            <MoodTile
              key={air}
              thermals={thermals}
              air={air}
              baseOverride={baseOverride}
              rowAnchors={rowAnchors}
              isSelected={isSelected}
              isModified={isModified}
              onClick={() => {
                onCellClick(bucket, air);
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

interface MoodTileProps {
  thermals: readonly ThermalLabel[];
  air: AirLabel;
  baseOverride: string | undefined;
  rowAnchors: { dry: string; humid: string } | null;
  isSelected: boolean;
  isModified: boolean;
  onClick: () => void;
}

function MoodTile({
  thermals,
  air,
  baseOverride,
  rowAnchors,
  isSelected,
  isModified,
  onClick,
}: MoodTileProps) {
  const { bucketClass, background } = airComfortStyle({ thermal: thermals[0]!, air });
  // Precedence: per-cell override > row hue shift > bucket defaults (via class).
  let overrideStyle: CSSProperties = {};
  if (baseOverride) {
    overrideStyle = {
      "--ac-dry": baseOverride,
      "--ac-humid": baseOverride,
      "--ac-base-darken": "0%",
    } as CSSProperties;
  } else if (rowAnchors) {
    overrideStyle = {
      "--ac-dry": rowAnchors.dry,
      "--ac-humid": rowAnchors.humid,
    } as CSSProperties;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${bucketClass} bento-tile relative flex min-h-[160px] flex-col overflow-hidden p-4 text-left transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50`}
      style={{ background, ...overrideStyle }}
    >
      <p className="font-display text-[10px] font-medium uppercase tracking-[0.2em] text-foreground/60">
        {air}
      </p>
      <ul className="font-display mt-auto space-y-0.5 text-sm leading-snug tracking-tight">
        {thermals.map((t) => (
          <li key={t}>
            {t} and {air.toLowerCase()}
          </li>
        ))}
      </ul>
      {isModified && (
        <span
          className="absolute right-3 top-3 size-2.5 rounded-full bg-amber-400 ring-2 ring-white/80"
          aria-label="Modified, not yet committed"
        />
      )}
      {isSelected && (
        <span
          className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-2 ring-foreground/60"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
