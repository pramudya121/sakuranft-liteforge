import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Tag, ShoppingCart, X, Send, Check, Eye, ArrowRightLeft, ImageOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNFT, useOffers, type NFTMeta } from "@/lib/web3/hooks";
import { useWallet } from "@/contexts/WalletContext";
import { acceptOffer, buyNFT, cancelListing, cancelOffer, listNFT, makeOffer, shortAddr, updateListingPrice, transferNFT, getMarketplaceFeeInfo, parseEther } from "@/lib/web3/ethers";
import { isAddress } from "ethers";
import { CHAIN } from "@/lib/web3/contracts";
import { toast } from "sonner";
import { useNFTViews, pushNotification } from "@/lib/supabase-hooks";
import { LikeButton, CommentsPanel } from "@/components/NFTSocial";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { useRealtimeListings, recordListing, markListingSold, cancelListing as cancelListingDB, updateListingPrice as updateListingPriceDB } from "@/lib/useRealtimeListings";

type NftAttribute = { trait_type: string; value: string | number | boolean };

/**
 * Resolve the rich metadata for a token. Prefers the top-level fields from
 * `decodeTokenUri` (modern mints) and falls back to JSON packed inside
 * `description` (legacy mints).
 */
function resolveMeta(nft: NFTMeta): { description: string; category?: string; attributes: NftAttribute[]; royalty_bps?: number } {
  const out = {
    description: (nft.description ?? "").trim(),
    category: nft.category,
    attributes: Array.isArray(nft.attributes) ? nft.attributes : [],
    royalty_bps: nft.royalty_bps,
  };
  if (out.description.startsWith("{") && out.description.endsWith("}")) {
    try {
      const obj = JSON.parse(out.description);
      if (obj && typeof obj === "object") {
        if (typeof obj.description === "string") out.description = obj.description;
        if (!out.category && typeof obj.category === "string") out.category = obj.category;
        if (out.attributes.length === 0 && Array.isArray(obj.attributes)) {
          out.attributes = obj.attributes
            .filter((a: any) => a && typeof a === "object" && "trait_type" in a)
            .map((a: any) => ({ trait_type: String(a.trait_type), value: a.value }));
        }
        if (out.royalty_bps == null && typeof obj.royalty_bps === "number") out.royalty_bps = obj.royalty_bps;
      }
    } catch { /* keep raw */ }
  }
  return out;
}

/**
 * Render light markdown: paragraphs, **bold**, *italic*, `code`, [text](url),
 * and line breaks. Sanitises by escaping HTML first and only allowing safe URL
 * schemes for links. Returns a fragment of React nodes.
 */
function renderLite(text: string): React.ReactNode {
  if (!text) return null;
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs.map((para, pi) => {
    // process inline: links → bold → italic → code
    let html = escapeHtml(para);
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) => {
      const safe = String(url).replace(/"/g, "%22");
      return `<a href="${safe}" target="_blank" rel="noreferrer" class="text-primary underline">${label}</a>`;
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(^|\W)\*([^*\n]+)\*(\W|$)/g, "$1<em>$2</em>$3");
    html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-xs">$1</code>');
    html = html.replace(/\n/g, "<br />");
    return (
      <p
        key={pi}
        className="text-muted-foreground leading-relaxed [&_a:hover]:text-primary [&>strong]:text-foreground"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });
}

export const Route = createFileRoute("/marketplace/$id")({
  component: NFTDetail,
  head: ({ params }) => {
    const title = `NFT #${params.id} — SakuraNFT`;
    const description = `View NFT #${params.id} on SakuraNFT: current listing price, offers, transfer history, and ownership details on the LitVM marketplace.`;
    const url = `https://sakura-bloom-forge.lovable.app/marketplace/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: `SakuraNFT #${params.id}`,
          url,
          category: "NFT",
          brand: { "@type": "Brand", name: "SakuraNFT" },
        }),
      }],
    };
  },
});

