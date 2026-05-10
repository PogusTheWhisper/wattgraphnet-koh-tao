"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
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

  // Slight lift above surface to avoid z-fighting
  const liftedPos = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(placement.quat);
    return placement.pos.clone().addScaledVector(up, 0.01);
  }, [placement]);

  return (
    <group>
      {/* Flat ring + disc tangent to surface — much cheaper than Decal */}
      <mesh
        position={liftedPos}
        quaternion={placement.quat}
        renderOrder={2}
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
        <circleGeometry args={[radius, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHover ? 0.55 : 0.28}
          depthWrite={false}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      {/* Outer ring outline */}
      <mesh position={liftedPos} quaternion={placement.quat} renderOrder={3}>
        <ringGeometry args={[radius * 0.93, radius, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHover ? 1 : 0.7}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
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
            />
          );
        })}
      </Suspense>
    </>
  );
}

export function Island3D({ stations, flows, modelId, className }: Props) {
  const model = useMemo(() => resolveModel(modelId), [modelId]);

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
      >
        <Scene
          src={model.src}
          stations={stations}
          flows={flows}
          layout={model.layout}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
          minDistance={2}
          maxDistance={8}
        />
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
