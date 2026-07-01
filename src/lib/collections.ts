import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CollectionMeta = {
  contract_address: string;
  name: string | null;
  logo_url: string | null;
  verified: boolean;
};

// Module-level cache so every card doesn't re-fetch.
let cache: CollectionMeta[] | null = null;
let inflight: Promise<CollectionMeta[]> | null = null;
const subscribers = new Set<(v: CollectionMeta[]) => void>();

async function loadCollections(): Promise<CollectionMeta[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = supabase
    .from("collections_metadata")
    .select("contract_address, name, logo_url, verified")
    .limit(500)
    .then(({ data }) => {
      cache = (data ?? []) as CollectionMeta[];
      subscribers.forEach((cb) => cb(cache!));
      inflight = null;
      return cache;
    });
  return inflight;
}

export function useCollections() {
  const [cols, setCols] = useState<CollectionMeta[]>(cache ?? []);
  useEffect(() => {
    let alive = true;
    loadCollections().then((v) => alive && setCols(v));
    const cb = (v: CollectionMeta[]) => alive && setCols(v);
    subscribers.add(cb);
    return () => { alive = false; subscribers.delete(cb); };
  }, []);
  const find = (slug?: string | null) =>
    slug ? cols.find((c) => c.contract_address === slug) ?? null : null;
  return { cols, find, verifiedCount: cols.filter((c) => c.verified).length };
}

export function isVerifiedCollection(slug?: string | null) {
  if (!slug || !cache) return false;
  return cache.some((c) => c.contract_address === slug && c.verified);
}
