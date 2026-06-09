export function NFTCardSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col">
      <div className="aspect-square bg-gradient-to-br from-muted/40 to-muted/10 animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted/40 animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted/30 animate-pulse" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-3 w-12 rounded bg-muted/30 animate-pulse" />
          <div className="h-4 w-16 rounded bg-muted/40 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-1.5 pt-2">
          <div className="h-8 rounded bg-muted/30 animate-pulse" />
          <div className="h-8 rounded bg-muted/40 animate-pulse" />
          <div className="h-8 rounded bg-muted/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="w-full rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] animate-pulse flex items-end gap-1 p-3" style={{ height }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex-1 rounded-t bg-white/10" style={{ height: `${30 + ((i * 37) % 60)}%` }} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-white/[0.04] animate-pulse" />
      ))}
    </div>
  );
}
