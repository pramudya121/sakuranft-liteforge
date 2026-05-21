import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Upload, Sparkles, Image as ImageIcon, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/contexts/WalletContext";
import { mintNFT } from "@/lib/web3/ethers";
import { generateNFTDescription, generateNFTImage } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/mint")({
  component: Mint,
  head: () => ({ meta: [{ title: "Mint NFT — SakuraNFT" }] }),
});

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

function Mint() {
  const { signer, address } = useWallet();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState<"img" | "desc" | null>(null);

  const genDesc = useServerFn(generateNFTDescription);
  const genImg = useServerFn(generateNFTImage);

  function onFile(f: File | undefined) {
    if (!f) return;
    setFile(f);
    const r = new FileReader();
    r.onload = () => setPreview(r.result as string);
    r.readAsDataURL(f);
  }

  async function handleAIImage() {
    const prompt = aiPrompt || name;
    if (!prompt) return toast.error("Type a prompt or name first");
    setAiBusy("img");
    try {
      const { imageDataUrl } = await genImg({ data: { prompt } });
      setPreview(imageDataUrl);
      setFile(dataUrlToFile(imageDataUrl, `ai-${Date.now()}.png`));
      toast.success("Image generated!");
    } catch (e: any) {
      toast.error(e?.message ?? "AI image failed");
    } finally { setAiBusy(null); }
  }

  async function handleAIDesc() {
    if (!name) return toast.error("Enter NFT name first");
    setAiBusy("desc");
    try {
      const { description } = await genDesc({ data: { name, hint: aiPrompt || undefined } });
      setDesc(description);
      toast.success("Description ready!");
    } catch (e: any) {
      toast.error(e?.message ?? "AI failed");
    } finally { setAiBusy(null); }
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
        <p className="text-muted-foreground mt-2">Upload your art — or let AI bloom one for you.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-3xl p-6 glow-card space-y-3">
          <label className="block aspect-square rounded-2xl border-2 border-dashed border-primary/40 cursor-pointer overflow-hidden bg-gradient-to-br from-accent/30 to-secondary/30 hover:border-primary transition">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <ImageIcon className="w-16 h-16" />
                <span>Click to upload an image</span>
                <span className="text-xs">PNG, JPG, GIF — or generate with AI →</span>
              </div>
            )}
          </label>
          <div className="space-y-2">
            <Input placeholder="AI prompt (e.g. 'snowy sakura at midnight, golden moon')"
              value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
            <Button type="button" variant="secondary" className="w-full" onClick={handleAIImage} disabled={aiBusy !== null}>
              <Wand2 className="w-4 h-4 mr-2" /> {aiBusy === "img" ? "Generating..." : "Generate image with AI"}
            </Button>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sakura Bloom #1" className="mt-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Description</label>
              <Button type="button" size="sm" variant="ghost" onClick={handleAIDesc} disabled={aiBusy !== null || !name}>
                <Wand2 className="w-3 h-3 mr-1" /> {aiBusy === "desc" ? "Writing..." : "AI write"}
              </Button>
            </div>
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

