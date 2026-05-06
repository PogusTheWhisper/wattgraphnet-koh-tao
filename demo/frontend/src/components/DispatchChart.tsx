"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DispatchPoint } from "@/lib/api";
import { formatHour, formatKW } from "@/lib/format";

export function DispatchChart({ schedule }: { schedule: DispatchPoint[] }) {
  const data = schedule.map((p) => ({
    t: formatHour(p.t),
    PV: Math.max(0, p.pv_kw),
    BESS_discharge: Math.max(0, p.bess_kw),
    BESS_charge: Math.min(0, p.bess_kw),
    Diesel: Math.max(0, p.diesel_kw),
    Load: p.load_kw,
    SoC: p.soc_pct,
  }));

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="oPV" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="oBESS" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="oDiesel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#f87171" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#1b2a4a" vertical={false} />
        <XAxis dataKey="t" stroke="#64748b" fontSize={11} tickMargin={6} />
        <YAxis
          yAxisId="left"
          stroke="#64748b"
          fontSize={11}
          tickFormatter={(v) => `${(v / 1000).toFixed(1)}MW`}
          width={46}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#34d399"
          fontSize={11}
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
          width={40}
        />
        <Tooltip
          formatter={(v: number, n: string) =>
            n === "SoC" ? [`${v.toFixed(1)}%`, n] : [formatKW(v), n]
          }
          labelFormatter={(l) => `Hour ${l}`}
          contentStyle={{
            background: "#0c1426",
            border: "1px solid #1b2a4a",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="PV"
          stackId="supply"
          stroke="#fbbf24"
          fill="url(#oPV)"
          strokeWidth={1.6}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="BESS_discharge"
          name="BESS discharge"
          stackId="supply"
          stroke="#38bdf8"
          fill="url(#oBESS)"
          strokeWidth={1.6}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="Diesel"
          stackId="supply"
          stroke="#f87171"
          fill="url(#oDiesel)"
          strokeWidth={1.6}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="BESS_charge"
          name="BESS charging"
          stroke="#38bdf8"
          strokeDasharray="3 3"
          fill="#38bdf8"
          fillOpacity={0.08}
          strokeWidth={1.2}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="Load"
          stroke="#ffffff"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="SoC"
          stroke="#34d399"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
