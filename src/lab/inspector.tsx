import { GROUPS, RANGES } from "./param-ranges";
import { hexToRGB, type RGB, rgbToHex, type SkyParams } from "./sky/params";

interface InspectorProps {
  params: SkyParams;
  onChange: (patch: Partial<SkyParams>) => void;
  onReset: () => void;
  edited: number;
}

export function Inspector({ params, onChange, onReset, edited }: InspectorProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-white/60 uppercase">
          Parameters
        </h2>
        <div className="flex items-center gap-2">
          {edited > 0 && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
              {edited} edited
            </span>
          )}
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-white/15 px-2 py-1 text-[10px] text-white/70 hover:bg-white/10"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(serialize(params))}
            className="rounded-md border border-white/15 px-2 py-1 text-[10px] text-white/70 hover:bg-white/10"
          >
            Copy
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {GROUPS.map((group) => (
          <section key={group.label} className="mt-4">
            <h3 className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-white/35 uppercase">
              {group.label}
            </h3>
            <div className="space-y-1.5">
              {group.keys.map((key) => {
                const value = params[key];
                if (Array.isArray(value)) {
                  return (
                    <ColorRow
                      key={key}
                      name={key}
                      value={value as RGB}
                      onChange={(v) => onChange({ [key]: v } as Partial<SkyParams>)}
                    />
                  );
                }
                const range = RANGES[key];
                if (!range || typeof value !== "number") return null;
                return (
                  <SliderRow
                    key={key}
                    name={key}
                    value={value}
                    range={range}
                    onChange={(v) => onChange({ [key]: v } as Partial<SkyParams>)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SliderRow({
  name,
  value,
  range,
  onChange,
}: {
  name: string;
  value: number;
  range: { min: number; max: number; step: number };
  onChange: (v: number) => void;
}) {
  const decimals = range.step >= 1 ? 0 : Math.min(String(range.step).split(".")[1]?.length ?? 2, 4);
  return (
    <label className="grid grid-cols-[7.5rem_1fr_3.2rem] items-center gap-2">
      <span className="truncate font-mono text-[10px] text-white/55">{name}</span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-sky-300 h-1 w-full cursor-pointer"
      />
      <span className="text-right font-mono text-[10px] tabular-nums text-white/70">
        {value.toFixed(decimals)}
      </span>
    </label>
  );
}

function ColorRow({
  name,
  value,
  onChange,
}: {
  name: string;
  value: RGB;
  onChange: (v: RGB) => void;
}) {
  const hex = rgbToHex(value);
  return (
    <label className="grid grid-cols-[7.5rem_1fr_3.2rem] items-center gap-2">
      <span className="truncate font-mono text-[10px] text-white/55">{name}</span>
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(hexToRGB(e.target.value))}
        className="h-5 w-full cursor-pointer rounded border border-white/15 bg-transparent"
      />
      <span className="text-right font-mono text-[9px] text-white/50">{hex}</span>
    </label>
  );
}

function serialize(params: SkyParams): string {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    out[key] = Array.isArray(value) ? rgbToHex(value as unknown as RGB) : value;
  }
  return JSON.stringify(out, null, 2);
}
