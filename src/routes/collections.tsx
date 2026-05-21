import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Layers, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAllNFTs, useAllListings } from "@/lib/web3/hooks";
import { CHAIN } from "@/lib/web3/contracts";

export const Route = createFileRoute("/collections")({
  component: CollectionsPage,
  head: () => ({
    meta: [
      { title: "NFT Collections — SakuraNFT" },
      { name: "description", content: "Browse verified NFT collections on LitVM. Discover floor prices, item counts, and the artists shaping the SakuraNFT ecosystem." },
      { property: "og:title", content: "NFT Collections — SakuraNFT" },
      { property: "og:description", content: "Verified NFT collections on the LitVM-powered SakuraNFT marketplace." },
      { name: "twitter:title", content: "NFT Collections — SakuraNFT" },
      { name: "twitter:description", content: "Verified NFT collections on the LitVM-powered SakuraNFT marketplace." },
    ],
    links: [{ rel: "canonical", href: "https://sakura-bloom-forge.lovable.app/collections" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "NFT Collections on SakuraNFT",
        url: "https://sakura-bloom-forge.lovable.app/collections",
        description: "Verified NFT collections on the LitVM-powered SakuraNFT marketplace.",
      }),
    }],
  }),
});

type Collection = {
  id: string;
  contract_address: string;
  name: string | null;
  description: string | null;
  banner_url: string | null;
  logo_url: string | null;
  verified: boolean;
};

function CollectionsPage() {
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const { nfts } = useAllNFTs();
  const { listings } = useAllListings();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("collections_metadata").select("*").order("verified", { ascending: false });
      setItems((data ?? []) as Collection[]);
      setLoading(false);
    })();
  }, []);

  const stats = (addr: string) => {
    const owned = nfts.filter((n) => true); // single collection contract for now
    const listed = listings.length;
    const floor = listings.length ? Math.min(...listings.map((l) => +l.priceEth)) : 0;
    return { count: owned.length, listed, floor };
  };

  const filtered = items.filter((c) => !q || (c.name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold gradient-text flex items-center gap-3"><Layers className="w-8 h-8" /> Collections</h1>
        <p className="text-muted-foreground mt-1">Curated NFT collections on LitVM.</p>
      </div>
      <div className="glass rounded-2xl p-3 relative max-w-md">
        <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search collections..." className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 glass rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl text-muted-foreground">No collections yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const s = stats(c.contract_address);
            return (
              <Link key={c.id} to="/collections/$address" params={{ address: c.contract_address }} className="glass rounded-2xl overflow-hidden hover:scale-[1.02] transition glow-card group">
                <div className="h-28 bg-gradient-to-br from-primary/30 to-accent/30 relative overflow-hidden">
                  {c.banner_url && <img src={c.banner_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                </div>
                <div className="p-4 -mt-8 relative">
                  <div className="w-14 h-14 rounded-xl bg-background border-2 border-background overflow-hidden shadow-lg">
                    {c.logo_url ? <img src={c.logo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🌸</div>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3">
                    <h3 className="font-bold text-lg truncate">{c.name ?? "Untitled"}</h3>
                    {c.verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description}</p>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <Stat label="Items" v={s.count} />
                    <Stat label="Listed" v={s.listed} />
                    <Stat label={`Floor ${CHAIN.symbol}`} v={s.floor ? s.floor.toFixed(3) : "—"} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number | string }) {
  return (
    <div className="rounded-lg bg-background/40 py-1.5">
      <div className="text-sm font-bold text-primary">{v}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
