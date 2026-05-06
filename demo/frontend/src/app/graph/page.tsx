import { AamGraph } from "@/components/AamGraph";
import { AamMatrix } from "@/components/AamMatrix";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const data = await api.graph();

  const topLinks = data.edges
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="pill pill-accent mb-2">Explainability · AAM</div>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          The Adaptive Adjacency Matrix
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          The network learns the relationships between stations end-to-end. No
          human draws the graph. Edge weights — {" "}
          <span className="font-mono text-brand-accent">
            A = softmax(ReLU(E₁·E₂ᵀ))
          </span>
          {" "}— reveal which stations influence each other most, making the
          forecast inspectable.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader
            title="Learned topology"
            subtitle="Hover any node to see its neighborhood"
          />
          <CardBody className="p-0">
            <AamGraph stations={data.stations} edges={data.edges} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Top learned dependencies"
            subtitle="Most influential station pairs"
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-brand-border">
              {topLinks.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-accent/15 text-[11px] font-semibold text-brand-accent">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-mono text-xs text-slate-200">
                        {e.source}{" "}
                        <span className="text-slate-500">→</span> {e.target}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 rounded-full bg-brand-panel2">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-brand-accent to-brand-accent2"
                        style={{
                          width: `${(e.weight / topLinks[0].weight) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-[11px] text-slate-300">
                      {e.weight.toFixed(3)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Influence heatmap"
          subtitle="Row-wise softmax · each row sums to 1"
        />
        <CardBody>
          <AamMatrix stations={data.stations} matrix={data.matrix} />
        </CardBody>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">
            Why it matters
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            No manual graph required
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Grid topology changes: lines trip, PV panels get installed, new
            loads come online. A static adjacency matrix would require
            re-engineering. AAM re-learns automatically.
          </p>
        </div>
        <div className="card p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">
            Why it&apos;s explainable
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            Heatmap = influence map
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Operators can see which stations drive a forecast — e.g. why the
            model expects Sairee Village load to spike when BESS SoC drops.
          </p>
        </div>
        <div className="card p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">
            Why it&apos;s fast
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            42.8 ms on CPU
          </div>
          <p className="mt-2 text-xs text-slate-400">
            AAM is a tiny pair of embedding matrices (N×10 and 10×N). Inference
            is dominated by cheap matrix multiplications — deploys to any PEA
            substation controller.
          </p>
        </div>
      </div>
    </div>
  );
}
