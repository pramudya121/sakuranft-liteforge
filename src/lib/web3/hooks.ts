import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { CONTRACTS, MARKETPLACE_ABI, NFT_ABI, OFFER_ABI } from "./contracts";
import { readProvider, decodeTokenUri } from "./ethers";
import { allCached, getCachedNFT, ingest, invalidateOwners, pMapBatched, type CachedNFT, type NFTAttribute } from "./nft-cache";

export type NFTMeta = {
  tokenId: bigint;
  owner: string;
  tokenURI: string;
  name: string;
  description: string;
  image: string;
  attributes?: NFTAttribute[];
  category?: string;
  royalty_bps?: number;
};

export type Listing = {
  listingId: bigint;
  seller: string;
  nft: string;
  tokenId: bigint;
  price: bigint;
  priceEth: string;
  active: boolean;
};

const CHAIN_POLL_MS = 8000;

// ---------- module-level shared caches (live across route changes) ----------
let cachedListings: Listing[] | null = null;
let cachedListingCount = 0n;

function toMeta(c: CachedNFT): NFTMeta {
  return { ...c, tokenId: BigInt(c.tokenId) };
}

export function useAllNFTs() {
  const [nfts, setNfts] = useState<NFTMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = allCached().map(toMeta).sort((a, b) => Number(b.tokenId - a.tokenId));
        if (cached.length > 0 && !cancelled) {
          setNfts(cached);
          setLoading(false);
        }

        const nft = new Contract(CONTRACTS.nftCollection, NFT_ABI, readProvider);
        const total: bigint = await nft.totalMinted();
        if (cancelled) return;

        const ids: bigint[] = [];
        for (let i = 1n; i <= total; i++) ids.push(i);

        // Phase 1: fast — for any cached token with known owner, surface it now.
        const hydrated = ids
          .map((id) => getCachedNFT(id))
          .filter((c): c is NonNullable<ReturnType<typeof getCachedNFT>> => !!c && !!c.owner)
          .map(toMeta);
        if (hydrated.length > 0 && !cancelled) {
          setNfts(hydrated.sort((a, b) => Number(b.tokenId - a.tokenId)));
          setLoading(false);
        }

        // Phase 2: parallel-fetch missing tokens (URI + owner), 8 at a time.
        const needed = ids.filter((id) => {
          const c = getCachedNFT(id);
          return !c || !c.owner || !c.tokenURI;
        });
        await pMapBatched(needed, 8, async (id) => {
          const cached = getCachedNFT(id);
          const [uri, owner] = await Promise.all([
            cached?.tokenURI ? Promise.resolve(cached.tokenURI) : nft.tokenURI(id),
            nft.ownerOf(id),
          ]);
          ingest(id, uri, owner);
        });

        if (cancelled) return;
        const final = ids
          .map((id) => getCachedNFT(id))
          .filter((c): c is NonNullable<ReturnType<typeof getCachedNFT>> => !!c)
          .map(toMeta)
          .sort((a, b) => Number(b.tokenId - a.tokenId));
        setNfts(final);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tick]);

  useEffect(() => {
    const timer = setInterval(() => {
      invalidateOwners();
      refetch();
    }, CHAIN_POLL_MS);
    return () => clearInterval(timer);
  }, []);

  return { nfts, loading, refetch };
}

export function useAllListings() {
  const [listings, setListings] = useState<Listing[]>(() => cachedListings ?? []);
  const [loading, setLoading] = useState(!cachedListings);
  const [tick, setTick] = useState(0);
  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mp = new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
        const count: bigint = await mp.listingCount();
        if (cancelled) return;
        // Fast path: if no new listings since last fetch and we have a cache, skip refetch.
        if (cachedListings && count === cachedListingCount && tick === 0) {
          setLoading(false);
          return;
        }
        const ids: bigint[] = [];
        for (let i = 1n; i <= count; i++) ids.push(i);

        const rows = await pMapBatched(ids, 12, async (i) => {
          try {
            const r = await mp.listings(i);
            if (!r.active) return null;
            return {
              listingId: i,
              seller: r.seller, nft: r.nft, tokenId: r.tokenId,
              price: r.price, priceEth: formatEther(r.price), active: r.active,
            } as Listing;
          } catch { return null; }
        });
        const items = rows.filter((x): x is Listing => !!x);
        cachedListings = items;
        cachedListingCount = count;
        if (!cancelled) setListings(items);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tick]);

  useEffect(() => {
    const timer = setInterval(() => {
      cachedListings = null;
      refetch();
    }, CHAIN_POLL_MS);
    return () => clearInterval(timer);
  }, []);

  return { listings, loading, refetch };
}

export function useNFT(tokenId: string | undefined) {
  const [nft, setNft] = useState<NFTMeta | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!tokenId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const id = BigInt(tokenId);
        const cached = getCachedNFT(id);
        if (cached?.owner && !cancelled) setNft(toMeta(cached));
        const nftC = new Contract(CONTRACTS.nftCollection, NFT_ABI, readProvider);
        const [uri, owner] = await Promise.all([
          cached?.tokenURI ? Promise.resolve(cached.tokenURI) : nftC.tokenURI(id),
          nftC.ownerOf(id),
        ]);
        const next = ingest(id, uri, owner);
        if (cancelled) return;
        setNft(toMeta(next));
        try {
          const mp = new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
          const r = await mp.getActiveListing(CONTRACTS.nftCollection, id);
          if (cancelled) return;
          if (r.active) {
            setListing({
              listingId: r.listingId, seller: r.seller, nft: CONTRACTS.nftCollection,
              tokenId: id, price: r.price, priceEth: formatEther(r.price), active: true,
            });
          } else {
            setListing(null);
          }
        } catch {
          setListing(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.shortMessage ?? e?.message ?? "Failed to load NFT");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tokenId, tick]);

  useEffect(() => {
    if (!tokenId) return;
    const timer = setInterval(() => refetch(), CHAIN_POLL_MS);
    return () => clearInterval(timer);
  }, [tokenId]);
  // intentionally also re-export decodeTokenUri usage indirectly via ingest
  void decodeTokenUri;
  return { nft, listing, loading, error, refetch };
}

export function useOffers(tokenId: string | undefined) {
  const [offers, setOffers] = useState<{ idx: number; offerer: string; value: bigint; valueEth: string; active: boolean }[]>([]);
  const [tick, setTick] = useState(0);
  const refetch = () => setTick((t) => t + 1);
  useEffect(() => {
    if (!tokenId) return;
    let cancelled = false;
    (async () => {
      const c = new Contract(CONTRACTS.offer, OFFER_ABI, readProvider);
      const items: any[] = [];
      for (let i = 0; i < 50; i++) {
        try {
          const r = await c.offers(CONTRACTS.nftCollection, BigInt(tokenId), BigInt(i));
          if (r.offerer === "0x0000000000000000000000000000000000000000") break;
          items.push({ idx: i, offerer: r.offerer, value: r.value, valueEth: formatEther(r.value), active: r.active });
        } catch { break; }
      }
      if (!cancelled) setOffers(items);
    })();
    return () => { cancelled = true; };
  }, [tokenId, tick]);
  useEffect(() => {
    if (!tokenId) return;
    const timer = setInterval(() => refetch(), CHAIN_POLL_MS);
    return () => clearInterval(timer);
  }, [tokenId]);
  return { offers, refetch };
}

// Local storage helpers
export function useLocalStorage<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV] as const;
}
