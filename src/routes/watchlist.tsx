import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useAllListings, useAllNFTs, useLocalStorage } from "@/lib/web3/hooks";
import { NFTCard } from "@/components/NFTCard";

export const Route = createFileRoute("/watchlist")({
  component: Watchlist,
  head: () => ({ meta: [{ title: "Watchlist — SakuraNFT" }] }),
});

function Watchlist() {
  const { nfts } = useAllNFTs();
  const { listings } = useAllListings();
  const [watch] = useLocalStorage<string[]>("watchlist", []);
  const items = nfts.filter((n) => watch.includes(n.tokenId.toString()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold gradient-text flex items-center gap-3"><Heart className="w-9 h-9 fill-primary" /> Watchlist</h1>
        <p className="text-muted-foreground mt-1">NFTs you're tracking. Get notified when prices change.</p>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl text-muted-foreground">Your watchlist is empty. Tap the heart icon on any NFT to add it.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((n) => <NFTCard key={n.tokenId.toString()} nft={n} listing={listings.find((l) => l.tokenId === n.tokenId)} />)}
        </div>
      )}
    </div>
  );
}
