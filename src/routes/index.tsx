import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Store, Plus, Repeat, Trophy, ArrowRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllListings, useAllNFTs } from "@/lib/web3/hooks";
import { CHAIN } from "@/lib/web3/contracts";
import { NFTCard } from "@/components/NFTCard";
import { useTrendingTokenIds } from "@/lib/supabase-hooks";
import heroBg from "@/assets/home-hero-bg.png";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "SakuraNFT — Mint & Trade NFTs on LitVM" },
      { name: "description", content: "Discover trending NFTs, mint your own artwork, and swap zkLTC on SakuraNFT — the winter-sakura marketplace and DEX built on the LitVM LiteForge testnet." },
      { property: "og:title", content: "SakuraNFT — Mint & Trade NFTs on LitVM" },
      { property: "og:description", content: "Trending NFTs, AI-assisted minting, and a built-in DEX for zkLTC, all on LitVM." },
      { name: "twitter:title", content: "SakuraNFT — Mint & Trade NFTs on LitVM" },
      { name: "twitter:description", content: "Trending NFTs, AI-assisted minting, and a built-in DEX for zkLTC, all on LitVM." },
    ],
    links: [{ rel: "canonical", href: "https://sakura-bloom-forge.lovable.app/" }],
  }),
});

function Home() {
  const { nfts } = useAllNFTs();
  const { listings } = useAllListings();
  const trendingIds = useTrendingTokenIds(8);
  const trending = trendingIds.map((id) => nfts.find((n) => n.tokenId.toString() === id)).filter(Boolean) as typeof nfts;
  const featured = nfts.slice(0, 8);

  return (
    <div className="space-y-20">
      {/* Fixed full-screen hero background (covers entire home) */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-gradient-to-b from-background/0 via-background/25 to-background/70 pointer-events-none" />

      {/* Hero content */}
      <section className="relative -mx-4 md:-mx-8 -mt-8 min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Layered depth vignette */}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.35)_75%)]" />
        <div className="relative z-10 text-center px-6 max-w-4xl spring-in" style={{ perspective: "1200px" }}>
          <div className="badge-luxe mb-6 mx-auto">
            <Sparkles className="w-3.5 h-3.5" /> Live on {CHAIN.name}
          </div>
          <h1 className="text-luxe-h text-6xl md:text-8xl text-white drop-shadow-[0_10px_40px_rgba(236,72,153,0.55)]">
            Winter Sakura
            <br />
            <span className="gold-text">NFT Marketplace</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/85 max-w-2xl mx-auto font-display italic">
            Mint, koleksi, dan perdagangkan NFT di bawah langit sakura bersalju. Swap token & sediakan likuiditas — didukung {CHAIN.symbol} di LitVM.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/marketplace" className="btn-luxe">
              Jelajahi Marketplace <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/mint" className="btn-frost">
              Buat NFT
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { l: "Minted", v: nfts.length },
              { l: "Listed", v: listings.length },
              { l: "Network", v: CHAIN.symbol },
              { l: "Chain ID", v: CHAIN.id },
            ].map((s, i) => (
              <div key={s.l}
                className="stagger-item rounded-2xl p-4 text-center backdrop-blur-xl bg-white/10 border border-white/20 hover:border-white/40 hover:bg-white/15 transition"
                style={{ ["--i" as any]: i, boxShadow: "0 12px 30px -10px rgba(236,72,153,0.35), inset 0 1px 0 rgba(255,255,255,0.25)" }}>
                <div className="text-2xl font-bold gold-text">{s.v}</div>
                <div className="text-xs text-white/70 mt-1 tracking-wide uppercase">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">Platform features</h2>
        <div className="grid md:grid-cols-4 gap-4">
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
        </div>
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
