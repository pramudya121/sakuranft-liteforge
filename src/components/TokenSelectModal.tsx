import { useEffect, useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TOKENS, type TokenInfo } from "@/lib/tokens";
import { CONTRACTS } from "@/lib/web3/contracts";
import { getNativeBalance, getTokenBalance } from "@/lib/web3/ethers";
import { formatEther, isAddress } from "ethers";

export function TokenSelectButton({ value, onChange }: { value: TokenInfo; onChange: (t: TokenInfo) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full dex-inner hover:opacity-90 shrink-0"
      >
        {value.logo && (
          <img src={value.logo} alt="" className="w-5 h-5 rounded-full" onError={(e) = loading="lazy" decoding="async"> (e.currentTarget.style.display = "none")} />
        )}
        <span className="font-semibold text-sm">{value.symbol}</span>
        <span className="text-xs opacity-60">▾</span>
      </button>
      <TokenSelectModal open={open} onClose={() => setOpen(false)} onSelect={(t) => { onChange(t); setOpen(false); }} />
    </>
  );
}

export function TokenSelectModal({
  open, onClose, onSelect, address, filter,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (t: TokenInfo) => void;
  address?: string;
  filter?: (t: TokenInfo) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [bals, setBals] = useState<Record<string, string>>({});

  const tokens = useMemo(() => TOKENS.filter(filter ?? (() => true)), [filter]);

  // Live balances
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      // Resolve wallet address if not passed in
      let owner = address;
      if (!owner && typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const accs = await (window as any).ethereum.request({ method: "eth_accounts" });
          owner = accs?.[0];
        } catch {}
      }
      if (!owner) return;
      const next: Record<string, string> = {};
      await Promise.all(
        tokens.map(async (t) => {
          try {
            if (t.address === "native") {
              const b = await getNativeBalance(owner!);
              next[t.symbol] = formatEther(b);
            } else if (t.address && isAddress(t.address)) {
              const b = await getTokenBalance(t.address, owner!);
              next[t.symbol] = formatEther(b);
            }
          } catch {}
        }),
      );
      if (alive) setBals(next);
    })();
    return () => { alive = false; };
  }, [open, address, tokens]);

  const filtered = tokens.filter((t) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || (t.address !== "native" && t.address.toLowerCase().includes(q));
  });

  const quick = tokens.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-white/10 dex-panel text-foreground rounded-3xl">
        <DialogTitle className="sr-only">Select a token</DialogTitle>
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <h3 className="text-lg font-bold">Select Token</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-400/30">BALANCES LIVE</span>
          <button onClick={onClose} className="ml-auto dex-muted hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 rounded-2xl dex-inner px-3 py-2.5">
            <Search className="w-4 h-4 dex-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, symbol or paste 0x address..."
              className="bg-transparent outline-none flex-1 text-sm placeholder:dex-muted opacity-80"
            />
          </div>
        </div>
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {quick.map((t) => {
            const bal = bals[t.symbol];
            return (
              <button
                key={t.symbol}
                onClick={() => onSelect(t)}
                className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full dex-inner hover:border-fuchsia-400/50"
              >
                <img src={t.logo} alt="" className="w-5 h-5 rounded-full" onError={(e) = loading="lazy" decoding="async"> (e.currentTarget.style.display = "none")} />
                <span className="text-xs font-semibold">{t.symbol}</span>
                <span className="text-[10px] text-fuchsia-300/80">{bal ? Number(bal).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "10"}</span>
              </button>
            );
          })}
        </div>
        <div className="max-h-[360px] overflow-y-auto px-2 pb-4">
          {filtered.map((t) => {
            const bal = bals[t.symbol];
            return (
              <button
                key={t.symbol}
                onClick={() => onSelect(t)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-foreground/5 text-left"
              >
                <img src={t.logo} alt="" className="w-8 h-8 rounded-full" onError={(e) = loading="lazy" decoding="async"> (e.currentTarget.style.display = "none")} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{t.symbol}</div>
                  <div className="text-[11px] dex-muted truncate">{t.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{bal ? Number(bal).toLocaleString(undefined, { maximumFractionDigits: 4 }) : (t.address && t.address !== "native" && isAddress(t.address) ? "0" : "10")}</div>
                  <div className="text-[10px] uppercase tracking-wider dex-muted opacity-80">Balance</div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}