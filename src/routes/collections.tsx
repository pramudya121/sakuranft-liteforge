import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BadgeCheck, Search, Layers, Sparkles, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCollections } from "@/lib/collections";
import { useAllListings, useAllNFTs } from "@/lib/web3/hooks";
import { CHAIN } from "@/lib/web3/contracts";

export const Route = createFileRoute("/collections")({
  component: CollectionsPage,
  head: () => ({
    meta: [
      { title: "Collections — SakuraNFT" },
      { name: "description", content: "Discover verified NFT collections on SakuraNFT. Browse floor prices, listed counts, and creator collections on the LitVM network." },
      { property: "og:title", content: "Collections — SakuraNFT" },
      { property: "og:description", content: "Verified NFT collections on the LitVM-powered SakuraNFT marketplace." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Collections — SakuraNFT" },
      { name: "twitter:description", content: "Verified NFT collections on the LitVM-powered SakuraNFT marketplace." },
    ],
    links: [{ rel: "canonical", href: "https://sakuranft.lovable.app/collections" }],
  }),
});

function CollectionsPage() {
  const { cols, verifiedCount } = useCollections();
  const { nfts } = useAllNFTs();
  const { listings } = useAllListings();
  const [q, setQ] = useState("");
  const [onlyVerified, setOnlyVerified] = useState(false);

  const rows = useMemo(() => {
    const byOwner = new Map<string, number>();
    nfts.forEach((n) => {
      const k = n.owner.toLowerCase();
      byOwner.set(k, (byOwner.get(k) ?? 0) + 1);
    });

    return cols
      .filter((c) => (onlyVerified ? c.verified : true))
      .filter((c) => {
        if (!q) return true;
        const s = q.toLowerCase();
        return (c.name ?? "").toLowerCase().includes(s) || c.contract_address.toLowerCase().includes(s);
      })
      .map((c) => {
        const addr = c.contract_address.toLowerCase();
        const items = nfts.filter((n) => n.owner.toLowerCase() === addr);
        const listed = listings.filter((l) => items.some((n) => n.tokenId === l.tokenId));
        const floor = listed.length ? Math.min(...listed.map((l) => +l.priceEth)) : 0;
        const volume = listed.reduce((a, l) => a + +l.priceEth, 0);
        return { ...c, count: byOwner.get(addr) ?? items.length, listed: listed.length, floor, volume };
      })
      .sort((a, b) => Number(b.verified) - Number(a.verified) || b.count - a.count);
  }, [cols, nfts, listings, q, onlyVerified]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
            <Layers className="w-8 h-8" /> Collections
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore verified creators and curated collections on {CHAIN.name}.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="glass rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> {cols.length} total
          </span>
          <span className="glass rounded-full px-3 py-1.5 flex items-center gap-1.5 ring-1 ring-primary/40">
            <BadgeCheck className="w-3.5 h-3.5 text-primary" /> {verifiedCount} verified
          </span>
        </div>
      </header>

      <div className="glass rounded-2xl p-4 grid md:grid-cols-4 gap-3">
        <div className="relative md:col-span-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search collections by name or address..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <button
          onClick={() => setOnlyVerified((v) => !v)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition border ${onlyVerified ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-border hover:border-primary/60"}`}
        >
          <BadgeCheck className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Verified only
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <p className="text-muted-foreground">No collections match your filters yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((c) => (
            <Link
              key={c.contract_address}
              to="/u/$address"
              params={{ address: c.contract_address }}
              className="group glass rounded-2xl overflow-hidden hover:ring-1 hover:ring-primary/60 transition-all hover:-translate-y-0.5"
            >
              <div className="h-20 bg-gradient-to-br from-fuchsia-500/30 via-pink-500/20 to-purple-500/30" />
              <div className="px-4 pb-4 -mt-8">
                <div className="w-16 h-16 rounded-2xl bg-background ring-2 ring-primary/40 overflow-hidden flex items-center justify-center text-2xl shadow-lg">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name ?? c.contract_address} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <span>🌸</span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {c.name ?? `${c.contract_address.slice(0, 6)}…${c.contract_address.slice(-4)}`}
                  </h3>
                  {c.verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" aria-label="Verified" />}
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{c.contract_address}</p>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Items" value={c.count} />
                  <Stat label="Listed" value={c.listed} accent />
                  <Stat label="Floor" value={c.floor ? `${c.floor}` : "—"} />
                </div>
                {c.volume > 0 && (
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Listed vol</span>
                    <span className="font-semibold text-foreground">{c.volume.toFixed(2)} {CHAIN.symbol}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl py-2 px-1 bg-muted/30 ${accent ? "ring-1 ring-primary/40" : ""}`}>
      <div className="text-sm font-bold truncate">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
