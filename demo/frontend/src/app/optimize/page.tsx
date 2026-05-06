import { OptimizeConsole } from "@/components/OptimizeConsole";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function OptimizePage() {
  const initial = await api.optimize(0.6, 24);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="pill pill-accent mb-2">Module #2 · Optimize</div>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          Multi-objective dispatch — cost × carbon
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Slide between cost-first and carbon-first. The optimizer replans a
          24-hour dispatch schedule across PV, BESS and diesel in real time and
          reports how much cash and CO₂ were avoided vs a diesel-only baseline.
        </p>
      </div>
      <OptimizeConsole initial={initial} />
    </div>
  );
}
