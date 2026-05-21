import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Contract, formatEther, parseEther } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { CHAIN, CONTRACTS, ERC20_ABI, ROUTER_ABI } from "@/lib/web3/contracts";
import { readProvider, swapExactETHForTokens, swapExactTokensForETH } from "@/lib/web3/ethers";
import { toast } from "sonner";

export const Route = createFileRoute("/dex/swap")({
  component: Swap,
  head: () => ({ meta: [{ title: "Swap — Sakura DEX" }] }),
});

function Swap() {
  const { signer } = useWallet();
  const [fromAmt, setFromAmt] = useState("");
  const [toAmt, setToAmt] = useState("");
  const [direction, setDirection] = useState<"eth-to-weth" | "weth-to-eth">("eth-to-weth");
  const [tokenAddr, setTokenAddr] = useState(CONTRACTS.weth);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!fromAmt || isNaN(+fromAmt) || +fromAmt <= 0) { setToAmt(""); return; }
    (async () => {
      try {
        const router = new Contract(CONTRACTS.router, ROUTER_ABI, readProvider);
        const path = direction === "eth-to-weth" ? [CONTRACTS.weth, tokenAddr] : [tokenAddr, CONTRACTS.weth];
        if (path[0].toLowerCase() === path[1].toLowerCase()) { setToAmt(fromAmt); return; }
        const out = await router.getAmountsOut(parseEther(fromAmt), path);
        setToAmt(formatEther(out[1]));
      } catch { setToAmt(""); }
    })();
  }, [fromAmt, tokenAddr, direction]);

  async function handleSwap() {
    if (!signer) return toast.error("Connect wallet");
    if (!fromAmt) return;
    setBusy(true);
    try {
      toast.loading("Confirm in wallet...", { id: "swap" });
      if (direction === "eth-to-weth") {
        await swapExactETHForTokens(signer, tokenAddr, fromAmt);
      } else {
        await swapExactTokensForETH(signer, tokenAddr, parseEther(fromAmt));
      }
      toast.success("Swap complete!", { id: "swap" });
      setFromAmt(""); setToAmt("");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Swap failed", { id: "swap" });
    } finally { setBusy(false); }
  }

  return (
    <div className="glass rounded-3xl p-6 glow-card space-y-3">
      <TokenInput
        label="From"
        amount={fromAmt} onAmount={setFromAmt}
        symbol={direction === "eth-to-weth" ? CHAIN.symbol : "TOKEN"}
        showTokenInput={direction !== "eth-to-weth"}
        token={tokenAddr} setToken={setTokenAddr}
      />
      <div className="flex justify-center -my-1">
        <button onClick={() => setDirection(direction === "eth-to-weth" ? "weth-to-eth" : "eth-to-weth")}
          className="w-10 h-10 rounded-xl glass border-2 border-background flex items-center justify-center hover:rotate-180 transition-transform duration-300">
          <ArrowDownUp className="w-4 h-4" />
        </button>
      </div>
      <TokenInput
        label="To (estimated)"
        amount={toAmt} onAmount={() => {}} readOnly
        symbol={direction === "eth-to-weth" ? "TOKEN" : CHAIN.symbol}
        showTokenInput={direction === "eth-to-weth"}
        token={tokenAddr} setToken={setTokenAddr}
      />
      <Button size="lg" className="w-full rounded-full shadow-lg" onClick={handleSwap} disabled={busy || !fromAmt || !signer}>
        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Swapping...</> : signer ? "Swap" : "Connect Wallet"}
      </Button>
      <p className="text-xs text-muted-foreground text-center pt-2">Default token = WETH. Paste any ERC-20 address to swap.</p>
    </div>
  );
}

function TokenInput({ label, amount, onAmount, symbol, readOnly, token, setToken, showTokenInput }: any) {
  return (
    <div className="rounded-2xl p-4 bg-background/40 border space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex gap-2">
        <Input className="text-2xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0" type="number" placeholder="0.0"
          value={amount} onChange={(e) => onAmount(e.target.value)} readOnly={readOnly} />
        <div className="px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-sm self-center shrink-0">{symbol}</div>
      </div>
      {showTokenInput && (
        <Input className="text-xs font-mono" placeholder="Token address (ERC-20)" value={token} onChange={(e) => setToken(e.target.value)} />
      )}
    </div>
  );
}
