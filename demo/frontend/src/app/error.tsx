"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto mt-8 max-w-xl p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-danger/15 text-brand-danger">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-white">
        Cannot reach WattGraphNet API
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        Set{" "}
        <code className="kbd">NEXT_PUBLIC_API_BASE</code> to your Railway URL.
        The default is <code className="kbd">http://localhost:8000</code>.
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-brand-bg hover:bg-brand-accent/90"
      >
        Retry
      </button>
    </div>
  );
}
