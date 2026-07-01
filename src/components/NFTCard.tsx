import { Link } from "@tanstack/react-router";
import { Heart, Send, ShoppingCart, Eye, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { NFTMeta, Listing } from "@/lib/web3/hooks";
import { shortAddr, makeOffer } from "@/lib/web3/ethers";
import { CHAIN } from "@/lib/web3/contracts";
import { useWallet } from "@/contexts/WalletContext";
import { useWatchlist } from "@/lib/supabase-hooks";
import { pushNotification } from "@/lib/supabase-hooks";
import { useCollections } from "@/lib/collections";
import { toast } from "sonner";

export function NFTCard({ nft, listing, onBuy }: { nft: NFTMeta; listing?: Listing; onBuy?: () => void }) {
  const { address, signer } = useWallet();
  const { items, toggle } = useWatchlist(address);
  const { find } = useCollections();
  const id = nft.tokenId.toString();
  const isFav = items.includes(id);
  const isOwner = address && address.toLowerCase() === nft.owner.toLowerCase();
  const collection = find(nft.category);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitOffer() {
    if (!signer) return toast.error("Connect wallet first");
    if (!offerPrice || +offerPrice <= 0) return toast.error("Enter a valid price");
    setBusy(true);
    try {
      toast.loading("Confirm offer in wallet...", { id: "offer" });
      await makeOffer(signer, nft.tokenId, offerPrice);
      toast.success("Offer sent!", { id: "offer" });
      await pushNotification(nft.owner, "offer", "💎 New offer received",
        `${offerPrice} ${CHAIN.symbol} offered on ${nft.name}`, nft.tokenId, `/marketplace/${id}`);
      setOfferOpen(false); setOfferPrice("");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Offer failed", { id: "offer" });
    } finally { setBusy(false); }
  }

  return (
    <div className="group relative rounded-2xl overflow-hidden flex flex-col bg-card border border-border/60 shadow-md hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.45)] hover:-translate-y-1.5 hover:border-primary/60 transition-all duration-300">
      {/* gradient halo on hover */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-fuchsia-500/25 via-transparent to-pink-500/25" />
      {/* glossy top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/10 to-transparent opacity-60" />

      <Link to="/marketplace/$id" params={{ id }} className="relative aspect-square overflow-hidden bg-gradient-to-br from-accent/40 to-secondary/40 block">
        {nft.image ? (
          <img src={nft.image} alt={nft.name} loading="lazy" decoding="async" fetchPriority="low" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl animate-pulse">🌸</div>
        )}
        {/* diagonal shine sweep on hover */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        {/* token id badge */}
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-mono bg-background/70 backdrop-blur border border-border/60">#{id}</span>
        {/* price ribbon */}
        {listing && (
          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-lg ring-1 ring-white/30">
            {(+listing.priceEth).toFixed(4)} {CHAIN.symbol}
          </span>
        )}
        {/* bottom image fade for legibility */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/80 to-transparent" />
      </Link>

      {/* watchlist heart — outside the link so the click doesn't navigate */}
      <button
        onClick={(e) => {
          e.preventDefault(); e.stopPropagation();
          if (!address) { toast.error("Connect wallet to use watchlist"); return; }
          toggle(id);
        }}
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/70 backdrop-blur border border-border/60 flex items-center justify-center hover:scale-110 hover:border-primary transition z-10"
        aria-label="Toggle watchlist"
      >
        <Heart className={`w-4 h-4 ${isFav ? "fill-primary text-primary" : "text-foreground"}`} />
      </button>

      <div className="p-4 flex-1 flex flex-col gap-2 relative">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold truncate text-base">{nft.name}</h3>
        </div>
        <Link to="/u/$address" params={{ address: nft.owner }} onClick={(e) => e.stopPropagation()} className="text-xs text-muted-foreground hover:text-primary truncate font-mono">
          by {shortAddr(nft.owner)}
        </Link>
        {!listing && (
          <div className="text-xs text-muted-foreground">Not listed</div>
        )}
        <div className="grid grid-cols-3 gap-1.5 mt-auto pt-2">
          <Button asChild size="sm" variant="outline" className="px-2 rounded-full">
            <Link to="/marketplace/$id" params={{ id }}><Eye className="w-3.5 h-3.5 mr-1" />View</Link>
          </Button>
          {listing && onBuy ? (
            <Button size="sm" className="px-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 border-0 text-white shadow hover:opacity-90" onClick={onBuy}>
              <ShoppingCart className="w-3.5 h-3.5 mr-1" />Buy
            </Button>
          ) : (
            <Button asChild size="sm" className="px-2 rounded-full" variant="secondary">
              <Link to="/marketplace/$id" params={{ id }}>Details</Link>
            </Button>
          )}
          {!isOwner ? (
            <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="px-2 rounded-full"><Send className="w-3.5 h-3.5 mr-1" />Offer</Button>
              </DialogTrigger>
              <DialogContent className="bg-popover">
                <DialogHeader><DialogTitle>Make Offer · {nft.name}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input type="number" step="0.001" placeholder={`Offer in ${CHAIN.symbol}`} value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} />
                  <Button onClick={submitOffer} disabled={busy} className="w-full">{busy ? "Sending..." : `Send Offer`}</Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button asChild size="sm" variant="outline" className="px-2 rounded-full">
              <Link to="/marketplace/$id" params={{ id }}>Manage</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
