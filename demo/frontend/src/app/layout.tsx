import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

export const metadata: Metadata = {
  title: "WattGraphNet — Smart Energy Management for Koh Tao",
  description:
    "AI-driven Smart Energy Management core engine for PEA Hackathon 2026 — Attention-based ST-GCN with Adaptive Adjacency Matrix.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <TopNav />
        <main className="mx-auto max-w-[1400px] px-6 pb-20 pt-6">
          {children}
        </main>
        <footer className="mx-auto max-w-[1400px] px-6 py-8 text-center text-xs text-slate-500">
          <span className="pill mr-2">SuperAI SS5 Medalist Team</span>
          <span>
            WattGraphNet · A-STGCN + AAM · PEA Hackathon 2026 · Track 4 Energy
            Resource Optimization
          </span>
        </footer>
      </body>
    </html>
  );
}
