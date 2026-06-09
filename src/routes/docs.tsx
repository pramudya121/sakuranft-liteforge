import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Sparkles, Wallet, Store, Plus, Repeat, Bot, Shield, Zap, Flame, Heart, Tag, TrendingUp, Image as ImageIcon, ArrowRight, Github, Twitter } from "lucide-react";

export const Route = createFileRoute("/docs")({
  component: Docs,
  head: () => ({
    meta: [
      { title: "Documentation — SakuraNFT" },
      { name: "description", content: "The complete guide to SakuraNFT — mint, trade, swap, and explore the petal-soft Web3 ecosystem on LitVM LiteForge." },
      { property: "og:title", content: "SakuraNFT Documentation 🌸" },
      { property: "og:description", content: "Everything you need to know about minting, trading, swapping, and building on SakuraNFT." },
    ],
  }),
});

const sections = [
  { id: "intro", label: "Introduction" },
  { id: "wallet", label: "Wallet Setup" },
  { id: "mint", label: "Minting" },
  { id: "marketplace", label: "Marketplace" },
  { id: "dex", label: "DEX & Liquidity" },
  { id: "ai", label: "AI Trading Bot" },
  { id: "profile", label: "Profile & Watchlist" },
  { id: "security", label: "Security" },
  { id: "faq", label: "FAQ" },
];

