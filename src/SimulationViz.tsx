// ════════════════════════════════════════════════════════════
//  Phoenix — Simulation Viz
//  Three.js WebGL centerpiece for Agent 4.
//
//  Two Catmull-Rom tube paths diverge from a glowing fork node.
//  Left tube = Timeline A (red, original plan → failure).
//  Right tube = Timeline B (emerald, Phoenix plan → success).
//
//  Events materialise as glowing sphere markers along each tube
//  in sync with the reveal sequence driven from outside via props.
//
//  Architecture:
//  - Fully isolated from React render cycle (like EmberField).
//  - Exposes a single class `SimViz` with `revealTo(a, b)` and
//    `destroy()`. A thin React wrapper manages the lifecycle.
// ════════════════════════════════════════════════════════════

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import gsap from "gsap";

// ── Vertex: per-vertex colour set at geometry build time ─────
const VERT = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vColor = color;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAG = /* glsl */ `
  varying vec3 vColor;
  uniform float uAlpha;
  void main() {
    gl_FragColor = vec4(vColor, uAlpha);
  }
`;

// ── Sphere glow: radial falloff ───────────────────────────────
const SPHERE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SPHERE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0;
    float core  = smoothstep(1.0, 0.0,  d);
    float glow  = smoothstep(1.0, 0.15, d) * 0.5;
    float alpha = (core + glow) * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// ── Helpers ───────────────────────────────────────────────────

function catmullPoints(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, n = 30) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const t2 = t * t, t3 = t2 * t;
    const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
    const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
    const z = 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
}

