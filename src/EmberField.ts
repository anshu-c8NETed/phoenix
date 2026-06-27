// ════════════════════════════════════════════════════════════
//  Phoenix — Ember Field
//  Ambient WebGL particle background for the landing hero.
//  Fully isolated from React's render cycle: mounts once,
//  drives itself via requestAnimationFrame, and exposes only
//  two setters (setUrgency, setMouse) so the host component
//  never needs to re-create the scene on re-render.
// ════════════════════════════════════════════════════════════

import * as THREE from "three";

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uUrgency;     // 0 (calm) → 1 (critical) — speeds + brightens drift
  attribute float aSize;
  attribute float aSeed;
  attribute float aSpeed;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    vSeed = aSeed;

    vec3 pos = position;

    // Upward drift, looping within a band so embers feel endless
    float speed = aSpeed * (0.4 + uUrgency * 0.9);
    float travel = mod(uTime * speed + aSeed * 100.0, 26.0);
    pos.y += travel - 13.0;

    // Gentle horizontal sway, unique per-particle via seed
    pos.x += sin(uTime * (0.3 + aSeed * 0.5) + aSeed * 6.2831) * (0.6 + aSeed * 0.8);
    pos.z += cos(uTime * (0.25 + aSeed * 0.4) + aSeed * 6.2831) * 0.5;

    // Fade in/out across the travel band (avoid hard pop at edges)
    float edgeFade = smoothstep(0.0, 2.5, travel) * smoothstep(26.0, 23.0, travel);
    vAlpha = edgeFade * (0.12 + uUrgency * 0.22);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * uPixelRatio * (24.0 / -mvPosition.z) * (0.85 + uUrgency * 0.3);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  precision mediump float;
  uniform highp float uUrgency;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    // Soft circular falloff so points read as embers, not squares
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.0, d);
    float glow = smoothstep(0.5, 0.15, d) * 0.5;
    float alpha = (core + glow) * vAlpha;
    if (alpha < 0.01) discard;

    // Warm ember palette: deep red → orange → pale amber, biased by seed + urgency
    vec3 deepRed   = vec3(0.55, 0.08, 0.04);
    vec3 orange    = vec3(0.95, 0.42, 0.12);
    vec3 paleAmber = vec3(1.0, 0.78, 0.45);

    float mixA = clamp(vSeed + uUrgency * 0.3, 0.0, 1.0);
    vec3 color = mix(deepRed, orange, mixA);
    color = mix(color, paleAmber, core * 0.6);

    gl_FragColor = vec4(color, alpha);
  }
`;

export interface EmberFieldOptions {
  particleCount?: number;
}

export class EmberField {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private startTime: number;
  private rafId: number | null = null;
  private destroyed = false;

  // Smoothed mouse parallax target (lerped each frame, not snapped)
  private mouseTarget = { x: 0, y: 0 };
  private mouseCurrent = { x: 0, y: 0 };
  private urgencyTarget = 0;
  private urgencyCurrent = 0;

  private resizeHandler = () => this.handleResize();

  constructor(container: HTMLElement, opts: EmberFieldOptions = {}) {
    this.container = container;
    const count = opts.particleCount ?? 90;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.z = 14;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.inset = "0";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";

    // ── Geometry: scattered points with per-particle randomness ──
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      sizes[i] = 1.5 + Math.random() * 3.5;
      seeds[i] = Math.random();
      speeds[i] = 0.5 + Math.random() * 1.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uUrgency: { value: 0 },
      },
    });

    this.points = new THREE.Points(geometry, this.material);
    this.scene.add(this.points);

    this.startTime = performance.now();

    this.handleResize();
    window.addEventListener("resize", this.resizeHandler);

    this.animate();
  }

  /** 0 = calm ambient drift, 1 = maximum urgency (faster, brighter) */
  setUrgency(value: number) {
    this.urgencyTarget = Math.max(0, Math.min(1, value));
  }

  /** Normalized mouse position, -1 to 1 on each axis */
  setMouse(x: number, y: number) {
    this.mouseTarget.x = x;
    this.mouseTarget.y = y;
  }

  private handleResize() {
    const { clientWidth, clientHeight } = this.container;
    if (!clientWidth || !clientHeight) return;
    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  }

  private animate = () => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.animate);

    const t = (performance.now() - this.startTime) / 1000;
    this.material.uniforms.uTime.value = t;

    // Smooth (lerp) both mouse parallax and urgency so changes never snap
    this.mouseCurrent.x += (this.mouseTarget.x - this.mouseCurrent.x) * 0.04;
    this.mouseCurrent.y += (this.mouseTarget.y - this.mouseCurrent.y) * 0.04;
    this.urgencyCurrent += (this.urgencyTarget - this.urgencyCurrent) * 0.02;
    this.material.uniforms.uUrgency.value = this.urgencyCurrent;

    // Subtle parallax: camera drifts opposite to cursor for depth
    this.camera.position.x = this.mouseCurrent.x * 1.2;
    this.camera.position.y = this.mouseCurrent.y * 0.8;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  };

  destroy() {
    this.destroyed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.resizeHandler);
    this.points.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}