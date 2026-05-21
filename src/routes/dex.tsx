import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Repeat, Droplet } from "lucide-react";

export const Route = createFileRoute("/dex")({
  component: DexLayout,
  head: () => ({ meta: [{ title: "DEX — SakuraNFT" }] }),
});

function DexLayout() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold gradient-text">Sakura DEX</h1>
        <p className="text-muted-foreground mt-1">Swap tokens & provide liquidity on LitVM.</p>
      </div>
      <div className="rounded-full p-1.5 flex gap-1 max-w-md mx-auto bg-[#160c26] border border-white/10">
        <Link to="/dex/swap" className="flex-1 px-4 py-2 rounded-full text-sm font-medium text-center text-muted-foreground hover:text-foreground transition"
          activeProps={{ className: "flex-1 px-4 py-2 rounded-full text-sm font-medium text-center bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow" }}>
          <Repeat className="w-4 h-4 inline mr-2" /> Swap
        </Link>
        <Link to="/dex/liquidity" className="flex-1 px-4 py-2 rounded-full text-sm font-medium text-center text-muted-foreground hover:text-foreground transition"
          activeProps={{ className: "flex-1 px-4 py-2 rounded-full text-sm font-medium text-center bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow" }}>
          <Droplet className="w-4 h-4 inline mr-2" /> Liquidity
        </Link>
      </div>
      <Outlet />
    </div>
  );
}
