import * as THREE from "three";

/**
 * Strike scheduling and the flash envelope, shared by every view so the
 * background and the hero flash on the same frame. Each strike carries a bolt
 * path in world coordinates; views build their own geometry from it.
 */

const MAX_BOLT_VERTS = 512;

export interface Strike {
  id: number;
  /** Line-segment pairs, xyz. Length is `segmentCount * 6`. */
  vertices: Float32Array;
  segmentCount: number;
  core: THREE.Vector3;
  age: number;
  duration: number;
  pulses: number[];
  visible: boolean;
}

function boltPath(start: THREE.Vector3, end: THREE.Vector3, out: number[], depth: number): void {
  if (depth === 0) {
    out.push(start.x, start.y, start.z, end.x, end.y, end.z);
    return;
  }
  const mid = start.clone().lerp(end, 0.42 + Math.random() * 0.16);
  const spread = start.distanceTo(end) * 0.16;
  mid.x += (Math.random() - 0.5) * spread;
  mid.z += (Math.random() - 0.5) * spread * 0.5;

  boltPath(start, mid, out, depth - 1);
  boltPath(mid, end, out, depth - 1);

  if (depth > 2 && Math.random() < 0.35) {
    const branch = mid
      .clone()
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * spread * 4,
          -spread * (1.5 + Math.random() * 2),
          (Math.random() - 0.5) * spread * 2,
        ),
      );
    boltPath(mid, branch, out, depth - 2);
  }
}

export class LightningController {
  flash = 0;
  readonly flashPos = new THREE.Vector3(0, 600, -1400);
  strike: Strike | null = null;
  /** Incremented on every new strike so views know to rebuild geometry. */
  strikeId = 0;

  private cooldown = 2;
  private nextId = 1;

  reset(): void {
    this.flash = 0;
    this.strike = null;
    this.cooldown = 1.5;
  }

  update(dt: number, ratePerSecond: number, cloudBase: number, cloudTop: number): void {
    if (this.strike) {
      this.strike.age += dt;
      this.flash = envelope(this.strike);
      if (this.strike.age > this.strike.duration) {
        this.strike = null;
        this.flash = 0;
      }
    } else {
      this.flash = 0;
    }

    if (ratePerSecond <= 0.001) {
      this.cooldown = 1;
      return;
    }

    this.cooldown -= dt;
    if (this.cooldown > 0 || this.strike) return;

    this.fire(cloudBase, cloudTop);
    // Poisson-ish spacing, floored so strikes never machine-gun.
    this.cooldown = 0.35 + -Math.log(Math.max(Math.random(), 1e-3)) / ratePerSecond;
  }

  private fire(cloudBase: number, cloudTop: number): void {
    const azimuth = (Math.random() - 0.5) * 2.4;
    const distance = 900 + Math.random() * 2200;
    const y = cloudBase + (cloudTop - cloudBase) * (0.25 + Math.random() * 0.4);

    this.flashPos.set(Math.sin(azimuth) * distance, y, -Math.cos(azimuth) * distance);

    const visible = Math.random() < 0.45;
    const verts: number[] = [];
    if (visible) {
      const start = this.flashPos.clone().setY(cloudBase * 1.05);
      const end = start
        .clone()
        .setY(-cloudBase * 1.4)
        .add(new THREE.Vector3((Math.random() - 0.5) * distance * 0.12, 0, 0));
      boltPath(start, end, verts, 6);
    }

    const count = Math.min(verts.length / 6, MAX_BOLT_VERTS / 2);
    const pulseCount = 1 + Math.floor(Math.random() * 3);
    const pulses: number[] = [0];
    for (let i = 1; i < pulseCount; i++) {
      pulses.push((pulses[i - 1] ?? 0) + 0.05 + Math.random() * 0.11);
    }

    this.strike = {
      id: this.nextId++,
      vertices: new Float32Array(verts.slice(0, count * 6)),
      segmentCount: count,
      core: this.flashPos.clone(),
      age: 0,
      duration: (pulses[pulses.length - 1] ?? 0) + 0.55,
      pulses,
      visible: visible && count > 0,
    };
    this.strikeId = this.strike.id;
  }
}

function envelope(s: Strike): number {
  let v = 0;
  for (const p of s.pulses) {
    if (s.age >= p) v += Math.exp(-(s.age - p) * 16);
  }
  return Math.min(v, 1.4);
}
