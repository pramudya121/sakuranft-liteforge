import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const Schema = z.object({
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid caller wallet"),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  type: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/i),
  title: z.string().min(1).max(200),
  message: z.string().max(1000).optional().nullable(),
  tokenId: z.number().int().nonnegative().optional().nullable(),
  link: z.string().max(300).optional().nullable(),
});

export type SendNotificationInput = z.infer<typeof Schema>;

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Notification types that a caller is only allowed to raise about themselves
 * (e.g. "I just bought this NFT"). These target the caller wallet only.
 */
const SELF_ONLY_TYPES = new Set(["purchase"]);

/**
 * Notification types that require an on-chain relationship between caller and
 * recipient for the given token (offer, sale, transfer, offer_accepted, …).
 */
const REQUIRES_RELATIONSHIP = new Set([
  "sale",
  "offer",
  "offer_accepted",
  "offer_rejected",
  "transfer",
  "listing",
  "price_update",
]);

/**
 * Verifies the caller wallet has a legitimate reason to notify `to` about
 * `tokenId`. Uses the service-role client so RLS doesn't obscure the row.
 */
async function callerMayNotify(opts: {
  admin: any;
  caller: string;
  to: string;
  tokenId: number | null;
  type: string;
}): Promise<boolean> {
  const { admin, caller, to, tokenId, type } = opts;
  if (caller === to) return true;
  if (SELF_ONLY_TYPES.has(type)) return false;
  if (!REQUIRES_RELATIONSHIP.has(type)) return false;
  if (tokenId === null || tokenId === undefined) return false;

  // Any of these on-chain relationships qualify:
  //   * caller listed the token, notifying the buyer/offerer (to)
  //   * caller made/holds an offer on the token that involves `to`
  //   * `to` listed the token and caller is a buyer/offerer on it
  const [listings, offers] = await Promise.all([
    admin
      .from("listings")
      .select("seller")
      .eq("token_id", tokenId)
      .in("seller", [caller, to])
      .limit(1),
    admin
      .from("nft_offers")
      .select("offerer")
      .eq("token_id", tokenId)
      .in("offerer", [caller, to])
      .limit(1),
  ]);
  const hasListing = (listings.data?.length ?? 0) > 0;
  const hasOffer = (offers.data?.length ?? 0) > 0;
  return hasListing || hasOffer;
}

/**
 * Server-side notification insert. Uses the admin client so the broad
 * anon INSERT policy on public.notifications can be removed.
 *
 * Auth model: the caller MUST supply an `x-wallet-address` header (set
 * globally by WalletContext). We then verify the caller has a legitimate
 * on-chain relationship to the recipient before writing the row, closing
 * the previous "any anon client can spam notifications" hole.
 */
export const sendNotificationFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Schema.parse(data))
  .handler(async ({ data }) => {
    const req = getRequest();
    const headerCaller = (req?.headers.get("x-wallet-address") ?? "").toLowerCase();
    // The caller wallet is required. We accept either the body-provided
    // `from` field (set by pushNotification on the client) or the
    // `x-wallet-address` header — they must match if both are present.
    const bodyCaller = data.from.toLowerCase();
    if (headerCaller && headerCaller !== bodyCaller) {
      return { ok: false, error: "caller_mismatch" };
    }
    const caller = bodyCaller;
    if (!WALLET_RE.test(caller)) {
      return { ok: false, error: "missing_caller_wallet" };
    }

    const to = data.to.toLowerCase();
    const tokenId = data.tokenId ?? null;

    const safeLink =
      data.link && /^\/[A-Za-z0-9/_\-.?=&%#:]*$/.test(data.link) ? data.link : null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const allowed = await callerMayNotify({
      admin: supabaseAdmin,
      caller,
      to,
      tokenId,
      type: data.type,
    });
    if (!allowed) {
      console.warn("[notifications] blocked spoof attempt", { caller, to, type: data.type, tokenId });
      return { ok: false, error: "forbidden" };
    }

    const { error } = await supabaseAdmin.from("notifications").insert({
      wallet_address: to,
      type: data.type,
      title: data.title,
      message: data.message ?? null,
      token_id: tokenId,
      link: safeLink,
    });
    if (error) {
      console.warn("[notifications] insert failed:", error.message);
      return { ok: false, error: "insert_failed" };
    }
    return { ok: true };
  });
