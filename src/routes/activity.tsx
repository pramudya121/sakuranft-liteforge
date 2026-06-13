import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ArrowLeftRight, Tag, Sparkles, Send, ShoppingCart, ExternalLink, Eye, Check, X, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CONTRACTS, MARKETPLACE_ABI, NFT_ABI, OFFER_ABI, CHAIN } from "@/lib/web3/contracts";
import { readProvider, shortAddr, buyNFT, makeOffer, acceptOffer, cancelOffer, nftRead, decodeTokenUri } from "@/lib/web3/ethers";
import { useWallet } from "@/contexts/WalletContext";
import { supabase } from "@/integrations/supabase/client";
import { pushNotification } from "@/lib/supabase-hooks";
import { toast } from "sonner";

export const Route = createFileRoute("/activity")({
  component: ActivityPage,
  head: () => ({
    meta: [
      { title: "Live Activity — SakuraNFT" },
      { name: "description", content: "Real-time NFT marketplace activity on LitVM: sales, listings, mints and offers — with one-tap Buy and Offer." },
    ],
    links: [{ rel: "canonical", href: "https://sakura-bloom-forge.lovable.app/activity" }],
  }),
});

type EvtKind = "Sale" | "Listing" | "Mint" | "Offer";
type Evt = {
  kind: EvtKind;
  blockNumber: number;
  tx: string;
  tokenId?: bigint;
  // sale / listing
  listingId?: bigint;
  priceWei?: bigint;
  priceEth?: string;
  seller?: string;
  buyer?: string;
  to?: string;
  offerer?: string;
  // image preview cache
  image?: string;
  name?: string;
};

type DBOffer = {
  id: string;
  token_id: number;
  bidder_address: string;
  owner_address: string | null;
  amount_eth: number;
  message: string | null;
  status: string;
  created_at: string;
};

const ICONS: Record<EvtKind, any> = { Sale: ArrowLeftRight, Listing: Tag, Mint: Sparkles, Offer: Send };
const COLORS: Record<EvtKind, string> = {
  Sale: "text-green-500 bg-green-500/10",
  Listing: "text-blue-500 bg-blue-500/10",
  Mint: "text-primary bg-primary/10",
  Offer: "text-orange-500 bg-orange-500/10",
};

