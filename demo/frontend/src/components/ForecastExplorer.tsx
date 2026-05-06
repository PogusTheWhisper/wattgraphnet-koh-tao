"use client";

import { useMemo, useState } from "react";
import { ForecastChart } from "@/components/ForecastChart";
import type { ForecastResponse } from "@/lib/api";
import { cn } from "@/lib/cn";

const METRICS = [
  { label: "SB-WAPE", value: "17.93%", color: "text-brand-accent" },
  { label: "MAE", value: "17.33 kW", color: "text-brand-accent2" },
  { label: "RMSE", value: "29.06 kW", color: "text-brand-warn" },
  { label: "Horizon", value: "24 h", color: "text-brand-success" },
];

export function ForecastExplorer({ data }: { data: ForecastResponse }) {
  const [selected, setSelected] = useState(data.stations[0]?.station_id ?? "");

  const station = useMemo(
    () => data.stations.find((s) => s.station_id === selected) ?? data.stations[0],
    [data.stations, selected]
  );

  if (!station) return null;

  const peak = Math.max(...station.points.map((p) => p.load_kw));
  const trough = Math.min(...station.points.map((p) => p.load_kw));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 md:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="card p-4">
            <div className="text-[11px] uppercase tracking-widest text-slate-500">
              {m.label}
            </div>
            <div
              className={cn(
                "mt-1 text-xl font-semibold number-tabular text-white",
                m.color
              )}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Load Forecast</div>
            <div className="card-subtitle">
              {station.station_name} · Next 24 hours · 90% CI
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {data.stations.map((s) => (
              <button
                key={s.station_id}
                onClick={() => setSelected(s.station_id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] transition-colors",
                  s.station_id === selected
                    ? "bg-brand-accent/15 text-brand-accent border border-brand-accent/40"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                )}
              >
                {s.station_name}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">
          <ForecastChart station={station} />
        </div>
        <div className="grid grid-cols-2 gap-0 border-t border-brand-border text-xs md:grid-cols-4">
          <div className="border-r border-brand-border p-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Peak
            </div>
            <div className="mt-0.5 font-semibold text-white number-tabular">
              {(peak / 1000).toFixed(2)} MW
            </div>
          </div>
          <div className="border-r border-brand-border p-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Trough
            </div>
            <div className="mt-0.5 font-semibold text-white number-tabular">
              {(trough / 1000).toFixed(2)} MW
            </div>
          </div>
          <div className="border-r border-brand-border p-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Load Factor
            </div>
            <div className="mt-0.5 font-semibold text-white number-tabular">
              {((station.points.reduce((s, p) => s + p.load_kw, 0) /
                station.points.length /
                peak) *
                100
              ).toFixed(0)}
              %
            </div>
          </div>
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Inference
            </div>
            <div className="mt-0.5 font-semibold text-white number-tabular">
              {data.meta.inference_ms.toFixed(1)} ms
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="text-xs uppercase tracking-widest text-slate-500">
          How the forecast is built
        </div>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Spatial graph",
              body: "Stations are nodes. Edges are learned via A_adaptive = Softmax(ReLU(E₁·E₂ᵀ)) — no manual topology needed.",
            },
            {
              step: "2",
              title: "Attention-based ST-GCN",
              body: "Chebyshev graph conv + temporal attention captures cross-station + long-range patterns.",
            },
            {
              step: "3",
              title: "Multi-horizon heads",
              body: "Output head predicts 24h × N stations. 12h context → 24h forecast = 15.57% SB-WAPE.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-lg border border-brand-border bg-brand-panel2/50 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent/20 text-[11px] font-semibold text-brand-accent">
                  {s.step}
                </span>
                <div className="text-sm font-semibold text-white">
                  {s.title}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
