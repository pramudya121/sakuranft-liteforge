import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Award, Edit2, Twitter, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/contexts/WalletContext";
import { useAllNFTs, useAllListings } from "@/lib/web3/hooks";
import { NFTCard } from "@/components/NFTCard";
import { PortfolioPanel } from "@/components/PortfolioPanel";
import { shortAddr } from "@/lib/web3/ethers";
import { CHAIN } from "@/lib/web3/contracts";
import { useProfile, type DBProfile } from "@/lib/supabase-hooks";
import { toast } from "sonner";
export const Route = createFileRoute("/profile")({
  component: Profile,
  head: () => ({ meta: [{ title: "Profile — SakuraNFT" }] }),
});

function Profile() {
  const { address } = useWallet();
  const { nfts } = useAllNFTs();
  const { listings } = useAllListings();
  const { profile, save } = useProfile(address);
  const [sort, setSort] = useState("newest");

  const owned = useMemo(() => {
    let arr = nfts.filter((n) => address && n.owner.toLowerCase() === address.toLowerCase());
    if (sort === "oldest") arr = [...arr].sort((a, b) => Number(a.tokenId - b.tokenId));
    if (sort === "name") arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [nfts, address, sort]);

  const badges = useMemo(() => {
    const b: { name: string; emoji: string; desc: string }[] = [];
    if (owned.length >= 1) b.push({ name: "Early Adopter", emoji: "🌸", desc: "First mint" });
    if (owned.length >= 5) b.push({ name: "Collector", emoji: "💎", desc: "5+ NFTs" });
    if (owned.length >= 10) b.push({ name: "Diamond Hands", emoji: "🤲", desc: "10+ holdings" });
    const sellerListings = listings.filter((l) => address && l.seller.toLowerCase() === address.toLowerCase());
    if (sellerListings.length >= 3) b.push({ name: "Top Seller", emoji: "🏆", desc: "3+ listings" });
    if (sellerListings.length >= 10) b.push({ name: "Trading Master", emoji: "⚔️", desc: "10+ active listings" });
    return b;
  }, [owned, listings, address]);

  if (!address) return <div className="text-center py-20 glass rounded-2xl">Connect your wallet to view profile.</div>;

  return (
    <div className="space-y-8">
      <div className="glass rounded-3xl overflow-hidden glow-card">
        {profile?.banner_url && (
          <div className="h-32 md:h-48 bg-cover bg-center" style={{ backgroundImage: `url(${profile.banner_url})` }} />
        )}
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-accent overflow-hidden flex items-center justify-center text-5xl shrink-0 -mt-16 md:-mt-20 border-4 border-background">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : "🌸"}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold">{profile?.display_name || "Anonymous Collector"}</h1>
            <p className="font-mono text-sm text-muted-foreground">{shortAddr(address)}</p>
            <p className="mt-2 text-sm">{profile?.bio || "No bio yet."}</p>
            <div className="flex gap-3 mt-3 justify-center md:justify-start">
              {profile?.twitter && <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener" className="text-muted-foreground hover:text-primary"><Twitter className="w-4 h-4" /></a>}
              {profile?.website && <a href={profile.website} target="_blank" rel="noopener" className="text-muted-foreground hover:text-primary"><Globe className="w-4 h-4" /></a>}
            </div>
          </div>
          <EditDialog profile={profile} onSave={async (p) => { await save(p); toast.success("Profile saved!"); }} />
        </div>
      </div>

      {badges.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Award className="w-4 h-4" /> Achievements</h3>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <div key={b.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-accent/30 border border-primary/30 text-sm">
                <span>{b.emoji}</span> <span className="font-medium">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Owned" v={owned.length} />
        <Stat label="Listed" v={listings.filter((l) => l.seller.toLowerCase() === address.toLowerCase()).length} />
        <Stat label={`Value (${CHAIN.symbol})`} v={listings.filter((l) => l.seller.toLowerCase() === address.toLowerCase()).reduce((a, l) => a + +l.priceEth, 0).toFixed(2)} />
      </div>

      <Tabs defaultValue="collection" className="w-full">
        <TabsList className="glass">
          <TabsTrigger value="collection">My Collection</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        </TabsList>
        <TabsContent value="collection" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold gradient-text">My Collection</h2>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {owned.length === 0 ? (
            <div className="text-center py-12 glass rounded-2xl text-muted-foreground">You don't own any NFTs yet.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {owned.map((n) => <NFTCard key={n.tokenId.toString()} nft={n} listing={listings.find((l) => l.tokenId === n.tokenId)} />)}
            </div>
          )}
        </TabsContent>
        <TabsContent value="portfolio" className="mt-4">
          <PortfolioPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: any }) {
  return <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold gradient-text">{v}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}

function EditDialog({ profile, onSave }: { profile: DBProfile | null; onSave: (p: Partial<DBProfile>) => Promise<void> }) {
  const [draft, setDraft] = useState<Partial<DBProfile>>({});
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  useEffect(() => { setDraft(profile ?? {}); }, [profile]);

  async function handleUpload(kind: "avatar" | "banner", file: File) {
    try {
      setUploading(kind);
      const { uploadImage } = await import("@/lib/upload");
      const url = await uploadImage(file, kind);
      setDraft((d) => ({ ...d, [`${kind}_url`]: url }));
      toast.success(`${kind} uploaded`);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Edit2 className="w-4 h-4 mr-2" /> Edit</Button></DialogTrigger>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Display name" value={draft.display_name ?? ""} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Avatar</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-muted overflow-hidden flex items-center justify-center text-2xl shrink-0">
                {draft.avatar_url ? <img src={draft.avatar_url} alt="" className="w-full h-full object-cover" /> : "🌸"}
              </div>
              <Input type="file" accept="image/*" disabled={uploading === "avatar"}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("avatar", f); }} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Banner</label>
            {draft.banner_url && <div className="h-20 w-full rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${draft.banner_url})` }} />}
            <Input type="file" accept="image/*" disabled={uploading === "banner"}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("banner", f); }} />
          </div>

          <Textarea placeholder="Bio" value={draft.bio ?? ""} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
          <Input placeholder="Twitter handle" value={draft.twitter ?? ""} onChange={(e) => setDraft({ ...draft, twitter: e.target.value })} />
          <Input placeholder="Website URL" value={draft.website ?? ""} onChange={(e) => setDraft({ ...draft, website: e.target.value })} />
          <Button onClick={async () => { await onSave(draft); setOpen(false); }} className="w-full" disabled={!!uploading}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

