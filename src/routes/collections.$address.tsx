import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllNFTs, useAllListings } from "@/lib/web3/hooks";
import { NFTCard } from "@/components/NFTCard";
import { CHAIN, CONTRACTS } from "@/lib/web3/contracts";
import { useWallet } from "@/contexts/WalletContext";
import { buyNFT, shortAddr } from "@/lib/web3/ethers";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/collections/$address")({
  component: CollectionDetail,
  head: ({ params }) => ({ meta: [
    { title: `Collection ${shortAddr(params.address)} — SakuraNFT` },
    { name: "description", content: "Explore items, owners and floor price for this NFT collection on LitVM." },
  ] }),
});

type Collection = {
  id: string;
  contract_address: string;
  name: string | null;
  description: string | null;
  banner_url: string | null;
  logo_url: string | null;
  verified: boolean;
};

function CollectionDetail() {
  const { address } = Route.useParams();
  const addrLower = address.toLowerCase();
  const [meta, setMeta] = useState<Collection | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"items" | "owners">("items");
  const { nfts, loading } = useAllNFTs();
  const { listings } = useAllListings();
  const { signer } = useWallet();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("collections_metadata")
        .select("*")
        .ilike("contract_address", address)
        .maybeSingle();
      setMeta((data as Collection) ?? null);
      setLoadingMeta(false);
    })();
  }, [address]);

  // Only one on-chain NFT contract for now; if address matches it we show all NFTs, else empty.
  const isPrimary = addrLower === CONTRACTS.nftCollection.toLowerCase();

  const items = useMemo(() => {
    if (!isPrimary) return [];
    let arr = nfts.map((n) => ({ nft: n, listing: listings.find((l) => l.tokenId === n.tokenId) }));
    if (search) arr = arr.filter((x) => x.nft.name.toLowerCase().includes(search.toLowerCase()) || x.nft.tokenId.toString().includes(search));
    return arr;
  }, [nfts, listings, search, isPrimary]);

  const stats = useMemo(() => {
    const listed = listings.length;
    const floor = listings.length ? Math.min(...listings.map((l) => +l.priceEth)) : 0;
    const volume = listings.reduce((s, l) => s + +l.priceEth, 0);
    const owners = new Set(nfts.map((n) => n.owner.toLowerCase())).size;
    return { listed, floor, volume, owners, total: nfts.length };
  }, [nfts, listings]);

  const topOwners = useMemo(() => {
    const map = new Map<string, number>();
    nfts.forEach((n) => map.set(n.owner.toLowerCase(), (map.get(n.owner.toLowerCase()) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [nfts]);

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

  function copyAddr() {
    navigator.clipboard.writeText(address);
    toast.success("Address copied");
  }

  return (
    <div className="space-y-6">
      <Link to="/collections" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Back to Collections
      </Link>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="h-44 md:h-56 bg-gradient-to-br from-primary/30 to-accent/30 relative">
          {meta?.banner_url && <img src={meta.banner_url} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="p-6 -mt-12 relative">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="w-24 h-24 rounded-2xl bg-background border-4 border-background overflow-hidden shadow-lg shrink-0">
              {meta?.logo_url ? <img src={meta.logo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">🌸</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold truncate">{meta?.name ?? (isPrimary ? "Sakura Genesis" : "Unknown Collection")}</h1>
                {meta?.verified && <BadgeCheck className="w-5 h-5 text-primary" />}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{meta?.description ?? "No description provided."}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="font-mono">{shortAddr(address)}</span>
                <button onClick={copyAddr} className="hover:text-primary"><Copy className="w-3 h-3" /></button>
                <a href={`${CHAIN.explorer}/address/${address}`} target="_blank" rel="noreferrer" className="hover:text-primary inline-flex items-center gap-1">
                  Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            <Stat label="Items" value={stats.total.toString()} />
            <Stat label="Owners" value={stats.owners.toString()} />
            <Stat label="Listed" value={stats.listed.toString()} />
            <Stat label={`Floor`} value={stats.floor ? `${stats.floor.toFixed(3)} ${CHAIN.symbol}` : "—"} />
            <Stat label={`Listed Vol.`} value={`${stats.volume.toFixed(2)} ${CHAIN.symbol}`} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border">
        <TabBtn active={tab === "items"} onClick={() => setTab("items")}>Items ({stats.total})</TabBtn>
        <TabBtn active={tab === "owners"} onClick={() => setTab("owners")}>Owners ({stats.owners})</TabBtn>
      </div>

      {tab === "items" && (
        <>
          <Input placeholder="Search by name or token ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          {!isPrimary ? (
            <div className="text-center py-20 glass rounded-2xl text-muted-foreground">
              This collection contract is not indexed on-chain yet.
            </div>
          ) : loading || loadingMeta ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square glass rounded-2xl animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 glass rounded-2xl">
              <p className="text-muted-foreground">No items found. <Link to="/mint" className="text-primary underline">Mint the first one</Link>.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(({ nft, listing }) => (
                <NFTCard key={nft.tokenId.toString()} nft={nft} listing={listing}
                  onBuy={listing ? () => handleBuy(listing.listingId, listing.price) : undefined} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "owners" && (
        <div className="glass rounded-2xl divide-y divide-border">
          {topOwners.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No owners yet.</div>
          ) : topOwners.map(([addr, count], i) => (
            <Link key={addr} to="/u/$address" params={{ address: addr }} className="flex items-center justify-between p-4 hover:bg-primary/5 transition">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground w-6 text-sm">{i + 1}</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent" />
                <span className="font-mono text-sm">{shortAddr(addr)}</span>
              </div>
              <div className="text-sm"><b>{count}</b> <span className="text-muted-foreground">items · {((count / Math.max(1, stats.total)) * 100).toFixed(1)}%</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/40 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-bold text-primary truncate">{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}