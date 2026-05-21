import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/contexts/WalletContext";
import { mintNFT } from "@/lib/web3/ethers";
import { toast } from "sonner";

export const Route = createFileRoute("/mint")({
  component: Mint,
  head: () => ({ meta: [{ title: "Mint NFT — SakuraNFT" }] }),
});

function Mint() {
  const { signer, address } = useWallet();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function onFile(f: File | undefined) {
    if (!f) return;
    setFile(f);
    const r = new FileReader();
    r.onload = () => setPreview(r.result as string);
    r.readAsDataURL(f);
  }

  async function handleMint() {
    if (!signer) return toast.error("Connect wallet");
    if (!file || !name) return toast.error("Image and name required");
    setBusy(true);
    try {
      const receipt = await mintNFT(signer, file, name, desc, setStatus);
      toast.success("NFT minted successfully!");
      console.log(receipt);
      setTimeout(() => nav({ to: "/profile" }), 1000);
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Mint failed");
    } finally { setBusy(false); setStatus(""); }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Mint a New NFT</h1>
        <p className="text-muted-foreground mt-2">Upload from your device — your art becomes an on-chain blossom.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-3xl p-6 glow-card">
          <label className="block aspect-square rounded-2xl border-2 border-dashed border-primary/40 cursor-pointer overflow-hidden bg-gradient-to-br from-accent/30 to-secondary/30 hover:border-primary transition">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <ImageIcon className="w-16 h-16" />
                <span>Click to upload an image</span>
                <span className="text-xs">PNG, JPG, GIF</span>
              </div>
            )}
          </label>
        </div>

        <div className="glass rounded-3xl p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sakura Bloom #1" className="mt-1.5" />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} placeholder="Tell the story of your NFT..." className="mt-1.5" />
          </div>
          <div className="text-xs text-muted-foreground">
            Minting to: <span className="font-mono">{address ?? "—"}</span>
          </div>
          {status && (
            <div className="flex items-center gap-2 text-sm text-primary"><Sparkles className="w-4 h-4 animate-pulse" /> {status}</div>
          )}
          <Button size="lg" className="w-full rounded-full shadow-lg" onClick={handleMint} disabled={busy || !signer}>
            <Upload className="w-4 h-4 mr-2" /> {busy ? "Minting..." : "Mint NFT"}
          </Button>
        </div>
      </div>
    </div>
  );
}
