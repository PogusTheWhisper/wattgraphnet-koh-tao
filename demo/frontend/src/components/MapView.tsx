"use client";

import { useState } from "react";
import { Island3D } from "@/components/Island3D";
import { RegionMap3D } from "@/components/RegionMap3D";
import type { CableSegment, GraphEdge, Station } from "@/lib/api";

type LiveFlows = {
  load_kw: number;
  pv_kw: number;
  grid_kw: number;
  bess_kw: number;
  diesel_kw: number;
};

type Props = {
  stations: Station[];
  cableRoute?: [number, number][];
  cableSegments?: CableSegment[];
  edges?: GraphEdge[];
  flows: LiveFlows;
  modelId?: string;
  className?: string;
};

type Mode = "satellite" | "island3d";

export function MapView({
  stations,
  cableRoute,
  cableSegments,
  edges,
  flows,
  modelId,
  className,
}: Props) {
  const [mode, setMode] = useState<Mode>("satellite");
  const [showAam, setShowAam] = useState(true);

  return (
    <div
      className={className ?? "relative h-[560px] w-full"}
      style={{ position: "relative" }}
    >
      {mode === "satellite" ? (
        <RegionMap3D
          stations={stations}
          cableRoute={cableRoute}
          cableSegments={cableSegments}
          edges={showAam ? edges : undefined}
          flows={flows}
          className="h-full w-full"
        />
      ) : (
        <Island3D
          stations={stations}
          edges={showAam ? edges : undefined}
          flows={flows}
          modelId={modelId}
          className="h-full w-full"
        />
      )}

      {/* AAM toggle */}
      <button
        type="button"
        onClick={() => setShowAam((v) => !v)}
        style={{
          position: "absolute",
          left: 12,
          top: 52,
          padding: "5px 10px",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: showAam ? "#0c1426" : "#cbd5e1",
          background: showAam ? "#a78bfa" : "rgba(12,20,38,0.92)",
          border: "1px solid #1b2a4a",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: 700,
          fontFamily:
            "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          zIndex: 5,
        }}
      >
        AAM {showAam ? "ON" : "OFF"}
      </button>

      {/* Mode toggle */}
      <div
        style={{
          position: "absolute",
          left: 12,
          top: 12,
          display: "flex",
          gap: 0,
          padding: 2,
          background: "rgba(12,20,38,0.92)",
          border: "1px solid #1b2a4a",
          borderRadius: 8,
          fontFamily:
            "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          zIndex: 5,
        }}
      >
        <ToggleBtn
          active={mode === "satellite"}
          onClick={() => setMode("satellite")}
          label="Powerline"
        />
        <ToggleBtn
          active={mode === "island3d"}
          onClick={() => setMode("island3d")}
          label="Grid Consumption"
        />
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 10px",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: active ? "#0c1426" : "#cbd5e1",
        background: active ? "#38bdf8" : "transparent",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  );
}
