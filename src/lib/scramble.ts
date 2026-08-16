import { prefersReducedMotion } from "@/lib/motion";

const DIGITS = "0123456789";

/** The letters this product's units are spelled with — mm, cm, in, km, mi,
 *  km/h, mph, mb, inHg. Churning against the real vocabulary keeps every frame
 *  near the final width and reads as units cycling rather than as noise.
 *  Uppercase holds still: the only one in the set is the H of inHg. */
const UNIT_LETTERS = "bchikmnp";

function poolFor(ch: string): string | null {
  if (ch >= "0" && ch <= "9") return DIGITS;
  if (ch >= "a" && ch <= "z") return UNIT_LETTERS;
  return null;
}

/** One frame of the churn. Characters left of `revealed` are settled; the rest
 *  are substituted within their own class, and everything with no class —
 *  `°`, `/`, `.`, the space, the em dash — is a fixed landmark from frame 0. */
export function scrambleFrame(
  target: string,
  revealed: number,
  rand: () => number = Math.random,
): string {
  let out = "";
  for (let i = 0; i < target.length; i++) {
    const ch = target[i] ?? "";
    const pool = i < revealed ? null : poolFor(ch);
    out += pool ? (pool[Math.floor(rand() * pool.length)] ?? ch) : ch;
  }
  return out;
}

const STEP_MS = 55;
const DURATION_MS = 380;
const FADE_MS = 200;

/** The `.swap-d-*` ladder in `index.css` steps the tiles in by 50 ms each. The
 *  sweep runs the same ladder, so a unit change crosses the grid in the order
 *  the grid was built. */
const SWEEP_STEP = 50;

/** `tile` is the tile's `swap-d-*` ordinal; `within` orders readings inside it. */
export function sweep(tile: number, within = 0): number {
  return (tile - 1) * SWEEP_STEP + within;
}

interface Job {
  node: HTMLElement;
  to: string;
  start: number;
  /** px, or 0 where the target is all digits and `tabular-nums` already holds
   *  the width steady. */
  lock: number;
  locked: boolean;
}

const jobs = new Set<Job>();
let frame = 0;
let lastStep = 0;

function unlock(node: HTMLElement): void {
  node.style.display = "";
  node.style.minWidth = "";
  node.style.textAlign = "";
}

function finish(job: Job): void {
  job.node.textContent = job.to;
  if (job.locked) unlock(job.node);
  jobs.delete(job);
}

/** Reads the clock rather than taking the frame timestamp, so the schedule is
 *  on the same origin as `job.start` wherever the two are not guaranteed to be. */
function tick(): void {
  const now = performance.now();
  const stepped = now - lastStep >= STEP_MS;
  if (stepped) lastStep = now;

  for (const job of jobs) {
    const t = (now - job.start) / DURATION_MS;
    if (t <= 0) continue;
    if (t >= 1) {
      finish(job);
      continue;
    }
    if (!stepped) continue;
    if (job.lock > 0 && !job.locked) {
      job.locked = true;
      job.node.style.textAlign = getComputedStyle(job.node).textAlign;
      job.node.style.display = "inline-block";
      job.node.style.minWidth = `${job.lock}px`;
    }
    job.node.textContent = scrambleFrame(job.to, Math.floor(job.to.length * t));
  }

  frame = jobs.size > 0 ? requestAnimationFrame(tick) : 0;
}

/**
 * Churn `node` from `from` to `to` after `delay` ms. The node is expected to
 * already hold `to` — the caller rendered it — so the old reading is written
 * back and held until this node's turn in the sweep arrives.
 *
 * Cancelling settles the node on `to` rather than leaving a frame behind.
 */
export function scrambleTo(node: HTMLElement, from: string, to: string, delay: number): () => void {
  if (prefersReducedMotion()) {
    if (typeof node.animate === "function") {
      node.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: FADE_MS, easing: "ease-out" });
    }
    return () => {};
  }

  // Measured before the old reading goes back in, while the node still holds
  // the target. Digits need no lock, so most readings skip the layout read.
  const lock = /[a-z]/.test(to) ? node.getBoundingClientRect().width : 0;
  node.textContent = from;

  const job: Job = { node, to, start: performance.now() + delay, lock, locked: false };
  jobs.add(job);
  if (frame === 0) {
    lastStep = 0;
    frame = requestAnimationFrame(tick);
  }

  return () => {
    if (jobs.has(job)) finish(job);
  };
}
