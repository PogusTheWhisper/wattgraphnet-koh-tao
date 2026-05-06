import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function HeroIntro() {
  return (
    <section className="card relative overflow-hidden">
      <div className="grid-bg absolute inset-0 opacity-40" />
      <div className="relative grid gap-6 p-6 md:grid-cols-[1.3fr_1fr] md:p-8">
        <div>
          <div className="pill pill-accent mb-3">
            <Sparkles className="h-3 w-3" />
            PEA Hackathon 2026 · Track 4
          </div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
            Turn Koh Tao into a{" "}
            <span className="bg-gradient-to-r from-brand-accent via-brand-accent2 to-pink-400 bg-clip-text text-transparent">
              self-optimizing microgrid
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-slate-400 md:text-base">
            WattGraphNet is an Attention-based Spatial-Temporal GCN with an
            Adaptive Adjacency Matrix. It forecasts load 24h ahead, dispatches
            PV + BESS + diesel under multi-objective optimization, and pages
            operators hours before imbalances happen.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="pill">A-STGCN + AAM</span>
            <span className="pill">SB-WAPE 17.93%</span>
            <span className="pill">42.8 ms · CPU</span>
            <span className="pill">~8 MB model</span>
            <span className="pill pill-success">฿8M / site / year</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/optimize"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-brand-bg hover:bg-brand-accent/90"
            >
              Run optimization
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/graph"
              className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-panel2 px-4 py-2 text-sm text-slate-200 hover:bg-brand-panel"
            >
              Explore AAM graph
            </Link>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="relative flex h-[260px] w-[260px] items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-accent/20 via-transparent to-brand-accent2/20 blur-2xl" />
            <div className="relative z-10 rounded-2xl border border-brand-border bg-brand-panel/80 p-4 font-mono text-[11px] leading-relaxed text-slate-300 shadow-glow">
              <div className="text-slate-500">// Adaptive Adjacency Matrix</div>
              <div>
                <span className="text-brand-accent">A_adaptive</span> ={" "}
                <span className="text-brand-warn">Softmax</span>(
              </div>
              <div className="pl-3">
                <span className="text-brand-warn">ReLU</span>(
                <span className="text-emerald-300">E₁</span> ·{" "}
                <span className="text-emerald-300">E₂ᵀ</span>)
              </div>
              <div>)</div>
              <div className="mt-2 text-slate-500">
                {"// learns station topology"}
              </div>
              <div className="mt-1 text-slate-500">
                {"// no manual graph required"}
              </div>
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 pill pill-accent">
              Explainable · Grid-aware
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
