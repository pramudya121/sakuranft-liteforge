import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TokenSelectButton } from "./TokenSelectModal";
import { TOKENS, type TokenInfo } from "@/lib/tokens";
import { useWallet } from "@/contexts/WalletContext";
import { Contract, isAddress, parseEther, parseUnits, formatEther } from "ethers";
import { getNativeBalance, getTokenBalance } from "@/lib/web3/ethers";
import { ERC20_ABI } from "@/lib/web3/contracts";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

export function SendTokenDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { address, signer } = useWallet();
  const [token, setToken] = useState<TokenInfo>(TOKENS[0]);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [bal, setBal] = useState("0");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !address) return;
    let alive = true;
    (async () => {
      try {
        const v = token.address === "native"
          ? await getNativeBalance(address)
          : await getTokenBalance(token.address, address);
        if (alive) setBal(formatEther(v));
      } catch { if (alive) setBal("0"); }
    })();
    return () => { alive = false; };
  }, [open, address, token]);

  const validTo = useMemo(() => isAddress(to.trim()), [to]);
  const tooMuch = useMemo(() => +amount > +bal, [amount, bal]);

  async function send() {
    if (!signer || !validTo || !amount) return;
    try {
      setBusy(true);
      let tx;
      if (token.address === "native") {
        tx = await signer.sendTransaction({ to: to.trim(), value: parseEther(amount) });
      } else {
        const c = new Contract(token.address, ERC20_ABI, signer);
        tx = await c.transfer(to.trim(), parseUnits(amount, 18));
      }
      toast.loading("Broadcasting...", { id: "send" });
      await tx.wait();
      toast.success(`Sent ${amount} ${token.symbol}`, { id: "send" });
      onOpenChange(false);
      setAmount(""); setTo("");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Transfer failed", { id: "send" });
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md form-solid rounded-2xl">
        <DialogHeader><DialogTitle className="gradient-text flex items-center gap-2"><Send className="w-5 h-5" /> Send Token</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-2xl p-4 dex-inner">
            <div className="flex justify-between text-xs mb-2">
              <span className="dex-muted">Asset</span>
              <button onClick={() => setAmount(bal)} className="dex-muted hover:text-primary font-semibold">Balance: {(+bal).toFixed(4)} · MAX</button>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="0.0" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0 h-12" />
              <TokenSelectButton value={token} onChange={setToken} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs dex-muted">Recipient address</label>
            <Input placeholder="0x…" value={to} onChange={(e) => setTo(e.target.value)} className="font-mono text-sm" />
            {to && !validTo && <p className="text-xs text-destructive">Invalid address</p>}
          </div>
          <Button disabled={busy || !signer || !validTo || !amount || tooMuch} onClick={send}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white font-bold border-0">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</> : tooMuch ? "Insufficient balance" : `Send ${token.symbol}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
