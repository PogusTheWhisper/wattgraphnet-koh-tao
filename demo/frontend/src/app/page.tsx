import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { GenerationMix } from "@/components/GenerationMix";
import { HeroChart } from "@/components/HeroChart";
import { HeroIntro } from "@/components/HeroIntro";
import { KohTaoMap } from "@/components/KohTaoMap";
import { KpiStrip, LiveMixKpi } from "@/components/KpiStrip";
import { SocGauge } from "@/components/SocGauge";
import { api } from "@/lib/api";
import { formatNumber, formatTHB } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stations, optimize, savings] = await Promise.all([
    api.stations(),
    api.optimize(0.7, 24),
    api.savings(),
  ]);

  const now = optimize.schedule[0] ?? {
    load_kw: 0,
    pv_kw: 0,
    bess_kw: 0,
    diesel_kw: 0,
    soc_pct: 0,
  };

  return (
    <div className="flex flex-col gap-6">
      <HeroIntro />

      <KpiStrip
        annualSavings={savings.annual_net_savings_thb}
        co2Tons={savings.annual_co2_avoided_tons}
        payback={savings.payback_months}
        paybackLabel={`Pilot ${savings.pilot_months} mo · 4,100+ PEA sites`}
        sbWape={savings.sb_wape_pct}
        inferenceMs={savings.inference_ms_cpu}
      />

      <LiveMixKpi
        load={now.load_kw}
        pv={now.pv_kw}
        bess={now.bess_kw}
        diesel={now.diesel_kw}
        soc={now.soc_pct}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Koh Tao Smart Grid"
            subtitle="Live topology · PV ▸ BESS ▸ Hub ▸ Loads"
            right={
              <div className="flex items-center gap-2 text-[11px]">
                <span className="flex items-center gap-1 text-brand-warn">
                  <span className="h-2 w-2 rounded-full bg-brand-warn" /> PV
                </span>
                <span className="flex items-center gap-1 text-brand-accent">
                  <span className="h-2 w-2 rounded-full bg-brand-accent" /> BESS
                </span>
                <span className="flex items-center gap-1 text-brand-danger">
                  <span className="h-2 w-2 rounded-full bg-brand-danger" />{" "}
                  Diesel
                </span>
                <span className="flex items-center gap-1 text-brand-accent2">
                  <span className="h-2 w-2 rounded-full bg-brand-accent2" />{" "}
                  Load
                </span>
              </div>
            }
          />
          <CardBody className="h-[520px] p-2">
            <KohTaoMap
              stations={stations.stations}
              flows={{
                load_kw: now.load_kw,
                pv_kw: now.pv_kw,
                bess_kw: now.bess_kw,
                diesel_kw: now.diesel_kw,
              }}
            />
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title="Generation Mix"
              subtitle="Right now · optimized dispatch"
            />
            <CardBody>
              <GenerationMix
                pv_kw={now.pv_kw}
                bess_kw={now.bess_kw}
                diesel_kw={now.diesel_kw}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Battery State of Charge"
              subtitle="50 MWh BESS"
            />
            <CardBody className="flex justify-center">
              <SocGauge soc={now.soc_pct} capacity_mwh={50} />
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title="24h Optimized Dispatch"
          subtitle="Stacked by resource · all values in kW"
          right={
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="pill">
                ฿{" "}
                {formatNumber(
                  optimize.totals.thb_saved / 1000,
                  1
                )}
                k saved today
              </span>
              <span className="pill">
                {formatNumber(optimize.totals.co2_saved_kg, 0)} kg CO₂ avoided
              </span>
              <span className="pill pill-accent">
                cost {Math.round(optimize.weight_cost * 100)}% · carbon{" "}
                {Math.round(optimize.weight_carbon * 100)}%
              </span>
            </div>
          }
        />
        <CardBody>
          <HeroChart schedule={optimize.schedule} />
        </CardBody>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">
            Model #1 · Forecast
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            24-hour load & DER forecast
          </div>
          <p className="mt-2 text-xs text-slate-400">
            WattGraphNet learns spatial dependencies between stations and
            predicts load with MAPE ≤ 10%. Beats PatchTST, Informer, and LSTM
            across all 6 stations.
          </p>
        </div>
        <div className="card p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">
            Module #2 · Optimize
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            Multi-objective dispatch
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Trade off cost vs carbon in real time. Reduces diesel hours by
            charging BESS during PV surplus and discharging during peak demand.
          </p>
        </div>
        <div className="card p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">
            Module #3 · Alert
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            Early imbalance warnings
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Lead time 2–6 hours for load spikes, low SoC trajectories, or PV
            curtailment — giving operators time to act, not react.
          </p>
        </div>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="pill">
            Projected net savings {formatTHB(savings.annual_net_savings_thb)} /
            site / year
          </span>
          <span className="pill">Payback {savings.payback_months} mo</span>
          <span className="pill">
            Pilot ready in {savings.pilot_months} mo
          </span>
        </div>
        <div className="text-slate-500">
          AWS + GDCC · scalable SaaS across{" "}
          {formatNumber(savings.stations_nationwide, 0)} PEA stations
        </div>
      </div>
    </div>
  );
}
