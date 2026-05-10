"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Decal, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
// Drei's useGLTF auto-detects meshopt-compressed GLBs (gltf-transform --compress meshopt)
// when invoked with the meshopt flag — see IslandModel below.

// Build a radial-gradient decal texture once — used by all segments.
function makeRadialTexture(): THREE.Texture {
  const size = 256;
  const canvas =
    typeof document !== "undefined"
      ? document.createElement("canvas")
      : null;
  if (!canvas) return new THREE.Texture();
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(
    size / 2, size / 2, size * 0.05,
    size / 2, size / 2, size * 0.5
  );
  grad.addColorStop(0.0, "rgba(255,255,255,1)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.85, "rgba(255,255,255,0.18)");
  grad.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // ring stroke
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
import { resolveModel } from "@/lib/models";
import type { Station } from "@/lib/api";

type LiveFlows = {
  load_kw: number;
  pv_kw: number;
  grid_kw: number;
  bess_kw: number;
  diesel_kw: number;
};

type Props = {
  stations: Station[];
  flows: LiveFlows;
  modelId?: string;
  className?: string;
};

const SEGMENT_COLOR: Record<Station["type"], string> = {
  substation: "#a78bfa",
  load:       "#f472b6",
  pv:         "#fbbf24",
  bess:       "#34d399",
  diesel:     "#f87171",
  main_grid:  "#a78bfa",
};

const SEGMENT_LABEL: Record<Station["type"], string> = {
  substation: "Cable Termination",
  load:       "Load Zone",
  pv:         "Solar PV",
  bess:       "BESS",
  diesel:     "Diesel Plant",
  main_grid:  "Main Grid",
};

// Find the largest mesh in the scene — assumed to be the island terrain.
function findIslandMesh(scene: THREE.Object3D): THREE.Mesh | null {
  let best: THREE.Mesh | null = null;
  let bestVol = 0;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox!;
    const size = new THREE.Vector3();
    bb.getSize(size);
    const vol = size.x * size.y * size.z;
    if (vol > bestVol) {
      bestVol = vol;
      best = m;
    }
  });
  return best;
}

function IslandModel({
  src,
  onIsland,
  children,
}: {
  src: string;
  onIsland: (m: THREE.Mesh) => void;
  children?: React.ReactNode;
}) {
  const { scene } = useGLTF(src, undefined, true);
  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = false;
        m.receiveShadow = false;
        if (m.material) {
          (m.material as THREE.Material).needsUpdate = false;
        }
      }
    });
    const island = findIslandMesh(scene);
    if (island) onIsland(island);
  }, [scene, onIsland]);
  return (
    <primitive object={scene}>
      {children}
    </primitive>
  );
}