function NFTDetail() {
  const { id } = Route.useParams();
  const { nft, listing, loading, error, refetch: refetchNFT } = useNFT(id);
  const { offers } = useOffers(id);
  const { listings: dbActive, loading: listingsLoading, error: listingError } = useRealtimeListings({ status: "active", tokenId: id ? Number(id) : undefined });

  // Sync DB listing row for the current token (used for buy/cancel/sold transitions).
  async function syncListingSold() {
    const row = dbActive.find((d) => String(d.token_id) === String(id));
    if (row) { try { await markListingSold(row.id); } catch {} }
    refetchNFT();
  }
  async function syncListingCancelled() {
    const row = dbActive.find((d) => String(d.token_id) === String(id));
    if (row) { try { await cancelListingDB(row.id); } catch {} }
    refetchNFT();
  }
  async function syncListingPrice(newPriceEth: string) {
    const row = dbActive.find((d) => String(d.token_id) === String(id));
    if (row) { try { await updateListingPriceDB(row.id, parseEther(newPriceEth), newPriceEth); } catch {} }
    refetchNFT();
  }
  const { signer, address } = useWallet();
  const [listPrice, setListPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editing, setEditing] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [feeBps, setFeeBps] = useState<number | null>(null);
  const [imageBroken, setImageBroken] = useState(false);
  const { count: viewCount, increment } = useNFTViews(id);

  useEffect(() => { setImageBroken(false); }, [id, nft?.image]);
  useEffect(() => { increment(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  useEffect(() => { getMarketplaceFeeInfo().then((f) => setFeeBps(f.bps)).catch(() => {}); }, []);

  const meta = useMemo(() => (nft ? resolveMeta(nft) : null), [nft]);
  const liveListing = useMemo(() => {
    const row = dbActive.find((d) => String(d.token_id) === String(id));
    if (!row) return listing;
    return {
      listingId: row.listing_id != null ? BigInt(row.listing_id) : listing?.listingId ?? 0n,
      seller: row.seller,
      nft: listing?.nft ?? "",
      tokenId: BigInt(row.token_id),
      price: BigInt(row.price_wei || "0"),
      priceEth: String(row.price_eth),
      active: row.status === "active",
    };
  }, [dbActive, id, listing]);

  // When an NFT is listed, ownerOf() returns the marketplace escrow contract.
  // Use the listing.seller as the canonical owner for display & ownership checks.
  const effectiveOwner = liveListing?.seller || nft?.owner || "";
  const isOwner = address && nft && address.toLowerCase() === effectiveOwner.toLowerCase();
  const detailError = error || listingError;

  async function wrap<T>(label: string, fn: () => Promise<T>, onSuccess?: () => void) {
    if (!signer) return toast.error("Connect wallet");
    try {
      toast.loading("Confirm in wallet...", { id: label });
      await fn();
      toast.success("Success!", { id: label });
      onSuccess?.();
    } catch (e: any) { toast.error(e?.shortMessage ?? e?.message ?? "Failed", { id: label }); }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 rounded-lg bg-muted/40 animate-pulse" />
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="aspect-square rounded-3xl bg-gradient-to-br from-muted/40 to-muted/10 animate-pulse" />
          <div className="space-y-4">
            <div className="h-4 w-24 rounded bg-muted/40 animate-pulse" />
            <div className="h-10 w-2/3 rounded-lg bg-muted/40 animate-pulse" />
            <div className="space-y-2 pt-2">
              <div className="h-3 w-full rounded bg-muted/30 animate-pulse" />
              <div className="h-3 w-11/12 rounded bg-muted/30 animate-pulse" />
              <div className="h-3 w-9/12 rounded bg-muted/30 animate-pulse" />
              <div className="h-3 w-7/12 rounded bg-muted/30 animate-pulse" />
            </div>
            <div className="glass rounded-2xl p-4 space-y-3 mt-4">
              <div className="h-4 w-full rounded bg-muted/40 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted/30 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-muted/30 animate-pulse" />
            </div>
            <div className="h-12 rounded-full bg-muted/40 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  if (detailError && !nft) {
    return (
      <div className="space-y-4 text-center py-16">
        <h1 className="text-2xl font-semibold">Detail NFT gagal dimuat</h1>
        <p className="text-muted-foreground">{detailError}</p>
        <Button onClick={() => refetchNFT()}>Coba lagi</Button>
      </div>
    );
  }
  if (!nft) return <div className="text-center py-20">NFT not found</div>;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/marketplace"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace</Link></Button>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="glass rounded-3xl overflow-hidden glow-card relative">
          {nft.image && !imageBroken ? (
            <img
              src={nft.image}
              alt={nft.name}
              className="w-full aspect-square object-cover"
              loading="eager"
              decoding="async"
              onError={() => setImageBroken(true)}
            />
          ) : (
            <div className="aspect-square flex flex-col items-center justify-center gap-3 text-muted-foreground">
              {nft.image ? <ImageOff className="w-14 h-14" /> : <span className="text-9xl">🌸</span>}
              <p className="text-xs">{nft.image ? "Image failed to load" : "No artwork attached"}</p>
            </div>
          )}
          {meta?.category && (
            <span className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur px-3 py-1 text-xs font-medium border border-border">
              <Sparkles className="w-3 h-3 text-primary" /> {meta.category}
            </span>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">Token #{nft.tokenId.toString()}</p>
            <h1 className="text-4xl font-bold gradient-text">{nft.name || `NFT #${nft.tokenId.toString()}`}</h1>
            <div className="mt-3 space-y-3">
              {meta && meta.description.trim()
                ? renderLite(meta.description)
                : <p className="text-muted-foreground italic">No description provided.</p>}
            </div>
            {meta && meta.attributes.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Attributes</p>
                <TooltipProvider delayDuration={200}>
                  <div className="flex flex-wrap gap-2">
                    {meta.attributes.map((attr: NftAttribute, i: number) => {
                      const val = String(attr.value);
                      const long = val.length > 18 || attr.trait_type.length > 14;
                      const chip = (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs max-w-[16rem]">
                          <span className="text-muted-foreground truncate">{attr.trait_type}:</span>
                          <span className="font-medium text-foreground truncate">{val}</span>
                        </span>
                      );
                      return long ? (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>{chip}</TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs break-words">
                            <span className="font-semibold">{attr.trait_type}:</span> {val}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span key={i}>{chip}</span>
                      );
                    })}
                  </div>
                </TooltipProvider>
              </div>
            )}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Eye className="w-3 h-3" /> {viewCount} views
              </div>
              <LikeButton tokenId={nft.tokenId} />
              {meta?.royalty_bps != null && meta.royalty_bps > 0 && (
                <span className="text-[11px] text-muted-foreground">Royalty: {(meta.royalty_bps / 100).toFixed(2)}%</span>
              )}
            </div>
          </div>
          <div className="glass rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><Link to="/u/$address" params={{ address: effectiveOwner }} className="font-mono hover:text-primary">{shortAddr(effectiveOwner)}</Link></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Collection</span><span>SakuraNFT</span></div>
            {listing && <div className="flex justify-between"><span className="text-muted-foreground">Current Price</span><span className="font-bold text-primary">{listing.priceEth} {CHAIN.symbol}</span></div>}
            {listing && feeBps !== null && (
              <div className="flex justify-between"><span className="text-muted-foreground">Marketplace Fee</span><span>{(feeBps / 100).toFixed(2)}% · seller gets {(+listing.priceEth * (10000 - feeBps) / 10000).toFixed(4)} {CHAIN.symbol}</span></div>
            )}
          </div>

          {listing && !isOwner && (
            <Button size="lg" className="w-full rounded-full shadow-lg" onClick={() => wrap("buy",
              () => buyNFT(signer, listing.listingId, listing.price),
              async () => {
                await syncListingSold();
                await pushNotification(listing.seller, "sale", "🎉 Your NFT was sold!", `${nft.name} sold for ${listing.priceEth} ${CHAIN.symbol}`, nft.tokenId, `/marketplace/${id}`);
              },
            )}>
              <ShoppingCart className="w-4 h-4 mr-2" /> Buy Now for {listing.priceEth} {CHAIN.symbol}
            </Button>
          )}
          {listing && isOwner && (
            <div className="glass rounded-2xl p-4 space-y-3">
              {!editing ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setEditing(true); setEditPrice(listing.priceEth); }}>
                    <Tag className="w-4 h-4 mr-2" /> Edit Price
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => wrap("cancel", () => cancelListing(signer, listing.listingId), syncListingCancelled)}>
                    <X className="w-4 h-4 mr-2" /> Cancel Listing
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Update listing price</p>
                  <div className="flex gap-2">
                    <Input type="number" step="0.001" placeholder={`New price in ${CHAIN.symbol}`} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                    <Button
                      onClick={async () => {
                        if (!signer || !editPrice) return;
                        const prevPrice = listing.priceEth;
                        // Optimistic: push new price to DB immediately so the marketplace
                        // grid & this page reflect the change before chain confirmation.
                        try { await syncListingPrice(editPrice); } catch {}
                        setEditing(false);
                        toast.loading("Confirm price update in wallet…", { id: "upd" });
                        try {
                          await updateListingPrice(signer, listing.listingId, editPrice);
                          toast.success("Price updated ✓", { id: "upd" });
                          refetchNFT();
                        } catch (e: any) {
                          // Revert DB row if the on-chain tx failed/was rejected.
                          try { await syncListingPrice(prevPrice); } catch {}
                          refetchNFT();
                          toast.error(e?.shortMessage ?? e?.message ?? "Update failed", { id: "upd" });
                        }
                      }}
                      disabled={!editPrice}
                    >Save</Button>
                    <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {isOwner && !listing && (
            <div className="glass rounded-2xl p-4 space-y-3">
              {!showTransfer ? (
                <Button variant="outline" className="w-full" onClick={() => setShowTransfer(true)}>
                  <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfer NFT to another wallet
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Send this NFT</p>
                  <div className="flex gap-2">
                    <Input placeholder="Recipient 0x address" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} />
                    <Button onClick={() => {
                      if (!isAddress(transferTo)) return toast.error("Invalid address");
                      wrap("xfer",
                        () => transferNFT(signer, transferTo, nft.tokenId),
                        () => { setShowTransfer(false); setTransferTo(""); refetchNFT(); });
                    }} disabled={!transferTo}>Send</Button>
                    <Button variant="ghost" onClick={() => setShowTransfer(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {!listing && isOwner && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium">List this NFT for sale</p>
              <div className="flex gap-2">
                <Input type="number" step="0.001" placeholder={`Price in ${CHAIN.symbol}`} value={listPrice} onChange={(e) => setListPrice(e.target.value)} />
                <Button onClick={() => wrap("list",
                  () => listNFT(signer, nft.tokenId, listPrice),
                  async () => {
                    try {
                      await recordListing({ tokenId: nft.tokenId, seller: nft.owner, priceWei: parseEther(listPrice), priceEth: listPrice });
                    } catch {}
                    setListPrice("");
                  },
                )} disabled={!listPrice}>
                  <Tag className="w-4 h-4 mr-2" /> List
                </Button>
              </div>
            </div>
          )}
          {!isOwner && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium">Make an offer</p>
              <div className="flex gap-2">
                <Input id="make-offer-input" type="number" step="0.001" placeholder={`Offer in ${CHAIN.symbol}`} value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} />
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

      <Tabs defaultValue="history" className="mt-8">
        <TabsList className="glass">
          <TabsTrigger value="history">Price History</TabsTrigger>
          <TabsTrigger value="offers">Offers ({offers.filter((o) => o.active).length})</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>
        <TabsContent value="history" className="glass rounded-2xl p-4">
          <PriceHistoryChart tokenId={nft.tokenId} />
        </TabsContent>
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
                      async () => {
                        await syncListingSold();
                        await pushNotification(o.offerer, "offer_accepted", "✅ Offer accepted!", `Your offer of ${o.valueEth} ${CHAIN.symbol} on ${nft.name} was accepted`, nft.tokenId, `/marketplace/${id}`);
                      },
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
        <TabsContent value="metadata" className="glass rounded-2xl p-4">
          <pre className="text-xs overflow-auto max-h-64">{JSON.stringify({
            tokenId: id,
            name: nft.name,
            description: meta?.description ?? "",
            image: nft.image,
            owner: nft.owner,
            category: meta?.category,
            attributes: meta?.attributes,
            royalty_bps: meta?.royalty_bps,
          }, null, 2)}</pre>
        </TabsContent>
      </Tabs>

      {/* Sticky mobile/scroll action bar: stays visible so Buy/Offer is always one tap away */}
      {(listing || !isOwner) && (
        <div className="lg:hidden sticky bottom-2 z-40">
          <div className="glass rounded-2xl border border-border/60 p-3 flex items-center gap-3 shadow-2xl backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground truncate">{nft.name}</p>
              {listing
                ? <p className="font-bold text-primary truncate">{listing.priceEth} {CHAIN.symbol}</p>
                : <p className="text-xs text-muted-foreground">Not listed</p>}
            </div>
            {listing && !isOwner && (
              <Button size="sm" className="rounded-full" onClick={() => wrap("buy",
                () => buyNFT(signer, listing.listingId, listing.price),
                async () => {
                  await syncListingSold();
                  await pushNotification(listing.seller, "sale", "🎉 Your NFT was sold!", `${nft.name} sold for ${listing.priceEth} ${CHAIN.symbol}`, nft.tokenId, `/marketplace/${id}`);
                },
              )}>
                <ShoppingCart className="w-4 h-4 mr-1" /> Buy
              </Button>
            )}
            {!isOwner && (
              <Button size="sm" variant="secondary" className="rounded-full" onClick={() => {
                document.getElementById("make-offer-input")?.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => document.getElementById("make-offer-input")?.focus(), 350);
              }}>
                <Send className="w-4 h-4 mr-1" /> Offer
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
