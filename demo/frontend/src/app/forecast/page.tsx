import { ForecastExplorer } from "@/components/ForecastExplorer";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const data = await api.forecast(24);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="pill pill-accent mb-2">Module #1 · Forecast</div>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          24-hour load and DER forecasting
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          WattGraphNet produces calibrated spatio-temporal forecasts across all
          Koh Tao feeders in {data.meta.inference_ms.toFixed(1)} ms on a single
          CPU. Inputs: 12 hours of history. Output: 24 hours ahead, per station,
          with a 90% confidence band.
        </p>
      </div>
      <ForecastExplorer data={data} />
    </div>
  );
}
