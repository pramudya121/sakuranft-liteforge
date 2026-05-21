import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownUp, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Contract, formatEther, parseEther, isAddress } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { CHAIN, CONTRACTS, ROUTER_ABI } from "@/lib/web3/contracts";
import { readProvider, swapExactETHForTokens, swapExactTokensForETH } from "@/lib/web3/ethers";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TOKENS, type TokenInfo } from "@/lib/tokens";
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
  const [token, setToken] = useState<TokenInfo>(TOKENS[1]); // WETH default
  const [busy, setBusy] = useState(false);
  const [slippage, setSlippage] = useState(1); // %
  const [priceImpact, setPriceImpact] = useState<number | null>(null);

  const tokenAddr = token.address === "native" ? CONTRACTS.weth : token.address;
  const tokenAddrValid = isAddress(tokenAddr);

  useEffect(() => {
    if (!fromAmt || isNaN(+fromAmt) || +fromAmt <= 0 || !tokenAddrValid) { setToAmt(""); setPriceImpact(null); return; }
    (async () => {
      try {
        const router = new Contract(CONTRACTS.router, ROUTER_ABI, readProvider);
        const path = direction === "eth-to-weth" ? [CONTRACTS.weth, tokenAddr] : [tokenAddr, CONTRACTS.weth];
        if (path[0].toLowerCase() === path[1].toLowerCase()) { setToAmt(fromAmt); setPriceImpact(0); return; }
        const out = await router.getAmountsOut(parseEther(fromAmt), path);
        setToAmt(formatEther(out[1]));
        // price impact estimate: compare actual rate vs spot rate of a tiny trade
        try {
          const tiny = parseEther("0.0001");
          const spot = await router.getAmountsOut(tiny, path);
          const spotRate = Number(formatEther(spot[1])) / Number(formatEther(tiny));
          const actualRate = Number(formatEther(out[1])) / Number(fromAmt);
          const impact = Math.max(0, (1 - actualRate / spotRate) * 100);
          setPriceImpact(impact);
        } catch { setPriceImpact(null); }
      } catch { setToAmt(""); setPriceImpact(null); }
    })();
  }, [fromAmt, tokenAddr, direction, tokenAddrValid]);

  async function handleSwap() {
    if (!signer) return toast.error("Connect wallet");
    if (!fromAmt) return;
    if (!tokenAddrValid) return toast.error("Token has no address on this chain");
    setBusy(true);
    try {
      toast.loading("Confirm in wallet...", { id: "swap" });
      if (direction === "eth-to-weth") await swapExactETHForTokens(signer, tokenAddr, fromAmt, slippage);
      else await swapExactTokensForETH(signer, tokenAddr, parseEther(fromAmt), slippage);
      toast.success("Swap complete!", { id: "swap" });
      setFromAmt(""); setToAmt("");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Swap failed", { id: "swap" });
    } finally { setBusy(false); }
  }

  const fromSymbol = direction === "eth-to-weth" ? CHAIN.symbol : token.symbol;
  const toSymbol = direction === "eth-to-weth" ? token.symbol : CHAIN.symbol;
  const fromLogo = direction === "eth-to-weth" ? TOKENS[0].logo : token.logo;
  const toLogo = direction === "eth-to-weth" ? token.logo : TOKENS[0].logo;

  return (
    <div className="glass rounded-3xl p-6 glow-card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Swap</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full"><Settings className="w-4 h-4" /></Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 glass">
            <p className="text-sm font-medium mb-2">Slippage tolerance</p>
            <div className="flex gap-2 mb-2">
              {[0.1, 0.5, 1, 3].map((v) => (
                <button key={v} onClick={() => setSlippage(v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${slippage === v ? "border-primary bg-primary/10 text-primary" : ""}`}>
                  {v}%
                </button>
              ))}
            </div>
            <Input type="number" step="0.1" value={slippage} onChange={(e) => setSlippage(Math.max(0.05, Math.min(50, +e.target.value || 1)))} />
          </PopoverContent>
        </Popover>
      </div>
      <TokenInput label="From" amount={fromAmt} onAmount={setFromAmt} symbol={fromSymbol} logo={fromLogo} />
      <div className="flex justify-center -my-1">
        <button onClick={() => setDirection(direction === "eth-to-weth" ? "weth-to-eth" : "eth-to-weth")}
          className="w-10 h-10 rounded-xl glass border-2 border-background flex items-center justify-center hover:rotate-180 transition-transform duration-300">
          <ArrowDownUp className="w-4 h-4" />
        </button>
      </div>
      <TokenInput label="To (estimated)" amount={toAmt} onAmount={() => {}} readOnly symbol={toSymbol} logo={toLogo} />

      {toAmt && (
        <div className="text-xs space-y-1 px-2 text-muted-foreground">
          <div className="flex justify-between"><span>Slippage tolerance</span><span>{slippage}%</span></div>
          <div className="flex justify-between"><span>Minimum received</span><span>{(parseFloat(toAmt) * (100 - slippage) / 100).toFixed(6)} {toSymbol}</span></div>
          {priceImpact !== null && (
            <div className="flex justify-between"><span>Price impact</span>
              <span className={priceImpact > 5 ? "text-destructive font-semibold" : priceImpact > 1 ? "text-yellow-500" : "text-green-500"}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      )}

      <div>
        <p className="text-xs text-muted-foreground mb-2">Select token</p>
        <div className="grid grid-cols-4 gap-2">
          {TOKENS.filter((t) => t.address !== "native").map((t) => (
            <button key={t.symbol} onClick={() => setToken(t)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition ${token.symbol === t.symbol ? "border-primary bg-primary/10" : "hover:bg-accent/30"}`}>
              <img src={t.logo} alt={t.symbol} className="w-6 h-6 rounded-full" onError={(e) => (e.currentTarget.style.display = "none")} />
              <span className="text-xs font-semibold">{t.symbol}</span>
            </button>
          ))}
        </div>
        <Input className="text-xs font-mono mt-2" placeholder="Or paste custom token address" value={token.address === "native" ? "" : token.address}
          onChange={(e) => setToken({ ...token, symbol: "CUSTOM", name: "Custom Token", address: e.target.value, logo: "" })} />
      </div>

      <Button size="lg" className="w-full rounded-full shadow-lg" onClick={handleSwap} disabled={busy || !fromAmt || !signer}>
        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Swapping...</> : signer ? "Swap" : "Connect Wallet"}
      </Button>
      <p className="text-xs text-muted-foreground text-center pt-2">Logos by CoinMarketCap · Powered by LitVM DEX</p>
    </div>
  );
}

function TokenInput({ label, amount, onAmount, symbol, logo, readOnly }: any) {
  return (
    <div className="rounded-2xl p-4 bg-background/40 border space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex gap-2 items-center">
        <Input className="text-2xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0" type="number" placeholder="0.0"
          value={amount} onChange={(e) => onAmount(e.target.value)} readOnly={readOnly} />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
          {logo && <img src={logo} alt="" className="w-5 h-5 rounded-full" onError={(e) => (e.currentTarget.style.display = "none")} />}
          {symbol}
        </div>
      </div>
    </div>
  );
}
