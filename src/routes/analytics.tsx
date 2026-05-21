import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { TrendingUp, Users, ShoppingBag, DollarSign } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAllListings, useAllNFTs } from "@/lib/web3/hooks";
import { CHAIN } from "@/lib/web3/contracts";

export const Route = createFileRoute("/analytics")({
  component: Analytics,
  head: () => ({ meta: [{ title: "Analytics — SakuraNFT" }] }),
});

function Analytics() {
  const { nfts } = useAllNFTs();
  const { listings } = useAllListings();

  const stats = useMemo(() => {
    const total = listings.reduce((a, l) => a + +l.priceEth, 0);
    const avg = listings.length ? total / listings.length : 0;
    const uniqueOwners = new Set(nfts.map((n) => n.owner)).size;
    return { total, avg, count: nfts.length, owners: uniqueOwners };
  }, [nfts, listings]);

  const priceDistribution = useMemo(() => {
    const buckets = [0, 0.1, 0.5, 1, 5, 10, 50, 100, 1000];
    return buckets.slice(0, -1).map((b, i) => ({
      range: `${b}-${buckets[i + 1]}`,
      count: listings.filter((l) => +l.priceEth >= b && +l.priceEth < buckets[i + 1]).length,
    }));
  }, [listings]);

  const mintsByTokenId = useMemo(() => {
    return nfts.slice().reverse().map((n, i) => ({ idx: i + 1, id: Number(n.tokenId) }));
  }, [nfts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold gradient-text">Analytics</h1>
        <p className="text-muted-foreground mt-1">Insights on collection performance.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={ShoppingBag} label="Total NFTs" value={stats.count} />
        <Stat icon={Users} label="Unique Owners" value={stats.owners} />
        <Stat icon={DollarSign} label={`Listed (${CHAIN.symbol})`} value={stats.total.toFixed(2)} />
        <Stat icon={TrendingUp} label="Avg Price" value={`${stats.avg.toFixed(3)} ${CHAIN.symbol}`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Mint Growth</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={mintsByTokenId}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.18 350)" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="oklch(0.7 0.18 350)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="idx" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Area type="monotone" dataKey="id" stroke="oklch(0.62 0.18 350)" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Price Distribution ({CHAIN.symbol})</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={priceDistribution}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="range" fontSize={10} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="oklch(0.62 0.18 350)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <div className="text-2xl font-bold gradient-text">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}
