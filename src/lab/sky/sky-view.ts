import * as THREE from "three";
import type { LightningController } from "./lightning";
import { getNoiseVolumes } from "./noise";
import type { RGB, SkyParams } from "./params";
import { Precipitation } from "./precipitation";
import { CLOUD_FRAG, COMPOSITE_FRAG, FULLSCREEN_VERT } from "./shaders";

export interface Framing {
  fov: number;
  /** Radians. Positive tilts the camera up, pushing the horizon down-frame. */
  pitch: number;
  yaw: number;
}

export interface ViewOptions {
  framing: Framing;
  /** Cloud target resolution as a fraction of the canvas. */
  cloudScale?: number;
  /** Primary raymarch steps, capped at 96 by the shader loop. */
  steps?: number;
  maxPixelRatio?: number;
  precipitation?: boolean;
  preserveDrawingBuffer?: boolean;
}

function makeVolume(data: Uint8Array, size: number): THREE.Data3DTexture {
  const tex = new THREE.Data3DTexture(data, size, size, size);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

function v3(c: RGB): THREE.Vector3 {
  return new THREE.Vector3(c[0], c[1], c[2]);
}

export class SkyView {
  readonly renderer: THREE.WebGLRenderer;
  private readonly cloudTarget: THREE.WebGLRenderTarget;
  private readonly cloudMat: THREE.ShaderMaterial;
  private readonly compositeMat: THREE.ShaderMaterial;
  private readonly cloudScene = new THREE.Scene();
  private readonly compositeScene = new THREE.Scene();
  private readonly overlayScene = new THREE.Scene();
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly camera: THREE.PerspectiveCamera;
  private readonly precip: Precipitation | null;
  private readonly bolt: THREE.LineSegments;
  private readonly boltMat: THREE.LineBasicMaterial;
  private readonly framing: Framing;
  private cloudScaleFactor: number;
  private readonly maxPixelRatio: number;
  private renderedStrikeId = -1;
  private frame = 0;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement, opts: ViewOptions) {
    this.framing = opts.framing;
    this.cloudScaleFactor = opts.cloudScale ?? 0.42;
    this.maxPixelRatio = opts.maxPixelRatio ?? 2;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
    });
    this.renderer.autoClear = false;
    this.renderer.setClearColor(0x000000, 1);

    const noise = getNoiseVolumes();
    const baseTex = makeVolume(noise.base, noise.baseSize);
    const detailTex = makeVolume(noise.detail, noise.detailSize);

    this.cloudTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });

    const rayUniforms = () => ({
      uForward: { value: new THREE.Vector3(0, 0, -1) },
      uRight: { value: new THREE.Vector3(1, 0, 0) },
      uUp: { value: new THREE.Vector3(0, 1, 0) },
      uTanHalfFov: { value: 0.5 },
      uAspect: { value: 1 },
    });

    this.cloudMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        ...rayUniforms(),
        uBaseNoise: { value: baseTex },
        uDetailNoise: { value: detailTex },
        uTime: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Vector3(1, 1, 1) },
        uSunIntensity: { value: 1 },
        uCloudBase: { value: 260 },
        uCloudTop: { value: 760 },
        uCoverage: { value: 0.3 },
        uDetail: { value: 0.4 },
        uAbsorption: { value: 0.05 },
        uDarkness: { value: 0.4 },
        uSilver: { value: 0.6 },
        uCloudLight: { value: new THREE.Vector3(1, 1, 1) },
        uCloudAmbient: { value: new THREE.Vector3(0.5, 0.6, 0.8) },
        uBaseScale: { value: 1 / 1400 },
        uDetailScale: { value: 1 / 160 },
        uWindDir: { value: new THREE.Vector2(1, 0) },
        uCloudSpeed: { value: 1 },
        uFlash: { value: 0 },
        uFlashPos: { value: new THREE.Vector3() },
        uFlashColor: { value: new THREE.Vector3(0.8, 0.85, 1) },
        uSteps: { value: opts.steps ?? 44 },
        uMaxMarch: { value: 9000 },
        uFrame: { value: 0 },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: CLOUD_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    this.compositeMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        ...rayUniforms(),
        uClouds: { value: this.cloudTarget.texture },
        uBaseNoise: { value: baseTex },
        uTime: { value: 0 },
        uFrame: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Vector3(1, 1, 1) },
        uSunIntensity: { value: 1 },
        uSunSize: { value: 0.9975 },
        uGlowStrength: { value: 0.4 },
        uGlowPower: { value: 26 },
        uMoonDir: { value: new THREE.Vector3(0, 0.5, -1).normalize() },
        uMoonIntensity: { value: 0 },
        uMoonPhase: { value: 0.7 },
        uZenith: { value: new THREE.Vector3() },
        uHorizon: { value: new THREE.Vector3() },
        uGround: { value: new THREE.Vector3() },
        uSkyExponent: { value: 0.7 },
        uHazeColor: { value: new THREE.Vector3() },
        uHazeStrength: { value: 0.3 },
        uHazeTightness: { value: 10 },
        uStars: { value: 0 },
        uStarDensity: { value: 1 },
        uTwinkle: { value: 1 },
        uMilkyWay: { value: 0 },
        uFog: { value: 0 },
        uFogColor: { value: new THREE.Vector3() },
        uFlash: { value: 0 },
        uFlashColor: { value: new THREE.Vector3(0.8, 0.85, 1) },
        uExposure: { value: 1 },
        uSaturation: { value: 1 },
        uVignette: { value: 0.35 },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.PlaneGeometry(2, 2);
    this.cloudScene.add(new THREE.Mesh(quad, this.cloudMat));
    this.compositeScene.add(new THREE.Mesh(quad, this.compositeMat));

    this.camera = new THREE.PerspectiveCamera(opts.framing.fov, 1, 0.1, 4000);
    this.applyFraming();

    this.precip = opts.precipitation === false ? null : new Precipitation(this.overlayScene);

    this.boltMat = new THREE.LineBasicMaterial({
      color: 0xdce4ff,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.bolt = new THREE.LineSegments(new THREE.BufferGeometry(), this.boltMat);
    this.bolt.frustumCulled = false;
    this.bolt.renderOrder = 20;
    this.bolt.visible = false;
    this.overlayScene.add(this.bolt);
  }

  private applyFraming(): void {
    const { pitch, yaw } = this.framing;
    const cp = Math.cos(pitch);
    const forward = new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    for (const m of [this.cloudMat, this.compositeMat]) {
      (m.uniforms.uForward!.value as THREE.Vector3).copy(forward);
      (m.uniforms.uRight!.value as THREE.Vector3).copy(right);
      (m.uniforms.uUp!.value as THREE.Vector3).copy(up);
      m.uniforms.uTanHalfFov!.value = Math.tan((this.framing.fov * Math.PI) / 360);
    }

    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(forward);
    this.camera.fov = this.framing.fov;
    this.camera.updateProjectionMatrix();
  }

  setQuality(steps: number, cloudScale: number): void {
    this.cloudMat.uniforms.uSteps!.value = steps;
    if (cloudScale === this.cloudScaleFactor) return;
    this.cloudScaleFactor = cloudScale;
    const pr = this.renderer.getPixelRatio();
    this.cloudTarget.setSize(
      Math.max(Math.floor(this.width * pr * cloudScale), 1),
      Math.max(Math.floor(this.height * pr * cloudScale), 1),
    );
  }

  setFraming(next: Partial<Framing>): void {
    Object.assign(this.framing, next);
    this.applyFraming();
  }

  resize(cssWidth: number, cssHeight: number, pixelRatio: number): void {
    const w = Math.max(Math.floor(cssWidth), 1);
    const h = Math.max(Math.floor(cssHeight), 1);
    const pr = Math.min(pixelRatio, this.maxPixelRatio);
    if (w === this.width && h === this.height && this.renderer.getPixelRatio() === pr) return;

    this.width = w;
    this.height = h;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.cloudTarget.setSize(
      Math.max(Math.floor(w * pr * this.cloudScaleFactor), 1),
      Math.max(Math.floor(h * pr * this.cloudScaleFactor), 1),
    );

    const aspect = w / h;
    this.cloudMat.uniforms.uAspect!.value = aspect;
    this.compositeMat.uniforms.uAspect!.value = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setParams(p: SkyParams): void {
    const alt = Math.asin(Math.max(Math.min(p.sunElevation, 1), -1));
    const ca = Math.cos(alt);
    const sunDir = new THREE.Vector3(
      Math.sin(p.sunAzimuth) * ca,
      Math.sin(alt),
      -Math.cos(p.sunAzimuth) * ca,
    ).normalize();

    const moonAz = p.sunAzimuth + Math.PI;
    const moonDir = new THREE.Vector3(
      Math.sin(moonAz) * 0.72,
      0.62,
      -Math.cos(moonAz) * 0.72,
    ).normalize();

    const c = this.cloudMat.uniforms;
    (c.uSunDir!.value as THREE.Vector3).copy(sunDir);
    (c.uSunColor!.value as THREE.Vector3).copy(v3(p.sunColor));
    c.uSunIntensity!.value = p.sunIntensity;
    c.uCloudBase!.value = p.cloudBase;
    c.uCloudTop!.value = Math.max(p.cloudTop, p.cloudBase + 40);
    c.uCoverage!.value = p.coverage;
    c.uDetail!.value = p.cloudDetail;
    c.uAbsorption!.value = p.cloudAbsorption;
    c.uDarkness!.value = p.cloudDarkness;
    c.uSilver!.value = p.silverLining;
    c.uMaxMarch!.value = Math.min(p.cloudTop * 6, 22000);
    (c.uCloudLight!.value as THREE.Vector3).copy(v3(p.cloudLight));
    (c.uCloudAmbient!.value as THREE.Vector3).copy(v3(p.cloudAmbient));
    c.uBaseScale!.value = 1 / (4200 * p.cloudScale);
    c.uDetailScale!.value = 1 / (900 * p.cloudScale);
    (c.uWindDir!.value as THREE.Vector2).set(Math.cos(p.windAngle), Math.sin(p.windAngle));
    c.uCloudSpeed!.value = p.cloudSpeed;
    (c.uFlashColor!.value as THREE.Vector3).copy(v3(p.flashColor));

    const m = this.compositeMat.uniforms;
    (m.uSunDir!.value as THREE.Vector3).copy(sunDir);
    (m.uSunColor!.value as THREE.Vector3).copy(v3(p.sunColor));
    m.uSunIntensity!.value = p.sunIntensity;
    m.uSunSize!.value = p.sunSize;
    m.uGlowStrength!.value = p.glowStrength;
    m.uGlowPower!.value = p.glowPower;
    (m.uMoonDir!.value as THREE.Vector3).copy(moonDir);
    m.uMoonIntensity!.value = p.moonIntensity;
    m.uMoonPhase!.value = p.moonPhase;
    (m.uZenith!.value as THREE.Vector3).copy(v3(p.zenith));
    (m.uHorizon!.value as THREE.Vector3).copy(v3(p.horizon));
    (m.uGround!.value as THREE.Vector3).copy(v3(p.ground));
    m.uSkyExponent!.value = p.skyExponent;
    (m.uHazeColor!.value as THREE.Vector3).copy(v3(p.hazeColor));
    m.uHazeStrength!.value = p.hazeStrength;
    m.uHazeTightness!.value = p.hazeTightness;
    m.uStars!.value = p.starIntensity;
    m.uStarDensity!.value = p.starDensity;
    m.uTwinkle!.value = p.starTwinkle;
    m.uMilkyWay!.value = p.milkyWay;
    m.uFog!.value = p.fog;
    (m.uFogColor!.value as THREE.Vector3).copy(v3(p.fogColor));
    (m.uFlashColor!.value as THREE.Vector3).copy(v3(p.flashColor));
    m.uExposure!.value = p.exposure;
    m.uSaturation!.value = p.saturation;
    m.uVignette!.value = p.vignette;
  }

  render(time: number, params: SkyParams, lightning: LightningController): void {
    this.frame++;
    this.cloudMat.uniforms.uTime!.value = time;
    this.cloudMat.uniforms.uFrame!.value = this.frame;
    this.cloudMat.uniforms.uFlash!.value = lightning.flash;
    (this.cloudMat.uniforms.uFlashPos!.value as THREE.Vector3).copy(lightning.flashPos);
    this.compositeMat.uniforms.uTime!.value = time;
    this.compositeMat.uniforms.uFrame!.value = this.frame;
    this.compositeMat.uniforms.uFlash!.value = lightning.flash * 0.5;

    this.renderer.setRenderTarget(this.cloudTarget);
    this.renderer.clear(true, false, false);
    this.renderer.render(this.cloudScene, this.quadCamera);

    this.renderer.setRenderTarget(null);
    this.renderer.clear(true, true, false);
    this.renderer.render(this.compositeScene, this.quadCamera);

    this.syncBolt(lightning);
    if (this.precip) {
      this.precip.update(time, params, this.renderer.getPixelRatio());
    }
    this.renderer.render(this.overlayScene, this.camera);
  }

  private syncBolt(lightning: LightningController): void {
    const s = lightning.strike;
    if (!s || !s.visible) {
      this.bolt.visible = false;
      return;
    }
    if (s.id !== this.renderedStrikeId) {
      this.renderedStrikeId = s.id;
      this.bolt.geometry.dispose();
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(s.vertices, 3));
      this.bolt.geometry = geo;
    }
    this.bolt.visible = true;
    this.boltMat.opacity = Math.min(lightning.flash, 1);
  }

  /** Data URL of the current frame. Requires `preserveDrawingBuffer`. */
  snapshot(type = "image/webp", quality = 0.9): string {
    return this.renderer.domElement.toDataURL(type, quality);
  }

  dispose(): void {
    this.precip?.dispose();
    this.bolt.geometry.dispose();
    this.boltMat.dispose();
    this.cloudTarget.dispose();
    this.cloudMat.dispose();
    this.compositeMat.dispose();
    this.renderer.dispose();
  }
}
