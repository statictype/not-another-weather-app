export const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Ray reconstruction and shared helpers. Prepended to both fragment shaders. */
const COMMON = /* glsl */ `
uniform vec3  uForward;
uniform vec3  uRight;
uniform vec3  uUp;
uniform float uTanHalfFov;
uniform float uAspect;

vec3 rayDir(vec2 uv) {
  vec2 ndc = uv * 2.0 - 1.0;
  return normalize(uForward + uRight * ndc.x * uTanHalfFov * uAspect + uUp * ndc.y * uTanHalfFov);
}

float remap(float v, float lo, float hi, float nlo, float nhi) {
  return nlo + (v - lo) / max(hi - lo, 1e-5) * (nhi - nlo);
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 hash33(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
           dot(p, vec3(269.5, 183.3, 246.1)),
           dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
`;

export const CLOUD_FRAG = /* glsl */ `
precision highp float;
precision highp sampler3D;

${COMMON}

uniform sampler3D uBaseNoise;
uniform sampler3D uDetailNoise;

uniform float uTime;
uniform vec3  uSunDir;
uniform vec3  uSunColor;
uniform float uSunIntensity;

uniform float uCloudBase;
uniform float uCloudTop;
uniform float uCoverage;
uniform float uDetail;
uniform float uAbsorption;
uniform float uDarkness;
uniform float uSilver;
uniform vec3  uCloudLight;
uniform vec3  uCloudAmbient;
uniform float uBaseScale;
uniform float uDetailScale;
uniform vec2  uWindDir;
uniform float uCloudSpeed;

uniform float uFlash;
uniform vec3  uFlashPos;
uniform vec3  uFlashColor;

uniform float uSteps;
uniform float uMaxMarch;
uniform float uFrame;

varying vec2 vUv;
layout(location = 0) out vec4 fragColor;

#define LIGHT_STEPS 5
#define PI 3.14159265359

float heightFraction(vec3 p) {
  return clamp((p.y - uCloudBase) / max(uCloudTop - uCloudBase, 1.0), 0.0, 1.0);
}

float density(vec3 p, bool cheap) {
  float h = heightFraction(p);
  float env = smoothstep(0.0, 0.24, h) * smoothstep(1.0, 0.58, h);
  if (env <= 0.0) return 0.0;

  vec3 wind = vec3(uWindDir.x, 0.0, uWindDir.y) * uCloudSpeed * uTime * 14.0;
  vec3 q = (p + wind) * uBaseScale;
  vec4 n = texture(uBaseNoise, q);

  // R is rank-normalised, so 1 - coverage cuts that fraction of the volume.
  float lo = 1.0 - uCoverage;
  float shape = smoothstep(lo, min(lo + 0.34, 0.995), n.r) * env;
  if (shape <= 0.002) return 0.0;
  if (cheap) return shape;

  vec3 dq = (p + wind * 1.8) * uDetailScale;
  vec3 dn = texture(uDetailNoise, dq).rgb;
  float det = dn.r * 0.625 + dn.g * 0.25 + dn.b * 0.125;
  det = mix(1.0 - det, det, clamp(h * 2.5, 0.0, 1.0));

  // Erosion weighted toward the edges, so cores stay solid.
  return clamp(shape - det * uDetail * (1.0 - shape) * 1.6, 0.0, 1.0);
}

float lightMarch(vec3 p) {
  float stepL = (uCloudTop - uCloudBase) / float(LIGHT_STEPS) * 0.65;
  float accum = 0.0;
  float w = 1.0;
  for (int i = 0; i < LIGHT_STEPS; i++) {
    p += uSunDir * stepL * w;
    accum += density(p, true) * stepL * w;
    w *= 1.45;
  }
  float t = accum * uAbsorption * 0.02;
  float beer = exp(-t);
  float powder = 1.0 - exp(-t * 2.0);
  return mix(beer, beer * powder * 2.0, 0.5);
}

float henyey(float c, float g) {
  float g2 = g * g;
  return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5);
}

vec2 slab(vec3 ro, vec3 rd, float lo, float hi) {
  if (abs(rd.y) < 1e-4) return vec2(-1.0);
  float t0 = (lo - ro.y) / rd.y;
  float t1 = (hi - ro.y) / rd.y;
  return vec2(min(t0, t1), max(t0, t1));
}

void main() {
  vec3 rd = rayDir(vUv);
  vec3 ro = vec3(0.0, 40.0, 0.0);

  vec2 t = slab(ro, rd, uCloudBase, uCloudTop);
  float tEnter = max(t.x, 0.0);
  // Capping the march keeps the step size below the detail-noise period, which
  // otherwise aliases into noise on shallow rays.
  float tExit = min(t.y, tEnter + uMaxMarch);
  if (t.x > t.y || tExit <= tEnter) {
    fragColor = vec4(0.0);
    return;
  }

  float cosT = dot(rd, uSunDir);
  float phase = henyey(cosT, 0.7) * 0.6 + henyey(cosT, -0.28) * 0.4;

  int steps = int(uSteps);
  float span = tExit - tEnter;
  // Steps grow with distance: near clouds get the resolution, far ones are
  // small on screen anyway, and the total still covers the span exactly.
  const float GROWTH = 1.055;
  float norm = (pow(GROWTH, uSteps) - 1.0) / (GROWTH - 1.0);
  float st = span / norm;

  float jitter = hash21(vUv * 1024.0 + uFrame * 0.618);
  float tt = tEnter + jitter * st;

  vec4 acc = vec4(0.0);
  vec3 sun = uCloudLight * uSunIntensity;

  for (int i = 0; i < 96; i++) {
    if (i >= steps || acc.a > 0.985) break;

    vec3 p = ro + rd * tt;
    float d = density(p, false);

    if (d > 0.002) {
      float energy = lightMarch(p);
      float h = heightFraction(p);

      vec3 col = sun * energy * (0.32 + phase * 0.85);
      col += uCloudAmbient * mix(0.45, 1.0, h);
      col *= mix(1.0 - uDarkness, 1.0, smoothstep(0.0, 0.6, h));

      float rim = pow(clamp(1.0 - d, 0.0, 1.0), 3.0) * pow(max(cosT, 0.0), 3.0);
      col += sun * rim * uSilver * energy;

      float fd = length(p - uFlashPos);
      col += uFlashColor * uFlash * 22.0 / (1.0 + fd * fd * 2.2e-5);

      float fade = 1.0 - smoothstep(uMaxMarch * 0.45, uMaxMarch, tt - tEnter);
      float alpha = (1.0 - exp(-d * st * uAbsorption * 0.06)) * fade;
      acc.rgb += col * alpha * (1.0 - acc.a);
      acc.a += alpha * (1.0 - acc.a);
    }

    tt += st;
    st *= GROWTH;
  }

  acc *= smoothstep(0.008, 0.075, rd.y);
  fragColor = clamp(acc, 0.0, 40.0);
}
`;

