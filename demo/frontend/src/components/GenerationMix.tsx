"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatKW } from "@/lib/format";

type Props = {
  pv_kw: number;
  bess_kw: number; // positive discharge, negative charge
  diesel_kw: number;
  grid_kw?: number;
};

export function GenerationMix({ pv_kw, bess_kw, diesel_kw, grid_kw = 0 }: Props) {
  const bess = Math.max(0, bess_kw);
  const data = [
    { name: "Solar PV", value: Math.max(0, pv_kw), color: "#fbbf24" },
    { name: "Main Grid", value: Math.max(0, grid_kw), color: "#a78bfa" },
    { name: "BESS", value: bess, color: "#38bdf8" },
    { name: "Diesel", value: Math.max(0, diesel_kw), color: "#f87171" },
  ];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="relative h-[280px] w-full">
      <ResponsiveContainer>
        <PieChart>
          <Tooltip
            formatter={(v: number, n: string) => [formatKW(v), n]}
            contentStyle={{ background: "#0c1426", border: "1px solid #1b2a4a" }}
          />
          <Pie
            data={data}
            innerRadius={72}
            outerRadius={104}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Legend
            formatter={(v) => <span className="text-xs text-slate-300">{v}</span>}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          Current Supply
        </div>
        <div className="text-2xl font-semibold text-white number-tabular">
          {formatKW(total)}
        </div>
        <div className="mt-0.5 text-[10px] text-slate-500">
          {((Math.max(0, pv_kw) / total) * 100).toFixed(0)}% clean
        </div>
      </div>
    </div>
  );
}
