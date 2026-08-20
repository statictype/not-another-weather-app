import { useState } from "react";
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
import { SkyDriver } from "./sky/driver";
import { SkyView } from "./sky/sky-view";

interface Shot {
  key: string;
  condition: Condition;
  phase: Phase;
  variant: string;
  url: string;
}

const SHOT_W = 420;
const SHOT_H = 260;

/**
 * Renders every condition x phase x variant through one offscreen view and
 * captures each frame, so all states can be compared side by side without
 * opening as many WebGL contexts.
 */
export function ContactSheet({ onPick }: { onPick: (c: Condition, p: Phase, v: string) => void }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [variantsOnly, setVariantsOnly] = useState(true);

  const shoot = async () => {
    const combos: { condition: Condition; phase: Phase; variant: string }[] = [];
    for (const condition of CONDITIONS) {
      const variants = variantsFor(condition);
      const chosen = variantsOnly ? variants : variants.slice(0, 1);
      for (const phase of PHASES) {
        for (const v of chosen) {
          combos.push({ condition, phase, variant: v.id });
        }
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = SHOT_W;
    canvas.height = SHOT_H;
    const first = combos[0];
    if (!first) return;

    const driver = new SkyDriver(buildParams(first.condition, first.phase, first.variant));
    const view = new SkyView(canvas, {
      framing: { fov: 58, pitch: 0.3, yaw: 0 },
      cloudScale: 0.75,
      steps: 64,
      maxPixelRatio: 1,
      preserveDrawingBuffer: true,
    });
    view.resize(SHOT_W, SHOT_H, 1);
    driver.add(view);

    const out: Shot[] = [];
    setProgress(0);
    for (let i = 0; i < combos.length; i++) {
      const c = combos[i]!;
      driver.setImmediate(buildParams(c.condition, c.phase, c.variant));
      // Let the wind and precipitation advance past their spawn state.
      for (let f = 0; f < 8; f++) driver.tick(1 / 30);
      out.push({
        key: `${c.condition}-${c.phase}-${c.variant}`,
        condition: c.condition,
        phase: c.phase,
        variant: c.variant,
        url: view.snapshot(),
      });
      setProgress((i + 1) / combos.length);
      await new Promise((r) => requestAnimationFrame(r));
    }

    driver.remove(view);
    view.dispose();
    setShots(out);
    setProgress(null);
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void shoot()}
          disabled={progress !== null}
          className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25 disabled:opacity-40"
        >
          {progress === null ? "Shoot contact sheet" : `Rendering ${Math.round(progress * 100)}%`}
        </button>
        <label className="flex items-center gap-2 text-xs text-white/60">
          <input
            type="checkbox"
            checked={variantsOnly}
            onChange={(e) => setVariantsOnly(e.target.checked)}
          />
          include all variants
        </label>
        <span className="text-xs text-white/40">{shots.length} frames</span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
        {shots.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onPick(s.condition, s.phase, s.variant)}
            className="group overflow-hidden rounded-xl border border-white/10 text-left"
          >
            <img src={s.url} alt={s.key} className="block w-full" />
            <span className="flex items-baseline justify-between px-2.5 py-1.5 text-[10px] text-white/60 group-hover:text-white">
              <span>
                {conditionLabel(s.condition)} · {phaseLabel(s.phase)}
              </span>
              <span className="text-white/35">{s.variant}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
