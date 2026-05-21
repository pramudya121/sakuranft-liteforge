import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Tag, ShoppingCart, X, Send, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNFT, useOffers } from "@/lib/web3/hooks";
import { useWallet } from "@/contexts/WalletContext";
import { acceptOffer, buyNFT, cancelListing, cancelOffer, listNFT, makeOffer, shortAddr } from "@/lib/web3/ethers";
import { CHAIN } from "@/lib/web3/contracts";
import { toast } from "sonner";
import { useNFTViews, pushNotification } from "@/lib/supabase-hooks";
import { LikeButton, CommentsPanel } from "@/components/NFTSocial";

export const Route = createFileRoute("/marketplace/$id")({
  component: NFTDetail,
  head: ({ params }) => ({ meta: [{ title: `NFT #${params.id} — SakuraNFT` }] }),
});

function NFTDetail() {
  const { id } = Route.useParams();
  const { nft, listing, loading } = useNFT(id);
  const offers = useOffers(id);
  const { signer, address } = useWallet();
  const [listPrice, setListPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const { count: viewCount, increment } = useNFTViews(id);

  useEffect(() => { increment(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const isOwner = address && nft && address.toLowerCase() === nft.owner.toLowerCase();

  async function wrap<T>(label: string, fn: () => Promise<T>, onSuccess?: () => void) {
    if (!signer) return toast.error("Connect wallet");
    try {
      toast.loading("Confirm in wallet...", { id: label });
      await fn();
      toast.success("Success!", { id: label });
      onSuccess?.();
    } catch (e: any) { toast.error(e?.shortMessage ?? e?.message ?? "Failed", { id: label }); }
  }

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!nft) return <div className="text-center py-20">NFT not found</div>;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/marketplace"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace</Link></Button>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="glass rounded-3xl overflow-hidden glow-card">
          {nft.image ? <img src={nft.image} alt={nft.name} className="w-full aspect-square object-cover" />
            : <div className="aspect-square flex items-center justify-center text-9xl">🌸</div>}
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">Token #{nft.tokenId.toString()}</p>
            <h1 className="text-4xl font-bold gradient-text">{nft.name}</h1>
            <p className="text-muted-foreground mt-2">{nft.description || "No description."}</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Eye className="w-3 h-3" /> {viewCount} views
              </div>
              <LikeButton tokenId={nft.tokenId} />
            </div>
          </div>
          <div className="glass rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="font-mono">{shortAddr(nft.owner)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Collection</span><span>SakuraNFT</span></div>
            {listing && <div className="flex justify-between"><span className="text-muted-foreground">Current Price</span><span className="font-bold text-primary">{listing.priceEth} {CHAIN.symbol}</span></div>}
          </div>

          {listing && !isOwner && (
            <Button size="lg" className="w-full rounded-full shadow-lg" onClick={() => wrap("buy",
              () => buyNFT(signer, listing.listingId, listing.price),
              () => pushNotification(listing.seller, "sale", "🎉 Your NFT was sold!", `${nft.name} sold for ${listing.priceEth} ${CHAIN.symbol}`, nft.tokenId, `/marketplace/${id}`),
            )}>
              <ShoppingCart className="w-4 h-4 mr-2" /> Buy Now for {listing.priceEth} {CHAIN.symbol}
            </Button>
          )}
          {listing && isOwner && (
            <Button size="lg" variant="outline" className="w-full" onClick={() => wrap("cancel", () => cancelListing(signer, listing.listingId))}>
              <X className="w-4 h-4 mr-2" /> Cancel Listing
            </Button>
          )}
          {!listing && isOwner && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium">List this NFT for sale</p>
              <div className="flex gap-2">
                <Input type="number" step="0.001" placeholder={`Price in ${CHAIN.symbol}`} value={listPrice} onChange={(e) => setListPrice(e.target.value)} />
                <Button onClick={() => wrap("list", () => listNFT(signer, nft.tokenId, listPrice))} disabled={!listPrice}>
                  <Tag className="w-4 h-4 mr-2" /> List
                </Button>
              </div>
            </div>
          )}
          {!isOwner && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium">Make an offer</p>
              <div className="flex gap-2">
                <Input type="number" step="0.001" placeholder={`Offer in ${CHAIN.symbol}`} value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} />
                <Button variant="secondary" onClick={() => wrap("offer",
                  () => makeOffer(signer, nft.tokenId, offerPrice),
                  () => pushNotification(nft.owner, "offer", "💎 New offer received", `${offerPrice} ${CHAIN.symbol} offered on ${nft.name}`, nft.tokenId, `/marketplace/${id}`),
                )} disabled={!offerPrice}>
                  <Send className="w-4 h-4 mr-2" /> Offer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="offers" className="mt-8">
        <TabsList className="glass">
          <TabsTrigger value="offers">Offers ({offers.filter((o) => o.active).length})</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>
        <TabsContent value="offers" className="glass rounded-2xl p-4">
          {offers.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No offers yet.</p> : (
            <div className="space-y-2">
              {offers.map((o) => (
                <div key={o.idx} className={`flex items-center justify-between p-3 rounded-xl border ${o.active ? "" : "opacity-50"}`}>
                  <div>
                    <p className="font-mono text-sm">{shortAddr(o.offerer)}</p>
                    <p className="text-xs text-muted-foreground">{o.active ? "Active" : "Inactive"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{o.valueEth} {CHAIN.symbol}</span>
                    {o.active && isOwner && <Button size="sm" onClick={() => wrap("acc",
                      () => acceptOffer(signer, nft.tokenId, o.idx),
                      () => pushNotification(o.offerer, "offer_accepted", "✅ Offer accepted!", `Your offer of ${o.valueEth} ${CHAIN.symbol} on ${nft.name} was accepted`, nft.tokenId, `/marketplace/${id}`),
                    )}><Check className="w-3 h-3 mr-1" /> Accept</Button>}
                    {o.active && address?.toLowerCase() === o.offerer.toLowerCase() && (
                      <Button size="sm" variant="outline" onClick={() => wrap("co", () => cancelOffer(signer, nft.tokenId, o.idx))}><X className="w-3 h-3" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="comments" className="glass rounded-2xl p-4">
          <CommentsPanel tokenId={nft.tokenId} />
        </TabsContent>
        <TabsContent value="history" className="glass rounded-2xl p-4">
          <p className="text-sm text-muted-foreground text-center py-6">Browse full chain history on <a className="text-primary underline" target="_blank" rel="noopener" href={`${CHAIN.explorer}/token/${nft.owner}`}>Block Explorer</a>.</p>
        </TabsContent>
        <TabsContent value="metadata" className="glass rounded-2xl p-4">
          <pre className="text-xs overflow-auto max-h-64">{JSON.stringify({ tokenId: id, name: nft.name, description: nft.description, owner: nft.owner }, null, 2)}</pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}
