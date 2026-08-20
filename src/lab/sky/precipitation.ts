import * as THREE from "three";

/**
 * Rain and snow. All motion lives in the vertex shader driven by `uTime`, so
 * neither system has a per-frame JS loop over particles. Both spawn boxes are
 * centred on the camera and both meshes skip frustum culling.
 */

const RAIN_VERT = /* glsl */ `
attribute vec2 aRandom;

uniform float uTime;
uniform float uIntensity;
uniform vec3  uWind;
uniform float uGravity;
uniform float uHeight;
uniform float uRadius;
uniform float uLength;

varying float vAlpha;

void main() {
  float seed = aRandom.x;
  float phase = aRandom.y;
  float tip = mod(float(gl_VertexID), 2.0);

  vec3 pos = position;
  float fall = uGravity * (0.8 + seed * 0.5);
  float t = uTime + phase * 20.0;
  pos.y = mod(pos.y + fall * t, uHeight);

  float progress = 1.0 - pos.y / uHeight;
  pos.x += uWind.x * progress * 0.6;
  pos.z += uWind.z * progress * 0.6;
  pos.x = mod(pos.x + uRadius, uRadius * 2.0) - uRadius;
  pos.z = mod(pos.z + uRadius, uRadius * 2.0) - uRadius;

  if (tip > 0.5) {
    float stretch = uLength * (1.0 + length(uWind) * 0.05) * 3.0;
    pos.y -= stretch;
    pos.x -= uWind.x * 0.06;
    pos.z -= uWind.z * 0.06;
  }

  vAlpha = step(seed, uIntensity);
  float dist = length(pos.xz);
  // Drops very close to the camera would draw as full-frame streaks.
  vAlpha *= smoothstep(3.0, 11.0, dist) * smoothstep(uRadius, uRadius * 0.35, dist);
  vAlpha *= smoothstep(0.0, 6.0, pos.y);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const RAIN_FRAG = /* glsl */ `
precision highp float;
uniform float uOpacity;
uniform vec3  uColor;
varying float vAlpha;

void main() {
  if (vAlpha < 0.01) discard;
  gl_FragColor = vec4(uColor, vAlpha * uOpacity);
}
`;

const SNOW_VERT = /* glsl */ `
attribute vec3 aSeed;

uniform float uTime;
uniform float uIntensity;
uniform vec3  uWind;
uniform float uGravity;
uniform float uHeight;
uniform float uRadius;
uniform float uFlutter;
uniform float uPointSize;
uniform float uPixelRatio;

varying float vAlpha;
varying float vSeed;

void main() {
  float seed = aSeed.x;
  float phase = aSeed.y;
  float sizeVar = aSeed.z;

  vec3 pos = position;
  float fall = uGravity * (0.55 + seed * 0.9);
  float t = uTime + phase * 12.0;
  pos.y = mod(pos.y + fall * t, uHeight);

  float progress = 1.0 - pos.y / uHeight;
  float flutter = sin(t * (1.4 + seed * 2.2) + phase) * uFlutter;
  float flutter2 = cos(t * (0.9 + seed * 1.7) + phase * 2.0) * uFlutter * 0.7;
  pos.x += flutter + uWind.x * progress;
  pos.z += flutter2 + uWind.z * progress;
  pos.x = mod(pos.x + uRadius, uRadius * 2.0) - uRadius;
  pos.z = mod(pos.z + uRadius, uRadius * 2.0) - uRadius;

  vAlpha = step(seed, uIntensity);
  float dist = length(pos.xz);
  vAlpha *= smoothstep(2.5, 9.0, dist) * smoothstep(uRadius, uRadius * 0.3, dist);
  vSeed = seed;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  // Clamped: without a ceiling, near flakes cover a quarter of the frame.
  gl_PointSize = clamp(
    uPointSize * sizeVar * uPixelRatio * (26.0 / max(-mv.z, 1.5)),
    1.0,
    10.0 * uPixelRatio
  );
}
`;

const SNOW_FRAG = /* glsl */ `
precision highp float;
uniform float uOpacity;
varying float vAlpha;
varying float vSeed;

