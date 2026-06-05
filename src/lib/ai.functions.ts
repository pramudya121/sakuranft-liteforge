import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LOVABLE_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_IMAGE_URL = "https://ai.gateway.lovable.dev/v1/images/generations";

export const generateNFTDescription = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      name: z.string().min(1).max(120),
      hint: z.string().max(800).optional(),
      tone: z.enum(["poetic", "epic", "mystical", "playful", "cyberpunk", "minimal"]).optional(),
      lang: z.string().max(20).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");

    const tone = data.tone ?? "poetic";
    const lang = data.lang ?? "English";
    const system = `You are a world-class NFT copywriter. Write a vivid, evocative ${tone} description (3 short sentences, 280-420 characters) for an NFT in ${lang}. Use rich sensory detail and metaphor. Reference the sakura/winter-bloom universe subtly when natural. No hashtags, no emojis, no markdown, no quotes.`;

    const res = await fetch(LOVABLE_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `NFT name: "${data.name}".${data.hint ? ` Context / traits: ${data.hint}` : ""}\nWrite the description now.` },
        ],
        temperature: 0.9,
      }),
    });
    if (res.status === 429) throw new Error("AI rate limit, try again shortly");
    if (res.status === 402) throw new Error("AI credits depleted — add credits in workspace billing");
    if (!res.ok) throw new Error(`AI error ${res.status}: ${await res.text().catch(() => "")}`);
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content?.trim() ?? "";
    return { description: text };
  });

export const generateNFTImage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      prompt: z.string().min(3).max(800),
      style: z.enum(["cinematic", "anime", "3d", "watercolor", "cyberpunk", "oil-painting", "pixel"]).optional(),
      quality: z.enum(["low", "medium", "high"]).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");

    const styleMap: Record<string, string> = {
      cinematic: "cinematic photography, ultra-detailed, dramatic lighting, shallow depth of field, 8k",
      anime: "anime key visual, Studio Ghibli inspired, vibrant colors, soft shading",
      "3d": "octane 3D render, subsurface scattering, ray-traced reflections, ultra detailed",
      watercolor: "delicate watercolor painting, soft pastel washes, paper texture",
      cyberpunk: "neon cyberpunk aesthetic, holographic, futuristic, rim lighting",
      "oil-painting": "classical oil painting, impasto brush strokes, museum quality",
      pixel: "crisp pixel art, 32-bit retro game aesthetic, limited palette",
    };
    const styleHint = styleMap[data.style ?? "cinematic"];
    const finalPrompt = `Masterpiece NFT artwork. ${data.prompt}. Subtle winter-sakura accents (pink cherry blossoms, soft snow) where natural. ${styleHint}. Square 1:1 composition, no text, no watermark.`;

    // Use OpenAI gpt-image-2 via the images endpoint — far higher fidelity than the chat fallback
    const res = await fetch(LOVABLE_IMAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt: finalPrompt,
        quality: data.quality ?? "medium",
        size: "1024x1024",
        n: 1,
      }),
    });
    if (res.status === 429) throw new Error("AI rate limit, try again shortly");
    if (res.status === 402) throw new Error("AI credits depleted — add credits in workspace billing");
    if (!res.ok) {
      // Fallback to Gemini chat-image if the images endpoint isn't available
      const fb = await fetch(LOVABLE_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: finalPrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (!fb.ok) throw new Error(`AI error ${res.status}: ${await res.text().catch(() => "")}`);
      const fbJson = await fb.json();
      const url: string | undefined = fbJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!url) throw new Error("No image returned");
      return { imageDataUrl: url };
    }
    const json = await res.json();
    const b64: string | undefined = json?.data?.[0]?.b64_json;
    const url: string | undefined = json?.data?.[0]?.url;
    if (b64) return { imageDataUrl: `data:image/png;base64,${b64}` };
    if (url) return { imageDataUrl: url };
    throw new Error("No image returned");
  });