// Build a glowing billboard sprite for event markers
function makeMarkerSprite(color: THREE.Color): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(0.55, 0.55);
  const mat = new THREE.ShaderMaterial({
    vertexShader: SPHERE_VERT,
    fragmentShader: SPHERE_FRAG,
    uniforms: {
      uColor: { value: color },
      uIntensity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geo, mat);
}

// ─────────────────────────────────────────────────────────────
// SimViz — the vanilla Three.js scene class
// ─────────────────────────────────────────────────────────────

interface SimVizOptions {
  countA: number;
  countB: number;
  typeColors: {
    failure: string;
    warning: string;
    success: string;
    milestone: string;
    neutral: string;
  };
}

export class SimViz {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private rafId: number | null = null;
  private destroyed = false;

  private markersA: THREE.Mesh[] = [];
  private markersB: THREE.Mesh[] = [];
  private forkGlow: THREE.Mesh | null = null;

  private currentRevealA = 0;
  private currentRevealB = 0;
  private targetRevealA = 0;
  private targetRevealB = 0;

  private camTarget = { x: 0, y: 0 };
  private camCurrent = { x: 0, y: 0 };
  private resizeHandler = () => this.handleResize();

  constructor(container: HTMLElement, opts: SimVizOptions) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 0, 12);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
    Object.assign(this.renderer.domElement.style, {
      position: "absolute", inset: "0", width: "100%", height: "100%",
    });

    this.handleResize();
    window.addEventListener("resize", this.resizeHandler);

    this.buildScene(opts);
    this.animate();
  }

  private buildScene(opts: SimVizOptions) {
    const forkPt = new THREE.Vector3(0, 1.5, 0);

    // ── Fork glow ────────────────────────────────────────────
    const forkGeo = new THREE.PlaneGeometry(1.4, 1.4);
    const forkMat = new THREE.ShaderMaterial({
      vertexShader: SPHERE_VERT,
      fragmentShader: SPHERE_FRAG,
      uniforms: {
        uColor: { value: new THREE.Color("#F97316") },
        uIntensity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.forkGlow = new THREE.Mesh(forkGeo, forkMat);
    this.forkGlow.position.copy(forkPt);
    this.scene.add(this.forkGlow);

    // Animate fork in
    gsap.to(forkMat.uniforms.uIntensity, { value: 0.85, duration: 1.2, ease: "power3.out", delay: 0.3 });

    // ── Path definitions (left = A / red, right = B / green) ─
    const endA = new THREE.Vector3(-4.5, -3, 0);
    const endB = new THREE.Vector3(4.5, -3, 0);
    const ctrlA1 = new THREE.Vector3(-1.5, 0.5, 0);
    const ctrlA2 = new THREE.Vector3(-3.5, -1.5, 0);
    const ctrlB1 = new THREE.Vector3(1.5, 0.5, 0);
    const ctrlB2 = new THREE.Vector3(3.5, -1.5, 0);

    const ptsA = catmullPoints(
      new THREE.Vector3(0, 2.5, 0), forkPt, ctrlA1, new THREE.Vector3(-2.5, -0.5, 0), 20
    ).concat(catmullPoints(ctrlA1, new THREE.Vector3(-2.5, -0.5, 0), ctrlA2, endA, 20));

    const ptsB = catmullPoints(
      new THREE.Vector3(0, 2.5, 0), forkPt, ctrlB1, new THREE.Vector3(2.5, -0.5, 0), 20
    ).concat(catmullPoints(ctrlB1, new THREE.Vector3(2.5, -0.5, 0), ctrlB2, endB, 20));

    const buildTube = (pts: THREE.Vector3[], hex: string) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 80, 0.035, 8, false);
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      this.scene.add(mesh);
      gsap.to(mat, { opacity: 0.65, duration: 1.4, ease: "power2.out", delay: 0.5 });
      return { curve, mesh };
    };

    const tubeA = buildTube(ptsA, "#EF4444");
    const tubeB = buildTube(ptsB, "#34D399");

    // ── Event markers ─────────────────────────────────────────
    const typeColorA = (t: string) => {
      const map: Record<string, string> = { failure: "#EF4444", warning: "#F59E0B", neutral: "#71717A", milestone: "#60A5FA", success: "#34D399" };
      return new THREE.Color(map[t] || "#71717A");
    };
    const typeColorB = (t: string) => {
      const map: Record<string, string> = { failure: "#EF4444", warning: "#F59E0B", neutral: "#71717A", milestone: "#60A5FA", success: "#34D399" };
      return new THREE.Color(map[t] || "#71717A");
    };

    // Distribute markers evenly along each tube
    const buildMarkers = (
      curve: THREE.CatmullRomCurve3,
      count: number,
      colorFn: (t: string) => THREE.Color,
      types: string[],
    ) => {
      const markers: THREE.Mesh[] = [];
      for (let i = 0; i < count; i++) {
        const t = (i + 1) / (count + 1);
        const pt = curve.getPoint(t);
        const type = types[i] || "neutral";
        const m = makeMarkerSprite(colorFn(type));
        m.position.copy(pt);
        // Always face camera (billboard)
        m.lookAt(this.camera.position);
        m.visible = false;
        this.scene.add(m);
        markers.push(m);
      }
      return markers;
    };

    // We'll use dummy types array (types are passed via revealTo sequence in React wrapper)
    const dummyTypesA = new Array(opts.countA).fill("failure");
    const dummyTypesB = new Array(opts.countB).fill("success");
    this.markersA = buildMarkers(tubeA.curve, opts.countA, typeColorA, dummyTypesA);
    this.markersB = buildMarkers(tubeB.curve, opts.countB, typeColorB, dummyTypesB);

    // ── Subtle ambient stars ──────────────────────────────────
    const starGeo = new THREE.BufferGeometry();
    const starCount = 120;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3 + 0] = (Math.random() - 0.5) * 24;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 4;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.25 });
    this.scene.add(new THREE.Points(starGeo, starMat));

    // ── Store curves so revealTo can look up positions ────────
    (this as any)._curveA = tubeA.curve;
    (this as any)._curveB = tubeB.curve;
    (this as any)._countA = opts.countA;
    (this as any)._countB = opts.countB;
  }

  /** Call to reveal markers up to index `a` on timeline A and `b` on timeline B. */
  revealTo(a: number, b: number, typeA: string[], typeB: string[]) {
    const typeColorA = (t: string) => {
      const map: Record<string, string> = { failure: "#EF4444", warning: "#F59E0B", neutral: "#71717A", milestone: "#60A5FA", success: "#34D399" };
      return new THREE.Color(map[t] || "#71717A");
    };
    const typeColorB = (t: string) => {
      const map: Record<string, string> = { failure: "#EF4444", warning: "#F59E0B", neutral: "#71717A", milestone: "#60A5FA", success: "#34D399" };
      return new THREE.Color(map[t] || "#71717A");
    };

    // Show newly revealed A markers
    for (let i = this.currentRevealA; i < a && i < this.markersA.length; i++) {
      const m = this.markersA[i];
      const mat = m.material as THREE.ShaderMaterial;
      mat.uniforms.uColor.value = typeColorA(typeA[i] || "neutral");
      m.visible = true;
      gsap.fromTo(mat.uniforms.uIntensity, { value: 0 }, { value: 1, duration: 0.4, ease: "back.out(2)" });
      gsap.fromTo(m.scale, { x: 0.3, y: 0.3, z: 0.3 }, { x: 1, y: 1, z: 1, duration: 0.45, ease: "back.out(2.5)" });
    }
    // Show newly revealed B markers
    for (let i = this.currentRevealB; i < b && i < this.markersB.length; i++) {
      const m = this.markersB[i];
      const mat = m.material as THREE.ShaderMaterial;
      mat.uniforms.uColor.value = typeColorB(typeB[i] || "neutral");
      m.visible = true;
      gsap.fromTo(mat.uniforms.uIntensity, { value: 0 }, { value: 1, duration: 0.4, ease: "back.out(2)" });
      gsap.fromTo(m.scale, { x: 0.3, y: 0.3, z: 0.3 }, { x: 1, y: 1, z: 1, duration: 0.45, ease: "back.out(2.5)" });
    }

    this.currentRevealA = a;
    this.currentRevealB = b;
  }

  setMouseParallax(nx: number, ny: number) {
    this.camTarget.x = nx * 1.5;
    this.camTarget.y = ny * 0.8;
  }

  private handleResize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.animate);

    // Smooth camera parallax
    this.camCurrent.x += (this.camTarget.x - this.camCurrent.x) * 0.04;
    this.camCurrent.y += (this.camTarget.y - this.camCurrent.y) * 0.04;
    this.camera.position.x = this.camCurrent.x;
    this.camera.position.y = this.camCurrent.y;
    this.camera.lookAt(0, 0, 0);

    // Billboard markers toward camera
    [...this.markersA, ...this.markersB].forEach(m => { if (m.visible) m.lookAt(this.camera.position); });

    this.renderer.render(this.scene, this.camera);
  };

  destroy() {
    this.destroyed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.resizeHandler);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// React wrapper
// ─────────────────────────────────────────────────────────────

interface SimVizProps {
  visibleA: number;
  visibleB: number;
  totalA: number;
  totalB: number;
  typesA: string[];
  typesB: string[];
}

export default function SimulationViz({ visibleA, visibleB, totalA, totalB, typesA, typesB }: SimVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vizRef = useRef<SimViz | null>(null);

  // Mount Three.js scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container || totalA === 0) return;

    const viz = new SimViz(container, {
      countA: totalA,
      countB: totalB,
      typeColors: {
        failure: "#EF4444",
        warning: "#F59E0B",
        success: "#34D399",
        milestone: "#60A5FA",
        neutral: "#71717A",
      },
    });
    vizRef.current = viz;

    // Mouse parallax
    const handleMouse = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      viz.setMouseParallax(nx, -ny);
    };
    window.addEventListener("mousemove", handleMouse);

    return () => {
      window.removeEventListener("mousemove", handleMouse);
      viz.destroy();
      vizRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalA, totalB]);

  // Sync reveals from parent
  useEffect(() => {
    vizRef.current?.revealTo(visibleA, visibleB, typesA, typesB);
  }, [visibleA, visibleB, typesA, typesB]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: 280 }}
      aria-hidden
    />
  );
}