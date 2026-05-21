import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEther } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { CHAIN, CONTRACTS } from "@/lib/web3/contracts";
import { wrapNative, unwrapNative, getNativeBalance, getTokenBalance } from "@/lib/web3/ethers";
import { toast } from "sonner";

export const Route = createFileRoute("/dex/wrap")({
  component: WrapPage,
  head: () => ({ meta: [{ title: "Wrap zkLTC ↔ WETH — Sakura DEX" }] }),
});

function WrapPage() {
  const { signer, address } = useWallet();
  const [mode, setMode] = useState<"wrap" | "unwrap">("wrap");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [nativeBal, setNativeBal] = useState("0");
  const [wethBal, setWethBal] = useState("0");

  const refresh = async () => {
    if (!address) return;
    try {
      const [n, w] = await Promise.all([
        getNativeBalance(address),
        getTokenBalance(CONTRACTS.weth, address),
      ]);
      setNativeBal(formatEther(n));
      setWethBal(formatEther(w));
    } catch {}
  };
  useEffect(() => { refresh(); }, [address]);

  const fromBal = mode === "wrap" ? nativeBal : wethBal;
  const toBal = mode === "wrap" ? wethBal : nativeBal;
  const fromSym = mode === "wrap" ? CHAIN.symbol : "WETH";
  const toSym = mode === "wrap" ? "WETH" : CHAIN.symbol;

  const onSubmit = async () => {
    if (!signer) return toast.error("Connect wallet first");
    if (!amount || +amount <= 0) return toast.error("Enter an amount");
    if (+amount > +fromBal) return toast.error("Insufficient balance");
    setBusy(true);
    try {
      if (mode === "wrap") {
        await wrapNative(signer, amount);
        toast.success(`Wrapped ${amount} ${CHAIN.symbol} → WETH`);
      } else {
        await unwrapNative(signer, amount);
        toast.success(`Unwrapped ${amount} WETH → ${CHAIN.symbol}`);
      }
      setAmount("");
      await refresh();
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Transaction failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="glass rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{mode === "wrap" ? "Wrap" : "Unwrap"}</h2>
        <p className="text-xs text-muted-foreground">1:1 — no fees, no slippage</p>
      </div>

      <div className="rounded-2xl border bg-card/40 p-4 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>From</span>
          <button onClick={() => setAmount(fromBal)} className="hover:text-primary">
            Balance: {(+fromBal).toFixed(4)} {fromSym}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Input type="number" inputMode="decimal" placeholder="0.0" value={amount}
            onChange={(e) => setAmount(e.target.value)} className="bg-transparent border-0 text-2xl px-0 focus-visible:ring-0" />
          <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">{fromSym}</div>
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={() => setMode(mode === "wrap" ? "unwrap" : "wrap")}
          className="p-2 rounded-full border bg-card hover:bg-accent transition">
          <ArrowDownUp className="w-4 h-4" />
        </button>
      </div>

      <div className="rounded-2xl border bg-card/40 p-4 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>To</span>
          <span>Balance: {(+toBal).toFixed(4)} {toSym}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-2xl flex-1">{amount || "0.0"}</div>
          <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">{toSym}</div>
        </div>
      </div>

      <Button className="w-full rounded-xl" size="lg" onClick={onSubmit} disabled={busy || !signer}>
        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
          : !signer ? "Connect wallet" : (mode === "wrap" ? `Wrap ${CHAIN.symbol}` : "Unwrap WETH")}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        WETH contract: <span className="font-mono">{CONTRACTS.weth.slice(0, 10)}…{CONTRACTS.weth.slice(-6)}</span>
      </p>
    </div>
  );
}