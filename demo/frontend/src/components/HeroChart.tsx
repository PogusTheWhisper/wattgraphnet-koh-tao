"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DispatchPoint } from "@/lib/api";
import { formatHour, formatKW } from "@/lib/format";

export function HeroChart({ schedule }: { schedule: DispatchPoint[] }) {
  const data = schedule.map((p) => ({
    t: formatHour(p.t),
    PV: Math.max(0, p.pv_kw),
    BESS: Math.max(0, p.bess_kw),
    Diesel: Math.max(0, p.diesel_kw),
    Load: p.load_kw,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gPV" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gBESS" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gDiesel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#f87171" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#1b2a4a" vertical={false} />
        <XAxis dataKey="t" stroke="#64748b" fontSize={10} tickMargin={6} />
        <YAxis
          stroke="#64748b"
          fontSize={10}
          tickFormatter={(v) => `${(v / 1000).toFixed(1)}MW`}
          width={42}
        />
        <Tooltip
          formatter={(v: number, n: string) => [formatKW(v), n]}
          labelFormatter={(l) => `Hour ${l}`}
          contentStyle={{
            background: "#0c1426",
            border: "1px solid #1b2a4a",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="PV"
          stackId="1"
          stroke="#fbbf24"
          fill="url(#gPV)"
          strokeWidth={1.5}
        />
        <Area
          type="monotone"
          dataKey="BESS"
          stackId="1"
          stroke="#38bdf8"
          fill="url(#gBESS)"
          strokeWidth={1.5}
        />
        <Area
          type="monotone"
          dataKey="Diesel"
          stackId="1"
          stroke="#f87171"
          fill="url(#gDiesel)"
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
