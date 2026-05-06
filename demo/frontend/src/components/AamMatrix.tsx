"use client";

import { useMemo, useState } from "react";
import type { Station } from "@/lib/api";
import { cn } from "@/lib/cn";

export function AamMatrix({
  stations,
  matrix,
}: {
  stations: Station[];
  matrix: number[][];
}) {
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);

  const max = useMemo(
    () => Math.max(...matrix.flat().filter((v) => v > 0)),
    [matrix]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-auto scrollbar-thin">
        <table className="border-separate border-spacing-0 text-[10px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-brand-panel p-1"></th>
              {stations.map((s) => (
                <th
                  key={s.id}
                  className="p-1 font-normal text-slate-500"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    minWidth: 26,
                  }}
                >
                  {s.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={stations[i].id}>
                <th
                  className="sticky left-0 z-10 bg-brand-panel pr-2 py-1 text-right font-normal text-slate-400"
                  style={{ minWidth: 110 }}
                >
                  {stations[i].id}
                </th>
                {row.map((v, j) => {
                  const intensity = v / (max || 1);
                  const isHover =
                    hover && (hover.i === i || hover.j === j);
                  return (
                    <td
                      key={j}
                      onMouseEnter={() => setHover({ i, j })}
                      onMouseLeave={() => setHover(null)}
                      className={cn(
                        "h-6 w-6 text-center align-middle transition-colors cursor-default",
                        isHover && "ring-1 ring-brand-accent/60"
                      )}
                      style={{
                        background: i === j
                          ? "transparent"
                          : `rgba(56, 189, 248, ${intensity.toFixed(3)})`,
                      }}
                      title={`${stations[i].id} → ${stations[j].id}: ${v.toFixed(3)}`}
                    >
                      {v > 0.15 ? (
                        <span className="text-[9px] text-white">
                          {(v * 100).toFixed(0)}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500">
        <span>Low</span>
        <span
          className="h-2 flex-1 rounded"
          style={{
            background:
              "linear-gradient(90deg, rgba(56,189,248,0.02), rgba(56,189,248,1))",
          }}
        />
        <span>High</span>
      </div>
    </div>
  );
}
