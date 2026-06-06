import { type CSSProperties, useState } from "react";
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
import {
  type CellKey,
  type CellMap,
  type EditorState,
  loadEditorState,
  type ModeMaps,
  persistEditorState,
} from "./persistence";
import {
  commit,
  commitAll,
  effective,
  isModified,
  modifiedCount as countModified,
  revert,
  setDraft,
  type StagedMap,
} from "./staged-map";

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

function cellKey(bucket: AirComfortBucket, air: AirLabel): CellKey {
  return `${bucket}-${air}`;
}

function hexToHsb(hex: string | undefined): HSB | null {
  if (!hex) return null;
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsb(rgb) : null;
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
  const [state, setState] = useState<EditorState>(loadEditorState);
  // Probed picker seeds per (mode, key) — picker initialization only; not part
  // of the staged store, so they never persist.
  const [probed, setProbed] = useState<Record<Mode, CellMap>>({ day: {}, night: {} });
  const [selected, setSelected] = useState<{ bucket: AirComfortBucket; air: AirLabel } | null>(
    null,
  );

  const cells = state[mode].cells;
  const rows = state[mode].rows;

  // Draft-only edits (slider drags, picker moves) just update state; a commit
  // also persists the new committed slice. Row maps use a baseline of 0 (no
  // rotation) so dragging back to default reads as unmodified.
  function persist(next: EditorState) {
    setState(next);
    persistEditorState(next);
  }

  function withMode(m: Mode, maps: Partial<ModeMaps>): EditorState {
    return { ...state, [m]: { ...state[m], ...maps } };
  }

  const modifiedCount =
    countModified(state.day.cells) +
    countModified(state.day.rows, 0) +
    countModified(state.night.cells) +
    countModified(state.night.rows, 0);

  function ensureProbed(bucket: AirComfortBucket, air: AirLabel, m: Mode) {
    setProbed((prev) => {
      const key = cellKey(bucket, air);
      if (prev[m][key] !== undefined) return prev;
      return { ...prev, [m]: { ...prev[m], [key]: probeBaseColor(bucket, air, m) } };
    });
  }

  function handleCellClick(bucket: AirComfortBucket, air: AirLabel) {
    ensureProbed(bucket, air, mode);
    setSelected({ bucket, air });
  }

  function toggleMode() {
    const next: Mode = mode === "day" ? "night" : "day";
    setMode(next);
    if (selected) ensureProbed(selected.bucket, selected.air, next);
  }

  function handlePickerChange(hsb: HSB) {
    if (!selected) return;
    const hex = rgbToHex(hsbToRgb(hsb));
    setState(
      withMode(mode, { cells: setDraft(cells, cellKey(selected.bucket, selected.air), hex) }),
    );
  }

  function handleRowHueChange(bucket: AirComfortBucket, degrees: number) {
    setState(withMode(mode, { rows: setDraft(rows, bucket, degrees) }));
  }

  function handleCommit() {
    if (!selected) return;
    persist(withMode(mode, { cells: commit(cells, cellKey(selected.bucket, selected.air)) }));
  }

  function handleRevert() {
    if (!selected) return;
    setState(withMode(mode, { cells: revert(cells, cellKey(selected.bucket, selected.air)) }));
  }

  function handleCommitRow(bucket: AirComfortBucket) {
    persist(withMode(mode, { rows: commit(rows, bucket) }));
  }

  function handleRevertRow(bucket: AirComfortBucket) {
    setState(withMode(mode, { rows: revert(rows, bucket) }));
  }

  function handleCommitAll() {
    persist({
      day: { cells: commitAll(state.day.cells), rows: commitAll(state.day.rows) },
      night: { cells: commitAll(state.night.cells), rows: commitAll(state.night.rows) },
    });
  }

  const selectedKey = selected ? cellKey(selected.bucket, selected.air) : null;
  const isSelectedModified = selectedKey !== null && isModified(cells, selectedKey);
  const pickerHsb = selectedKey
    ? hexToHsb(effective(cells, selectedKey) ?? probed[mode][selectedKey])
    : null;

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
            const effectiveOffset = effective(rows, bucket) ?? 0;
            const a = AC_ANCHORS[mode][bucket];
            const rowAnchors =
              effectiveOffset !== 0
                ? {
                    dry: shiftHueHex(a.dry, effectiveOffset),
                    humid: shiftHueHex(a.humid, effectiveOffset),
                  }
                : null;
            return (
              <BucketRow
                key={bucket}
                bucket={bucket}
                thermals={thermals}
                cells={cells}
                selectedKey={selectedKey}
                onCellClick={handleCellClick}
                hueOffset={effectiveOffset}
                rowAnchors={rowAnchors}
                isRowModified={isModified(rows, bucket, 0)}
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

interface BucketRowProps {
  bucket: AirComfortBucket;
  thermals: readonly ThermalLabel[];
  cells: StagedMap<CellKey, string>;
  selectedKey: CellKey | null;
  onCellClick: (bucket: AirComfortBucket, air: AirLabel) => void;
  hueOffset: number;
  rowAnchors: { dry: string; humid: string } | null;
  isRowModified: boolean;
  onRowHueChange: (bucket: AirComfortBucket, degrees: number) => void;
  onCommitRow: (bucket: AirComfortBucket) => void;
  onRevertRow: (bucket: AirComfortBucket) => void;
}

const HUE_TRACK =
  "linear-gradient(to right, hsl(0,100%,50%) 0%, hsl(60,100%,50%) 17%, hsl(120,100%,50%) 33%, hsl(180,100%,50%) 50%, hsl(240,100%,50%) 67%, hsl(300,100%,50%) 83%, hsl(360,100%,50%) 100%)";

function BucketRow({
  bucket,
  thermals,
  cells,
  selectedKey,
  onCellClick,
  hueOffset,
  rowAnchors,
  isRowModified,
  onRowHueChange,
  onCommitRow,
  onRevertRow,
}: BucketRowProps) {
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
            style={{ background: HUE_TRACK }}
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
          return (
            <MoodTile
              key={air}
              thermals={thermals}
              air={air}
              baseOverride={effective(cells, key)}
              rowAnchors={rowAnchors}
              isSelected={selectedKey === key}
              isModified={isModified(cells, key)}
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
