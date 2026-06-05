import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
});

// Tools exposed to the AI. The CLIENT executes swap/wrap actions because
// they need the user's signer; the SERVER only proposes parameters.
const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_tokens",
      description: "List all supported tokens on Sakura DEX (symbol, name, address).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_swap_quote",
      description: "Get an estimated swap quote between two tokens on Sakura DEX. Returns amountOut, route, price impact.",
      parameters: {
        type: "object",
        properties: {
          fromSymbol: { type: "string", description: "Token symbol you pay with (e.g. zkLTC, wzkLTC, ETH)." },
          toSymbol: { type: "string", description: "Token symbol you want to receive." },
          amountIn: { type: "string", description: "Amount of fromSymbol as a decimal string, e.g. '1.5'." },
        },
        required: ["fromSymbol", "toSymbol", "amountIn"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_swap",
      description: "Propose a swap for the user to confirm in their wallet. Use AFTER calling get_swap_quote.",
      parameters: {
        type: "object",
        properties: {
          fromSymbol: { type: "string" },
          toSymbol: { type: "string" },
          amountIn: { type: "string" },
          slippagePct: { type: "number", description: "Slippage tolerance percent, default 0.5" },
        },
        required: ["fromSymbol", "toSymbol", "amountIn"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Navigate the user to an app page.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", enum: ["/", "/marketplace", "/mint", "/dex/swap", "/dex/liquidity", "/activity", "/profile", "/analytics", "/leaderboard", "/watchlist"] },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
];

const SYSTEM_PROMPT = `You are Sakura, the AI assistant for SakuraNFT — an NFT marketplace + DEX on the LitVM chain (native coin: zkLTC).

Capabilities:
- Answer questions about the platform (mint NFTs, list, buy, swap, wrap, add liquidity).
- Help users swap tokens on Sakura DEX by calling get_swap_quote then propose_swap.
- Navigate users to relevant pages via the navigate tool.

Rules:
- ALWAYS reply in the SAME language the user wrote in (Indonesian, English, etc.). Auto-detect.
- Be concise, friendly, use plain language. No long paragraphs.
- For swaps: call get_swap_quote first, share the estimated output, then call propose_swap so the user can confirm in their wallet.
- Never invent token addresses — only use ones returned by list_tokens.
- If the user is not connected to a wallet, ask them to connect first before proposing swaps.`;

export const chatAgent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      messages: z.array(MessageSchema).min(1).max(40),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");

    const res = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });

    if (res.status === 429) return { error: "Rate limit. Try again in a moment." as const };
    if (res.status === 402) return { error: "AI credits depleted. Top up to continue." as const };
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { error: `AI error ${res.status}: ${t.slice(0, 200)}` as const };
    }

    const json = await res.json();
    const choice = json?.choices?.[0]?.message ?? {};
    return {
      content: (choice.content ?? "") as string,
      toolCalls: (choice.tool_calls ?? []) as Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>,
    };
  });
