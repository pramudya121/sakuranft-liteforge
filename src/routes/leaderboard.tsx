import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Trophy, Award, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAllListings, useAllNFTs } from "@/lib/web3/hooks";
import { shortAddr } from "@/lib/web3/ethers";
import { CHAIN } from "@/lib/web3/contracts";

export const Route = createFileRoute("/leaderboard")({
  component: Leaderboard,
  head: () => ({
    meta: [
      { title: "Leaderboard — Top Collectors & Sellers on SakuraNFT" },
      { name: "description", content: "See the top SakuraNFT collectors, sellers, and traders on LitVM. Live rankings by NFTs owned, listings, and zkLTC volume." },
      { property: "og:title", content: "Top Collectors & Sellers — SakuraNFT Leaderboard" },
      { property: "og:description", content: "Live rankings of the most active collectors, sellers, and traders on SakuraNFT." },
      { property: "og:url", content: "https://sakuranft.lovable.app/leaderboard" },
      { name: "twitter:title", content: "SakuraNFT Leaderboard" },
      { name: "twitter:description", content: "Top collectors, sellers, and traders on LitVM." },
    ],
    links: [{ rel: "canonical", href: "https://sakuranft.lovable.app/leaderboard" }],
  }),
});

function Leaderboard() {
  const { nfts } = useAllNFTs();
  const { listings } = useAllListings();
  const [search, setSearch] = useState("");

  const collectors = useMemo(() => {
    const map = new Map<string, number>();
    nfts.forEach((n) => map.set(n.owner, (map.get(n.owner) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [nfts]);

  const sellers = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    listings.forEach((l) => {
      const r = map.get(l.seller) ?? { count: 0, total: 0 };
      map.set(l.seller, { count: r.count + 1, total: r.total + +l.priceEth });
    });
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [listings]);

  const valuable = useMemo(() => {
    return [...listings].sort((a, b) => +b.priceEth - +a.priceEth).slice(0, 50);
  }, [listings]);

  const filter = <T extends { 0?: string } | any>(arr: any[]) => arr.filter((x) =>
    !search || (Array.isArray(x) ? x[0] : (x.seller ?? x.tokenId.toString())).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold gradient-text flex items-center gap-3"><Trophy className="w-9 h-9" /> Leaderboard</h1>
        <p className="text-muted-foreground mt-1">Top collectors, sellers, and most valuable NFTs.</p>
      </div>
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search address or token..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Tabs defaultValue="collectors">
        <TabsList className="glass">
          <TabsTrigger value="collectors"><Crown className="w-4 h-4 mr-2" /> Top Collectors</TabsTrigger>
          <TabsTrigger value="sellers"><Award className="w-4 h-4 mr-2" /> Top Sellers</TabsTrigger>
          <TabsTrigger value="valuable"><Trophy className="w-4 h-4 mr-2" /> Most Valuable</TabsTrigger>
        </TabsList>
        <TabsContent value="collectors" className="glass rounded-2xl divide-y mt-4">
          {filter(collectors).map(([addr, count], i) => (
            <Row key={addr} rank={i + 1} address={addr} value={`${count} NFTs`} />
          ))}
        </TabsContent>
        <TabsContent value="sellers" className="glass rounded-2xl divide-y mt-4">
          {filter(sellers).map(([addr, data], i) => (
            <Row key={addr} rank={i + 1} address={addr} value={`${data.total.toFixed(4)} ${CHAIN.symbol} listed`} sub={`${data.count} listings`} />
          ))}
        </TabsContent>
        <TabsContent value="valuable" className="glass rounded-2xl divide-y mt-4">
          {filter(valuable).map((l, i) => (
            <Row key={l.listingId.toString()} rank={i + 1} address={`Token #${l.tokenId.toString()}`} value={`${l.priceEth} ${CHAIN.symbol}`} sub={shortAddr(l.seller)} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ rank, address, value, sub }: { rank: number; address: string; value: string; sub?: string }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const isAddr = address.startsWith("0x");
  const content = (
    <div className="p-4 flex items-center gap-4 hover:bg-accent/30 transition">
      <div className="w-12 text-center text-xl font-bold">{medal}</div>
      <div className="flex-1 min-w-0">
        <p className="font-mono truncate">{isAddr ? shortAddr(address) : address}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <span className="font-bold text-primary">{value}</span>
    </div>
  );
  return isAddr ? <Link to="/u/$address" params={{ address }} className="block">{content}</Link> : content;
}
