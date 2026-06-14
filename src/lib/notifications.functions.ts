import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Schema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  type: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/i),
  title: z.string().min(1).max(200),
  message: z.string().max(1000).optional().nullable(),
  tokenId: z.number().int().nonnegative().optional().nullable(),
  link: z.string().max(300).optional().nullable(),
});

export type SendNotificationInput = z.infer<typeof Schema>;

/**
 * Server-side notification insert. Uses the admin client so the broad
 * anon INSERT policy on public.notifications can be removed. Input is
 * strictly validated; `link` is restricted to safe internal paths.
 */
export const sendNotificationFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Schema.parse(data))
  .handler(async ({ data }) => {
    const safeLink =
      data.link && /^\/[A-Za-z0-9/_\-.?=&%#:]*$/.test(data.link) ? data.link : null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("notifications").insert({
      wallet_address: data.to.toLowerCase(),
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
