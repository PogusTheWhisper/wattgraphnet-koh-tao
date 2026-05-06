"use client";

import { useMemo, useState } from "react";
import type { GraphEdge, Station } from "@/lib/api";

// Radial layout - stations arranged in a circle with hub at center
function layout(stations: Station[]): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const cx = 300;
  const cy = 260;
  const r = 180;
  const hub = stations.find((s) => s.type === "substation");
  if (hub) out[hub.id] = { x: cx, y: cy };
  const ring = stations.filter((s) => s.id !== hub?.id);
  ring.forEach((s, i) => {
    const angle = (2 * Math.PI * i) / ring.length - Math.PI / 2;
    out[s.id] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
  return out;
}

const TYPE_COLORS: Record<Station["type"], string> = {
  substation: "#38bdf8",
  load: "#a78bfa",
  pv: "#fbbf24",
  bess: "#34d399",
  diesel: "#f87171",
};

export function AamGraph({
  stations,
  edges,
}: {
  stations: Station[];
  edges: GraphEdge[];
}) {
  const pos = useMemo(() => layout(stations), [stations]);
  const [focus, setFocus] = useState<string | null>(null);
  const maxW = Math.max(...edges.map((e) => e.weight), 0.0001);

  const visibleEdges = focus
    ? edges.filter((e) => e.source === focus || e.target === focus)
    : edges;

  return (
    <svg viewBox="0 0 600 520" className="w-full h-[520px]">
      <defs>
        <filter id="nodeGlow">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {visibleEdges.map((e, i) => {
        const a = pos[e.source];
        const b = pos[e.target];
        if (!a || !b) return null;
        const w = e.weight / maxW;
        return (
          <g key={i}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#38bdf8"
              strokeOpacity={0.15 + 0.7 * w}
              strokeWidth={0.4 + 3.5 * w}
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {/* Nodes */}
      {stations.map((s) => {
        const p = pos[s.id];
        if (!p) return null;
        const color = TYPE_COLORS[s.type];
        const r = s.type === "substation" ? 18 : 12;
        const active = focus === s.id;
        return (
          <g
            key={s.id}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setFocus(s.id)}
            onMouseLeave={() => setFocus(null)}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={r + (active ? 10 : 6)}
              fill={color}
              opacity={active ? 0.25 : 0.12}
              filter="url(#nodeGlow)"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill="#0c1426"
              stroke={color}
              strokeWidth={active ? 3 : 2}
            />
            <text
              x={p.x}
              y={p.y + 3}
              textAnchor="middle"
              fontSize={r === 18 ? 9 : 8}
              fontWeight="700"
              fill={color}
            >
              {s.id.replace("KT-", "")}
            </text>
            <text
              x={p.x}
              y={p.y + r + 14}
              textAnchor="middle"
              fontSize={10}
              fill={active ? "#e2e8f0" : "#94a3b8"}
            >
              {s.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
