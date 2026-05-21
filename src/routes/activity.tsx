import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ArrowLeftRight, Tag, Sparkles, Send } from "lucide-react";
import { CONTRACTS, MARKETPLACE_ABI, NFT_ABI, OFFER_ABI } from "@/lib/web3/contracts";
import { readProvider, shortAddr } from "@/lib/web3/ethers";

export const Route = createFileRoute("/activity")({
  component: ActivityPage,
  head: () => ({ meta: [{ title: "Activity — SakuraNFT" }] }),
});

type Evt = { kind: string; icon: any; color: string; text: string; blockNumber: number; tx: string };

function ActivityPage() {
  const [events, setEvents] = useState<Evt[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
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
        const all: Evt[] = [
          ...sold.map((e: any) => ({ kind: "Sale", icon: ArrowLeftRight, color: "text-green-500", text: `Sold for ${formatEther(e.args.price)} zkLTC to ${shortAddr(e.args.buyer)}`, blockNumber: e.blockNumber, tx: e.transactionHash })),
          ...listed.map((e: any) => ({ kind: "Listing", icon: Tag, color: "text-blue-500", text: `Listed #${e.args.tokenId} for ${formatEther(e.args.price)} zkLTC`, blockNumber: e.blockNumber, tx: e.transactionHash })),
          ...minted.map((e: any) => ({ kind: "Mint", icon: Sparkles, color: "text-primary", text: `Minted #${e.args.tokenId} to ${shortAddr(e.args.to)}`, blockNumber: e.blockNumber, tx: e.transactionHash })),
          ...offered.map((e: any) => ({ kind: "Offer", icon: Send, color: "text-orange-500", text: `Offer ${formatEther(e.args.value)} zkLTC on #${e.args.tokenId}`, blockNumber: e.blockNumber, tx: e.transactionHash })),
        ].sort((a, b) => b.blockNumber - a.blockNumber);
        setEvents(all);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold gradient-text">Live Activity</h1>
        <p className="text-muted-foreground mt-1">All marketplace events across the chain.</p>
      </div>
      <div className="glass rounded-2xl divide-y">
        {loading ? <p className="p-6 text-center text-muted-foreground">Loading activity...</p> :
          events.length === 0 ? <p className="p-6 text-center text-muted-foreground">No activity yet.</p> :
          events.map((e, i) => {
            const Icon = e.icon;
            return (
              <div key={i} className="p-4 flex items-center gap-4 hover:bg-accent/30 transition">
                <div className={`w-10 h-10 rounded-full bg-background flex items-center justify-center ${e.color}`}><Icon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{e.kind}</p>
                  <p className="text-sm text-muted-foreground truncate">{e.text}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">#{e.blockNumber}</span>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
