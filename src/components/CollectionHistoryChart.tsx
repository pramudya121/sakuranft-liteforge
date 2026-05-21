import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchCollectionHistory, type CollectionHistoryPoint } from "@/lib/web3/history";
import { CHAIN } from "@/lib/web3/contracts";
import { Activity, TrendingDown } from "lucide-react";

export function CollectionHistoryChart() {
  const [data, setData] = useState<CollectionHistoryPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const points = await fetchCollectionHistory();
      if (!cancelled) setData(points);
    })();
    return () => { cancelled = true; };
  }, []);

  if (data === null) return <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Loading on-chain history…</div>;
  if (data.length === 0) return <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">No trading history yet for this collection.</div>;

  const totalVol = data.reduce((s, p) => s + p.volume, 0);
  const totalSales = data.reduce((s, p) => s + p.sales, 0);
  const chart = data.map((p) => ({
    label: new Date(p.timestamp * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    floor: p.floor,
    volume: p.volume,
    sales: p.sales,
  }));

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><TrendingDown className="w-4 h-4 text-primary" /> Floor Price</h3>
          <span className="text-xs text-muted-foreground">{data.length} days</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chart}>
            <defs>
              <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.7 0.18 350)" stopOpacity={0.5}/>
                <stop offset="100%" stopColor="oklch(0.7 0.18 350)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip formatter={(v: any) => `${v} ${CHAIN.symbol}`} />
            <Area type="monotone" dataKey="floor" stroke="oklch(0.7 0.18 350)" strokeWidth={2} fill="url(#floorGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Daily Volume</h3>
          <span className="text-xs text-muted-foreground">{totalVol.toFixed(2)} {CHAIN.symbol} · {totalSales} sales</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip formatter={(v: any) => `${v} ${CHAIN.symbol}`} />
            <Bar dataKey="volume" fill="oklch(0.7 0.18 350)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}