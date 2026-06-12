import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BookOpen, Search, Wallet, Droplet, Repeat, BarChart3, Briefcase, Settings as SettingsIcon,
  Bot, GitBranch, AlertTriangle, Percent, Coins, Layers, FileCode, Database, Map, HelpCircle,
  Sparkles, ShieldCheck, Zap, Copy, Check, ExternalLink, Store, Plus, ArrowRight,
} from "lucide-react";
import { TOKENS } from "@/lib/tokens";
import { CONTRACTS, CHAIN } from "@/lib/web3/contracts";

export const Route = createFileRoute("/docs")({
  component: Docs,
  head: () => ({
    meta: [
      { title: "Documentation — SakuraNFT" },
      { name: "description", content: "Complete documentation for SakuraNFT: smart contracts, supported tokens, swap, liquidity, portfolio, analytics, AI assistant and more." },
      { property: "og:title", content: "SakuraNFT Documentation 🌸" },
      { property: "og:description", content: "Smart contracts, supported tokens, guides & technical reference for the SakuraNFT ecosystem." },
    ],
  }),
});

type Item = { id: string; label: string; icon: any };
type Group = { title: string; items: Item[] };

const groups: Group[] = [
  { title: "Getting Started", items: [
    { id: "intro", label: "Introduction", icon: BookOpen },
    { id: "why", label: "Why SakuraNFT", icon: Sparkles },
    { id: "wallet", label: "Connect Wallet", icon: Wallet },
    { id: "faucet", label: "Get Testnet Tokens", icon: Droplet },
  ]},
  { title: "User Guides", items: [
    { id: "swap", label: "How to Swap", icon: Repeat },
    { id: "liquidity", label: "Provide Liquidity", icon: Droplet },
    { id: "portfolio", label: "Portfolio & Send", icon: Briefcase },
    { id: "analytics", label: "Analytics & Pairs", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: SettingsIcon },
    { id: "ai", label: "SakuraNFT AI", icon: Bot },
  ]},
  { title: "DeFi Concepts", items: [
    { id: "amm", label: "AMM & Pricing", icon: GitBranch },
    { id: "il", label: "Impermanent Loss", icon: AlertTriangle },
    { id: "slippage", label: "Slippage & Price Impact", icon: Percent },
    { id: "lp", label: "LP Tokens & Fees", icon: Coins },
  ]},
  { title: "Technical", items: [
    { id: "stack", label: "Technology Stack", icon: Layers },
    { id: "contracts", label: "Smart Contracts", icon: FileCode },
    { id: "tokens", label: "Supported Tokens", icon: Database },
  ]},
  { title: "Roadmap & FAQ", items: [
    { id: "roadmap", label: "Development Roadmap", icon: Map },
    { id: "faq", label: "FAQ", icon: HelpCircle },
  ]},
];