function SegmentDecal({
  id,
  station,
  anchor,
  radius,
  color,
  islandMesh,
  hoverId,
  setHoverId,
  kw,
  label,
  texture,
}: {
  id: string;
  station: Station;
  anchor: THREE.Vector3;
  radius: number;
  color: string;
  islandMesh: THREE.Mesh;
  hoverId: string | null;
  setHoverId: (v: string | null) => void;
  kw: number;
  label: string;
  texture: THREE.Texture;
}) {
  // Raycast onto the island mesh to find surface hit + normal
  const placement = useMemo(() => {
    const raycaster = new THREE.Raycaster();
    const origin = new THREE.Vector3(anchor.x, anchor.y + 8, anchor.z);
    raycaster.set(origin, new THREE.Vector3(0, -1, 0));
    const hits = raycaster.intersectObject(islandMesh, true);
    if (!hits.length) return null;
    const hit = hits[0];
    const normal =
      (hit.face?.normal &&
        hit.face.normal.clone().transformDirection(islandMesh.matrixWorld)) ??
      new THREE.Vector3(0, 1, 0);
    const pos = hit.point.clone();
    // Decal is projected ALONG -Z of its rotation, so look-at along normal.
    const target = pos.clone().add(normal);
    const m = new THREE.Matrix4().lookAt(pos, target, new THREE.Vector3(0, 1, 0));
    const quat = new THREE.Quaternion().setFromRotationMatrix(m);
    return { pos, quat };
  }, [anchor, islandMesh]);

  if (!placement) return null;
  const isHover = hoverId === id;
  const utilPct = Math.round(
    Math.min(100, (kw / Math.max(50, station.capacity_kw)) * 100)
  );

  return (
    <group>
      <Decal
        mesh={{ current: islandMesh } as never}
        position={placement.pos}
        rotation={new THREE.Euler().setFromQuaternion(placement.quat)}
        scale={[radius * 2, radius * 2, radius * 2]}
      >
        <meshBasicMaterial
          map={texture}
          color={color}
          transparent
          opacity={isHover ? 0.85 : 0.45}
          depthTest
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-10}
        />
      </Decal>

      {/* invisible hover sphere at the segment center */}
      <mesh
        position={placement.pos}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoverId(id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoverId(null);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[radius * 0.8, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* tooltip */}
      {isHover ? (
        <Html
          position={placement.pos}
          center
          distanceFactor={6}
          style={{
            pointerEvents: "none",
            transform: "translate(-50%, calc(-100% - 16px))",
          }}
        >
          <div
            style={{
              minWidth: 200,
              padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(12, 20, 38, 0.96)",
              border: `1px solid ${color}55`,
              boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
              color: "#e2e8f0",
              fontSize: 11,
              fontFamily:
                "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
              textAlign: "left",
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                color,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
            <div
              style={{ marginTop: 2, color: "#fff", fontSize: 13, fontWeight: 600 }}
            >
              {station.name}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 12, alignItems: "baseline" }}>
              <span style={{ color: "#94a3b8" }}>now</span>
              <span
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {(kw / 1000).toFixed(2)} MW
              </span>
            </div>
            <div style={{ marginTop: 2, color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
              {(station.capacity_kw / 1000).toFixed(1)} MW capacity · {utilPct}% util
            </div>
            <div
              style={{
                marginTop: 6,
                height: 3,
                borderRadius: 2,
                background: "#1b2a4a",
                overflow: "hidden",
              }}
            >
              <div style={{ width: `${utilPct}%`, height: "100%", background: color }} />
            </div>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function Scene({
  src,
  stations,
  flows,
  layout,
}: {
  src: string;
  stations: Station[];
  flows: LiveFlows;
  layout: ReturnType<typeof resolveModel>["layout"];
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [islandMesh, setIslandMesh] = useState<THREE.Mesh | null>(null);
  const decalTexture = useMemo(() => makeRadialTexture(), []);

  const perStation = useMemo(() => {
    const loads = stations.filter((s) => s.type === "load");
    const totalLoadCap = loads.reduce((s, x) => s + x.capacity_kw, 0) || 1;
    const m = new Map<string, number>();
    for (const s of stations) {
      let kw = 0;
      if (s.type === "load") kw = (s.capacity_kw / totalLoadCap) * flows.load_kw;
      else if (s.type === "pv") kw = flows.pv_kw;
      else if (s.type === "bess") kw = Math.abs(flows.bess_kw);
      else if (s.type === "diesel") kw = flows.diesel_kw;
      else if (s.type === "substation" || s.type === "main_grid") kw = flows.grid_kw;
      m.set(s.id, kw);
    }
    return m;
  }, [stations, flows]);

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 8, 5]} intensity={1.0} />
      <Suspense fallback={null}>
        <IslandModel src={src} onIsland={setIslandMesh} />
        {islandMesh && stations.map((s) => {
          const seg = layout[s.id];
          if (!seg) return null;
          const anchor = new THREE.Vector3(seg.pos[0], seg.pos[1], seg.pos[2]);
          // Convert "screen radius" hint into world-units (heuristic).
          const worldRadius = (seg.radius ?? 90) / 600;
          return (
            <SegmentDecal
              key={s.id}
              id={s.id}
              station={s}
              anchor={anchor}
              radius={worldRadius}
              color={SEGMENT_COLOR[s.type] ?? "#38bdf8"}
              islandMesh={islandMesh}
              hoverId={hoverId}
              setHoverId={setHoverId}
              kw={perStation.get(s.id) ?? 0}
              label={SEGMENT_LABEL[s.type]}
              texture={decalTexture}
            />
          );
        })}
      </Suspense>
    </>
  );
}

function CameraReset({
  defaultPos,
  defaultTarget,
  delayMs = 1000,
}: {
  defaultPos: [number, number, number];
  defaultTarget: [number, number, number];
  delayMs?: number;
}) {
  const { camera, gl } = useThree();
  // We expose a parent-controlled OrbitControls via ref through context if needed.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let dragging = false;
    const dom = gl.domElement;
    const reset = () => {
      // Trigger a custom event so OrbitControls (lower) can reset.
      dom.dispatchEvent(new CustomEvent("island3d-reset"));
    };
    const schedule = () => {
      if (dragging) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(reset, delayMs);
    };
    const onDown = () => {
      dragging = true;
      if (timer) clearTimeout(timer);
    };
    const onUp = () => {
      dragging = false;
      schedule();
    };
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointerup", onUp);
    dom.addEventListener("pointerleave", onUp);
    dom.addEventListener("pointercancel", onUp);
    dom.addEventListener("wheel", schedule, { passive: true });
    return () => {
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointerup", onUp);
      dom.removeEventListener("pointerleave", onUp);
      dom.removeEventListener("pointercancel", onUp);
      dom.removeEventListener("wheel", schedule);
      if (timer) clearTimeout(timer);
    };
  }, [camera, gl, delayMs]);
  return null;
}

export function Island3D({ stations, flows, modelId, className }: Props) {
  const model = useMemo(() => resolveModel(modelId), [modelId]);
  const controlsRef = useRef<unknown>(null);

  // OrbitControls reset listener: when the canvas dispatches "island3d-reset",
  // ease the controls back to the default position via .reset()
  const onCreated = ({ gl, camera }: { gl: THREE.WebGLRenderer; camera: THREE.Camera }) => {
    const dom = gl.domElement;
    const handler = () => {
      const c = controlsRef.current as
        | { reset?: () => void; target: THREE.Vector3 }
        | null;
      if (!c) return;
      camera.position.set(3, 2.2, 3);
      c.target.set(0, 0, 0);
      c.reset?.();
    };
    dom.addEventListener("island3d-reset", handler as EventListener);
  };

  return (
    <div
      className={className ?? "relative h-[520px] w-full"}
      style={{
        position: "relative",
        background:
          "radial-gradient(ellipse at center, #1b2a4a 0%, #060a14 80%)",
        borderRadius: "0.75rem",
        overflow: "hidden",
      }}
    >
      <Canvas
        camera={{ position: [3, 2.2, 3], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={onCreated}
      >
        <Scene
          src={model.src}
          stations={stations}
          flows={flows}
          layout={model.layout}
        />
        <OrbitControls
          ref={controlsRef as never}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
          minDistance={2}
          maxDistance={8}
        />
        <CameraReset defaultPos={[3, 2.2, 3]} defaultTarget={[0, 0, 0]} />
      </Canvas>

      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          padding: "6px 10px",
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "#94a3b8",
          background: "rgba(12,20,38,0.7)",
          border: "1px solid #1b2a4a",
          borderRadius: 6,
          textTransform: "uppercase",
        }}
      >
        {model.label}
      </div>
    </div>
  );
}

// Preload the env-selected model into useGLTF cache (page also has <link rel=preload>).
if (typeof window !== "undefined") {
  const m = resolveModel(
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ISLAND_MODEL) ||
      undefined
  );
  useGLTF.preload(m.src, undefined, true);
}
