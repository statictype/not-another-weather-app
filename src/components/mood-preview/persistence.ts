import {
  type AirComfortBucket,
  type AirComfortMode,
  type AirLabel,
} from "@/lib/air-comfort-palette";
import { staged, type StagedMap } from "./staged-map";

export type CellKey = `${AirComfortBucket}-${AirLabel}`;
export type CellMap = Partial<Record<CellKey, string>>;
type RowHueMap = Partial<Record<AirComfortBucket, number>>;

/** The two staged maps a mode owns: per-cell hex overrides + per-row hue offsets. */
export interface ModeMaps {
  cells: StagedMap<CellKey, string>;
  rows: StagedMap<AirComfortBucket, number>;
}

/** The editor's full in-memory state — staged maps per mode. */
export type EditorState = Record<AirComfortMode, ModeMaps>;

/** The on-disk shape under `STORAGE_KEY`. Only committed values are persisted. */
interface ModeData {
  cells: CellMap;
  rowHue: RowHueMap;
}
type Persisted = Record<AirComfortMode, ModeData>;

const STORAGE_KEY = "oasis.mood-preview.v1";

function emptyPersisted(): Persisted {
  return { day: { cells: {}, rowHue: {} }, night: { cells: {}, rowHue: {} } };
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

function pickModeData(value: unknown): ModeData {
  if (!value || typeof value !== "object") return { cells: {}, rowHue: {} };
  const obj = value as Record<string, unknown>;
  if ("cells" in obj || "rowHue" in obj) {
    return { cells: pickStringMap(obj.cells), rowHue: pickNumberMap(obj.rowHue) };
  }
  // Backwards-compat: pre-rowHue shape stored cells directly under `day`/`night`.
  return { cells: pickStringMap(obj), rowHue: {} };
}

function loadPersisted(): Persisted {
  if (typeof localStorage === "undefined") return emptyPersisted();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPersisted();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyPersisted();
    const obj = parsed as Record<string, unknown>;
    return { day: pickModeData(obj.day), night: pickModeData(obj.night) };
  } catch {
    return emptyPersisted();
  }
}

/** Load the persisted committed values into a fresh editor state (empty drafts). */
export function loadEditorState(): EditorState {
  const p = loadPersisted();
  return {
    day: { cells: staged(p.day.cells), rows: staged(p.day.rowHue) },
    night: { cells: staged(p.night.cells), rows: staged(p.night.rowHue) },
  };
}

/** Write the committed slice of every staged map back to localStorage. */
export function persistEditorState(state: EditorState): void {
  if (typeof localStorage === "undefined") return;
  const persisted: Persisted = {
    day: { cells: { ...state.day.cells.committed }, rowHue: { ...state.day.rows.committed } },
    night: { cells: { ...state.night.cells.committed }, rowHue: { ...state.night.rows.committed } },
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // quota or disabled — silent ignore
  }
}