function ActivityPage() {
  const { signer, address } = useWallet();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Evt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"all" | "sales" | "listings" | "mints" | "offers" | "inbox">("all");
  const [offerOpen, setOfferOpen] = useState<Evt | null>(null);
  const [offerAmt, setOfferAmt] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inbox, setInbox] = useState<DBOffer[]>([]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const block = await readProvider.getBlockNumber();
      const from = Math.max(0, block - 50000);
      const mp = new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
      const nft = new Contract(CONTRACTS.nftCollection, NFT_ABI, readProvider);
      const off = new Contract(CONTRACTS.offer, OFFER_ABI, readProvider);
      const [sold, listed, minted, offered] = await Promise.all([
        mp.queryFilter(mp.filters.Sold(), from).catch(() => []),
        mp.queryFilter(mp.filters.Listed(), from).catch(() => []),
        nft.queryFilter(nft.filters.Minted(), from).catch(() => []),
        off.queryFilter(off.filters.OfferMade(), from).catch(() => []),
      ]);

      const soldEvents: Evt[] = await Promise.all(
        sold.map(async (e: any) => {
          let tokenId: bigint | undefined;
          let seller: string | undefined;
          try {
            const l = await mp.listings(e.args.listingId);
            tokenId = l[2] as bigint;
            seller = String(l[0]);
          } catch {}
          return {
            kind: "Sale", blockNumber: e.blockNumber, tx: e.transactionHash,
            listingId: e.args.listingId as bigint, priceWei: e.args.price as bigint,
            priceEth: formatEther(e.args.price), buyer: e.args.buyer, tokenId, seller,
          };
        }),
      );

      const all: Evt[] = [
        ...soldEvents,
        ...listed.map((e: any) => ({
          kind: "Listing" as EvtKind, blockNumber: e.blockNumber, tx: e.transactionHash,
          listingId: e.args.listingId as bigint, tokenId: e.args.tokenId as bigint,
          priceWei: e.args.price as bigint, priceEth: formatEther(e.args.price), seller: e.args.seller,
        })),
        ...minted.map((e: any) => ({
          kind: "Mint" as EvtKind, blockNumber: e.blockNumber, tx: e.transactionHash,
          tokenId: e.args.tokenId as bigint, to: e.args.to,
        })),
        ...offered.map((e: any) => ({
          kind: "Offer" as EvtKind, blockNumber: e.blockNumber, tx: e.transactionHash,
          tokenId: e.args.tokenId as bigint, priceWei: e.args.value as bigint,
          priceEth: formatEther(e.args.value), offerer: e.args.offerer,
        })),
      ].sort((a, b) => b.blockNumber - a.blockNumber).slice(0, 80);

      // Fetch image previews for unique tokenIds (parallel, capped)
      const unique = Array.from(new Set(all.filter((e) => e.tokenId !== undefined).map((e) => e.tokenId!.toString()))).slice(0, 40);
      const meta = new Map<string, { image?: string; name?: string }>();
      await Promise.all(unique.map(async (idStr) => {
        try {
          const uri = await nftRead().tokenURI(BigInt(idStr));
          const m = decodeTokenUri(uri) ?? {};
          meta.set(idStr, { image: m.image, name: m.name });
        } catch {}
      }));
      setEvents(all.map((e) => e.tokenId !== undefined ? { ...e, ...(meta.get(e.tokenId.toString()) ?? {}) } : e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadInbox = useCallback(async () => {
    if (!address) { setInbox([]); return; }
    const { data } = await supabase
      .from("nft_offers")
      .select("*")
      .eq("owner_address", address.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(50);
    setInbox((data ?? []) as DBOffer[]);
  }, [address]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadInbox(); }, [loadInbox]);

  // Realtime: re-fetch when offers DB changes for me
  useEffect(() => {
    if (!address) return;
    const ch = supabase
      .channel(`inbox-${address}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "nft_offers", filter: `owner_address=eq.${address.toLowerCase()}` }, () => loadInbox())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [address, loadInbox]);

  // Live on-chain refresh every 30s
  useEffect(() => {
    const t = setInterval(() => load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function wrap(id: string, fn: () => Promise<any>, after?: () => void | Promise<void>): Promise<void> {
    if (!signer) { toast.error("Connect wallet first"); return; }
    setBusyId(id);
    try {
      toast.loading("Confirm in wallet...", { id });
      await fn();
      toast.success("Success!", { id });
      await after?.();
      await load();
      await loadInbox();
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Failed", { id });
    } finally { setBusyId(null); }
  }

  const filtered = useMemo(() => {
    if (tab === "all") return events;
    const map: Record<string, EvtKind> = { sales: "Sale", listings: "Listing", mints: "Mint", offers: "Offer" };
    const kind = map[tab];
    return kind ? events.filter((e) => e.kind === kind) : events;
  }, [events, tab]);

  const stats = useMemo(() => ({
    sales: events.filter((e) => e.kind === "Sale").length,
    listings: events.filter((e) => e.kind === "Listing").length,
    mints: events.filter((e) => e.kind === "Mint").length,
    offers: events.filter((e) => e.kind === "Offer").length,
  }), [events]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Live Activity</h1>
          <p className="text-muted-foreground mt-1">Real-time marketplace events with quick Buy & Offer actions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={refreshing} className="rounded-full">
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Sales" value={stats.sales} color="text-green-500" />
        <StatCard label="Listings" value={stats.listings} color="text-blue-500" />
        <StatCard label="Mints" value={stats.mints} color="text-primary" />
        <StatCard label="Offers" value={stats.offers} color="text-orange-500" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="glass flex flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="mints">Mints</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          {address && <TabsTrigger value="inbox">My Inbox {inbox.filter((o) => o.status === "active").length > 0 && <span className="ml-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">{inbox.filter((o) => o.status === "active").length}</span>}</TabsTrigger>}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {tab === "inbox" ? (
            <InboxList inbox={inbox} busyId={busyId} wrap={wrap} address={address} />
          ) : loading ? (
            <div className="glass rounded-2xl p-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading on-chain activity…</div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-muted-foreground">🌸 No activity yet.</div>
          ) : (
            <div className="glass rounded-2xl divide-y divide-border/50">
              {filtered.map((e, i) => (
                <EventRow
                  key={`${e.tx}-${i}`}
                  e={e}
                  address={address}
                  busy={busyId === `${e.tx}-${i}`}
                  onBuy={(ev) => wrap(`${e.tx}-${i}`,
                    () => buyNFT(signer, ev.listingId!, ev.priceWei!),
                    async () => {
                      if (ev.seller && ev.tokenId !== undefined) {
                        await pushNotification(ev.seller, "sale", "🎉 Your NFT was sold!", `Sold for ${ev.priceEth} ${CHAIN.symbol}`, ev.tokenId, `/marketplace/${ev.tokenId}`);
                      }
                    },
                  )}
                  onOffer={(ev) => { setOfferOpen(ev); setOfferAmt(""); }}
                  onView={(ev) => navigate({ to: "/marketplace/$id", params: { id: ev.tokenId!.toString() } })}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Offer Dialog */}
      <Dialog open={!!offerOpen} onOpenChange={(o) => !o && setOfferOpen(null)}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle className="gradient-text">Make an offer</DialogTitle>
          </DialogHeader>
          {offerOpen && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {offerOpen.image ? <img src={offerOpen.image} alt="" className="w-14 h-14 rounded-lg object-cover" loading="lazy" decoding="async" /> : <div className="w-14 h-14 rounded-lg bg-accent/40 flex items-center justify-center">🌸</div>}
                <div>
                  <p className="font-bold">{offerOpen.name ?? `NFT #${offerOpen.tokenId}`}</p>
                  <p className="text-xs text-muted-foreground">#{offerOpen.tokenId?.toString()}</p>
                </div>
              </div>
              <Input type="number" step="0.001" placeholder={`Offer in ${CHAIN.symbol}`} value={offerAmt} onChange={(e) => setOfferAmt(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setOfferOpen(null)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground"
                  disabled={!offerAmt || busyId === "offer-dialog"}
                  onClick={() => {
                    const ev = offerOpen;
                    const amt = offerAmt;
                    wrap("offer-dialog",
                      async () => {
                        await makeOffer(signer, ev.tokenId!, amt);
                        // Record in DB for inbox
                        let owner: string | null = null;
                        try { owner = String(await nftRead().ownerOf(ev.tokenId!)).toLowerCase(); } catch {}
                        await supabase.from("nft_offers").insert({
                          token_id: Number(ev.tokenId!),
                          bidder_address: address!.toLowerCase(),
                          owner_address: owner,
                          amount_eth: Number(amt),
                          status: "active",
                        });
                        if (owner && owner !== address!.toLowerCase()) {
                          await pushNotification(owner, "offer", "💎 New offer received", `${amt} ${CHAIN.symbol} offered on ${ev.name ?? `NFT #${ev.tokenId}`}`, ev.tokenId, `/marketplace/${ev.tokenId}`);
                        }
                        setOfferOpen(null);
                      },
                    );
                  }}
                >
                  <Send className="w-4 h-4 mr-1" /> Send Offer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label} (last 50k blocks)</p>
    </div>
  );
}

function EventRow({
  e, address, busy, onBuy, onOffer, onView,
}: {
  e: Evt; address: string | null; busy: boolean;
  onBuy: (e: Evt) => void; onOffer: (e: Evt) => void; onView: (e: Evt) => void;
}) {
  const Icon = ICONS[e.kind];
  const isOwnerSeller = address && e.seller && address.toLowerCase() === e.seller.toLowerCase();
  const canBuy = e.kind === "Listing" && e.listingId !== undefined && !isOwnerSeller;
  const canOffer = e.tokenId !== undefined && (e.kind === "Mint" || e.kind === "Listing");

  const headline =
    e.kind === "Sale" ? `Sold for ${e.priceEth} ${CHAIN.symbol} to ${shortAddr(e.buyer ?? "")}` :
    e.kind === "Listing" ? `Listed for ${e.priceEth} ${CHAIN.symbol} by ${shortAddr(e.seller ?? "")}` :
    e.kind === "Mint" ? `Minted to ${shortAddr(e.to ?? "")}` :
    `Offer ${e.priceEth} ${CHAIN.symbol} by ${shortAddr(e.offerer ?? "")}`;

  return (
    <div className="p-3 sm:p-4 flex items-center gap-3 hover:bg-accent/20 transition">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${COLORS[e.kind]}`}>
        <Icon className="w-4 h-4" />
      </div>
      {e.tokenId !== undefined ? (
        <Link to="/marketplace/$id" params={{ id: e.tokenId.toString() }} className="shrink-0">
          {e.image ? (
            <img src={e.image} alt="" className="w-12 h-12 rounded-lg object-cover ring-1 ring-border" loading="lazy" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">🌸</div>
          )}
        </Link>
      ) : <div className="w-12 h-12 rounded-lg bg-accent/20" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{e.kind}</span>
          {e.tokenId !== undefined && <span className="text-xs text-muted-foreground">#{e.tokenId.toString()} · {e.name ?? "NFT"}</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{headline}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {canBuy && (
          <Button size="sm" className="rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground h-8 px-3 text-xs" disabled={busy} onClick={() => onBuy(e)}>
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ShoppingCart className="w-3 h-3 mr-1" /> Buy</>}
          </Button>
        )}
        {canOffer && !isOwnerSeller && address && (
          <Button size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs" onClick={() => onOffer(e)}>
            <Send className="w-3 h-3 mr-1" /> Offer
          </Button>
        )}
        {e.tokenId !== undefined && (
          <Button size="sm" variant="ghost" className="rounded-full h-8 px-2" onClick={() => onView(e)} aria-label="View">
            <Eye className="w-3.5 h-3.5" />
          </Button>
        )}
        <a href={`${CHAIN.explorer}/tx/${e.tx}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary p-1" aria-label="View on explorer">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

function InboxList({
  inbox, busyId, wrap, address,
}: {
  inbox: DBOffer[]; busyId: string | null;
  wrap: (id: string, fn: () => Promise<any>, after?: () => void | Promise<void>) => Promise<void>;
  address: string | null;
}) {
  const formatOfferTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  if (!address) return <div className="glass rounded-2xl p-10 text-center text-muted-foreground">Connect wallet to view offers received on your NFTs.</div>;
  if (inbox.length === 0) return <div className="glass rounded-2xl p-10 text-center text-muted-foreground">📭 No offers received yet.</div>;

  return (
    <div className="glass rounded-2xl divide-y divide-border/50">
      {inbox.map((o) => {
        const id = `inbox-${o.id}`;
        return (
          <div key={o.id} className="p-4 flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center"><Send className="w-4 h-4" /></div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold text-sm">Offer on NFT #{o.token_id}</p>
              <p className="text-xs text-muted-foreground">{shortAddr(o.bidder_address)} · {formatOfferTime(o.created_at)}</p>
            </div>
            <span className="font-bold text-primary">{o.amount_eth} {CHAIN.symbol}</span>
            <span className={`text-[10px] uppercase rounded-full px-2 py-0.5 ${o.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{o.status}</span>
            <Button asChild size="sm" variant="ghost" className="h-8">
              <Link to="/marketplace/$id" params={{ id: String(o.token_id) }}>
                <Eye className="w-3.5 h-3.5 mr-1" /> View & Accept
              </Link>
            </Button>
            {o.status === "active" && o.bidder_address.toLowerCase() === address.toLowerCase() && (
              <Button size="sm" variant="outline" className="h-8" disabled={busyId === id}
                onClick={() => wrap(id, async () => {
                  await supabase.from("nft_offers").update({ status: "cancelled" }).eq("id", o.id);
                })}>
                <X className="w-3.5 h-3.5 mr-1" /> Withdraw
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
