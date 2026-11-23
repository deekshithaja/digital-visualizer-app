export function SkeletonCard({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-6 ${className}`}
      aria-busy="true"
      aria-label="Loading content"
    >
      <div className="h-4 w-36 rounded bg-slate-200 dark:bg-[#172641] animate-pulse" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            className="h-3.5 rounded bg-slate-100 dark:bg-[#172641]/70 animate-pulse"
            style={{ width: `${92 - idx * 14}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTableRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4 px-5 py-3.5">
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-48 rounded bg-slate-200 dark:bg-[#172641] animate-pulse" />
            <div className="h-3 w-72 rounded bg-slate-100 dark:bg-[#172641]/70 animate-pulse" />
          </div>
          <div className="h-7 w-20 rounded-md bg-slate-100 dark:bg-[#172641] animate-pulse" />
        </div>
      ))}
    </div>
  );
}
