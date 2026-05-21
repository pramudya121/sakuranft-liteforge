import { useState } from "react";
import { Wallet, ChevronDown, LogOut, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWallet, isCorrectChain } from "@/contexts/WalletContext";
import { shortAddr } from "@/lib/web3/ethers";
import { CHAIN } from "@/lib/web3/contracts";
import { toast } from "sonner";

const wallets: { kind: "metamask" | "okx" | "bitget"; name: string; emoji: string }[] = [
  { kind: "metamask", name: "MetaMask", emoji: "🦊" },
  { kind: "okx", name: "OKX Wallet", emoji: "⚫" },
  { kind: "bitget", name: "Bitget Wallet", emoji: "🟦" },
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
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="gradient-text text-2xl">Connect a Wallet</DialogTitle>
          </DialogHeader>
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
                <span className="text-2xl">{w.emoji}</span>
                <span className="font-medium">{w.name}</span>
              </button>
            ))}
          </div>
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
