import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const thai = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WattGraphNet SEMS · Koh Tao Control",
  description:
    "AI-driven Smart Energy Management for PEA Hackathon 2026 — A-STGCN with Adaptive Adjacency Matrix.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${sans.variable} ${mono.variable} ${thai.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased font-sans">
        <TopNav />
        <main className="mx-auto max-w-[1400px] px-6 pb-20 pt-6">
          {children}
        </main>
        <footer className="mx-auto max-w-[1400px] px-6 py-8 text-center text-[11px] uppercase tracking-[0.2em] text-slate-500 font-mono">
          <span className="pill mr-2">SuperAI SS5</span>
          <span>WattGraphNet · A-STGCN+AAM · PEA Hackathon 2026 · Track 4</span>
        </footer>
      </body>
    </html>
  );
}
