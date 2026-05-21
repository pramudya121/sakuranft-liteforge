import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAllListings, useAllNFTs } from "@/lib/web3/hooks";
import { NFTCard } from "@/components/NFTCard";
import { useWallet } from "@/contexts/WalletContext";
import { buyNFT } from "@/lib/web3/ethers";
import { toast } from "sonner";

export const Route = createFileRoute("/marketplace/")({
  component: Marketplace,
  head: () => ({ meta: [{ title: "Marketplace — SakuraNFT" }] }),
});

function Marketplace() {
  const { nfts, loading } = useAllNFTs();
  const { listings } = useAllListings();
  const { signer } = useWallet();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [maxPrice, setMaxPrice] = useState(100);
  const [onlyListed, setOnlyListed] = useState("all");

  const items = useMemo(() => {
    let arr = nfts.map((n) => ({ nft: n, listing: listings.find((l) => l.tokenId === n.tokenId) }));
    if (onlyListed === "listed") arr = arr.filter((x) => x.listing);
    if (onlyListed === "unlisted") arr = arr.filter((x) => !x.listing);
    if (search) arr = arr.filter((x) => x.nft.name.toLowerCase().includes(search.toLowerCase()) || x.nft.tokenId.toString().includes(search));
    arr = arr.filter((x) => !x.listing || +x.listing.priceEth <= maxPrice);
    if (sort === "price-asc") arr.sort((a, b) => (+(a.listing?.priceEth ?? 1e9)) - (+(b.listing?.priceEth ?? 1e9)));
    if (sort === "price-desc") arr.sort((a, b) => (+(b.listing?.priceEth ?? 0)) - (+(a.listing?.priceEth ?? 0)));
    if (sort === "oldest") arr.sort((a, b) => Number(a.nft.tokenId - b.nft.tokenId));
    return arr;
  }, [nfts, listings, search, sort, maxPrice, onlyListed]);

  async function handleBuy(listingId: bigint, price: bigint) {
    if (!signer) return toast.error("Connect wallet first");
    try {
      toast.loading("Confirm in wallet...", { id: "buy" });
      await buyNFT(signer, listingId, price);
      toast.success("Purchased!", { id: "buy" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Buy failed", { id: "buy" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold gradient-text">Marketplace</h1>
        <p className="text-muted-foreground mt-1">Discover and collect snow sakura NFTs.</p>
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
        <Select value={onlyListed} onValueChange={setOnlyListed}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All NFTs</SelectItem>
            <SelectItem value="listed">Listed only</SelectItem>
            <SelectItem value="unlisted">Unlisted only</SelectItem>
          </SelectContent>
        </Select>
        <div className="md:col-span-4 flex items-center gap-3">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Max price: <b>{maxPrice} zkLTC</b></span>
          <Slider value={[maxPrice]} onValueChange={([v]) => setMaxPrice(v)} max={1000} step={1} className="flex-1" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square glass rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <p className="text-muted-foreground">No NFTs match your filters. Be the first to <a href="/mint" className="text-primary underline">mint one</a>!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(({ nft, listing }) => (
            <NFTCard key={nft.tokenId.toString()} nft={nft} listing={listing}
              onBuy={listing ? () => handleBuy(listing.listingId, listing.price) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
