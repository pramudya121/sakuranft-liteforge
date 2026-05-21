import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Store, Plus, Repeat, Trophy, ArrowRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllListings, useAllNFTs } from "@/lib/web3/hooks";
import { CHAIN } from "@/lib/web3/contracts";
import { NFTCard } from "@/components/NFTCard";
import { useTrendingTokenIds } from "@/lib/supabase-hooks";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({ meta: [{ title: "SakuraNFT — Mint & Trade NFTs on LitVM" }] }),
});

function Home() {
  const { nfts } = useAllNFTs();
  const { listings } = useAllListings();
  const trendingIds = useTrendingTokenIds(8);
  const trending = trendingIds.map((id) => nfts.find((n) => n.tokenId.toString() === id)).filter(Boolean) as typeof nfts;
  const featured = nfts.slice(0, 8);

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative pt-12 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm mb-6">
          <Sparkles className="w-4 h-4 text-primary" /> Live on {CHAIN.name}
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
          <span className="gradient-text">Winter Sakura</span>
          <br /> NFT Marketplace
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Mint, collect, and trade NFTs under a snow-dusted sakura sky. Swap tokens, provide liquidity, and earn — all powered by ${CHAIN.symbol} on LitVM.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Button asChild size="lg" className="rounded-full shadow-lg">
            <Link to="/marketplace">Explore Marketplace <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full glass">
            <Link to="/mint">Create NFT</Link>
          </Button>
        </div>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { l: "Minted", v: nfts.length },
            { l: "Listed", v: listings.length },
            { l: "Network", v: CHAIN.symbol },
            { l: "Chain ID", v: CHAIN.id },
          ].map((s) => (
            <div key={s.l} className="glass rounded-2xl p-4">
              <div className="text-2xl font-bold gradient-text">{s.v}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-4 gap-4">
        {[
          { i: Plus, t: "Mint Easily", d: "Upload from your device. Mint to your wallet in seconds." },
          { i: Store, t: "Buy & Sell", d: "Fixed-price listings + offers, settled in $zkLTC." },
          { i: Repeat, t: "Built-in DEX", d: "Swap tokens & provide liquidity in our Uniswap v2 fork." },
          { i: Trophy, t: "Leaderboards", d: "Climb the ranks as a top collector, seller, or trader." },
        ].map((f) => (
          <div key={f.t} className="glass rounded-2xl p-6 hover:scale-105 transition">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-3">
              <f.i className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="font-semibold mb-1">{f.t}</h3>
            <p className="text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>

      {/* Trending */}
      {trending.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold gradient-text flex items-center gap-2"><Flame className="w-7 h-7 text-primary" /> Trending Now</h2>
            <Button asChild variant="ghost"><Link to="/marketplace">View all <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {trending.map((n) => (
              <NFTCard key={n.tokenId.toString()} nft={n} listing={listings.find((l) => l.tokenId === n.tokenId)} />
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold gradient-text">Latest Mints</h2>
            <Button asChild variant="ghost"><Link to="/marketplace">View all <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((n) => (
              <NFTCard key={n.tokenId.toString()} nft={n} listing={listings.find((l) => l.tokenId === n.tokenId)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
