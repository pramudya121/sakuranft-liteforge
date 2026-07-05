import { Link } from "@tanstack/react-router";
import { Heart, Send, ShoppingCart, Eye, BadgeCheck, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
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
  const [quickOpen, setQuickOpen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  function onViewerMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = viewerRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--tx", (x - 0.5).toFixed(3));
    el.style.setProperty("--ty", (y - 0.5).toFixed(3));
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  }
  function onViewerLeave() {
    const el = viewerRef.current; if (!el) return;
    el.style.setProperty("--tx", "0"); el.style.setProperty("--ty", "0");
  }
  const cardRef = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--tx", (x - 0.5).toFixed(3));
    el.style.setProperty("--ty", (y - 0.5).toFixed(3));
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  }
  function onLeave() {
    const el = cardRef.current; if (!el) return;
    el.style.setProperty("--tx", "0");
    el.style.setProperty("--ty", "0");
  }

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
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="tilt-3d luxe-border spotlight group relative rounded-2xl overflow-hidden flex flex-col bg-card border border-border/60 shadow-md hover:shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.55)] transition-shadow duration-500"
    >
      {/* gradient halo on hover */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-fuchsia-500/25 via-transparent to-amber-400/20" />
      {/* glossy top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/10 to-transparent opacity-60" />

      <Link to="/marketplace/$id" params={{ id }} className="relative aspect-square overflow-hidden bg-gradient-to-br from-accent/40 to-secondary/40 block">
        {nft.image ? (
          <img src={nft.image} alt={nft.name} loading="lazy" decoding="async" fetchPriority="low" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 will-change-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl animate-pulse">🌸</div>
        )}
        {/* diagonal shine sweep on hover */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        {/* floating sparkle */}
        <div className="pointer-events-none absolute top-4 right-14 opacity-0 group-hover:opacity-100 transition-opacity duration-500 orbit tilt-layer-3">
          <Sparkles className="w-4 h-4 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        </div>
        {/* token id badge */}
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-mono bg-background/70 backdrop-blur border border-border/60 tilt-layer-1">#{id}</span>
        {/* price ribbon */}
        {listing && (
          <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400 text-white shadow-[0_8px_24px_-6px_rgba(236,72,153,0.6)] ring-1 ring-white/40 tilt-layer-2">
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
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/70 backdrop-blur border border-border/60 flex items-center justify-center hover:scale-110 hover:border-primary transition z-10 tilt-layer-2"
        aria-label="Toggle watchlist"
      >
        <Heart className={`w-4 h-4 ${isFav ? "fill-primary text-primary" : "text-foreground"}`} />
      </button>

      <div className="p-4 flex-1 flex flex-col gap-2 relative tilt-layer-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold truncate text-base flex items-center gap-1.5">
            <span className="truncate gold-text">{nft.name}</span>
            {collection?.verified && (
              <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0" aria-label="Verified collection" />
            )}
          </h3>
        </div>
        {collection?.name && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            {collection.logo_url && <img src={collection.logo_url} alt="" className="w-3.5 h-3.5 rounded-full" loading="lazy" decoding="async" />}
            <span className="truncate">{collection.name}</span>
          </div>
        )}
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
