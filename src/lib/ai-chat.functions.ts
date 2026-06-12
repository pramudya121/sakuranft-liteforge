import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MessageSchema = z.object({
  // SECURITY: client may only send user/assistant/tool roles.
  // "system" is reserved for the server-side prompt to prevent prompt-injection.
  role: z.enum(["user", "assistant", "tool"]),
  content: z.string().max(8000),
  tool_call_id: z.string().max(200).optional(),
  name: z.string().max(120).optional(),
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
      name: "get_balance",
      description: "Get the user's wallet balance for a token symbol (e.g. zkLTC, ETH, MON). Returns balance as decimal string.",
      parameters: {
        type: "object",
        properties: { symbol: { type: "string" } },
        required: ["symbol"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_add_liquidity",
      description: "Propose adding liquidity to a zkLTC/TOKEN pool. The user confirms in their wallet.",
      parameters: {
        type: "object",
        properties: {
          tokenSymbol: { type: "string", description: "The non-native token symbol (paired with zkLTC)." },
          ethAmount:   { type: "string", description: "Amount of zkLTC (native) to add, decimal string." },
          tokenAmount: { type: "string", description: "Amount of tokenSymbol to add, decimal string." },
        },
        required: ["tokenSymbol", "ethAmount", "tokenAmount"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_remove_liquidity",
      description: "Propose removing liquidity from a zkLTC/TOKEN pool by percentage of the user's LP balance.",
      parameters: {
        type: "object",
        properties: {
          tokenSymbol: { type: "string" },
          percent:     { type: "number", description: "Percentage 1-100 of LP balance to remove." },
        },
        required: ["tokenSymbol", "percent"],
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
          path: { type: "string", enum: ["/", "/marketplace", "/mint", "/dex/swap", "/dex/liquidity", "/activity", "/profile", "/analytics", "/leaderboard", "/docs"] },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
];

const SYSTEM_PROMPT = `You are Sakura, the AI assistant for SakuraNFT — an NFT marketplace + DEX on the LitVM chain (native coin: zkLTC).

Capabilities:
- Answer questions about the platform (mint NFTs, list, buy, swap, wrap, add/remove liquidity).
- Swap tokens via get_swap_quote → propose_swap.
- Provide liquidity via propose_add_liquidity and propose_remove_liquidity.
- Check balances with get_balance.
- Navigate users to relevant pages.

Rules:
- ALWAYS reply in the SAME language the user wrote in. Auto-detect.
- Be concise and friendly. Prefer short answers.
- For swaps: call get_swap_quote first, share the expected output, then propose_swap so the user confirms in their wallet.
- Never invent token addresses. Use list_tokens.
- If the user isn't connected, ask them to connect first.`;


export const chatAgent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      messages: z.array(MessageSchema).min(1).max(40),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");

    // Defense-in-depth: strip any residual system-role messages before forwarding.
    const safeMessages = data.messages.filter((m) => m.role !== ("system" as any));

    const res = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...safeMessages],
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
