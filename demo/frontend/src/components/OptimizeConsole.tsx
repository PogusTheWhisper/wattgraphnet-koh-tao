"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, Leaf, Wallet } from "lucide-react";
import { DispatchChart } from "@/components/DispatchChart";
import { api, type OptimizeResponse } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatKWh, formatNumber, formatTHB } from "@/lib/format";

export function OptimizeConsole({ initial }: { initial: OptimizeResponse }) {
  const [data, setData] = useState<OptimizeResponse>(initial);
  const [weight, setWeight] = useState(initial.weight_cost);
  const [isPending, startTransition] = useTransition();

  const refetch = useCallback((w: number) => {
    startTransition(async () => {
      try {
        const next = await api.optimize(w, 24);
        setData(next);
      } catch {
        // keep old data on error
      }
    });
  }, []);

  // Debounce slider changes
  useEffect(() => {
    const t = setTimeout(() => refetch(weight), 220);
    return () => clearTimeout(t);
  }, [weight, refetch]);

  const { totals } = data;
  const totalSupply = totals.pv_kwh + Math.max(0, totals.bess_kwh) + totals.diesel_kwh;
  const pvShare = totalSupply > 0 ? (totals.pv_kwh / totalSupply) * 100 : 0;
  const dieselShare = totalSupply > 0 ? (totals.diesel_kwh / totalSupply) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-500">
              Multi-objective dispatch weight
            </div>
            <div className="mt-0.5 text-sm font-semibold text-white">
              Cost {Math.round(weight * 100)}% · Carbon{" "}
              {Math.round((1 - weight) * 100)}%
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="pill">
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-brand-success" />
              )}
              {isPending ? "Optimizing" : "Converged"}
            </span>
            <span className="pill">
              {data.meta.inference_ms.toFixed(1)} ms
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <Leaf className="h-4 w-4 text-emerald-400" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value))}
            className="range-input flex-1 accent-brand-accent"
          />
          <Wallet className="h-4 w-4 text-brand-warn" />
        </div>
        <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-slate-500">
          <span>Prioritize carbon</span>
          <span>Prioritize cost</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="24h load" value={formatKWh(totals.load_kwh)} color="text-white" />
        <Stat
          label="Diesel avoided"
          value={formatKWh(totals.load_kwh - totals.diesel_kwh)}
          sub={`${(100 - dieselShare).toFixed(0)}% clean`}
          color="text-brand-success"
        />
        <Stat
          label="฿ saved (today)"
          value={formatTHB(totals.thb_saved)}
          sub="vs diesel-only baseline"
          color="text-brand-warn"
        />
        <Stat
          label="CO₂ avoided"
          value={`${formatNumber(totals.co2_saved_kg, 0)} kg`}
          sub={`PV share ${pvShare.toFixed(0)}%`}
          color="text-emerald-300"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">24h Dispatch Schedule</div>
            <div className="card-subtitle">
              PV ▸ BESS ▸ Diesel stacked · Load overlay · SoC on right axis
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Legend color="#fbbf24" label="PV" />
            <Legend color="#38bdf8" label="BESS" />
            <Legend color="#f87171" label="Diesel" />
            <Legend color="#ffffff" label="Load" />
            <Legend color="#34d399" label="SoC" dashed />
          </div>
        </div>
        <div className="p-4">
          <DispatchChart schedule={data.schedule} />
        </div>
      </div>

      <div className="card p-5">
        <div className="text-[11px] uppercase tracking-widest text-slate-500">
          How the optimizer decides
        </div>
        <ul className="mt-3 grid gap-3 md:grid-cols-3 text-xs text-slate-300">
          <li className="rounded-lg border border-brand-border bg-brand-panel2/50 p-3">
            <span className="pill pill-success mb-2">PV surplus</span>
            <p>
              Any solar over instantaneous load is routed to BESS at 92%
              round-trip efficiency instead of being curtailed.
            </p>
          </li>
          <li className="rounded-lg border border-brand-border bg-brand-panel2/50 p-3">
            <span className="pill pill-accent mb-2">Peak hours</span>
            <p>
              With cost-weight high, BESS discharges aggressively during evening
              peak — keeping diesel off as long as SoC stays above 5%.
            </p>
          </li>
          <li className="rounded-lg border border-brand-border bg-brand-panel2/50 p-3">
            <span className="pill pill-warn mb-2">Fallback</span>
            <p>
              Diesel is only dispatched after PV + BESS cannot meet residual
              load. At 13 ฿/kWh it is the cost-of-last-resort.
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold number-tabular",
          color ?? "text-white"
        )}
      >
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-slate-400">{sub}</div> : null}
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1 text-slate-300">
      <span
        className={cn(
          "inline-block h-0.5 w-3 rounded",
          dashed ? "border-t-2 border-dashed" : ""
        )}
        style={{
          background: dashed ? "transparent" : color,
          borderColor: color,
        }}
      />
      {label}
    </span>
  );
}
