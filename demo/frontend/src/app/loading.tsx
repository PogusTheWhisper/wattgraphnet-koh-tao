export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-accent" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-accent2 [animation-delay:120ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-warn [animation-delay:240ms]" />
      </div>
      <div className="text-xs uppercase tracking-widest">
        WattGraphNet · running inference
      </div>
    </div>
  );
}
