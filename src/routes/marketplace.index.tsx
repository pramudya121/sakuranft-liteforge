import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, LayoutGrid, List, Sparkles, TrendingUp, Tag, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAllListings, useAllNFTs } from "@/lib/web3/hooks";
import { NFTCard } from "@/components/NFTCard";
import { NFTCardSkeleton } from "@/components/Skeletons";
import { useInfiniteSlice } from "@/hooks/use-infinite-slice";
import { useWallet } from "@/contexts/WalletContext";
import { buyNFT } from "@/lib/web3/ethers";
import { CHAIN } from "@/lib/web3/contracts";
import { useRealtimeListings, markListingSold } from "@/lib/useRealtimeListings";
import { toast } from "sonner";

export const Route = createFileRoute("/marketplace/")({
  component: Marketplace,
  head: () => ({
    meta: [
      { title: "NFT Marketplace — SakuraNFT" },
      { name: "description", content: "Browse, search and buy listed NFTs on LitVM. Filter by price, sort by newest or trending, and own digital art secured on-chain." },
      { property: "og:title", content: "NFT Marketplace — SakuraNFT" },
      { property: "og:description", content: "Browse, search and buy listed NFTs on the LitVM-powered SakuraNFT marketplace." },
      { name: "twitter:title", content: "NFT Marketplace — SakuraNFT" },
      { name: "twitter:description", content: "Browse, search and buy listed NFTs on the LitVM-powered SakuraNFT marketplace." },
    ],
    links: [{ rel: "canonical", href: "https://sakura-bloom-forge.lovable.app/marketplace" }],
  }),
});