function Docs() {
  const [active, setActive] = useState("intro");
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("section[data-doc]");
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  };

  const filterMatch = (label: string) => label.toLowerCase().includes(q.toLowerCase());

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-6 -mt-2">
      {/* Sidebar */}
      <aside className="md:sticky md:top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl glass border border-border/60 p-3">
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search docs…"
            className="w-full bg-background/60 border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </div>
        {groups.map((g) => {
          const items = g.items.filter((i) => !q || filterMatch(i.label));
          if (!items.length) return null;
          return (
            <div key={g.title} className="mb-3">
              <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{g.title}</p>
              <nav className="space-y-0.5">
                {items.map((it) => {
                  const Icon = it.icon;
                  const isActive = active === it.id;
                  return (
                    <a key={it.id} href={`#${it.id}`}
                      onClick={() => setActive(it.id)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition ${
                        isActive
                          ? "bg-gradient-to-r from-fuchsia-500/20 to-pink-500/10 text-foreground border-l-2 border-fuchsia-400"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                      }`}>
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{it.label}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </aside>

      {/* Main */}
      <main className="space-y-10 min-w-0">
        {/* Hero */}
        <section data-doc id="intro" className="scroll-mt-24">
          <div className="rounded-3xl glass border border-border/60 p-6 md:p-10">
            <h1 className="text-3xl md:text-5xl font-bold">
              Welcome to <span className="gradient-text">SakuraNFT</span> 🌸
            </h1>
            <p className="text-muted-foreground mt-3 max-w-3xl">
              SakuraNFT is a community-first NFT marketplace and decentralized exchange built on the
              <strong className="text-foreground"> LitVM LiteForge Testnet</strong>, powered by the battle-tested
              UniswapV2 protocol. Mint, trade, swap, provide liquidity, and earn — all without intermediaries. ✨
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mt-6">
              <Feature icon={<ShieldCheck className="w-5 h-5" />} title="Non-Custodial 🔐" body="You always maintain full control over your assets." />
              <Feature icon={<Zap className="w-5 h-5" />} title="Fast & Cheap ⚡" body="Low gas fees on LitVM LiteForge testnet." />
              <Feature icon={<FileCode className="w-5 h-5" />} title="Open Source 🧩" body="Verified and transparent smart contracts." />
            </div>

            <Callout tone="info" icon={<Sparkles className="w-4 h-4" />}>
              <strong>New to DeFi?</strong> Start by connecting your wallet, getting testnet tokens from the faucet,
              then try your first swap. Use the SakuraNFT AI (bottom-right button) for help anytime! 💬
            </Callout>

            <h2 className="text-xl font-bold mt-8 mb-3 flex items-center gap-2">✨ Key Features</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <KeyFeature icon={<Repeat className="w-5 h-5" />} title="Token Swap" body="Instantly trade tokens with AMM pricing." />
              <KeyFeature icon={<Droplet className="w-5 h-5" />} title="Liquidity Pools" body="Provide liquidity and earn 0.3% fees." />
              <KeyFeature icon={<BarChart3 className="w-5 h-5" />} title="Analytics" body="Real-time charts, TVL, volume, pair data." />
              <KeyFeature icon={<Briefcase className="w-5 h-5" />} title="Portfolio" body="Track holdings, LP positions, send tokens." />
              <KeyFeature icon={<Bot className="w-5 h-5" />} title="SakuraNFT AI" body="AI assistant with on-chain action execution." />
              <KeyFeature icon={<Store className="w-5 h-5" />} title="NFT Marketplace" body="List, buy, and offer on minted collectibles." />
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/60 text-sm">
              <span className="text-muted-foreground">SakuraNFT — Decentralized Trading on LitVM LiteForge</span>
              <Link to="/marketplace" className="text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
                Browse marketplace <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <Section id="why" icon={<Sparkles className="w-5 h-5" />} title="Why SakuraNFT ✨">
          <p>SakuraNFT isn't another generic OpenSea clone — it's a <strong>vertically integrated trading hub</strong> that
            combines an NFT marketplace, a UniswapV2-style DEX, deep analytics, a portfolio manager, and an action-capable
            AI assistant in <em>one</em> dApp on the LitVM LiteForge chain.</p>

          <h3 className="font-bold text-lg mt-5 mb-2">🚀 Key advantages</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <KeyFeature icon={<Layers className="w-5 h-5" />} title="All-in-one dApp"
              body="Mint, list, swap, add liquidity, and view analytics without switching apps or chains." />
            <KeyFeature icon={<Bot className="w-5 h-5" />} title="AI that actually trades"
              body="Hana can quote, propose, and execute swaps + liquidity ops — you only confirm in your wallet." />
            <KeyFeature icon={<Zap className="w-5 h-5" />} title="Low-fee testnet UX"
              body="Built on LitVM LiteForge — gas is near-zero so you can iterate and learn risk-free." />
            <KeyFeature icon={<ShieldCheck className="w-5 h-5" />} title="Non-custodial by design"
              body="Your wallet stays the source of truth. We never hold keys, balances, or NFTs in escrow off-chain." />
            <KeyFeature icon={<BarChart3 className="w-5 h-5" />} title="Native analytics & history"
              body="TVL, floor, volume, per-pair reserves, sales feed and price history are first-class — not an afterthought." />
            <KeyFeature icon={<Database className="w-5 h-5" />} title="ERC-721 standard metadata"
              body="Name, image, attributes, category & royalty live as top-level fields — fully portable to any marketplace." />
          </div>

          <h3 className="font-bold text-lg mt-6 mb-2">🧩 Problems we solve</h3>
          <ul className="space-y-2.5 text-[15px] leading-relaxed">
            <li>
              <strong>📦 Fragmented tooling.</strong> Today you need OpenSea for NFTs, Uniswap for swaps,
              Dexscreener for analytics, and a separate portfolio app. SakuraNFT collapses that into a single
              cohesive surface, so beginners stop bouncing between five tabs.
            </li>
            <li>
              <strong>🤖 AI that talks but can't act.</strong> Most chat assistants only describe DeFi. Hana
              proposes real on-chain transactions (swap, add liquidity, mint) that your wallet then signs —
              closing the loop between “explain it” and “do it for me.”
            </li>
            <li>
              <strong>🧾 Opaque NFT metadata.</strong> Many marketplaces dump JSON into the description field,
              breaking attribute filters and royalty enforcement. SakuraNFT writes ERC-721 standard fields
              (<code>attributes</code>, <code>category</code>, <code>royalty_bps</code>) at the top level so
              external marketplaces can read them too.
            </li>
            <li>
              <strong>💸 Hidden costs.</strong> Marketplace fees and seller payouts are previewed
              <em> before</em> you sign — no surprises after the transaction lands.
            </li>
            <li>
              <strong>🚧 Steep DeFi onramps.</strong> Concepts like AMM pricing, slippage, and impermanent loss
              get plain-language explainers in this doc and inline tooltips inside the trading UI.
            </li>
            <li>
              <strong>🔐 Trust on public data.</strong> Likes, comments, watchlists, listings, offers, and
              notifications are scoped to the connected wallet at the database layer — anonymous spam and
              cross-wallet tampering are blocked by RLS, not just by client checks.
            </li>
            <li>
              <strong>⚡ Slow detail pages.</strong> Marketplace cards and detail pages hydrate from a local
              cache instantly, then revalidate from chain events — so browsing feels native, not Web3-laggy.
            </li>
          </ul>

          <Callout tone="info" icon={<Sparkles className="w-4 h-4" />}>
            <strong>The thesis:</strong> a creator should be able to mint, list, price, and discover liquidity
            for their work — and a trader should be able to discover, value, and acquire it — without leaving
            a single browser tab. SakuraNFT is that single tab. 🌸
          </Callout>
        </Section>

        <Section id="wallet" icon={<Wallet className="w-5 h-5" />} title="Connect Wallet 🦊">
          <p>SakuraNFT supports any EIP-1193 wallet — <strong>MetaMask 🦊</strong>, <strong>Rabby 🐰</strong>, <strong>OKX</strong>, and <strong>Bitget</strong>.
            Click <em>Connect Wallet</em> in the header, approve the network switch to LitVM LiteForge testnet, and you're ready.</p>
          <Callout tone="tip">💡 Your private keys never leave your wallet. SakuraNFT only sees the address you authorize.</Callout>
        </Section>

        <Section id="faucet" icon={<Droplet className="w-5 h-5" />} title="Get Testnet Tokens 💧">
          <p>You need testnet <strong>{CHAIN.symbol}</strong> for gas. Open your wallet, switch to {CHAIN.name} (Chain ID {CHAIN.id}),
            then visit the public faucet to claim free testnet tokens. They are worthless on mainnet — purely for testing. 🧪</p>
          <a href={CHAIN.explorer} target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
            Open block explorer <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Section>

        <Section id="swap" icon={<Repeat className="w-5 h-5" />} title="How to Swap 🔁">
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Go to <Link to="/dex/swap" className="text-primary underline">DEX → Swap</Link>.</li>
            <li>Pick the token you have (top) and the token you want (bottom).</li>
            <li>Enter an amount. The router previews price impact, fees, and route.</li>
            <li>Approve the token (one-time) if it's an ERC-20, then click <em>Swap</em>.</li>
            <li>Confirm the transaction in your wallet. Done! 🌸</li>
          </ol>
        </Section>

        <Section id="liquidity" icon={<Droplet className="w-5 h-5" />} title="Provide Liquidity 💎">
          <p>Earn a share of every swap fee in a pool. Open <Link to="/dex/liquidity" className="text-primary underline">DEX → Liquidity</Link>,
            pick the pair, deposit both tokens at the current ratio, and receive LP tokens that represent your share. Remove anytime to redeem
            your underlying tokens plus accumulated fees.</p>
        </Section>

        <Section id="portfolio" icon={<Briefcase className="w-5 h-5" />} title="Portfolio & Send 💼">
          <p>Your <Link to="/profile" className="text-primary underline">Profile</Link> shows your owned NFTs, active listings, token balances,
            and synced watchlist. Use the <em>Send</em> button in the wallet dropdown to transfer native zkLTC or any ERC-20 token directly.</p>
        </Section>

        <Section id="analytics" icon={<BarChart3 className="w-5 h-5" />} title="Analytics & Pairs 📊">
          <p>The <Link to="/analytics" className="text-primary underline">Analytics</Link> dashboard surfaces real-time TVL, daily volume,
            sales, floor-price trends, and per-pool reserves with token logos for fast pair recognition.</p>
        </Section>

        <Section id="settings" icon={<SettingsIcon className="w-5 h-5" />} title="Settings ⚙️">
          <p>Customize slippage tolerance, transaction deadlines, expert mode, and theme (light/dark) from the controls inside each tool.
            All settings persist locally — your preferences travel with the browser.</p>
        </Section>

        <Section id="ai" icon={<Bot className="w-5 h-5" />} title="SakuraNFT AI 🤖">
          <p>In the bottom-right corner of every page lives <strong>Hana</strong>, the SakuraNFT AI assistant.
            She speaks natural language and can execute real on-chain actions: swap tokens, add liquidity, check balances,
            summarize markets, and walk you through minting. Try: <em>"swap 0.5 zkLTC to ETH"</em> or <em>"what is my portfolio worth?"</em></p>
        </Section>

        <Section id="amm" icon={<GitBranch className="w-5 h-5" />} title="AMM & Pricing 📐">
          <p>SakuraNFT uses the constant-product formula <code>x · y = k</code>. Each pool holds reserves of two tokens; trading one shifts the
            ratio and instantly re-prices the pair. No order books, no market makers — just math. 🧮</p>
        </Section>

        <Section id="il" icon={<AlertTriangle className="w-5 h-5" />} title="Impermanent Loss ⚠️">
          <p>When prices diverge after you deposit, your LP position can be worth less than simply holding the two tokens. The loss is
            "impermanent" because it reverses if prices return. Fees earned often offset it — always weigh both. ⚖️</p>
        </Section>

        <Section id="slippage" icon={<Percent className="w-5 h-5" />} title="Slippage & Price Impact 📉">
          <p><strong>Price impact</strong> is how much your trade moves the pool price. <strong>Slippage tolerance</strong> is the maximum
            price change you'll accept between signing and confirmation. Set it tighter on stable pairs, looser on thin liquidity.</p>
        </Section>

        <Section id="lp" icon={<Coins className="w-5 h-5" />} title="LP Tokens & Fees 🪙">
          <p>When you deposit liquidity you receive LP tokens — your receipt for the share of the pool. Every swap charges <strong>0.30%</strong>,
            of which <strong>0.25%</strong> flows back to LP holders automatically. Redeem your LP tokens any time to claim your share + fees. 💸</p>
        </Section>

        <Section id="stack" icon={<Layers className="w-5 h-5" />} title="Technology Stack 🧱">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Chain:</strong> {CHAIN.name} (ID {CHAIN.id})</li>
            <li><strong>Smart Contracts:</strong> Solidity, UniswapV2-style AMM, ERC-721 NFTs</li>
            <li><strong>Frontend:</strong> React 19, TanStack Start, Tailwind v4, Recharts</li>
            <li><strong>Backend:</strong> Lovable Cloud (Postgres + Edge), ethers.js v6</li>
            <li><strong>AI:</strong> Lovable AI Gateway (Gemini 2.5 Flash)</li>
            <li><strong>Storage:</strong> Decentralized IPFS via Pinata gateway + Cloudflare CDN edge cache</li>
          </ul>
        </Section>

        {/* SMART CONTRACTS */}
        <Section id="contracts" icon={<FileCode className="w-5 h-5" />} title="Smart Contracts 📜">
          <p className="mb-4">All contracts are deployed on <strong>{CHAIN.name}</strong>. Click any address to copy, or open it in the explorer.</p>
          <div className="grid gap-2">
            {Object.entries(CONTRACTS).map(([name, addr]) => (
              <ContractRow key={name} name={name} addr={addr} copied={copied === name}
                onCopy={() => copy(addr, name)} explorer={`${CHAIN.explorer}/address/${addr}`} />
            ))}
          </div>
        </Section>

        {/* SUPPORTED TOKENS */}
        <Section id="tokens" icon={<Database className="w-5 h-5" />} title="Supported Tokens 🪙">
          <p className="mb-4">Every token listed below is fully supported across swap, liquidity, portfolio, and analytics.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOKENS.map((t) => {
              const isNative = t.address === "native";
              const key = `tok-${t.symbol}`;
              return (
                <div key={t.symbol} className="rounded-2xl form-solid p-3.5 hover:border-primary/40 transition group">
                  <div className="flex items-center gap-3 mb-2">
                    <img src={t.logo} alt={t.symbol} className="w-10 h-10 rounded-full ring-1 ring-border" loading="lazy" decoding="async" />
                    <div className="min-w-0">
                      <div className="font-semibold flex items-center gap-2">
                        {t.symbol}
                        {isNative && <span className="text-[9px] bg-fuchsia-500/20 text-fuchsia-300 px-1.5 py-0.5 rounded">NATIVE</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{t.name}</div>
                    </div>
                  </div>
                  {!isNative && (
                    <div className="flex items-center justify-between text-[11px] bg-background/40 rounded-lg px-2 py-1.5">
                      <code className="truncate text-muted-foreground">{`${(t.address as string).slice(0, 8)}…${(t.address as string).slice(-6)}`}</code>
                      <button onClick={() => copy(t.address as string, key)} className="text-muted-foreground hover:text-primary shrink-0 ml-2">
                        {copied === key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        <Section id="roadmap" icon={<Map className="w-5 h-5" />} title="Development Roadmap 🗺️">
          <ul className="space-y-2">
            <li>✅ V1 — Marketplace, AMM swap, liquidity, profile, AI assistant</li>
            <li>🔄 V2 — Concentrated liquidity, limit orders, NFT lending</li>
            <li>🌐 V3 — Cross-chain bridges, mainnet launch, mobile app</li>
          </ul>
        </Section>

        <Section id="faq" icon={<HelpCircle className="w-5 h-5" />} title="FAQ ❓">
          <FAQ q="Is this real money?" a="No. SakuraNFT runs on the LitVM LiteForge testnet. zkLTC has no monetary value and is freely claimable from the faucet." />
          <FAQ q="Do I pay gas?" a="Yes. Every on-chain action consumes testnet zkLTC for gas." />
          <FAQ q="Which file types can I mint?" a="PNG, JPEG, WebP, and GIF up to 5 MB. Larger files are rejected client-side and auto-compressed to WebP when possible." />
          <FAQ q="Can I cancel a listing?" a="Yes. Open the NFT page and click Cancel — it disappears from the marketplace immediately." />
          <FAQ q="How does the AI execute trades?" a="Hana proposes the transaction and your wallet prompts you to sign. Nothing happens without your approval." />
        </Section>

        <div className="rounded-2xl glass border border-border/60 p-6 text-center">
          <Sparkles className="w-7 h-7 mx-auto text-primary mb-2" />
          <h3 className="font-bold text-lg">Ready to bloom? 🌸</h3>
          <p className="text-sm text-muted-foreground mt-1">Connect a wallet and start your SakuraNFT journey in under a minute.</p>
          <div className="flex justify-center gap-2 mt-4">
            <Link to="/mint" className="rounded-full px-4 py-2 text-sm font-semibold bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Mint NFT</Link>
            <Link to="/dex/swap" className="rounded-full px-4 py-2 text-sm font-semibold border border-border bg-card inline-flex items-center gap-1"><Repeat className="w-4 h-4" /> Try a swap</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section data-doc id={id} className="scroll-mt-24">
      <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 mb-4">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white flex items-center justify-center shadow-lg">{icon}</span>
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl form-solid p-4">
      <div className="w-9 h-9 rounded-lg bg-fuchsia-500/15 text-fuchsia-300 flex items-center justify-center mb-2">{icon}</div>
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
    </div>
  );
}

function KeyFeature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl form-solid p-4 hover:border-fuchsia-400/40 transition">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-pink-500/10 text-fuchsia-300 flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
        </div>
      </div>
    </div>
  );
}

function Callout({ tone, icon, children }: { tone: "info" | "tip"; icon?: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === "tip"
    ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
    : "border-fuchsia-400/40 bg-fuchsia-500/10";
  return (
    <div className={`rounded-xl border ${cls} p-3.5 text-sm flex items-start gap-2 mt-5`}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div>{children}</div>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-xl form-solid p-4 group">
      <summary className="cursor-pointer font-semibold flex items-center justify-between">
        {q}
        <span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <p className="text-sm text-muted-foreground mt-2">{a}</p>
    </details>
  );
}

function ContractRow({ name, addr, copied, onCopy, explorer }: { name: string; addr: string; copied: boolean; onCopy: () => void; explorer: string }) {
  const labels: Record<string, string> = {
    marketplace: "Marketplace",
    nftCollection: "NFT Collection (ERC-721)",
    offer: "Offer / Bids",
    factory: "DEX Factory",
    weth: "Wrapped zkLTC (wzkLTC)",
    router: "DEX Router (V2)",
  };
  return (
    <div className="rounded-xl form-solid p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold text-sm">{labels[name] ?? name}</div>
        <code className="text-xs text-muted-foreground truncate block">{addr}</code>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onCopy} className="p-2 rounded-lg hover:bg-accent/40 text-muted-foreground hover:text-primary" title="Copy">
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
        <a href={explorer} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-accent/40 text-muted-foreground hover:text-primary" title="Open in explorer">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
