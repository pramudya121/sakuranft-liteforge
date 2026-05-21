import { useState } from "react";
import { Wallet, ChevronDown, LogOut, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWallet, isCorrectChain } from "@/contexts/WalletContext";
import { shortAddr } from "@/lib/web3/ethers";
import { CHAIN } from "@/lib/web3/contracts";
import { toast } from "sonner";

// Logos served directly from the WalletConnect Cloud Explorer CDN.
// Image IDs are the canonical WC Explorer listing IDs for each wallet.
const WC_LOGO = (id: string) =>
  `https://explorer-api.walletconnect.com/v3/logo/lg/${id}?projectId=2f05a7cde2bb14e9f1042a25c9c9b8e7`;
const wallets: { kind: "metamask" | "okx" | "bitget"; name: string; logo: string; desc: string }[] = [
  { kind: "metamask", name: "MetaMask", desc: "Most popular Web3 wallet", logo: WC_LOGO("c6b8b5bf-c884-43e7-1de6-4d6f7f3a3300") },
  { kind: "okx", name: "OKX Wallet", desc: "Multichain wallet by OKX", logo: WC_LOGO("45f2f08e-fc0c-4d62-3e63-404e72170500") },
  { kind: "bitget", name: "Bitget Wallet", desc: "Web3 wallet by Bitget", logo: WC_LOGO("0c4808c3-d40d-422d-2c66-72d4368e1500") },
];

export function WalletButton() {
  const { address, chainId, balance, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);

  if (!address) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="rounded-full shadow-lg" size="sm">
            <Wallet className="w-4 h-4 mr-2" /> Connect Wallet
          </Button>
        </DialogTrigger>
        <DialogContent className="glass max-w-md">
          <DialogHeader>
            <DialogTitle className="gradient-text text-2xl">Connect a Wallet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Choose a wallet to continue. Logos provided by the WalletConnect Explorer.</p>
          <div className="space-y-2 pt-2">
            {wallets.map((w) => (
              <button
                key={w.kind}
                onClick={async () => {
                  try { await connect(w.kind); setOpen(false); toast.success(`Connected to ${w.name}`); }
                  catch (e: any) { toast.error(e?.message ?? "Failed to connect"); }
                }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border hover:border-primary hover:bg-accent/50 transition-all"
              >
                <img
                  src={w.logo}
                  alt={`${w.name} logo`}
                  width={40}
                  height={40}
                  loading="lazy"
                  className="w-10 h-10 rounded-xl object-cover bg-muted"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                />
                <div className="flex flex-col items-start">
                  <span className="font-medium">{w.name}</span>
                  <span className="text-xs text-muted-foreground">{w.desc}</span>
                </div>
              </button>
            ))}
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
