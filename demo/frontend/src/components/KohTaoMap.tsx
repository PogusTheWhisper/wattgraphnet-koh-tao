"use client";

import { motion } from "framer-motion";
import type { Station } from "@/lib/api";

type Props = {
  stations: Station[];
  flows?: {
    load_kw: number;
    pv_kw: number;
    bess_kw: number;
    diesel_kw: number;
  };
};

// Map station lat/lon to a 600x520 svg viewport. Koh Tao bbox is small, so
// we just normalize to the min/max in the dataset for a clean, centered layout.
function project(stations: Station[]) {
  if (stations.length === 0) return () => ({ x: 0, y: 0 });
  const lats = stations.map((s) => s.lat);
  const lons = stations.map((s) => s.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const padX = 80;
  const padY = 80;
  const w = 600;
  const h = 520;
  return (s: Station) => ({
    x: padX + ((s.lon - minLon) / (maxLon - minLon || 1)) * (w - 2 * padX),
    y: padY + (1 - (s.lat - minLat) / (maxLat - minLat || 1)) * (h - 2 * padY),
  });
}

const TYPE_COLORS: Record<Station["type"], string> = {
  substation: "#38bdf8",
  load: "#a78bfa",
  pv: "#fbbf24",
  bess: "#34d399",
  diesel: "#f87171",
};

const TYPE_LABEL: Record<Station["type"], string> = {
  substation: "HUB",
  load: "LOAD",
  pv: "PV",
  bess: "BESS",
  diesel: "DIESEL",
};

export function KohTaoMap({ stations, flows }: Props) {
  const proj = project(stations);
  const hub = stations.find((s) => s.type === "substation");
  const hubPos = hub ? proj(hub) : { x: 300, y: 260 };

  const sourceTypes: Station["type"][] = ["pv", "bess", "diesel"];
  const loadTypes: Station["type"][] = ["load"];

  const diesel_on = (flows?.diesel_kw ?? 0) > 5;

  return (
    <svg
      viewBox="0 0 600 520"
      className="w-full h-full"
      role="img"
      aria-label="Koh Tao Smart Grid Topology"
    >
      <defs>
        <radialGradient id="island" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1b2a4a" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#0c1426" stopOpacity="0.9" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Island silhouette */}
      <path
        d="M 150 120 Q 220 70 320 90 Q 430 80 480 160 Q 510 240 460 340 Q 430 430 330 440 Q 220 450 160 380 Q 110 300 120 220 Q 130 160 150 120 Z"
        fill="url(#island)"
        stroke="#1b2a4a"
        strokeWidth="1.5"
      />

      {/* Lines from sources to hub */}
      {stations
        .filter((s) => sourceTypes.includes(s.type))
        .map((s) => {
          const p = proj(s);
          const kw =
            s.type === "pv"
              ? flows?.pv_kw ?? 0
              : s.type === "bess"
                ? flows?.bess_kw ?? 0
                : flows?.diesel_kw ?? 0;
          const active =
            s.type === "pv"
              ? (flows?.pv_kw ?? 0) > 10
              : s.type === "bess"
                ? Math.abs(flows?.bess_kw ?? 0) > 10
                : diesel_on;
          return (
            <g key={`line-src-${s.id}`}>
              <line
                x1={p.x}
                y1={p.y}
                x2={hubPos.x}
                y2={hubPos.y}
                stroke={active ? TYPE_COLORS[s.type] : "#1b2a4a"}
                strokeWidth={active ? 2.2 : 1}
                strokeOpacity={active ? 0.8 : 0.4}
                strokeDasharray={active ? "6 4" : "3 5"}
              >
                {active ? (
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-20"
                    dur={kw > 2000 ? "0.9s" : "1.8s"}
                    repeatCount="indefinite"
                  />
                ) : null}
              </line>
            </g>
          );
        })}

      {/* Lines from hub to loads */}
      {stations
        .filter((s) => loadTypes.includes(s.type))
        .map((s) => {
          const p = proj(s);
          return (
            <line
              key={`line-load-${s.id}`}
              x1={hubPos.x}
              y1={hubPos.y}
              x2={p.x}
              y2={p.y}
              stroke="#a78bfa"
              strokeWidth={1.8}
              strokeOpacity={0.6}
              strokeDasharray="6 4"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-20"
                dur="1.4s"
                repeatCount="indefinite"
              />
            </line>
          );
        })}

      {/* Stations */}
      {stations.map((s, i) => {
        const p = proj(s);
        const color = TYPE_COLORS[s.type];
        const r = s.type === "substation" ? 13 : 9;
        return (
          <motion.g
            key={s.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={r + 6}
              fill={color}
              opacity={0.15}
              filter="url(#glow)"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill="#0c1426"
              stroke={color}
              strokeWidth={2}
              filter="url(#glow)"
            />
            <text
              x={p.x}
              y={p.y + 3}
              textAnchor="middle"
              fontSize={r === 13 ? 8 : 7}
              fill={color}
              fontWeight="700"
            >
              {TYPE_LABEL[s.type]}
            </text>
            <text
              x={p.x}
              y={p.y + r + 16}
              textAnchor="middle"
              fontSize={10}
              fill="#cbd5e1"
              fontWeight="500"
            >
              {s.name}
            </text>
            <text
              x={p.x}
              y={p.y + r + 28}
              textAnchor="middle"
              fontSize={9}
              fill="#64748b"
            >
              {(s.capacity_kw / 1000).toFixed(1)} MW
            </text>
          </motion.g>
        );
      })}

      {/* Compass */}
      <g transform="translate(540, 40)" opacity={0.6}>
        <circle r={18} fill="#0c1426" stroke="#1b2a4a" />
        <text textAnchor="middle" y={-6} fontSize={8} fill="#64748b">
          N
        </text>
        <path d="M 0 -14 L 3 2 L 0 -2 L -3 2 Z" fill="#38bdf8" />
      </g>
    </svg>
  );
}