void main() {
  if (vAlpha < 0.01) discard;
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.12, d);
  gl_FragColor = vec4(vec3(0.97, 0.98, 1.0), a * vAlpha * uOpacity);
}
`;

export interface PrecipOptions {
  rainCount?: number;
  snowCount?: number;
  radius?: number;
  height?: number;
}

export class Precipitation {
  readonly rain: THREE.LineSegments;
  readonly snow: THREE.Points;
  private readonly rainMat: THREE.ShaderMaterial;
  private readonly snowMat: THREE.ShaderMaterial;
  private readonly radius: number;
  private readonly wind = new THREE.Vector3();

  constructor(scene: THREE.Scene, opts: PrecipOptions = {}) {
    const rainCount = opts.rainCount ?? 15000;
    const snowCount = opts.snowCount ?? 18000;
    this.radius = opts.radius ?? 42;
    const height = opts.height ?? 46;

    const rainPos = new Float32Array(rainCount * 6);
    const rainRnd = new Float32Array(rainCount * 4);
    for (let i = 0; i < rainCount; i++) {
      const x = (Math.random() - 0.5) * this.radius * 2;
      const y = Math.random() * height;
      const z = (Math.random() - 0.5) * this.radius * 2;
      rainPos.set([x, y, z, x, y, z], i * 6);
      const s = Math.random();
      const p = Math.random();
      rainRnd.set([s, p, s, p], i * 4);
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
    rainGeo.setAttribute("aRandom", new THREE.BufferAttribute(rainRnd, 2));

    this.rainMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uWind: { value: new THREE.Vector3() },
        uGravity: { value: -14 },
        uHeight: { value: height },
        uRadius: { value: this.radius },
        uLength: { value: 0.3 },
        uOpacity: { value: 0.15 },
        uColor: { value: new THREE.Color(0.72, 0.78, 0.92) },
      },
      vertexShader: RAIN_VERT,
      fragmentShader: RAIN_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    this.rain = new THREE.LineSegments(rainGeo, this.rainMat);
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 10;
    scene.add(this.rain);

    const snowPos = new Float32Array(snowCount * 3);
    const snowSeed = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      snowPos.set(
        [
          (Math.random() - 0.5) * this.radius * 2,
          Math.random() * height,
          (Math.random() - 0.5) * this.radius * 2,
        ],
        i * 3,
      );
      snowSeed.set([Math.random(), Math.random() * Math.PI * 2, 0.5 + Math.random() * 1.4], i * 3);
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
    snowGeo.setAttribute("aSeed", new THREE.BufferAttribute(snowSeed, 3));

    this.snowMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uWind: { value: new THREE.Vector3() },
        uGravity: { value: -1.6 },
        uHeight: { value: height },
        uRadius: { value: this.radius },
        uFlutter: { value: 1.6 },
        uPointSize: { value: 3 },
        uPixelRatio: { value: 1 },
        uOpacity: { value: 0.72 },
      },
      vertexShader: SNOW_VERT,
      fragmentShader: SNOW_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    });
    this.snow = new THREE.Points(snowGeo, this.snowMat);
    this.snow.frustumCulled = false;
    this.snow.renderOrder = 11;
    scene.add(this.snow);
  }

  update(
    time: number,
    p: {
      rain: number;
      rainLength: number;
      snow: number;
      snowSize: number;
      windAngle: number;
      windSpeed: number;
    },
    pixelRatio: number,
  ): void {
    const gust = 1 + Math.sin(time * 0.37) * 0.22 + Math.sin(time * 0.93) * 0.1;
    this.wind.set(
      Math.cos(p.windAngle) * p.windSpeed * gust,
      0,
      Math.sin(p.windAngle) * p.windSpeed * gust,
    );

    const r = this.rainMat.uniforms;
    r.uTime!.value = time;
    r.uIntensity!.value = p.rain;
    r.uLength!.value = p.rainLength;
    (r.uWind!.value as THREE.Vector3).copy(this.wind);
    this.rain.visible = p.rain > 0.002;

    const s = this.snowMat.uniforms;
    s.uTime!.value = time;
    s.uIntensity!.value = p.snow;
    s.uPointSize!.value = p.snowSize;
    s.uPixelRatio!.value = pixelRatio;
    s.uFlutter!.value = 1.6 + p.windSpeed * 0.06;
    (s.uWind!.value as THREE.Vector3).copy(this.wind).multiplyScalar(0.55);
    this.snow.visible = p.snow > 0.002;
  }

  dispose(): void {
    this.rain.geometry.dispose();
    this.snow.geometry.dispose();
    this.rainMat.dispose();
    this.snowMat.dispose();
  }
}