function Marketplace() {
  const { nfts, loading, refetch: refetchNFTs } = useAllNFTs();
  const { listings: chainListings, refetch: refetchListings } = useAllListings();
  const { listings: dbListings } = useRealtimeListings({ status: "active" });
  const { signer } = useWallet();

  // Merge: prefer DB listing (live) when token matches, fall back to chain listing.
  const listings = useMemo(() => {
    const merged = new Map<string, typeof chainListings[number]>();
    for (const l of chainListings) merged.set(l.tokenId.toString(), l);
    for (const d of dbListings) {
      const key = String(d.token_id);
      const existing = merged.get(key);
      merged.set(key, {
        ...(existing ?? ({} as any)),
        tokenId: BigInt(d.token_id),
        listingId: d.listing_id != null ? BigInt(d.listing_id) : existing?.listingId ?? 0n,
        seller: d.seller,
        price: existing?.price ?? BigInt(d.price_wei || "0"),
        priceEth: String(d.price_eth),
      } as any);
    }
    return Array.from(merged.values());
  }, [chainListings, dbListings]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [maxPrice, setMaxPrice] = useState(100);
  const [view, setView] = useState<"grid" | "list">("grid");

  const stats = useMemo(() => {
    const prices = listings.map((l) => +l.priceEth).filter((n) => n > 0);
    const floor = prices.length ? Math.min(...prices) : 0;
    const volume = prices.reduce((a, b) => a + b, 0);
    const owners = new Set(nfts.map((n) => n.owner.toLowerCase())).size;
    return { total: nfts.length, listed: listings.length, floor, volume, owners };
  }, [nfts, listings]);

  // Only iterate over actively-listed NFTs. Items that have been bought/cancelled
  // are filtered out of `listings` upstream (chain refetches on Sold event, DB
  // row flips to `sold` on buy), so they disappear from the marketplace
  // automatically without a manual refresh.
  const items = useMemo(() => {
    const nftByToken = new Map(nfts.map((n) => [n.tokenId.toString(), n]));
    let arr = listings
      .map((listing) => {
        const baseNft = nftByToken.get(listing.tokenId.toString());
        if (!baseNft) return null;
        // When an NFT is listed, on-chain ownerOf() returns the marketplace
        // escrow contract. The *real* owner is the seller on the listing.
        const nft = { ...baseNft, owner: listing.seller || baseNft.owner };
        return { nft, listing };
      })
      .filter((x): x is { nft: typeof nfts[number]; listing: typeof listings[number] } => !!x);
    if (search) arr = arr.filter((x) => x.nft.name.toLowerCase().includes(search.toLowerCase()) || x.nft.tokenId.toString().includes(search));
    arr = arr.filter((x) => +x.listing.priceEth <= maxPrice);
    if (sort === "price-asc") arr.sort((a, b) => +a.listing.priceEth - +b.listing.priceEth);
    if (sort === "price-desc") arr.sort((a, b) => +b.listing.priceEth - +a.listing.priceEth);
    if (sort === "oldest") arr.sort((a, b) => Number(a.nft.tokenId - b.nft.tokenId));
    if (sort === "newest") arr.sort((a, b) => Number(b.nft.tokenId - a.nft.tokenId));
    return arr;
  }, [nfts, listings, search, sort, maxPrice]);

  async function handleBuy(listing: typeof listings[number]) {
    if (!signer) return toast.error("Connect wallet first");
    try {
      toast.loading("Confirm in wallet...", { id: "buy" });
      await buyNFT(signer, listing.listingId, listing.price);
      // Mark DB listing as sold so realtime subscribers (including this page)
      // immediately drop it without waiting for a chain re-scan.
      const dbRow = dbListings.find((d) => String(d.token_id) === listing.tokenId.toString() && d.status === "active");
      if (dbRow) { try { await markListingSold(dbRow.id); } catch {} }
      // Force a chain refetch so owner + listings update without page reload.
      refetchListings();
      refetchNFTs();
      toast.success("Purchased! Ownership transferred.", { id: "buy" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Buy failed", { id: "buy" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
            <Sparkles className="w-8 h-8" /> Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">Discover, trade and collect Sakura NFTs on LitVM.</p>
        </div>
        <div className="flex items-center gap-2 glass rounded-full p-1">
          <button onClick={() => setView("grid")} className={`p-2 rounded-full transition ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label="Grid view">
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView("list")} className={`p-2 rounded-full transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label="List view">
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Premium stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile icon={<Sparkles className="w-4 h-4" />} label="Total NFTs" value={stats.total} />
        <StatTile icon={<Tag className="w-4 h-4" />} label="Listed" value={stats.listed} accent />
        <StatTile icon={<TrendingUp className="w-4 h-4" />} label="Floor" value={stats.floor ? `${stats.floor} ${CHAIN.symbol}` : "—"} />
        <StatTile icon={<TrendingUp className="w-4 h-4" />} label={`Listed Vol`} value={`${stats.volume.toFixed(2)} ${CHAIN.symbol}`} />
        <StatTile icon={<Users className="w-4 h-4" />} label="Owners" value={stats.owners} />
      </div>

      <div className="glass rounded-2xl p-4 grid md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or token ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="price-asc">Price: Low → High</SelectItem>
            <SelectItem value="price-desc">Price: High → Low</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center justify-end text-xs text-muted-foreground px-1">
          Showing <span className="font-semibold text-primary mx-1">{items.length}</span> listed NFTs
        </div>
        <div className="md:col-span-4 flex items-center gap-3">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Max price: <b>{maxPrice} zkLTC</b></span>
          <Slider value={[maxPrice]} onValueChange={([v]) => setMaxPrice(v)} max={1000} step={1} className="flex-1" />
        </div>
      </div>

      <MarketGrid loading={loading} items={items} view={view} onBuy={handleBuy} />
    </div>
  );
}

function MarketGrid({ loading, items, view, onBuy }: {
  loading: boolean;
  items: { nft: any; listing: any }[];
  view: "grid" | "list";
  onBuy: (listing: any) => void;
}) {
  const { slice, sentinelRef, hasMore } = useInfiniteSlice(items, 24, 24);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <NFTCardSkeleton key={i} />)}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="text-center py-20 glass rounded-2xl">
        <p className="text-muted-foreground">No NFTs match your filters. Be the first to <a href="/mint" className="text-primary underline">mint one</a>!</p>
      </div>
    );
  }
  return (
    <>
      {view === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {slice.map(({ nft, listing }) => (
            <NFTCard key={nft.tokenId.toString()} nft={nft} listing={listing} onBuy={() => onBuy(listing)} />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl divide-y divide-border/40">
          {slice.map(({ nft, listing }) => (
            <a key={nft.tokenId.toString()} href={`/marketplace/${nft.tokenId.toString()}`}
               className="flex items-center gap-4 p-3 hover:bg-accent/40 transition">
              <img src={nft.image} alt={nft.name} loading="lazy" decoding="async" className="w-14 h-14 rounded-lg object-cover bg-muted" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{nft.name}</p>
                <p className="text-xs text-muted-foreground font-mono">#{nft.tokenId.toString()}</p>
              </div>
              <div className="text-right text-sm">
                {listing ? <span className="font-bold text-primary">{listing.priceEth} {CHAIN.symbol}</span> : <span className="text-muted-foreground">Not listed</span>}
              </div>
            </a>
          ))}
        </div>
      )}
      {hasMore && (
        <div ref={sentinelRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {Array.from({ length: 4 }).map((_, i) => <NFTCardSkeleton key={i} />)}
        </div>
      )}
    </>
  );
}

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`glass rounded-2xl p-4 ${accent ? "ring-1 ring-primary/40" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}<span>{label}</span></div>
      <div className="mt-1 text-xl font-bold gradient-text truncate">{value}</div>
    </div>
  );
}
