import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useAllListings, useAllNFTs } from "@/lib/web3/hooks";
import { NFTCard } from "@/components/NFTCard";
import { useWallet } from "@/contexts/WalletContext";
import { useWatchlist } from "@/lib/supabase-hooks";

export const Route = createFileRoute("/watchlist")({
  component: Watchlist,
  head: () => ({ meta: [{ title: "Watchlist — SakuraNFT" }] }),
});

function Watchlist() {
  const { address } = useWallet();
  const { nfts } = useAllNFTs();
  const { listings } = useAllListings();
  const { items } = useWatchlist(address);
  const set = new Set(items);
  const list = nfts.filter((n) => set.has(n.tokenId.toString()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold gradient-text flex items-center gap-3"><Heart className="w-9 h-9 fill-primary" /> Watchlist</h1>
        <p className="text-muted-foreground mt-1">NFTs you're tracking — synced across devices.</p>
      </div>
      {!address ? (
        <div className="text-center py-20 glass rounded-2xl text-muted-foreground">Connect your wallet to view your watchlist.</div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl text-muted-foreground">Your watchlist is empty. Tap the heart icon on any NFT to add it.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map((n) => <NFTCard key={n.tokenId.toString()} nft={n} listing={listings.find((l) => l.tokenId === n.tokenId)} />)}
        </div>
      )}
    </div>
  );
}
