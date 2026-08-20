/**
 * Tiling 3D noise baked once on the CPU and uploaded as two volumes. The
 * raymarch reads 2 texels per sample instead of running Worley's 27-cell
 * neighbourhood loop per octave.
 *
 *   base   32^3 RGBA — R: rank-normalised cloud field, GBA: inverted Worley 4/8/16
 *   detail 32^3 RGB  — inverted Worley at 8/16/32, erodes cloud edges
 */
const BASE_SIZE = 32;
const DETAIL_SIZE = 32;

export interface NoiseVolumes {
  base: Uint8Array;
  baseSize: number;
  detail: Uint8Array;
  detailSize: number;
}

function hash1(n: number): number {
  const s = Math.sin(n) * 43758.5453123;
  return s - Math.floor(s);
}

/** Feature points on a periodic `freq^3` lattice, one per cell. */
function worleyPoints(freq: number, seed: number): Float32Array {
  const pts = new Float32Array(freq * freq * freq * 3);
  for (let i = 0; i < freq * freq * freq; i++) {
    pts[i * 3] = hash1(i * 1.13 + seed);
    pts[i * 3 + 1] = hash1(i * 2.71 + seed + 17.3);
    pts[i * 3 + 2] = hash1(i * 3.97 + seed + 41.7);
  }
  return pts;
}

/** Inverted, so 1 = cell centre. Wraps at the lattice boundary. */
function worley(pts: Float32Array, freq: number, x: number, y: number, z: number): number {
  const fx = x * freq;
  const fy = y * freq;
  const fz = z * freq;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const iz = Math.floor(fz);
  let best = 1e9;

  for (let dz = -1; dz <= 1; dz++) {
    const cz = (((iz + dz) % freq) + freq) % freq;
    for (let dy = -1; dy <= 1; dy++) {
      const cy = (((iy + dy) % freq) + freq) % freq;
      for (let dx = -1; dx <= 1; dx++) {
        const cx = (((ix + dx) % freq) + freq) % freq;
        const p = (cz * freq * freq + cy * freq + cx) * 3;
        const px = ix + dx + (pts[p] ?? 0);
        const py = iy + dy + (pts[p + 1] ?? 0);
        const pz = iz + dz + (pts[p + 2] ?? 0);
        const ex = px - fx;
        const ey = py - fy;
        const ez = pz - fz;
        const d = ex * ex + ey * ey + ez * ez;
        if (d < best) best = d;
      }
    }
  }
  return 1 - Math.min(Math.sqrt(best), 1);
}

function valuePoints(freq: number, seed: number): Float32Array {
  const v = new Float32Array(freq * freq * freq);
  for (let i = 0; i < v.length; i++) v[i] = hash1(i * 1.61 + seed);
  return v;
}

function valueNoise(v: Float32Array, freq: number, x: number, y: number, z: number): number {
  const fx = x * freq;
  const fy = y * freq;
  const fz = z * freq;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const iz = Math.floor(fz);
  const tx = fx - ix;
  const ty = fy - iy;
  const tz = fz - iz;
  const ux = tx * tx * (3 - 2 * tx);
  const uy = ty * ty * (3 - 2 * ty);
  const uz = tz * tz * (3 - 2 * tz);

  const at = (dx: number, dy: number, dz: number) => {
    const cx = (((ix + dx) % freq) + freq) % freq;
    const cy = (((iy + dy) % freq) + freq) % freq;
    const cz = (((iz + dz) % freq) + freq) % freq;
    return v[cz * freq * freq + cy * freq + cx] ?? 0;
  };

  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  const x00 = mix(at(0, 0, 0), at(1, 0, 0), ux);
  const x10 = mix(at(0, 1, 0), at(1, 1, 0), ux);
  const x01 = mix(at(0, 0, 1), at(1, 0, 1), ux);
  const x11 = mix(at(0, 1, 1), at(1, 1, 1), ux);
  return mix(mix(x00, x10, uy), mix(x01, x11, uy), uz);
}

let cached: NoiseVolumes | null = null;

export function getNoiseVolumes(): NoiseVolumes {
  if (cached) return cached;

  const vp = [valuePoints(4, 0), valuePoints(8, 7), valuePoints(16, 23)];
  const wp = [worleyPoints(4, 3), worleyPoints(8, 11), worleyPoints(16, 29)];
  const dp = [worleyPoints(8, 53), worleyPoints(16, 71), worleyPoints(32, 97)];

  const voxels = BASE_SIZE ** 3;
  const base = new Uint8Array(voxels * 4);
  const field = new Float32Array(voxels);

  for (let z = 0; z < BASE_SIZE; z++) {
    for (let y = 0; y < BASE_SIZE; y++) {
      for (let x = 0; x < BASE_SIZE; x++) {
        const u = x / BASE_SIZE;
        const v = y / BASE_SIZE;
        const w = z / BASE_SIZE;
        const fbm =
          valueNoise(vp[0]!, 4, u, v, w) * 0.5333 +
          valueNoise(vp[1]!, 8, u, v, w) * 0.2667 +
          valueNoise(vp[2]!, 16, u, v, w) * 0.2;
        const w4 = worley(wp[0]!, 4, u, v, w);
        const w8 = worley(wp[1]!, 8, u, v, w);
        const w16 = worley(wp[2]!, 16, u, v, w);

        const j = z * BASE_SIZE * BASE_SIZE + y * BASE_SIZE + x;
        field[j] = fbm * 0.62 + (w4 * 0.625 + w8 * 0.25 + w16 * 0.125) * 0.38;
        base[j * 4 + 1] = Math.round(w4 * 255);
        base[j * 4 + 2] = Math.round(w8 * 255);
        base[j * 4 + 3] = Math.round(w16 * 255);
      }
    }
  }

  // Averaging decorrelated octaves concentrates the field around its mean, which
  // leaves a coverage threshold below ~0.5 selecting nothing. Replacing each
  // value by its rank makes the distribution uniform, so `coverage` in the
  // shader maps to roughly that fraction of the volume.
  const order = Array.from({ length: voxels }, (_, i) => i);
  order.sort((a, b) => field[a]! - field[b]!);
  for (let rank = 0; rank < voxels; rank++) {
    base[order[rank]! * 4] = Math.round((rank / (voxels - 1)) * 255);
  }

  const detail = new Uint8Array(DETAIL_SIZE ** 3 * 4);
  for (let z = 0; z < DETAIL_SIZE; z++) {
    for (let y = 0; y < DETAIL_SIZE; y++) {
      for (let x = 0; x < DETAIL_SIZE; x++) {
        const u = x / DETAIL_SIZE;
        const v = y / DETAIL_SIZE;
        const w = z / DETAIL_SIZE;
        const i = (z * DETAIL_SIZE * DETAIL_SIZE + y * DETAIL_SIZE + x) * 4;
        detail[i] = Math.round(worley(dp[0]!, 8, u, v, w) * 255);
        detail[i + 1] = Math.round(worley(dp[1]!, 16, u, v, w) * 255);
        detail[i + 2] = Math.round(worley(dp[2]!, 32, u, v, w) * 255);
        detail[i + 3] = 255;
      }
    }
  }

  cached = { base, baseSize: BASE_SIZE, detail, detailSize: DETAIL_SIZE };
  return cached;
}
