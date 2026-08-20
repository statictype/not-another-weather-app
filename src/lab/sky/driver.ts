import { LightningController } from "./lightning";
import { lerpParams, type SkyParams } from "./params";
import type { SkyView } from "./sky-view";

/**
 * One clock, one transition and one lightning schedule shared by every view, so
 * the page background and the hero always show the same instant of the same sky.
 */
export class SkyDriver {
  readonly lightning = new LightningController();
  params: SkyParams;
  timeScale = 1;
  onStats?: (fps: number) => void;

  private readonly views = new Set<SkyView>();
  private from: SkyParams;
  private to: SkyParams;
  private progress = 1;
  private duration = 1;
  private time = 0;
  private raf = 0;
  private last = 0;
  private frames = 0;
  private statsAt = 0;

  constructor(initial: SkyParams) {
    this.params = initial;
    this.from = initial;
    this.to = initial;
  }

  add(view: SkyView): void {
    this.views.add(view);
    view.setParams(this.params);
  }

  remove(view: SkyView): void {
    this.views.delete(view);
  }

  get transitioning(): boolean {
    return this.progress < 1;
  }

  transitionTo(target: SkyParams, seconds: number): void {
    if (seconds <= 0) {
      this.setImmediate(target);
      return;
    }
    this.from = this.params;
    this.to = target;
    this.duration = seconds;
    this.progress = 0;
  }

  setImmediate(target: SkyParams): void {
    this.from = target;
    this.to = target;
    this.params = target;
    this.progress = 1;
    this.push();
  }

  start(): void {
    if (this.raf) return;
    this.last = performance.now();
    this.statsAt = this.last;
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      this.step(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Advances by a fixed slice and renders once. Used by the contact sheet. */
  tick(dt: number): void {
    this.advance(dt);
    this.render();
  }

  private step(now: number): void {
    const dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;
    this.advance(dt);
    this.render();

    this.frames++;
    if (now - this.statsAt >= 500) {
      this.onStats?.((this.frames * 1000) / (now - this.statsAt));
      this.frames = 0;
      this.statsAt = now;
    }
  }

  private advance(dt: number): void {
    const scaled = dt * this.timeScale;
    this.time += scaled;

    if (this.progress < 1) {
      this.progress = Math.min(this.progress + scaled / this.duration, 1);
      const t = smootherstep(this.progress);
      this.params = this.progress >= 1 ? this.to : lerpParams(this.from, this.to, t);
      this.push();
    }

    this.lightning.update(
      scaled,
      this.params.lightning,
      this.params.cloudBase,
      this.params.cloudTop,
    );
  }

  private push(): void {
    for (const v of this.views) v.setParams(this.params);
  }

  private render(): void {
    for (const v of this.views) v.render(this.time, this.params, this.lightning);
  }
}

function smootherstep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
