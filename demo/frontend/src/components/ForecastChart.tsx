"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StationForecast } from "@/lib/api";
import { formatHour, formatKW } from "@/lib/format";

export function ForecastChart({ station }: { station: StationForecast }) {
  const data = station.points.map((p) => ({
    t: formatHour(p.t),
    load: p.load_kw,
    pv: p.pv_kw,
    lower: p.lower_kw,
    upper: p.upper_kw,
    // band = upper - lower, rendered as stacked area above lower
    band: p.upper_kw - p.lower_kw,
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gLoad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#1b2a4a" vertical={false} />
        <XAxis dataKey="t" stroke="#64748b" fontSize={11} tickMargin={6} />
        <YAxis
          stroke="#64748b"
          fontSize={11}
          tickFormatter={(v) => `${(v / 1000).toFixed(1)}MW`}
          width={46}
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
        {/* 90% confidence band, stacked (lower, band) */}
        <Area
          type="monotone"
          dataKey="lower"
          stackId="ci"
          stroke="none"
          fill="transparent"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="band"
          stackId="ci"
          stroke="none"
          fill="#38bdf8"
          fillOpacity={0.12}
          name="90% CI"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="load"
          stroke="#38bdf8"
          strokeWidth={2.4}
          dot={false}
          name="Load"
        />
        <Line
          type="monotone"
          dataKey="pv"
          stroke="#fbbf24"
          strokeWidth={1.8}
          strokeDasharray="4 3"
          dot={false}
          name="PV"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
