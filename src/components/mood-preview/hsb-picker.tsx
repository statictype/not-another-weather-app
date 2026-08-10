import { type PointerEvent, useRef } from "react";
import { type HSB, hexToRgb, hsbToRgb, rgbToHex, rgbToHsb } from "@/lib/color";

interface HsbPickerProps {
  value: HSB;
  onChange: (next: HSB) => void;
}

const HUE_TRACK =
  "linear-gradient(to right, hsl(0,100%,50%) 0%, hsl(60,100%,50%) 17%, hsl(120,100%,50%) 33%, hsl(180,100%,50%) 50%, hsl(240,100%,50%) 67%, hsl(300,100%,50%) 83%, hsl(360,100%,50%) 100%)";

export function HsbPicker({ value, onChange }: HsbPickerProps) {
  const svRef = useRef<HTMLDivElement>(null);

  function emitFromPointer(event: PointerEvent<HTMLDivElement>) {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp01((event.clientX - rect.left) / rect.width);
    const y = clamp01((event.clientY - rect.top) / rect.height);
    onChange({ h: value.h, s: x * 100, b: (1 - y) * 100 });
  }

  function onSvPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    emitFromPointer(event);
  }

  function onSvPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1) return;
    emitFromPointer(event);
  }

  const hex = rgbToHex(hsbToRgb(value));

  // Each slider track previews its own axis at the current value of the other two.
  const satTrack = `linear-gradient(to right, ${rgbToHex(
    hsbToRgb({ h: value.h, s: 0, b: value.b }),
  )}, ${rgbToHex(hsbToRgb({ h: value.h, s: 100, b: value.b }))})`;
  const brtTrack = `linear-gradient(to right, ${rgbToHex(
    hsbToRgb({ h: value.h, s: value.s, b: 0 }),
  )}, ${rgbToHex(hsbToRgb({ h: value.h, s: value.s, b: 100 }))})`;

  return (
    <div className="space-y-3">
      <div
        ref={svRef}
        onPointerDown={onSvPointerDown}
        onPointerMove={onSvPointerMove}
        className="relative h-44 w-full cursor-crosshair touch-none select-none overflow-hidden rounded-xl"
        style={{
          backgroundColor: `hsl(${value.h}, 100%, 50%)`,
          backgroundImage:
            "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
        }}
        role="application"
        aria-label="Saturation and brightness"
      >
        <div
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{
            left: `${value.s}%`,
            top: `${100 - value.b}%`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
          }}
        />
      </div>

      <SliderRow
        label="H"
        ariaLabel="Hue"
        value={value.h}
        max={360}
        suffix="°"
        track={HUE_TRACK}
        onChange={(v) => {
          onChange({ ...value, h: v });
        }}
      />
      <SliderRow
        label="S"
        ariaLabel="Saturation"
        value={value.s}
        max={100}
        suffix="%"
        track={satTrack}
        onChange={(v) => {
          onChange({ ...value, s: v });
        }}
      />
      <SliderRow
        label="B"
        ariaLabel="Brightness"
        value={value.b}
        max={100}
        suffix="%"
        track={brtTrack}
        onChange={(v) => {
          onChange({ ...value, b: v });
        }}
      />

      <div className="grid grid-cols-[auto_1fr] items-center gap-2 pt-1">
        <div
          className="size-8 rounded-md border border-foreground/15"
          style={{ backgroundColor: hex }}
          aria-hidden="true"
        />
        <input
          type="text"
          value={hex}
          onChange={(e) => {
            const rgb = hexToRgb(e.target.value);
            if (rgb) onChange(rgbToHsb(rgb));
          }}
          spellCheck={false}
          maxLength={7}
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 font-mono text-sm uppercase tracking-wide outline-none focus:border-foreground/40"
          aria-label="Hex"
        />
      </div>
    </div>
  );
}

interface SliderRowProps {
  label: string;
  ariaLabel: string;
  value: number;
  max: number;
  suffix: string;
  track: string;
  onChange: (next: number) => void;
}

function SliderRow({ label, ariaLabel, value, max, suffix, track, onChange }: SliderRowProps) {
  return (
    <div className="grid grid-cols-[1.25rem_1fr_2.75rem] items-center gap-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/55">
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={Math.round(value)}
        onChange={(e) => {
          onChange(Number(e.target.value));
        }}
        className="hsb-slider w-full"
        style={{ background: track }}
        aria-label={ariaLabel}
      />
      <span className="text-right font-mono text-xs text-foreground/80">
        {Math.round(value)}
        {suffix}
      </span>
    </div>
  );
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
