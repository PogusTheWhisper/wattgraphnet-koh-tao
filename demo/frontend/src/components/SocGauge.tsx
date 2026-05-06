"use client";

import { motion } from "framer-motion";

export function SocGauge({ soc, capacity_mwh = 50 }: { soc: number; capacity_mwh?: number }) {
  const clamped = Math.max(0, Math.min(100, soc));
  const radius = 72;
  const stroke = 12;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - clamped / 100);
  const color =
    clamped < 20 ? "#f87171" : clamped < 40 ? "#fbbf24" : "#34d399";

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-2">
      <div className="relative">
        <svg width={180} height={180} viewBox="0 0 180 180">
          <circle
            cx={90}
            cy={90}
            r={radius}
            fill="none"
            stroke="#1b2a4a"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={90}
            cy={90}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            transform="rotate(-90 90 90)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            BESS SoC
          </div>
          <div className="text-3xl font-semibold text-white number-tabular">
            {clamped.toFixed(0)}%
          </div>
          <div className="text-[11px] text-slate-400">
            {(capacity_mwh * clamped / 100).toFixed(1)} / {capacity_mwh} MWh
          </div>
        </div>
      </div>
    </div>
  );
}
