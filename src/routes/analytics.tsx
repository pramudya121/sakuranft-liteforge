import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, ShoppingBag, DollarSign, Repeat, Droplet, Sparkles, Activity as ActivityIcon, LineChart as LineChartIcon } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAllListings, useAllNFTs } from "@/lib/web3/hooks";
import { CHAIN, CONTRACTS } from "@/lib/web3/contracts";
import { TOKENS } from "@/lib/tokens";
import { getPairInfo, formatEther } from "@/lib/web3/ethers";
import { fetchCollectionHistory, fetchRecentSales, type CollectionHistoryPoint, type RecentSale } from "@/lib/web3/history";
import { ChartSkeleton, TableSkeleton } from "@/components/Skeletons";
import { useCollections } from "@/lib/collections";
import { BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  component: Analytics,
  head: () => ({
    meta: [
      { title: "Analytics — SakuraNFT Marketplace & DEX" },
      { name: "description", content: "Real-time analytics for the SakuraNFT marketplace and Sakura DEX on LitVM: floor price, volume, liquidity pools, token pairs." },
      { property: "og:title", content: "SakuraNFT Analytics — Live Marketplace & DEX Metrics" },
      { property: "og:description", content: "Floor price, trading volume, liquidity pools, and token pair stats — updated live on LitVM." },
      { property: "og:url", content: "https://sakuranft.lovable.app/analytics" },
      { name: "twitter:title", content: "SakuraNFT Analytics" },
      { name: "twitter:description", content: "Live floor price, volume, pools & pair stats on LitVM." },
    ],
    links: [{ rel: "canonical", href: "https://sakuranft.lovable.app/analytics" }],
  }),
});

const COLORS = ["#e879f9", "#f472b6", "#a78bfa", "#60a5fa", "#34d399", "#facc15", "#fb923c", "#f87171"];

type PoolStat = { pair: string; symA: string; symB: string; reserveA: string; reserveB: string; tvlEth: number };

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl p-5 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-fuchsia-400/40 transition">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs dex-muted uppercase tracking-wider">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 flex items-center justify-center"><Icon className="w-4 h-4 text-fuchsia-300" /></div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-[11px] dex-muted mt-1">{sub}</div>}
    </div>
  );
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-3xl p-5 bg-white/[0.02] border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

// Custom Y-axis tick that renders paired token logos alongside the pair label.
function PairTick(props: any) {
  const { x, y, payload } = props;
  const pair = String(payload?.value ?? "");
  const [symA, symB] = pair.split("/");
  const tA = TOKENS.find((t) => t.symbol === symA);
  const tB = TOKENS.find((t) => t.symbol === symB);
  return (
    <g transform={`translate(${x - 8},${y})`}>
      {tA && <image href={tA.logo} x={-118} y={-9} width={18} height={18} clipPath="circle(9px at 9px 9px)" />}
      {tB && <image href={tB.logo} x={-104} y={-9} width={18} height={18} clipPath="circle(9px at 9px 9px)" />}
      <text x={-80} y={4} fill="rgba(255,255,255,0.75)" fontSize={11}>{pair}</text>
    </g>
  );
}

