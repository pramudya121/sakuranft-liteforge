import { Link } from "@tanstack/react-router";
import { SakuraBackground } from "./SakuraBackground";
import { WalletButton } from "./WalletButton";
import { Home, Store, Plus, Activity, Trophy, BarChart3, User, Heart, Repeat } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/mint", label: "Mint", icon: Plus },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/watchlist", label: "Watchlist", icon: Heart },
  { to: "/dex", label: "DEX", icon: Repeat },
  { to: "/profile", label: "Profile", icon: User },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <SakuraBackground />
      <div className="relative z-10">
        <header className="sticky top-0 z-50 glass border-b">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg shadow-lg group-hover:scale-110 transition-transform">
                🌸
              </div>
              <span className="font-bold text-lg gradient-text">SakuraNFT</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="px-3 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent/40 transition-all"
                  activeProps={{ className: "px-3 py-2 rounded-full text-sm font-medium text-primary bg-accent/60" }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <WalletButton />
          </div>
          {/* mobile nav */}
          <nav className="lg:hidden flex overflow-x-auto gap-1 px-3 pb-2 scrollbar-hide">
            {navItems.map((n) => {
              const Icon = n.icon;
              return (
                <Link key={n.to} to={n.to}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground shrink-0"
                  activeProps={{ className: "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs text-primary bg-accent/60 shrink-0" }}
                >
                  <Icon className="w-4 h-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="container mx-auto px-4 py-8 fade-in">{children}</main>
        <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          🌸 SakuraNFT on LitVM LiteForge Testnet · Powered by zkLTC
        </footer>
      </div>
    </div>
  );
}
