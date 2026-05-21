import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NFTMeta, Listing } from "@/lib/web3/hooks";
import { shortAddr } from "@/lib/web3/ethers";
import { CHAIN } from "@/lib/web3/contracts";
import { useLocalStorage } from "@/lib/web3/hooks";

export function NFTCard({ nft, listing, onBuy }: { nft: NFTMeta; listing?: Listing; onBuy?: () => void }) {
  const [watch, setWatch] = useLocalStorage<string[]>("watchlist", []);
  const id = nft.tokenId.toString();
  const isFav = watch.includes(id);
  return (
    <div className="glass rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-300 glow-card flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-accent/40 to-secondary/40">
        {nft.image ? (
          <img src={nft.image} alt={nft.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🌸</div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); setWatch(isFav ? watch.filter((x) => x !== id) : [...watch, id]); }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full glass flex items-center justify-center hover:scale-110 transition"
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-primary text-primary" : ""}`} />
        </button>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold truncate">{nft.name}</h3>
          <span className="text-xs text-muted-foreground shrink-0">#{id}</span>
        </div>
        <p className="text-xs text-muted-foreground">by {shortAddr(nft.owner)}</p>
        {listing ? (
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xs text-muted-foreground">Price</span>
            <span className="font-bold text-primary">{(+listing.priceEth).toFixed(4)} {CHAIN.symbol}</span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Not listed</div>
        )}
        <div className="flex gap-2 mt-auto pt-2">
          {listing && onBuy && (
            <Button size="sm" className="flex-1" onClick={onBuy}>Buy</Button>
          )}
          <Button asChild size="sm" variant={listing ? "outline" : "default"} className="flex-1">
            <Link to="/marketplace/$id" params={{ id }}>View Details</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