function Docs() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <div className="rounded-3xl glass glow-card p-8 md:p-12 text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-semibold mb-4">
          <BookOpen className="w-3.5 h-3.5" /> DOCUMENTATION · v1.0
        </div>
        <h1 className="text-4xl md:text-6xl font-bold gradient-text">SakuraNFT Docs 🌸</h1>
        <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
          A complete, friendly walkthrough of every petal of the SakuraNFT garden — from your very first wallet
          connection 🦊 to advanced AI-assisted swaps 🤖. Whether you are a brand new collector or a seasoned
          on-chain trader, this guide will help you bloom.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          <Link to="/mint" className="rounded-full px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-lg inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Start minting
          </Link>
          <Link to="/marketplace" className="rounded-full px-5 py-2.5 text-sm font-semibold border border-border bg-card inline-flex items-center gap-2">
            <Store className="w-4 h-4" /> Browse market <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-8">
        {/* TOC */}
        <aside className="md:sticky md:top-24 self-start">
          <nav className="rounded-2xl form-solid p-4 space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 pb-2">On this page</p>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}
                className="block px-3 py-1.5 rounded-lg text-sm hover:bg-accent/40 hover:text-primary text-muted-foreground">
                {s.label}
              </a>
            ))}
            <div className="pt-3 mt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground px-2">
              <a className="hover:text-primary inline-flex items-center gap-1" href="#"><Github className="w-3.5 h-3.5" /> GitHub</a>
              <span>·</span>
              <a className="hover:text-primary inline-flex items-center gap-1" href="#"><Twitter className="w-3.5 h-3.5" /> Twitter</a>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main className="space-y-10">
          <Section id="intro" icon={<Sparkles className="w-5 h-5" />} title="What is SakuraNFT? 🌸">
            <p>
              <strong>SakuraNFT</strong> is a community-first Web3 destination built on the
              <em> LitVM LiteForge testnet</em>, powered by the native <strong>zkLTC</strong> token. It blends the
              warm, hand-crafted feel of a Japanese spring festival with the precision of a modern decentralized
              marketplace and exchange. 🏯✨
            </p>
            <p>
              The platform is more than a marketplace — it is an entire on-chain garden. You can mint generative
              digital art 🎨, trade rare collectibles 🃏, provide liquidity to token pairs 💧, swap assets through a
              gas-aware smart router ⚡, and even chat with a built-in AI assistant that can execute on-chain
              actions for you 🤖. Every petal of the experience was designed to feel alive: from the falling
              cherry blossoms in the background to the silky animations that respond to your every interaction.
            </p>
            <Cards>
              <Card icon={<Plus className="w-5 h-5" />} title="Mint" body="Create gas-efficient ERC-721 NFTs with built-in IPFS storage." />
              <Card icon={<Store className="w-5 h-5" />} title="Trade" body="List, buy, and make offers — all settled on-chain." />
              <Card icon={<Repeat className="w-5 h-5" />} title="Swap" body="Smart router with multi-hop routing across pools." />
              <Card icon={<Bot className="w-5 h-5" />} title="AI Bot" body="Conversational assistant that can swap, list, and analyze." />
            </Cards>
          </Section>

          <Section id="wallet" icon={<Wallet className="w-5 h-5" />} title="Wallet Setup 🦊">
            <p>
              SakuraNFT supports any EIP-1193 compatible wallet. Out of the box you can connect with
              <strong> MetaMask 🦊</strong>, <strong>Rabby 🐰</strong>, <strong>OKX Wallet</strong>, and
              <strong> Bitget Wallet</strong>. Once you click <em>Connect Wallet</em> in the header, the app will
              ask your wallet to switch to the LitVM LiteForge testnet — if the network isn't installed yet, it
              will be added automatically for you. No manual RPC pasting required. 🎉
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Install your preferred wallet extension. 🧩</li>
              <li>Click <strong>Connect Wallet</strong> in the top-right corner.</li>
              <li>Select your wallet and approve the connection request.</li>
              <li>Accept the network switch prompt to join LitVM LiteForge testnet.</li>
              <li>Need testnet zkLTC? Visit the public faucet and request a drop. 💧</li>
            </ol>
            <Callout tone="info">
              💡 Your private keys never leave your wallet. SakuraNFT only sees the public address you choose to share.
            </Callout>
          </Section>

          <Section id="mint" icon={<Plus className="w-5 h-5" />} title="Minting Your First NFT 🎨">
            <p>
              The <Link className="text-primary underline" to="/mint">Mint</Link> page is your creative studio.
              Drag an image, give it a name, add a description, optionally attach traits, and hit <em>Mint</em>.
              Behind the scenes, SakuraNFT will:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>🗜️ Compress and upload your image to decentralized storage.</li>
              <li>🧾 Generate ERC-721 compliant metadata (name, description, attributes, image URI).</li>
              <li>⛓️ Call the on-chain <code>mint()</code> function from your connected wallet.</li>
              <li>🌸 Redirect you to the freshly minted NFT page once the transaction is confirmed.</li>
            </ul>
            <Callout tone="tip">
              ⚡ Pro tip: keep images under 5 MB and prefer <code>.webp</code> or <code>.jpg</code> for the snappiest experience.
            </Callout>
          </Section>

          <Section id="marketplace" icon={<Store className="w-5 h-5" />} title="The Marketplace 🛍️">
            <p>
              The <Link className="text-primary underline" to="/marketplace">Marketplace</Link> is the heart of
              SakuraNFT. Only NFTs that are <strong>actively listed</strong> appear here — once an item is sold or
              delisted, it disappears instantly and reappears the moment its new owner relists it. This keeps the
              shelves fresh and the discovery experience honest. 🪞
            </p>
            <Cards>
              <Card icon={<Tag className="w-5 h-5" />} title="List for sale" body="Set a price in zkLTC and approve the marketplace once — instant settlement." />
              <Card icon={<TrendingUp className="w-5 h-5" />} title="Make offers" body="Offer below ask price. Sellers can accept any time before expiry." />
              <Card icon={<Heart className="w-5 h-5" />} title="Watchlist" body="Tap the heart on any NFT to track it — synced across devices in your Profile." />
              <Card icon={<ImageIcon className="w-5 h-5" />} title="Collections" body="Browse curated collections with floor price, volume, and holder stats." />
            </Cards>
          </Section>

          <Section id="dex" icon={<Repeat className="w-5 h-5" />} title="DEX & Liquidity 💧">
            <p>
              SakuraNFT ships with a built-in Uniswap-V2 style decentralized exchange. The
              <Link className="text-primary underline" to="/dex"> DEX</Link> features an intelligent multi-hop
              router that automatically finds the cheapest path between any two supported tokens, even when no
              direct pool exists. You can also become a liquidity provider and earn fees on every trade routed
              through your pool. 🌊
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Smart routing 🧠</strong> — up to 3 hops, with live price impact and total fee preview.</li>
              <li><strong>Wrap & unwrap ↔️</strong> — native zkLTC ↔ wzkLTC with zero slippage, zero fees.</li>
              <li><strong>Liquidity provisioning 💎</strong> — single click to add, remove, or rebalance.</li>
              <li><strong>Slippage controls ⚙️</strong> — fine-tune from 0.05% to 50% with one tap presets.</li>
            </ul>
          </Section>

          <Section id="ai" icon={<Bot className="w-5 h-5" />} title="AI Trading Bot 🤖">
            <p>
              In the bottom-right corner of every page lives <strong>Hana</strong>, the SakuraNFT AI companion.
              Hana speaks natural language and can execute real on-chain actions: she can swap tokens,
              add or remove liquidity, check your balances, summarize market trends, and walk you through
              minting your first NFT — all from within the chat window. 💬
            </p>
            <Callout tone="tip">
              💡 Try asking: <em>"swap 0.5 zkLTC to USDC"</em> or <em>"what is my portfolio worth?"</em>
            </Callout>
          </Section>

          <Section id="profile" icon={<Heart className="w-5 h-5" />} title="Profile & Watchlist 💖">
            <p>
              Your <Link className="text-primary underline" to="/profile">Profile</Link> is your on-chain identity.
              Customize your avatar, banner, bio, and links — and review every NFT you own, every active listing,
              your token balances, and your synced <strong>Watchlist</strong> ❤️ in dedicated tabs. Achievements
              appear automatically as you mint, collect, and trade. 🏆
            </p>
          </Section>

          <Section id="security" icon={<Shield className="w-5 h-5" />} title="Security & Best Practices 🔐">
            <p>
              SakuraNFT was built with a security-first mindset. All sensitive operations run through audited
              smart contracts, all user uploads are MIME and size validated, and every external link is
              sanitized before rendering. We never custody your assets — every transaction is signed by your
              wallet, and you remain in full control at all times. 🛡️
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>✅ Verify the URL bar reads the official SakuraNFT domain before signing.</li>
              <li>✅ Inspect every transaction in your wallet popup before approving.</li>
              <li>✅ Use a hardware wallet (Ledger / Trezor) for high-value collections.</li>
              <li>❌ Never share your seed phrase — no one from the SakuraNFT team will ever ask.</li>
            </ul>
          </Section>

          <Section id="faq" icon={<Flame className="w-5 h-5" />} title="FAQ ❓">
            <FAQ q="Is this real money?" a="No. SakuraNFT currently runs on LitVM LiteForge testnet. The zkLTC token has no monetary value and is freely available from the faucet." />
            <FAQ q="Do I need to pay gas?" a="Yes, every on-chain action consumes a tiny amount of testnet zkLTC for gas. Top up from the faucet whenever you're low." />
            <FAQ q="Which file types can I mint?" a="PNG, JPEG, WebP, and GIF up to 5 MB. Larger files will be rejected client-side before upload." />
            <FAQ q="Can I cancel a listing?" a="Absolutely. Open the NFT detail page and click 'Cancel listing'. The NFT disappears from the marketplace instantly." />
            <FAQ q="How does the AI bot execute trades?" a="Hana proposes a transaction in the chat and your wallet prompts you to sign. Nothing happens without your explicit approval." />
          </Section>

          <div className="rounded-2xl glass p-6 text-center">
            <Zap className="w-7 h-7 mx-auto text-primary mb-2" />
            <h3 className="font-bold text-lg">Ready to bloom? 🌸</h3>
            <p className="text-sm text-muted-foreground mt-1">Connect a wallet and start your SakuraNFT journey in under a minute.</p>
            <div className="flex justify-center gap-2 mt-4">
              <Link to="/mint" className="rounded-full px-4 py-2 text-sm font-semibold bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white">Mint your first NFT</Link>
              <Link to="/marketplace" className="rounded-full px-4 py-2 text-sm font-semibold border border-border bg-card">Browse market</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Section({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 mb-4">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center">{icon}</span>
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function Cards({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3 mt-4">{children}</div>;
}

function Card({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl form-solid p-4">
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">{icon}</div>
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
    </div>
  );
}

function Callout({ tone, children }: { tone: "info" | "tip"; children: React.ReactNode }) {
  const cls = tone === "tip"
    ? "border-amber-400/40 bg-amber-400/10"
    : "border-primary/40 bg-primary/10";
  return <div className={`rounded-xl border ${cls} p-3.5 text-sm`}>{children}</div>;
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
