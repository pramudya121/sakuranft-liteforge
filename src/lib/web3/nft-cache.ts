// In-memory + sessionStorage cache for NFT metadata.
// Token URIs are immutable per tokenId on this contract (mintNFT bakes URI in),
// so the (uri, decoded) pair is cached forever. Owners change → refreshed on
// Transfer event by useAllNFTs, which calls invalidateOwners().

import { decodeTokenUri } from "./ethers";

export type CachedNFT = {
  tokenId: string;       // bigint → string for serialization
  owner: string;
  tokenURI: string;
  name: string;
  description: string;
  image: string;
};

const KEY = "sakura.nftCache.v2";
const mem = new Map<string, CachedNFT>();
let loaded = false;

function loadPersisted() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, CachedNFT>;
    for (const [k, v] of Object.entries(obj)) mem.set(k, v);
  } catch {}
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist() {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const obj: Record<string, CachedNFT> = {};
      for (const [k, v] of mem.entries()) obj[k] = v;
      sessionStorage.setItem(KEY, JSON.stringify(obj));
    } catch {}
  }, 400);
}

export function getCachedNFT(tokenId: bigint | string): CachedNFT | null {
  loadPersisted();
  return mem.get(tokenId.toString()) ?? null;
}

export function setCachedNFT(item: CachedNFT) {
  loadPersisted();
  mem.set(item.tokenId, item);
  schedulePersist();
}

export function allCached(): CachedNFT[] {
  loadPersisted();
  return Array.from(mem.values());
}

export function invalidateOwners() {
  // Owners may change; wipe owner so callers re-fetch ownerOf only.
  loadPersisted();
  for (const v of mem.values()) v.owner = "";
  schedulePersist();
}

// Decode + cache a single (tokenId, uri, owner) tuple.
export function ingest(tokenId: bigint, uri: string, owner: string): CachedNFT {
  const idStr = tokenId.toString();
  const prior = mem.get(idStr);
  const meta = prior?.tokenURI === uri && prior.name
    ? { name: prior.name, description: prior.description, image: prior.image }
    : (() => {
        const m = decodeTokenUri(uri) ?? {};
        return {
          name: m.name ?? `NFT #${idStr}`,
          description: m.description ?? "",
          image: m.image ?? "",
        };
      })();
  const next: CachedNFT = { tokenId: idStr, owner, tokenURI: uri, ...meta };
  mem.set(idStr, next);
  schedulePersist();
  return next;
}

// Run an async mapper in batches of `concurrency`. Returns results in order.
export async function pMapBatched<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try { out[idx] = await fn(items[idx], idx); } catch { /* keep undefined */ }
    }
  });
  await Promise.all(workers);
  return out;
}
