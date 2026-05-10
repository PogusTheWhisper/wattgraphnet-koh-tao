import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { api, type Alert } from "@/lib/api";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const SEV_STYLES: Record<Alert["severity"], { pill: string; icon: typeof Bell }> = {
  info: { pill: "pill pill-accent", icon: Bell },
  warn: { pill: "pill pill-warn", icon: AlertTriangle },
  critical: { pill: "pill pill-danger", icon: ShieldAlert },
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = (d.getTime() - Date.now()) / 1000 / 60;
  if (diff < 0) {
    const abs = Math.abs(diff);
    if (abs < 60) return `${Math.round(abs)} min ago`;
    return `${(abs / 60).toFixed(1)} h ago`;
  }
  if (diff < 60) return `in ${Math.round(diff)} min`;
  return `in ${(diff / 60).toFixed(1)} h`;
}

export default async function AlertsPage() {
  const data = await api.alerts();
  const critical = data.alerts.filter((a) => a.severity === "critical").length;
  const warn = data.alerts.filter((a) => a.severity === "warn").length;
  const info = data.alerts.filter((a) => a.severity === "info").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="pill pill-accent mb-2">Module #3 · Alert</div>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          Early warnings — 2 to 6 hours ahead
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          WattGraphNet continuously compares forecasted demand and generation
          against feeder and storage constraints. When a breach is projected,
          operators are paged with hours of lead time — enough to act, not just
          react.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard
          icon={ShieldAlert}
          label="Critical"
          value={critical}
          color="text-brand-danger"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Warnings"
          value={warn}
          color="text-brand-warn"
        />
        <SummaryCard
          icon={Bell}
          label="Informational"
          value={info}
          color="text-brand-accent"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Avg lead time"
          value={`${(
            data.alerts.reduce((s, a) => s + a.lead_time_h, 0) /
            Math.max(1, data.alerts.length)
          ).toFixed(1)} h`}
          color="text-brand-success"
        />
      </div>

      <Card>
        <CardHeader
          title="Active alerts"
          subtitle="Sorted by projected time-to-impact"
        />
        <CardBody className="p-0">
          <ul className="divide-y divide-brand-border">
            {data.alerts
              .slice()
              .sort((a, b) => a.lead_time_h - b.lead_time_h)
              .map((a) => {
                const { pill, icon: Icon } = SEV_STYLES[a.severity];
                return (
                  <li
                    key={a.id}
                    className="flex flex-col gap-3 p-5 md:flex-row md:items-start"
                  >
                    <div className="flex items-start gap-3 md:w-1/3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          a.severity === "critical"
                            ? "bg-brand-danger/15 text-brand-danger"
                            : a.severity === "warn"
                              ? "bg-brand-warn/15 text-brand-warn"
                              : "bg-brand-accent/15 text-brand-accent"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {a.title}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                          <span className={pill}>{a.severity}</span>
                          <span className="pill">{a.station_id}</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="h-3 w-3" />
                            ETA {formatRelative(a.eta)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-slate-300">
                        {a.message}
                      </p>
                      {a.recommendation ? (
                        <div className="mt-3 rounded-lg border border-brand-border bg-brand-panel2/50 p-3">
                          <div className="text-[10px] uppercase tracking-widest text-slate-500">
                            Actionable recommendation · Source / Amount / Time
                          </div>
                          <ul className="mt-2 flex flex-col gap-1.5 text-xs text-slate-300">
                            {a.recommendation.actions.map((act, i) => (
                              <li key={i} className="flex flex-wrap items-baseline gap-1.5">
                                <span className="pill pill-accent">{act.source}</span>
                                <span className="text-white font-semibold">
                                  {act.action} {(act.amount_kw / 1000).toFixed(2)} MW
                                </span>
                                <span className="text-slate-500">
                                  {new Date(act.from).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  {" → "}
                                  {new Date(act.to).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className="text-slate-400">— {act.reason}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-2 text-[11px] text-brand-success">
                            ⇒ {a.recommendation.expected_outcome}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">
                        Lead time
                      </div>
                      <div className="text-xl font-semibold text-white number-tabular">
                        {a.lead_time_h.toFixed(1)} h
                      </div>
                      <div className="text-[10px] text-slate-500">
                        issued {formatRelative(a.issued_at)}
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="What each alert type means"
          subtitle="Operator runbook · Koh Tao microgrid"
        />
        <CardBody>
          <div className="grid gap-3 text-xs text-slate-300 md:grid-cols-3">
            <div className="rounded-lg border border-brand-border bg-brand-panel2/50 p-3">
              <span className="pill pill-accent mb-2">Info</span>
              <p>
                Gives you operational headroom — e.g. pre-charge BESS to absorb
                PV peak. No immediate action required, but planning-relevant.
              </p>
            </div>
            <div className="rounded-lg border border-brand-border bg-brand-panel2/50 p-3">
              <span className="pill pill-warn mb-2">Warn</span>
              <p>
                Forecast deviation exceeds threshold. Acknowledge, then adjust
                dispatch weights or stage diesel for ramp.
              </p>
            </div>
            <div className="rounded-lg border border-brand-border bg-brand-panel2/50 p-3">
              <span className="pill pill-danger mb-2">Critical</span>
              <p>
                Projected breach (e.g. SoC ≤ 15% or feeder overload). Requires
                positive acknowledgment and a committed dispatch change.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Bell;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="card flex items-start gap-4 p-4">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-lg bg-brand-panel2",
          color
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-widest text-slate-500">
          {label}
        </div>
        <div className="mt-0.5 text-2xl font-semibold text-white number-tabular">
          {value}
        </div>
      </div>
    </div>
  );
}
