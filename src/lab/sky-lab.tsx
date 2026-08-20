import { useEffect, useMemo, useState } from "react";
import { ContactSheet } from "./contact-sheet";
import { Inspector } from "./inspector";
import { SkyDriver } from "./sky/driver";
import type { SkyParams } from "./sky/params";
import {
  buildParams,
  type Condition,
  CONDITIONS,
  conditionLabel,
  type Phase,
  PHASES,
  phaseLabel,
  variantsFor,
} from "./sky/presets";
import { useSkyView } from "./use-sky-view";

const QUALITY = {
  low: { steps: 26, cloudScale: 0.3 },
  medium: { steps: 48, cloudScale: 0.5 },
  high: { steps: 68, cloudScale: 0.6 },
} as const;
type Quality = keyof typeof QUALITY;

export function SkyLab() {
  const [condition, setCondition] = useState<Condition>("sunny");
  const [phase, setPhase] = useState<Phase>("day");
  const [variant, setVariant] = useState("open");
  const [edits, setEdits] = useState<Partial<SkyParams>>({});
  const [duration, setDuration] = useState(3);
  const [timeScale, setTimeScale] = useState(1);
  const [quality, setQuality] = useState<Quality>("medium");
  const [fps, setFps] = useState(0);
  const [tab, setTab] = useState<"live" | "sheet">("live");
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const [driver] = useState(() => new SkyDriver(buildParams("sunny", "day", "open")));

  const target = useMemo(
    () => ({ ...buildParams(condition, phase, variant), ...edits }),
    [condition, phase, variant, edits],
  );

  useEffect(() => {
    driver.onStats = setFps;
    driver.start();
    return () => driver.stop();
  }, [driver]);

  useEffect(() => {
    driver.timeScale = timeScale;
  }, [driver, timeScale]);

  const preset = `${condition}/${phase}/${variant}`;
  useEffect(() => {
    driver.transitionTo(buildParams(condition, phase, variant), duration);
    // `duration` is read at the moment the preset changes, not a trigger itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver, preset]);

  const bgRef = useSkyView(driver, {
    framing: { fov: 62, pitch: 0.3, yaw: 0 },
    ...QUALITY[quality],
  });
  const heroRef = useSkyView(driver, {
    framing: { fov: 34, pitch: 0.34, yaw: 0.42 },
    steps: QUALITY[quality].steps,
    cloudScale: Math.min(QUALITY[quality].cloudScale + 0.18, 1),
  });

  const applyEdit = (patch: Partial<SkyParams>) => {
    const next = { ...edits, ...patch };
    setEdits(next);
    driver.setImmediate({ ...buildParams(condition, phase, variant), ...next });
  };

  const pick = (c: Condition, p: Phase, v: string) => {
    setEdits({});
    setCondition(c);
    setPhase(p);
    setVariant(v);
    setTab("live");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= CONDITIONS.length) {
        const c = CONDITIONS[n - 1]!;
        setEdits({});
        setCondition(c);
        setVariant(variantsFor(c)[0]!.id);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const i = PHASES.indexOf(phase);
        const d = e.key === "ArrowRight" ? 1 : -1;
        setPhase(PHASES[(i + d + PHASES.length) % PHASES.length]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const variants = variantsFor(condition);
  const activeVariant = variants.find((v) => v.id === variant) ?? variants[0]!;

  return (
    <div className="relative min-h-screen bg-black text-white">
      <canvas ref={bgRef} className="fixed inset-0 block h-full w-full" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-baseline gap-3">
            <h1 className="text-sm font-semibold tracking-[0.18em] uppercase">Sky Lab</h1>
            <span className="text-[11px] text-white/45">
              {conditionLabel(condition)} · {phaseLabel(phase)} · {activeVariant.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Tab active={tab === "live"} onClick={() => setTab("live")}>
              Live
            </Tab>
            <Tab active={tab === "sheet"} onClick={() => setTab("sheet")}>
              Contact sheet
            </Tab>
            <button
              type="button"
              onClick={() => setInspectorOpen((v) => !v)}
              className="rounded-md border border-white/15 bg-black/25 px-2.5 py-1 text-[11px] text-white/70 backdrop-blur hover:bg-white/10"
            >
              {inspectorOpen ? "Hide params" : "Params"}
            </button>
          </div>
        </header>

        {tab === "live" ? (
          <>
            <div className="flex flex-1 items-center justify-center px-6 py-10">
              <HeroMock canvasRef={heroRef} condition={condition} phase={phase} />
            </div>
            <ControlBar
              condition={condition}
              phase={phase}
              variant={variant}
              duration={duration}
              timeScale={timeScale}
              quality={quality}
              onCondition={(c) => {
                setEdits({});
                setCondition(c);
                setVariant(variantsFor(c)[0]!.id);
              }}
              onPhase={(p) => {
                setEdits({});
                setPhase(p);
              }}
              onVariant={(v) => {
                setEdits({});
                setVariant(v);
              }}
              onDuration={setDuration}
              onTimeScale={setTimeScale}
              onQuality={setQuality}
            />
          </>
        ) : (
          <div className="flex-1 overflow-y-auto bg-black/55 backdrop-blur-sm">
            <ContactSheet onPick={pick} />
          </div>
        )}
      </div>

      {inspectorOpen && (
        <aside className="fixed top-0 right-0 z-20 h-screen w-[21rem] border-l border-white/10 bg-black/70 backdrop-blur-xl">
          <Inspector
            params={target}
            onChange={applyEdit}
            onReset={() => {
              setEdits({});
              driver.setImmediate(buildParams(condition, phase, variant));
            }}
            edited={Object.keys(edits).length}
          />
        </aside>
      )}

      <div className="fixed bottom-3 left-4 z-20 font-mono text-[10px] text-white/40">
        {fps.toFixed(0)} fps · {QUALITY[quality].steps} steps · cloud RT{" "}
        {Math.round(QUALITY[quality].cloudScale * 100)}%
      </div>
    </div>
  );
}

function HeroMock({
  canvasRef,
  condition,
  phase,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  condition: Condition;
  phase: Phase;
}) {
  return (
    <section className="relative aspect-[16/8] w-full max-w-[52rem] overflow-hidden rounded-[2rem] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/45 via-black/10 to-transparent" />
      <div className="relative flex h-full flex-col justify-between p-8 sm:p-10">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/70 uppercase">
            United Kingdom
          </p>
          <h2 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">London</h2>
        </div>
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-lg text-white/90">{conditionLabel(condition)}</p>
            <p className="mt-1 text-[11px] font-semibold tracking-[0.16em] text-white/55 uppercase">
              {phaseLabel(phase)} · 07:42
            </p>
          </div>
          <p className="text-6xl leading-none font-light tabular-nums sm:text-7xl">14°</p>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-white/15 ring-inset" />
    </section>
  );
}

interface ControlBarProps {
  condition: Condition;
  phase: Phase;
  variant: string;
  duration: number;
  timeScale: number;
  quality: Quality;
  onCondition: (c: Condition) => void;
  onPhase: (p: Phase) => void;
  onVariant: (v: string) => void;
  onDuration: (v: number) => void;
  onTimeScale: (v: number) => void;
  onQuality: (q: Quality) => void;
}

function ControlBar(props: ControlBarProps) {
  const variants = variantsFor(props.condition);
  const active = variants.find((v) => v.id === props.variant);

  return (
    <div className="sticky bottom-0 border-t border-white/10 bg-black/45 px-6 py-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Row label="Condition">
          {CONDITIONS.map((c, i) => (
            <Chip key={c} active={c === props.condition} onClick={() => props.onCondition(c)}>
              {conditionLabel(c)}
              <span className="ml-1.5 text-[9px] text-white/30">{i + 1}</span>
            </Chip>
          ))}
        </Row>

        <Row label="Phase">
          {PHASES.map((p) => (
            <Chip key={p} active={p === props.phase} onClick={() => props.onPhase(p)}>
              {phaseLabel(p)}
            </Chip>
          ))}
        </Row>

        <Row label="Variant">
          {variants.map((v) => (
            <Chip key={v.id} active={v.id === props.variant} onClick={() => props.onVariant(v.id)}>
              {v.label}
            </Chip>
          ))}
        </Row>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        {active && <p className="text-[11px] text-white/45">{active.note}</p>}
        <div className="ml-auto flex items-center gap-5">
          <Slider
            label="transition"
            value={props.duration}
            min={0}
            max={12}
            step={0.25}
            suffix="s"
            onChange={props.onDuration}
          />
          <Slider
            label="time"
            value={props.timeScale}
            min={0}
            max={12}
            step={0.1}
            suffix="x"
            onChange={props.onTimeScale}
          />
          <div className="flex items-center gap-1">
            {(Object.keys(QUALITY) as Quality[]).map((q) => (
              <Chip key={q} active={q === props.quality} onClick={() => props.onQuality(q)}>
                {q}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold tracking-[0.16em] text-white/35 uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-black"
          : "rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/65 hover:bg-white/10"
      }
    >
      {children}
    </button>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-medium text-black"
          : "rounded-md border border-white/15 bg-black/25 px-2.5 py-1 text-[11px] text-white/70 backdrop-blur hover:bg-white/10"
      }
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] tracking-[0.14em] text-white/35 uppercase">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-sky-300 h-1 w-24 cursor-pointer"
      />
      <span className="w-10 font-mono text-[10px] tabular-nums text-white/60">
        {value.toFixed(1)}
        {suffix}
      </span>
    </label>
  );
}