export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
precision highp sampler3D;

${COMMON}

uniform sampler2D uClouds;
uniform sampler3D uBaseNoise;

uniform float uTime;
uniform float uFrame;

uniform vec3  uSunDir;
uniform vec3  uSunColor;
uniform float uSunIntensity;
uniform float uSunSize;
uniform float uGlowStrength;
uniform float uGlowPower;

uniform vec3  uMoonDir;
uniform float uMoonIntensity;
uniform float uMoonPhase;

uniform vec3  uZenith;
uniform vec3  uHorizon;
uniform vec3  uGround;
uniform float uSkyExponent;
uniform vec3  uHazeColor;
uniform float uHazeStrength;
uniform float uHazeTightness;

uniform float uStars;
uniform float uStarDensity;
uniform float uTwinkle;
uniform float uMilkyWay;

uniform float uFog;
uniform vec3  uFogColor;

uniform float uFlash;
uniform vec3  uFlashColor;

uniform float uExposure;
uniform float uSaturation;
uniform float uVignette;

varying vec2 vUv;
layout(location = 0) out vec4 fragColor;

vec3 starLayer(vec3 rd, float scale, float cut, float radius, float bright) {
  vec3 p = rd * scale;
  vec3 id = floor(p);
  vec3 f = fract(p) - 0.5;
  vec3 h = hash33(id);
  if (h.x > cut) return vec3(0.0);

  vec2 off = (h.yz - 0.5) * 0.62;
  vec2 d = f.xy - off;
  float r = length(d);

  float mag = pow(h.y * 0.7 + h.z * 0.3, 3.0);
  float core = smoothstep(radius, 0.0, r) * (0.35 + mag);

  float tw = 0.7 + 0.3 * sin(uTime * (1.8 + h.z * 4.0) + h.y * 31.4);
  core *= mix(1.0, tw, uTwinkle);

  float spikes = 0.0;
  if (mag > 0.35) {
    spikes = max(0.0, 1.0 - abs(d.x) * 120.0) * max(0.0, 1.0 - abs(d.y) * 14.0)
           + max(0.0, 1.0 - abs(d.y) * 120.0) * max(0.0, 1.0 - abs(d.x) * 14.0);
    spikes *= (mag - 0.35) * 0.5;
  }

  vec3 hot = vec3(0.62, 0.72, 1.0);
  vec3 warm = vec3(1.0, 0.78, 0.58);
  vec3 tint = mix(hot, mix(vec3(1.0, 0.97, 0.93), warm, smoothstep(0.55, 1.0, h.z)), smoothstep(0.0, 0.55, h.z));

  return tint * (core + spikes) * bright;
}

