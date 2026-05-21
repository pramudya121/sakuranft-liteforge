import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Contract, formatEther, parseEther } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { CHAIN, CONTRACTS, ERC20_ABI, FACTORY_ABI, PAIR_ABI } from "@/lib/web3/contracts";
import { addLiquidityETH, approveToken, readProvider, removeLiquidityETH } from "@/lib/web3/ethers";
import { toast } from "sonner";

export const Route = createFileRoute("/dex/liquidity")({
  component: Liquidity,
  head: () => ({ meta: [{ title: "Liquidity — Sakura DEX" }] }),
});

function Liquidity() {
  return (
    <Tabs defaultValue="add" className="glass rounded-3xl p-6 glow-card">
      <TabsList className="w-full">
        <TabsTrigger value="add" className="flex-1"><Plus className="w-4 h-4 mr-2" /> Add</TabsTrigger>
        <TabsTrigger value="remove" className="flex-1"><Minus className="w-4 h-4 mr-2" /> Remove</TabsTrigger>
      </TabsList>
      <TabsContent value="add"><AddLiq /></TabsContent>
      <TabsContent value="remove"><RemoveLiq /></TabsContent>
    </Tabs>
  );
}

function AddLiq() {
  const { signer } = useWallet();
  const [token, setToken] = useState(CONTRACTS.weth);
  const [tokenAmt, setTokenAmt] = useState("");
  const [ethAmt, setEthAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");

  async function handleAdd() {
    if (!signer) return toast.error("Connect wallet");
    if (!token || !tokenAmt || !ethAmt) return toast.error("Fill all fields");
    setBusy(true);
    try {
      setStep("Approving token...");
      toast.loading("Approve token in wallet...", { id: "add" });
      const tAmt = parseEther(tokenAmt);
      await approveToken(signer, token, CONTRACTS.router, tAmt);
      setStep("Adding liquidity...");
      toast.loading("Confirm add liquidity...", { id: "add" });
      await addLiquidityETH(signer, token, tAmt, ethAmt);
      toast.success("Liquidity added!", { id: "add" });
      setTokenAmt(""); setEthAmt("");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Failed", { id: "add" });
    } finally { setBusy(false); setStep(""); }
  }

  return (
    <div className="space-y-3 pt-4">
      <div className="rounded-2xl p-4 bg-background/40 border">
        <p className="text-xs text-muted-foreground mb-1">Token Address</p>
        <Input className="font-mono text-sm" value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x..." />
      </div>
      <div className="rounded-2xl p-4 bg-background/40 border">
        <p className="text-xs text-muted-foreground mb-1">Token Amount</p>
        <Input type="number" placeholder="0.0" value={tokenAmt} onChange={(e) => setTokenAmt(e.target.value)} className="text-2xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0" />
      </div>
      <div className="text-center text-xl">+</div>
      <div className="rounded-2xl p-4 bg-background/40 border">
        <p className="text-xs text-muted-foreground mb-1">{CHAIN.symbol} Amount</p>
        <Input type="number" placeholder="0.0" value={ethAmt} onChange={(e) => setEthAmt(e.target.value)} className="text-2xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0" />
      </div>
      {step && <p className="text-sm text-primary text-center">{step}</p>}
      <Button size="lg" className="w-full rounded-full" onClick={handleAdd} disabled={busy}>
        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : "Approve & Add Liquidity"}
      </Button>
    </div>
  );
}

function RemoveLiq() {
  const { signer, address } = useWallet();
  const [token, setToken] = useState(CONTRACTS.weth);
  const [liquidity, setLiquidity] = useState("");
  const [pairAddr, setPairAddr] = useState("");
  const [lpBalance, setLpBalance] = useState("0");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token || !address) return;
      try {
        const factory = new Contract(CONTRACTS.factory, FACTORY_ABI, readProvider);
        const p = await factory.getPair(CONTRACTS.weth, token);
        setPairAddr(p);
        if (p && p !== "0x0000000000000000000000000000000000000000") {
          const pair = new Contract(p, PAIR_ABI, readProvider);
          const bal = await pair.balanceOf(address);
          setLpBalance(formatEther(bal));
        }
      } catch {}
    })();
  }, [token, address]);

  async function handleRemove() {
    if (!signer) return toast.error("Connect wallet");
    if (!liquidity || !pairAddr || pairAddr === "0x0000000000000000000000000000000000000000") return toast.error("No pair found");
    setBusy(true);
    try {
      const lAmt = parseEther(liquidity);
      toast.loading("Approve LP token...", { id: "rm" });
      await approveToken(signer, pairAddr, CONTRACTS.router, lAmt);
      toast.loading("Removing liquidity...", { id: "rm" });
      await removeLiquidityETH(signer, token, lAmt, pairAddr);
      toast.success("Liquidity removed!", { id: "rm" });
      setLiquidity("");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Failed", { id: "rm" });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3 pt-4">
      <div className="rounded-2xl p-4 bg-background/40 border">
        <p className="text-xs text-muted-foreground mb-1">Token Address (paired with {CHAIN.symbol})</p>
        <Input className="font-mono text-sm" value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x..." />
      </div>
      <div className="rounded-2xl p-4 bg-background/40 border">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>LP Amount</span><button className="underline" onClick={() => setLiquidity(lpBalance)}>Balance: {(+lpBalance).toFixed(6)}</button>
        </div>
        <Input type="number" placeholder="0.0" value={liquidity} onChange={(e) => setLiquidity(e.target.value)} className="text-2xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0" />
      </div>
      <Button size="lg" className="w-full rounded-full" onClick={handleRemove} disabled={busy}>
        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : "Approve & Remove Liquidity"}
      </Button>
    </div>
  );
}
