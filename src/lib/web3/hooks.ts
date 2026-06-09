import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { CONTRACTS, MARKETPLACE_ABI, NFT_ABI, OFFER_ABI } from "./contracts";
import { readProvider, decodeTokenUri } from "./ethers";

export type NFTMeta = {
  tokenId: bigint;
  owner: string;
  tokenURI: string;
  name: string;
  description: string;
  image: string;
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

export function useAllNFTs() {
  const [nfts, setNfts] = useState<NFTMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = () => setTick((t) => t + 1);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const nft = new Contract(CONTRACTS.nftCollection, NFT_ABI, readProvider);
        const total: bigint = await nft.totalMinted();
        const items: NFTMeta[] = [];
        for (let i = 1n; i <= total; i++) {
          try {
            const [uri, owner] = await Promise.all([nft.tokenURI(i), nft.ownerOf(i)]);
            const meta = decodeTokenUri(uri) ?? {};
            items.push({
              tokenId: i, owner, tokenURI: uri,
              name: meta.name ?? `NFT #${i}`,
              description: meta.description ?? "",
              image: meta.image ?? "",
            });
          } catch {}
        }
        if (!cancelled) setNfts(items.reverse());
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tick]);
  // Auto-refresh owner data on any Transfer event
  useEffect(() => {
    const nft = new Contract(CONTRACTS.nftCollection, NFT_ABI, readProvider);
    const handler = () => refetch();
    nft.on("Transfer", handler);
    return () => { nft.off("Transfer", handler); };
  }, []);
  return { nfts, loading, refetch };
}

export function useAllListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = () => setTick((t) => t + 1);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mp = new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
        const count: bigint = await mp.listingCount();
        const items: Listing[] = [];
        for (let i = 1n; i <= count; i++) {
          try {
            const r = await mp.listings(i);
            if (r.active) {
              items.push({
                listingId: i,
                seller: r.seller, nft: r.nft, tokenId: r.tokenId,
                price: r.price, priceEth: formatEther(r.price), active: r.active,
              });
            }
          } catch {}
        }
        if (!cancelled) setListings(items);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tick]);
  // Auto-refresh on listing lifecycle events
  useEffect(() => {
    const mp = new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
    const handler = () => refetch();
    mp.on("Listed", handler);
    mp.on("Sold", handler);
    mp.on("ListingCancelled", handler);
    return () => {
      mp.off("Listed", handler);
      mp.off("Sold", handler);
      mp.off("ListingCancelled", handler);
    };
  }, []);
  return { listings, loading, refetch };
}

export function useNFT(tokenId: string | undefined) {
  const [nft, setNft] = useState<NFTMeta | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = () => setTick((t) => t + 1);
  useEffect(() => {
    if (!tokenId) return;
    let cancelled = false;
    (async () => {
      try {
        const id = BigInt(tokenId);
        const nftC = new Contract(CONTRACTS.nftCollection, NFT_ABI, readProvider);
        const [uri, owner] = await Promise.all([nftC.tokenURI(id), nftC.ownerOf(id)]);
        const meta = decodeTokenUri(uri) ?? {};
        if (cancelled) return;
        setNft({
          tokenId: id, owner, tokenURI: uri,
          name: meta.name ?? `NFT #${id}`,
          description: meta.description ?? "",
          image: meta.image ?? "",
        });
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
        } catch {}
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tokenId, tick]);
  // Auto-refresh on any relevant on-chain event for this token
  useEffect(() => {
    if (!tokenId) return;
    const nftC = new Contract(CONTRACTS.nftCollection, NFT_ABI, readProvider);
    const mp = new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
    const handler = () => refetch();
    nftC.on("Transfer", handler);
    mp.on("Listed", handler);
    mp.on("Sold", handler);
    mp.on("ListingCancelled", handler);
    mp.on("PriceUpdated", handler);
    return () => {
      nftC.off("Transfer", handler);
      mp.off("Listed", handler);
      mp.off("Sold", handler);
      mp.off("ListingCancelled", handler);
      mp.off("PriceUpdated", handler);
    };
  }, [tokenId]);
  return { nft, listing, loading, refetch };
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
  // Auto-refresh on offer lifecycle events
  useEffect(() => {
    if (!tokenId) return;
    const c = new Contract(CONTRACTS.offer, OFFER_ABI, readProvider);
    const handler = () => refetch();
    c.on("OfferMade", handler);
    c.on("OfferCancelled", handler);
    c.on("OfferAccepted", handler);
    return () => {
      c.off("OfferMade", handler);
      c.off("OfferCancelled", handler);
      c.off("OfferAccepted", handler);
    };
  }, [tokenId]);
  return { offers, refetch };
}

// Local storage helpers for off-chain features (watchlist, profile, notifications)
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
