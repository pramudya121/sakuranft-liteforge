import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { fetchNFTPriceHistory, type PriceHistoryPoint } from "@/lib/web3/history";
import { CHAIN } from "@/lib/web3/contracts";
import { shortAddr } from "@/lib/web3/ethers";
import { ExternalLink, TrendingUp, Tag, ShoppingCart } from "lucide-react";

export function PriceHistoryChart({ tokenId }: { tokenId: bigint }) {
  const [points, setPoints] = useState<PriceHistoryPoint[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchNFTPriceHistory(tokenId);
      if (!cancelled) setPoints(data);
    })();
    return () => { cancelled = true; };
  }, [tokenId]);

  if (points === null) return <p className="p-6 text-sm text-muted-foreground text-center">Loading price history...</p>;
  if (points.length === 0) return <p className="p-6 text-sm text-muted-foreground text-center">No price history yet — this NFT hasn't been listed or sold.</p>;

  const sales = points.filter((p) => p.kind === "sale");
  const chartData = points.map((p) => ({
    label: new Date(p.timestamp * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    price: p.priceEth,
    kind: p.kind,
  }));
  const lowest = Math.min(...points.map((p) => p.priceEth));
  const highest = Math.max(...points.map((p) => p.priceEth));
  const lastSale = sales[sales.length - 1];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Lowest" value={`${lowest.toFixed(4)} ${CHAIN.symbol}`} />
        <Stat label="Last Sale" value={lastSale ? `${lastSale.priceEth.toFixed(4)} ${CHAIN.symbol}` : "—"} />
        <Stat label="Highest" value={`${highest.toFixed(4)} ${CHAIN.symbol}`} />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <defs>
            <linearGradient id="hist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.7 0.18 350)" stopOpacity={1}/>
              <stop offset="100%" stopColor="oklch(0.7 0.18 350)" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="label" fontSize={11} />
          <YAxis fontSize={11} />
          <Tooltip formatter={(v: any) => `${v} ${CHAIN.symbol}`} />
          <Line type="monotone" dataKey="price" stroke="url(#hist)" strokeWidth={2.5} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="space-y-1.5">
        <h4 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Event Timeline</h4>
        <div className="divide-y rounded-xl border">
          {points.slice().reverse().map((p, i) => (
            <div key={i} className="flex items-center justify-between p-3 text-sm">
              <div className="flex items-center gap-3">
                {p.kind === "sale" ? <ShoppingCart className="w-4 h-4 text-green-500" /> : <Tag className="w-4 h-4 text-blue-500" />}
                <div>
                  <div className="font-medium capitalize">{p.kind}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.timestamp * 1000).toLocaleString()}
                    {p.to && ` · to ${shortAddr(p.to)}`}
                    {p.from && ` · by ${shortAddr(p.from)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-primary">{p.priceEth.toFixed(4)} {CHAIN.symbol}</span>
                <a href={`${CHAIN.explorer}/tx/${p.tx}`} target="_blank" rel="noopener" className="text-muted-foreground hover:text-primary"><ExternalLink className="w-3.5 h-3.5" /></a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-bold gradient-text mt-0.5">{value}</div>
    </div>
  );
}
