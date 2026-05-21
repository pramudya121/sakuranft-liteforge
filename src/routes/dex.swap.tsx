import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownUp, Loader2, Settings, Plus, MoreHorizontal, ChevronDown, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEther, parseEther, isAddress } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { CHAIN, CONTRACTS } from "@/lib/web3/contracts";
import {
  findBestRoute, swapExactETHForTokens, swapExactTokensForETH, swapExactTokensForTokens,
  getNativeBalance, getTokenBalance,
} from "@/lib/web3/ethers";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TOKENS, type TokenInfo } from "@/lib/tokens";
import { toast } from "sonner";

export const Route = createFileRoute("/dex/swap")({
  component: Swap,
  head: () => ({ meta: [{ title: "Swap — Sakura DEX" }] }),
});

function tokenForAddr(addr: string): TokenInfo {
  const lower = addr.toLowerCase();
  return TOKENS.find((t) => t.address !== "native" && t.address.toLowerCase() === lower)
    ?? { symbol: "?", name: "?", address: addr, decimals: 18, cmcId: 0, logo: "" };
}

function Swap() {
  const { signer, address } = useWallet();
  const [from, setFrom] = useState<TokenInfo>(TOKENS[0]); // zkLTC native
  const [to, setTo] = useState<TokenInfo>(TOKENS[1]); // WETH
  const [fromAmt, setFromAmt] = useState("");
  const [toAmt, setToAmt] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [priceImpact, setPriceImpact] = useState<number | null>(null);
  const [route, setRoute] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [balFrom, setBalFrom] = useState("0");
  const [balTo, setBalTo] = useState("0");

  const fromAddr = from.address === "native" ? CONTRACTS.weth : from.address;
  const toAddr = to.address === "native" ? CONTRACTS.weth : to.address;

  // balances
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!address) return;
      try {
        const f = from.address === "native" ? await getNativeBalance(address) : await getTokenBalance(from.address, address);
        if (alive) setBalFrom(formatEther(f));
      } catch { if (alive) setBalFrom("0"); }
      try {
        const t = to.address === "native" ? await getNativeBalance(address) : await getTokenBalance(to.address, address);
        if (alive) setBalTo(formatEther(t));
      } catch { if (alive) setBalTo("0"); }
    })();
    return () => { alive = false; };
  }, [address, from, to]);

  // smart routing quote
  useEffect(() => {
    if (!fromAmt || isNaN(+fromAmt) || +fromAmt <= 0 || !isAddress(fromAddr) || !isAddress(toAddr) || fromAddr.toLowerCase() === toAddr.toLowerCase()) {
      setToAmt(""); setPriceImpact(null); setRoute([]); return;
    }
    let cancelled = false;
    (async () => {
      try {
        const amtIn = parseEther(fromAmt);
        const best = await findBestRoute(amtIn, fromAddr, toAddr);
        if (cancelled) return;
        if (!best) { setToAmt(""); setPriceImpact(null); setRoute([]); return; }
        setToAmt(formatEther(best.out));
        setRoute(best.path);
        // price impact via tiny trade
        try {
          const tiny = parseEther("0.0001");
          const small = await findBestRoute(tiny, fromAddr, toAddr);
          if (small) {
            const spotRate = Number(formatEther(small.out)) / Number(formatEther(tiny));
            const actualRate = Number(formatEther(best.out)) / Number(fromAmt);
            setPriceImpact(Math.max(0, (1 - actualRate / spotRate) * 100));
          }
        } catch { setPriceImpact(null); }
      } catch { if (!cancelled) { setToAmt(""); setPriceImpact(null); setRoute([]); } }
    })();
    return () => { cancelled = true; };
  }, [fromAmt, fromAddr, toAddr]);

  function flip() { const a = from, b = to; setFrom(b); setTo(a); setFromAmt(toAmt); setToAmt(""); }

  async function handleSwap() {
    if (!signer) return toast.error("Connect wallet");
    if (!fromAmt || !route.length) return;
    setBusy(true);
    try {
      toast.loading("Confirm in wallet...", { id: "swap" });
      const amtIn = parseEther(fromAmt);
      if (from.address === "native") {
        // native -> token (possibly multi-hop). For native start, use swapExactETHForTokens with direct path; multi-hop ETH starts also go via this w/ longer path.
        // Router supports swapExactETHForTokens with any path starting with WETH.
        await swapExactETHForTokens(signer, route[route.length - 1], fromAmt, slippage);
      } else if (to.address === "native") {
        await swapExactTokensForETH(signer, from.address, amtIn, slippage);
      } else {
        await swapExactTokensForTokens(signer, amtIn, route, slippage);
      }
      toast.success("Swap complete!", { id: "swap" });
      setFromAmt(""); setToAmt("");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Swap failed", { id: "swap" });
    } finally { setBusy(false); }
  }

  const minReceived = toAmt ? (parseFloat(toAmt) * (100 - slippage) / 100).toFixed(6) : "0";
  const hops = route.length > 0 ? route.length - 1 : 0;
  const totalFee = (hops * 0.3).toFixed(1);

  return (
    <div className="rounded-3xl p-5 bg-gradient-to-b from-card to-background/70 border border-border/60 shadow-2xl backdrop-blur-xl space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Swap</h2>
        <div className="flex items-center gap-1">
          <button className="w-9 h-9 rounded-xl bg-background/40 flex items-center justify-center hover:bg-background/60"><Plus className="w-4 h-4" /></button>
          <button className="w-9 h-9 rounded-xl bg-background/40 flex items-center justify-center hover:bg-background/60"><MoreHorizontal className="w-4 h-4" /></button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-9 h-9 rounded-xl bg-background/40 flex items-center justify-center hover:bg-background/60"><Settings className="w-4 h-4" /></button>
            </PopoverTrigger>
            <PopoverContent className="w-64 glass">
              <p className="text-sm font-medium mb-2">Slippage tolerance</p>
              <div className="flex gap-2 mb-2">
                {[0.1, 0.5, 1, 3].map((v) => (
                  <button key={v} onClick={() => setSlippage(v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${slippage === v ? "border-primary bg-primary/10 text-primary" : ""}`}>{v}%</button>
                ))}
              </div>
              <Input type="number" step="0.1" value={slippage} onChange={(e) => setSlippage(Math.max(0.05, Math.min(50, +e.target.value || 0.5)))} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* From */}
      <div className="rounded-2xl p-4 bg-background/50 border">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-muted-foreground">You pay</span>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">{(+balFrom).toFixed(4)}</span>
            {[25, 50, 75, 100].map((p) => (
              <button key={p} onClick={() => setFromAmt(((+balFrom * p) / 100).toString())}
                className="px-1.5 text-[10px] rounded text-primary hover:bg-primary/10 font-semibold">
                {p === 100 ? "MAX" : `${p}%`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input type="number" placeholder="0.0" value={fromAmt}
            onChange={(e) => setFromAmt(e.target.value)}
            className="text-3xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0 h-12" />
          <TokenSelectBtn value={from} onChange={setFrom} />
        </div>
      </div>

      <div className="flex justify-center -my-2 relative z-10">
        <button onClick={flip}
          className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:rotate-180 transition-transform duration-300 shadow-lg">
          <ArrowDownUp className="w-4 h-4" />
        </button>
      </div>

      {/* To */}
      <div className="rounded-2xl p-4 bg-background/50 border">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-muted-foreground">You receive</span>
          <span className="text-muted-foreground">{(+balTo).toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Input type="number" placeholder="0.0" value={toAmt} readOnly
            className="text-3xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0 h-12" />
          <TokenSelectBtn value={to} onChange={setTo} />
        </div>
      </div>

      {/* Rate + impact */}
      {toAmt && (
        <div className="flex justify-between text-xs px-1">
          <span className="text-muted-foreground">1 {from.symbol} = {(+toAmt / +fromAmt).toLocaleString(undefined, { maximumFractionDigits: 6 })} {to.symbol}</span>
          {priceImpact !== null && (
            <span className={priceImpact > 5 ? "text-destructive font-semibold" : priceImpact > 1 ? "text-yellow-500" : "text-green-500"}>
              Impact {priceImpact.toFixed(2)}%
            </span>
          )}
        </div>
      )}

      {/* Smart Route */}
      {route.length > 0 && (
        <div className="rounded-2xl p-3 bg-background/40 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs flex items-center gap-1.5 font-semibold"><Zap className="w-3 h-3 text-primary" /> Smart Route</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${hops === 1 ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}`}>
              {hops === 1 ? "Direct" : `${hops} hops`}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {route.map((addr, i) => {
              const t = (i === 0 && from.address === "native") ? TOKENS[0]
                      : (i === route.length - 1 && to.address === "native") ? TOKENS[0]
                      : tokenForAddr(addr);
              return (
                <span key={i} className="flex items-center gap-1">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/70 text-xs">
                    {t.logo && <img src={t.logo} className="w-4 h-4 rounded-full" />}
                    <span className="font-semibold">{t.symbol}</span>
                  </span>
                  {i < route.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </span>
              );
            })}
            <span className="ml-auto text-[10px] text-muted-foreground">{totalFee}% fee</span>
          </div>
        </div>
      )}

      {/* Trade details accordion */}
      {toAmt && (
        <button onClick={() => setShowDetails((s) => !s)}
          className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-background/30 hover:bg-background/50">
          <span className="text-muted-foreground">Trade details</span>
          <ChevronDown className={`w-4 h-4 transition ${showDetails ? "rotate-180" : ""}`} />
        </button>
      )}
      {showDetails && toAmt && (
        <div className="text-xs space-y-1.5 px-3 text-muted-foreground">
          <div className="flex justify-between"><span>Minimum received</span><span>{minReceived} {to.symbol}</span></div>
          <div className="flex justify-between"><span>Slippage tolerance</span><span>{slippage}%</span></div>
          <div className="flex justify-between"><span>Network</span><span>{CHAIN.name}</span></div>
          <div className="flex justify-between"><span>Route hops</span><span>{hops}</span></div>
        </div>
      )}

      <Button size="lg" disabled={busy || !fromAmt || !signer || !route.length} onClick={handleSwap}
        className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-base shadow-lg">
        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Swapping...</>
          : !signer ? "Connect Wallet" : !route.length && fromAmt ? "No route" : "Swap"}
      </Button>
    </div>
  );
}

function TokenSelectBtn({ value, onChange }: { value: TokenInfo; onChange: (t: TokenInfo) => void }) {
  const options = TOKENS;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-background hover:bg-background/80 border shrink-0">
          {value.logo && <img src={value.logo} alt="" className="w-5 h-5 rounded-full" onError={(e) => (e.currentTarget.style.display = "none")} />}
          <span className="font-semibold text-sm">{value.symbol}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1 glass">
        {options.map((t) => (
          <button key={t.symbol} onClick={() => onChange(t)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/30 text-left">
            {t.logo && <img src={t.logo} alt="" className="w-5 h-5 rounded-full" onError={(e) => (e.currentTarget.style.display = "none")} />}
            <div className="flex-1">
              <div className="text-sm font-semibold">{t.symbol}</div>
              <div className="text-[10px] text-muted-foreground">{t.name}</div>
            </div>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}