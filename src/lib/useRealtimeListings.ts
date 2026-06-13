import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DBListing = {
  id: string;
  listing_id: number | null;
  token_id: number;
  seller: string;
  price_wei: string;
  price_eth: number;
  currency: string;
  status: string;
  tx_hash: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

/**
 * Live subscription to public.listings.
 * Marketplace components consume this instead of (or alongside) on-chain reads
 * so price changes & new listings appear instantly without re-scanning the chain.
 */
export function useRealtimeListings(opts?: { status?: string; tokenId?: number | bigint }) {
  const [listings, setListings] = useState<DBListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let q = supabase.from("listings").select("*").order("updated_at", { ascending: false });
    if (opts?.status) q = q.eq("status", opts.status);
    if (opts?.tokenId !== undefined) q = q.eq("token_id", Number(opts.tokenId));
    const { data } = await q;
    setListings((data ?? []) as DBListing[]);
    setLoading(false);
  }, [opts?.status, opts?.tokenId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("listings-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        (payload) => {
          setListings((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as DBListing;
              if (opts?.status && row.status !== opts.status) return prev;
              if (opts?.tokenId !== undefined && row.token_id !== Number(opts.tokenId)) return prev;
              return [row, ...prev.filter((x) => x.id !== row.id)];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as DBListing;
              const filtered = prev.filter((x) => x.id !== row.id);
              if (opts?.status && row.status !== opts.status) return filtered;
              if (opts?.tokenId !== undefined && row.token_id !== Number(opts.tokenId)) return filtered;
              return [row, ...filtered];
            }
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as DBListing;
              return prev.filter((x) => x.id !== oldRow.id);
            }
            return prev;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load, opts?.status, opts?.tokenId]);

  return { listings, loading, reload: load };
}

// ---- Mutation helpers ----

export async function recordListing(input: {
  listingId?: bigint | number | null;
  tokenId: bigint | number;
  seller: string;
  priceWei: bigint | string;
  priceEth: number | string;
  currency?: string;
  txHash?: string;
  metadata?: Record<string, unknown>;
}) {
  const row = {
    listing_id: input.listingId !== undefined && input.listingId !== null ? Number(input.listingId) : null,
    token_id: Number(input.tokenId),
    seller: input.seller.toLowerCase(),
    price_wei: input.priceWei.toString(),
    price_eth: Number(input.priceEth),
    currency: input.currency ?? "zkLTC",
    status: "active",
    tx_hash: input.txHash ?? null,
    metadata: (input.metadata ?? null) as any,
  };
  const { data, error } = await supabase.from("listings").insert(row).select().single();
  if (error) throw error;
  return data as DBListing;
}

export async function updateListingPrice(id: string, priceWei: bigint | string, priceEth: number | string) {
  const { error } = await supabase
    .from("listings")
    .update({ price_wei: priceWei.toString(), price_eth: Number(priceEth) })
    .eq("id", id);
  if (error) throw error;
}

export async function cancelListing(id: string, txHash?: string) {
  const { error } = await supabase
    .from("listings")
    .update({ status: "cancelled", tx_hash: txHash ?? null })
    .eq("id", id);
  if (error) throw error;
}

export async function markListingSold(id: string, txHash?: string) {
  const { error } = await supabase
    .from("listings")
    .update({ status: "sold", tx_hash: txHash ?? null })
    .eq("id", id);
  if (error) throw error;
}