float bandNoise(vec3 rd) {
  float a = texture(uBaseNoise, rd * 0.55 + vec3(0.13)).r;
  float b = texture(uBaseNoise, rd * 1.7 + vec3(0.61)).g;
  float c = texture(uBaseNoise, rd * 4.1 + vec3(0.29)).b;
  return a * 0.55 + b * 0.3 + c * 0.15;
}

vec3 milkyWay(vec3 rd) {
  vec3 axis = normalize(vec3(0.42, 0.52, -0.75));
  float d = dot(rd, axis);
  float band = exp(-d * d * 14.0);
  float n = bandNoise(rd);
  float lanes = smoothstep(0.32, 0.62, texture(uBaseNoise, rd * 2.3 + vec3(0.77)).a);
  float glow = band * smoothstep(0.28, 0.85, n) * (1.0 - lanes * 0.75);
  vec3 tint = mix(vec3(0.55, 0.62, 0.95), vec3(1.0, 0.92, 0.82), n);
  return tint * glow;
}

vec3 moon(vec3 rd, float halo) {
  float c = dot(rd, uMoonDir);
  float ang = acos(clamp(c, -1.0, 1.0));
  float radius = 0.028;

  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), uMoonDir));
  vec3 up = cross(uMoonDir, right);
  vec2 lc = vec2(dot(rd, right), dot(rd, up)) / radius;

  float disc = smoothstep(1.0, 0.94, length(lc));
  float k = (uMoonPhase * 2.0 - 1.0) * 2.0;
  float lit = smoothstep(0.97, 1.06, length(vec2(lc.x - k, lc.y)));
  lit = uMoonPhase > 0.5 ? lit : 1.0 - smoothstep(1.06, 0.97, length(vec2(lc.x - k, lc.y)));

  float craters = texture(uBaseNoise, vec3(lc * 0.22, 0.5)).r;
  vec3 surface = vec3(0.92, 0.93, 0.88) * mix(0.82, 1.0, craters);

  float glow = pow(max(1.0 - ang / 0.55, 0.0), 3.0) * halo;
  return surface * disc * lit * 1.6 + vec3(0.62, 0.70, 0.95) * glow * 0.5;
}

void main() {
  vec3 rd = rayDir(vUv);
  float h = rd.y;

  vec3 sky = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), uSkyExponent));
  sky = mix(sky, uGround, smoothstep(0.03, -0.16, h));

  float cosS = dot(rd, uSunDir);

  if (uStars > 0.001) {
    float above = smoothstep(-0.04, 0.12, h);
    vec3 s = starLayer(rd, 190.0 * uStarDensity, 0.09, 0.115, 1.0);
    s += starLayer(rd, 92.0 * uStarDensity, 0.045, 0.16, 0.75);
    sky += s * uStars * above;
    sky += milkyWay(rd) * uMilkyWay * above * 0.55;
  }

  if (uMoonIntensity > 0.001) {
    sky += moon(rd, uMoonIntensity) * uMoonIntensity;
  }

  float band = exp(-abs(h) * uHazeTightness) * (0.45 + 0.55 * max(cosS, 0.0));
  sky = mix(sky, uHazeColor, clamp(band * uHazeStrength, 0.0, 1.0));

  float towardSun = max(cosS, 0.0);
  sky += uSunColor * uSunIntensity * uGlowStrength *
         (pow(towardSun, uGlowPower) + pow(towardSun, 3.0) * 0.22);

  float discEdge = uSunSize;
  float disc = smoothstep(discEdge, discEdge + (1.0 - discEdge) * 0.35, cosS);
  sky += uSunColor * disc * uSunIntensity * 2.6;

  vec4 clouds = texture(uClouds, vUv);
  vec3 col = sky * (1.0 - clouds.a) + clouds.rgb;

  col += uFlashColor * uFlash * 0.55;

  float fogProfile = 0.5 + 0.5 * (1.0 - smoothstep(-0.12, 0.6, h));
  col = mix(col, uFogColor, clamp(uFog * fogProfile, 0.0, 1.0));

  col *= uExposure;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(lum), col, uSaturation);

  vec2 vc = vUv - 0.5;
  col *= 1.0 - uVignette * dot(vc, vc) * 1.4;

  float peak = max(max(col.r, col.g), col.b);
  col /= 1.0 + max(peak - 0.85, 0.0);
  col += (hash21(vUv * 2048.0 + uFrame) - 0.5) / 255.0;

  fragColor = vec4(col, 1.0);
}
`;