function Analytics() {
  const { nfts } = useAllNFTs();
  const { listings } = useAllListings();
  const { cols: allCols, verifiedCount } = useCollections();
  const [pools, setPools] = useState<PoolStat[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [history, setHistory] = useState<CollectionHistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);

  const verifiedCols = useMemo(() => allCols.filter((c) => c.verified).slice(0, 12), [allCols]);

  useEffect(() => {
    let alive = true;
    setHistoryLoading(true);
    setSalesLoading(true);
    fetchCollectionHistory()
      .then((h) => { if (alive) { setHistory(h); setHistoryLoading(false); } })
      .catch(() => { if (alive) setHistoryLoading(false); });
    fetchRecentSales(25)
      .then((r) => { if (alive) { setRecentSales(r); setSalesLoading(false); } })
      .catch(() => { if (alive) setSalesLoading(false); });
    return () => { alive = false; };
  }, []);


  // ---- DEX pool stats: probe every token vs wzkLTC ----
  useEffect(() => {
    let alive = true;
    (async () => {
      setPoolsLoading(true);
      const wzk = TOKENS.find((t) => t.symbol === "wzkLTC")!;
      const candidates = TOKENS.filter((t) => t.address && t.address !== "native" && t.symbol !== "wzkLTC" && /^0x[0-9a-fA-F]{40}$/.test(t.address));
      const results: PoolStat[] = [];
      for (const t of candidates) {
        try {
          const info = await getPairInfo(CONTRACTS.weth, t.address as string);
          if (!info.pair) continue;
          const r0 = Number(formatEther(info.reserve0));
          const r1 = Number(formatEther(info.reserve1));
          const wzkIsToken0 = info.token0.toLowerCase() === CONTRACTS.weth.toLowerCase();
          const wzkReserve = wzkIsToken0 ? r0 : r1;
          const otherReserve = wzkIsToken0 ? r1 : r0;
          results.push({ pair: `${wzk.symbol}/${t.symbol}`, symA: wzk.symbol, symB: t.symbol, reserveA: wzkReserve.toFixed(4), reserveB: otherReserve.toFixed(4), tvlEth: wzkReserve * 2 });
        } catch {}
      }
      if (alive) { setPools(results.sort((a, b) => b.tvlEth - a.tvlEth)); setPoolsLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  // ---- Marketplace stats ----
  const mp = useMemo(() => {
    const total = listings.reduce((a, l) => a + +l.priceEth, 0);
    const avg = listings.length ? total / listings.length : 0;
    const floor = listings.length ? Math.min(...listings.map((l) => +l.priceEth)) : 0;
    const ceiling = listings.length ? Math.max(...listings.map((l) => +l.priceEth)) : 0;
    const uniqueOwners = new Set(nfts.map((n) => n.owner)).size;
    const listedRatio = nfts.length ? (listings.length / nfts.length) * 100 : 0;
    return { total, avg, floor, ceiling, count: nfts.length, owners: uniqueOwners, listed: listings.length, listedRatio };
  }, [nfts, listings]);

  const priceBuckets = useMemo(() => {
    const buckets = [0, 0.01, 0.05, 0.1, 0.5, 1, 5, 10, 100];
    return buckets.slice(0, -1).map((b, i) => ({
      range: `${b}-${buckets[i + 1]}`,
      count: listings.filter((l) => +l.priceEth >= b && +l.priceEth < buckets[i + 1]).length,
    }));
  }, [listings]);


  const topHolders = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of nfts) counts[n.owner] = (counts[n.owner] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([addr, c]) => ({ name: `${addr.slice(0, 6)}…${addr.slice(-4)}`, value: c }));
  }, [nfts]);

  // Real on-chain history aggregates
  const histStats = useMemo(() => {
    if (!history.length) return { totalVolume: 0, totalSales: 0, last7Volume: 0, last7Sales: 0, avgSale: 0 };
    const totalVolume = history.reduce((s, p) => s + p.volume, 0);
    const totalSales = history.reduce((s, p) => s + p.sales, 0);
    const cutoff = Date.now() / 1000 - 7 * 86400;
    const recent = history.filter((p) => p.timestamp >= cutoff);
    const last7Volume = recent.reduce((s, p) => s + p.volume, 0);
    const last7Sales = recent.reduce((s, p) => s + p.sales, 0);
    const avgSale = totalSales ? totalVolume / totalSales : 0;
    return { totalVolume, totalSales, last7Volume, last7Sales, avgSale };
  }, [history]);

  const dexTvl = pools.reduce((s, p) => s + p.tvlEth, 0);

  // ---- Top traders derived from recent sales feed ----
  const topTraders = useMemo(() => {
    const map = new Map<string, { addr: string; bought: number; sold: number; volume: number; trades: number }>();
    const bump = (addr: string, kind: "bought" | "sold", vol: number) => {
      const k = addr.toLowerCase();
      const cur = map.get(k) ?? { addr, bought: 0, sold: 0, volume: 0, trades: 0 };
      cur[kind] += 1;
      cur.volume += vol;
      cur.trades += 1;
      map.set(k, cur);
    };
    for (const s of recentSales) { bump(s.buyer, "bought", s.priceEth); bump(s.seller, "sold", s.priceEth); }
    return [...map.values()].sort((a, b) => b.volume - a.volume).slice(0, 8);
  }, [recentSales]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold gradient-text">Analytics</h1>
        <p className="text-muted-foreground mt-1">Live insights across the SakuraNFT marketplace and Sakura DEX.</p>
      </div>

      {/* ===== Marketplace ===== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-fuchsia-400" />
          <h2 className="text-xl font-bold text-foreground">NFT Marketplace</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Sparkles} label="Total NFTs" value={mp.count.toString()} sub={`${mp.owners} unique owners`} />
          <StatCard icon={ShoppingBag} label="Active Listings" value={mp.listed.toString()} sub={`${mp.listedRatio.toFixed(1)}% listed`} />
          <StatCard icon={DollarSign} label="Floor Price" value={`${mp.floor.toFixed(4)} ${CHAIN.symbol}`} sub={`Ceiling ${mp.ceiling.toFixed(2)}`} />
          <StatCard icon={TrendingUp} label="On-chain Volume" value={`${histStats.totalVolume.toFixed(3)} ${CHAIN.symbol}`} sub={`${histStats.totalSales} sales · 7d ${histStats.last7Volume.toFixed(3)}`} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="Daily Trading Volume (on-chain sales)" right={<span className="text-[10px] dex-muted opacity-80">{historyLoading ? "Scanning chain…" : `${history.length} days`}</span>}>
            {history.length === 0 ? (
              historyLoading ? <ChartSkeleton /> : <p className="text-xs dex-muted py-8 text-center">No recorded sales yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="gVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e879f9" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#e879f9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#160c26", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                    formatter={(v: any) => [`${Number(v).toFixed(4)} ${CHAIN.symbol}`, "Volume"]} />
                  <Area type="monotone" dataKey="volume" stroke="#e879f9" fill="url(#gVol)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Section>

          <Section title="Floor Price Trend (on-chain)" right={<LineChartIcon className="w-3.5 h-3.5 dex-muted opacity-80" />}>
            {history.length === 0 ? (
              historyLoading ? <ChartSkeleton /> : <p className="text-xs dex-muted py-8 text-center">No floor data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#160c26", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                    formatter={(v: any) => [`${Number(v).toFixed(4)} ${CHAIN.symbol}`, "Floor"]} />
                  <Line type="monotone" dataKey="floor" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Section>

          <Section title="Listing Price Distribution">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priceBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="range" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#160c26", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Bar dataKey="count" fill="#f472b6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>

          <Section title="Daily Sales Count (on-chain)">
            {history.length === 0 ? (
              historyLoading ? <ChartSkeleton /> : <p className="text-xs dex-muted py-8 text-center">No sales yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#160c26", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                  <Bar dataKey="sales" fill="#34d399" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Section>

          <Section title="Top Holders">
            {topHolders.length === 0 ? <p className="text-xs dex-muted">No data yet.</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={topHolders} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {topHolders.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#160c26", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Section>

          <Section title="Marketplace Summary">
            <ul className="text-sm space-y-2 text-foreground">
              <li className="flex justify-between"><span className="dex-muted">Total Value Listed</span><span className="font-semibold">{mp.total.toFixed(4)} {CHAIN.symbol}</span></li>
              <li className="flex justify-between"><span className="dex-muted">On-chain Volume</span><span className="font-semibold">{histStats.totalVolume.toFixed(4)} {CHAIN.symbol}</span></li>
              <li className="flex justify-between"><span className="dex-muted">Avg Sale Price</span><span className="font-semibold">{histStats.avgSale.toFixed(4)} {CHAIN.symbol}</span></li>
              <li className="flex justify-between"><span className="dex-muted">Sales (7d)</span><span className="font-semibold">{histStats.last7Sales}</span></li>
              <li className="flex justify-between"><span className="dex-muted">Listed Ratio</span><span className="font-semibold">{mp.listedRatio.toFixed(2)}%</span></li>
              <li className="flex justify-between"><span className="dex-muted">Concentration (top owner)</span><span className="font-semibold">{topHolders[0] && mp.count ? `${((topHolders[0].value / mp.count) * 100).toFixed(1)}%` : "—"}</span></li>
            </ul>
          </Section>
        </div>
      </section>

      {/* ===== Verified Collections ===== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-sky-400" />
          <h2 className="text-xl font-bold text-foreground">Verified Collections</h2>
          <span className="text-xs dex-muted">{verifiedCount} verified</span>
        </div>
        {verifiedCols.length === 0 ? (
          <div className="rounded-2xl p-6 bg-white/[0.02] border border-white/10 text-center text-xs dex-muted">
            No verified collections yet. Verified creators get a checkmark badge across the marketplace.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {verifiedCols.map((c) => (
              <div key={c.contract_address} className="rounded-2xl p-3 bg-white/[0.02] border border-white/10 hover:border-sky-400/40 transition flex items-center gap-2">
                {c.logo_url ? (
                  <img src={c.logo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500/40 to-pink-500/40 flex items-center justify-center text-lg shrink-0">🌸</div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-1">
                    {c.name || c.contract_address}
                    <BadgeCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  </div>
                  <div className="text-[10px] dex-muted truncate">{c.contract_address}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== DEX ===== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-pink-400" />
          <h2 className="text-xl font-bold text-foreground">Sakura DEX</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Droplet} label="Active Pools" value={pools.length.toString()} sub={poolsLoading ? "Scanning…" : `vs wzkLTC`} />
          <StatCard icon={DollarSign} label="Total TVL" value={`${dexTvl.toFixed(2)} ${CHAIN.symbol}`} sub="Sum of pool liquidity ×2" />
          <StatCard icon={Sparkles} label="Tokens Listed" value={TOKENS.length.toString()} sub="Including native zkLTC" />
          <StatCard icon={ActivityIcon} label="Top Pair" value={pools[0]?.pair ?? "—"} sub={pools[0] ? `${pools[0].tvlEth.toFixed(2)} ${CHAIN.symbol} TVL` : "No pools"} />
        </div>

        <Section title="Liquidity per Pool" right={<span className="text-[10px] dex-muted opacity-80">{poolsLoading ? "Loading…" : `${pools.length} pools`}</span>}>
          {pools.length === 0 ? (
            poolsLoading ? <ChartSkeleton height={260} /> : <p className="text-xs dex-muted py-4 text-center">No active pools yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(260, pools.length * 44)}>
              <BarChart data={pools} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                <YAxis type="category" dataKey="pair" stroke="rgba(255,255,255,0.5)" fontSize={11} width={140}
                  tick={<PairTick />} />
                <Tooltip contentStyle={{ background: "#160c26", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                  formatter={(v: any) => [`${Number(v).toFixed(4)} ${CHAIN.symbol}`, "TVL"]} />
                <Bar dataKey="tvlEth" fill="#f472b6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Pool Reserves">
          {pools.length === 0 ? (
            poolsLoading ? <TableSkeleton rows={5} /> : <p className="text-xs dex-muted py-4 text-center">No pools to display.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs dex-muted uppercase">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-2">Pair</th>
                    <th className="text-right py-2 px-2">wzkLTC</th>
                    <th className="text-right py-2 px-2">Other</th>
                    <th className="text-right py-2 px-2">TVL ({CHAIN.symbol})</th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((p) => {
                    const tA = TOKENS.find((t) => t.symbol === p.symA);
                    const tB = TOKENS.find((t) => t.symbol === p.symB);
                    return (
                      <tr key={p.pair} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-2 px-2 font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {tA && <img src={tA.logo} alt={tA.symbol} className="w-6 h-6 rounded-full ring-2 ring-background" loading="lazy" decoding="async" />}
                              {tB && <img src={tB.logo} alt={tB.symbol} className="w-6 h-6 rounded-full ring-2 ring-background" loading="lazy" decoding="async" />}
                            </div>
                            <span>{p.pair}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right text-foreground">{p.reserveA}</td>
                        <td className="py-2 px-2 text-right text-foreground">
                          <span className="inline-flex items-center gap-1.5 justify-end">
                            {p.reserveB}
                            {tB && <img src={tB.logo} alt={tB.symbol} className="w-4 h-4 rounded-full" loading="lazy" decoding="async" />}
                            <span className="dex-muted opacity-80 text-xs">{p.symB}</span>
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-fuchsia-300">{p.tvlEth.toFixed(4)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </section>
    </div>
  );
}
