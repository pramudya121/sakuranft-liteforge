import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts, Link } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { WalletProvider } from "@/contexts/WalletContext";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";

function NotFoundComponent() {
  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center glass p-10 rounded-3xl">
          <h1 className="text-7xl font-bold gradient-text">404</h1>
          <p className="mt-2 text-muted-foreground">This sakura blossom couldn't be found.</p>
          <Link to="/" className="mt-6 inline-block px-6 py-2 rounded-full bg-primary text-primary-foreground">Go Home</Link>
        </div>
      </div>
    </Layout>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center glass p-10 rounded-3xl max-w-md">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 px-6 py-2 rounded-full bg-primary text-primary-foreground">Try again</button>
        </div>
      </div>
    </Layout>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SakuraNFT — Winter Sakura NFT Marketplace & DEX on LitVM" },
      { name: "description", content: "Mint, trade NFTs and swap zkLTC on LitVM LiteForge Testnet with a magical winter sakura aesthetic." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <Layout><Outlet /></Layout>
        <Toaster position="top-right" />
      </WalletProvider>
    </QueryClientProvider>
  );
}
