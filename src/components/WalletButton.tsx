import { useState } from "react";
import { Wallet, ChevronDown, LogOut, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWallet, isCorrectChain } from "@/contexts/WalletContext";
import { shortAddr } from "@/lib/web3/ethers";
import { CHAIN } from "@/lib/web3/contracts";
import { toast } from "sonner";
import { SendTokenDialog } from "./SendTokenDialog";

const wallets: { kind: "metamask" | "okx" | "bitget" | "rabby"; name: string; logo: string; desc: string }[] = [
  {
    kind: "metamask",
    name: "MetaMask",
    desc: "Most popular Web3 wallet",
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg",
  },
  {
    kind: "rabby",
    name: "Rabby Wallet",
    desc: "Multi-chain wallet by DeBank",
    logo: "https://rabby.io/assets/images/logo-128.png",
  },
  {
    kind: "okx",
    name: "OKX Wallet",
    desc: "Multichain wallet by OKX",
    logo: "https://www.okx.com/cdn/assets/imgs/239/0F0C3CB1F8B6A1A1.png",
  },
  {
    kind: "bitget",
    name: "Bitget Wallet",
    desc: "Web3 wallet by Bitget",
    logo: "https://web3.bitget.com/v1/static/web3/logo.png",
  },
];

export function WalletButton() {
  const { address, chainId, balance, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  if (!address) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="rounded-full shadow-lg bg-gradient-to-r from-primary to-accent text-primary-foreground border-0" size="sm">
            <Wallet className="w-4 h-4 mr-2" /> Connect Wallet
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="gradient-text text-2xl">Connect a Wallet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Choose a wallet to continue on <span className="font-semibold text-foreground">{CHAIN.name}</span>.
          </p>
          <div className="space-y-2 pt-2">
            {wallets.map((w) => {
              const isConnecting = connecting === w.kind;
              return (
                <button
                  key={w.kind}
                  disabled={connecting !== null}
                  onClick={async () => {
                    setConnecting(w.kind);
                    try { await connect(w.kind); setOpen(false); toast.success(`Connected to ${w.name}`); }
                    catch (e: any) { toast.error(e?.message ?? "Failed to connect"); }
                    finally { setConnecting(null); }
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-background/40 hover:border-primary hover:bg-accent/40 transition-all disabled:opacity-60"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/90 dark:bg-white/95 flex items-center justify-center p-1.5 shrink-0">
                    <img
                      src={w.logo}
                      alt={`${w.name} logo`}
                      width={36}
                      height={36}
                      loading="lazy"
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                    />
                  </div>
                  <div className="flex flex-col items-start flex-1">
                    <span className="font-semibold">{w.name}</span>
                    <span className="text-xs text-muted-foreground">{w.desc}</span>
                  </div>
                  {isConnecting && <span className="text-xs text-primary animate-pulse">Connecting…</span>}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            By connecting you agree to our Terms. We never store your private keys.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const wrongChain = !isCorrectChain(chainId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={wrongChain ? "destructive" : "secondary"} className="rounded-full" size="sm">
          {wrongChain ? "Wrong Network" : `${(+balance).toFixed(3)} ${CHAIN.symbol}`}
          <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{shortAddr(address)}</span>
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass">
        {wrongChain && (
          <DropdownMenuItem onClick={() => connect((localStorage.getItem("walletKind") as any) ?? "metamask")}>
            Switch to {CHAIN.name}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(address); toast.success("Address copied"); }}>
          <Copy className="w-4 h-4 mr-2" /> Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={disconnect}>
          <LogOut className="w-4 h-4 mr-2" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
