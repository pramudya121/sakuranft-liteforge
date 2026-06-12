// Injects the connected wallet address into outgoing Supabase REST + Realtime
// requests as the `x-wallet-address` header. RLS policies use this to scope
// row ownership for tables like profiles, watchlist, likes, comments,
// listings, offers, and notifications.
//
// This is NOT a cryptographic auth proof — a determined attacker can spoof
// the header. It raises the bar for casual abuse and ensures the app's own
// hooks only touch the connected wallet's rows. Sensitive operations
// (server-trusted actions) should additionally route through server
// functions that verify wallet signatures.

import { supabase } from "@/integrations/supabase/client";

let currentWallet: string | null = null;

function applyHeader(addr: string | null) {
  try {
    const rest: any = (supabase as any).rest;
    if (rest && rest.headers) {
      if (addr) rest.headers["x-wallet-address"] = addr;
      else delete rest.headers["x-wallet-address"];
    }
  } catch {}
  try {
    const realtime: any = (supabase as any).realtime;
    if (realtime && typeof realtime.setAuth === "function") {
      // no-op: realtime auth uses JWT; header not applicable for realtime
    }
  } catch {}
}

export function setWalletHeader(addr: string | null) {
  currentWallet = addr ? addr.toLowerCase() : null;
  applyHeader(currentWallet);
}

export function getWalletHeader() {
  return currentWallet;
}
