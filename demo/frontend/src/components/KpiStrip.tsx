import {
  Gauge,
  Leaf,
  PiggyBank,
  TimerReset,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatNumber, formatTHB } from "@/lib/format";

type KpiProps = {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "flat";
  accent?: string;
};

function Kpi({ label, value, sub, icon: Icon, accent = "text-brand-accent" }: KpiProps) {
  return (
    <div className="card flex items-start gap-4 p-4">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-lg bg-brand-panel2",
          accent
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-widest text-slate-500">
          {label}
        </div>
        <div className="mt-0.5 truncate text-2xl font-semibold text-white number-tabular">
          {value}
        </div>
        {sub ? <div className="mt-0.5 text-xs text-slate-400">{sub}</div> : null}
      </div>
    </div>
  );
}

export function KpiStrip({
  annualSavings,
  co2Tons,
  payback,
  paybackLabel,
  sbWape,
  inferenceMs,
}: {
  annualSavings: number;
  co2Tons: number;
  payback: number;
  paybackLabel: string;
  sbWape: number;
  inferenceMs: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Kpi
        label="Net Savings / Site / Year"
        value={formatTHB(annualSavings)}
        sub="Diesel offset @ 9 ฿/kWh loss"
        icon={PiggyBank}
        accent="text-brand-success"
      />
      <Kpi
        label="CO₂ Avoided / Year"
        value={`${formatNumber(co2Tons, 0)} t`}
        sub="Carbon-weighted dispatch"
        icon={Leaf}
        accent="text-emerald-300"
      />
      <Kpi
        label="Payback"
        value={`${payback} mo`}
        sub={paybackLabel}
        icon={TimerReset}
        accent="text-brand-warn"
      />
      <Kpi
        label="SB-WAPE"
        value={`${sbWape.toFixed(2)}%`}
        sub="SOTA vs PatchTST · Informer · LSTM"
        icon={TrendingUp}
        accent="text-brand-accent"
      />
      <Kpi
        label="Inference (CPU)"
        value={`${inferenceMs.toFixed(1)} ms`}
        sub="~8 MB ONNX — edge-ready"
        icon={Gauge}
        accent="text-brand-accent2"
      />
    </div>
  );
}

export function LiveMixKpi({
  load,
  pv,
  grid = 0,
  bess,
  diesel,
  soc,
}: {
  load: number;
  pv: number;
  grid?: number;
  bess: number;
  diesel: number;
  soc: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
      <Kpi label="Load" value={`${(load / 1000).toFixed(2)} MW`} icon={Zap} />
      <Kpi
        label="PV"
        value={`${(pv / 1000).toFixed(2)} MW`}
        icon={Zap}
        accent="text-brand-warn"
      />
      <Kpi
        label="Main Grid"
        value={`${(grid / 1000).toFixed(2)} MW`}
        sub="33 kV cable"
        icon={Zap}
        accent="text-brand-accent2"
      />
      <Kpi
        label="BESS"
        value={`${(Math.abs(bess) / 1000).toFixed(2)} MW ${bess >= 0 ? "↑" : "↓"}`}
        sub={bess >= 0 ? "Discharging" : "Charging"}
        icon={Zap}
        accent="text-brand-accent"
      />
      <Kpi
        label="Diesel"
        value={`${(diesel / 1000).toFixed(2)} MW`}
        icon={Zap}
        accent="text-brand-danger"
      />
      <Kpi label="SoC" value={`${soc.toFixed(0)}%`} icon={Gauge} accent="text-brand-success" />
    </div>
  );
}
