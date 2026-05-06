"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, Bell, Cpu, Network, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

const links = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/forecast", label: "Forecast", icon: BarChart3 },
  { href: "/optimize", label: "Optimize", icon: Zap },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/graph", label: "AAM Graph", icon: Network },
];

export function TopNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-brand-border/70 bg-brand-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-accent to-brand-accent2 text-brand-bg shadow-glow transition-transform group-hover:scale-105">
            <Cpu className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-white">
              WattGraphNet
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              PEA Hackathon · Koh Tao
            </div>
          </div>
        </Link>

        <nav className="ml-4 hidden md:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-brand-panel2 text-white shadow-glow"
                    : "text-slate-400 hover:bg-brand-panel hover:text-slate-200"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="pill pill-success">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-success opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-success" />
            </span>
            Live · Koh Tao
          </span>
          <span className="hidden lg:inline-flex pill">SB-WAPE 17.93%</span>
        </div>
      </div>
      <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-4 pb-2 scrollbar-thin">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap",
                active
                  ? "bg-brand-panel2 text-white"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
