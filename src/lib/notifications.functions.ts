import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const ALLOWED_TYPES = new Set([
  "offer_received",
  "offer_accepted",
  "offer_rejected",
  "offer_cancelled",
  "nft_sold",
  "nft_bought",
  "nft_listed",
  "nft_transferred",
  "price_updated",
  "comment_received",
  "like_received",
  "watchlist_price",
  "system",
]);

const Schema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  type: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_]+$/i)
    .refine((v) => ALLOWED_TYPES.has(v), "Unsupported notification type"),
  title: z.string().min(1).max(200),
  message: z.string().max(1000).optional().nullable(),
  tokenId: z.number().int().nonnegative().optional().nullable(),
  link: z.string().max(300).optional().nullable(),
});

export type SendNotificationInput = z.infer<typeof Schema>;

/**
 * Server-side notification insert. Requires the caller to identify themselves
 * via the `x-wallet-address` header (set by the app's wallet-header shim).
 * A caller cannot notify themselves (blocks self-spam) and `type` is
 * restricted to an application-defined whitelist. `link` is limited to safe
 * internal paths. This is not cryptographic proof of the caller, but it
 * removes the previous unauthenticated privileged-insert surface.
 */
export const sendNotificationFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Schema.parse(data))
  .handler(async ({ data }) => {
    const rawCaller = getRequestHeader("x-wallet-address") ?? "";
    const caller = rawCaller.toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(caller)) {
      return { ok: false, error: "unauthenticated" };
    }
    const recipient = data.to.toLowerCase();
    if (caller === recipient) {
      // A wallet can't push notifications into its own inbox via this fn.
      return { ok: false, error: "self_notify_forbidden" };
    }

    const safeLink =
      data.link && /^\/[A-Za-z0-9/_\-.?=&%#:]*$/.test(data.link) ? data.link : null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("notifications").insert({
      wallet_address: recipient,
      type: data.type,
      title: data.title,
      message: data.message ?? null,
      token_id: data.tokenId ?? null,
      link: safeLink,
    });
    if (error) {
      console.warn("[notifications] insert failed:", error.message);
      return { ok: false };
    }
    return { ok: true };
  });
