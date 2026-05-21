import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle, Send, X, Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles, Bot, User } from "lucide-react";
import { chatAgent } from "@/lib/ai-chat.functions";
import { TOKENS, type TokenInfo } from "@/lib/tokens";
import { CONTRACTS } from "@/lib/web3/contracts";
import { findBestRoute, getNativeBalance, getTokenBalance, swapExactETHForTokens, swapExactTokensForETH, swapExactTokensForTokens, wrapNative, unwrapNative } from "@/lib/web3/ethers";
import { formatEther, parseEther, isAddress } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string };

// ----- Web Speech API (browser native, free, multilingual) -----
function getRecognizer(): any | null {
  if (typeof window === "undefined") return null;
  const W = window as any;
  const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
  return SR ? new SR() : null;
}

function findToken(sym: string): TokenInfo | null {
  const s = sym.trim().toLowerCase();
  return TOKENS.find((t) => t.symbol.toLowerCase() === s) ?? null;
}

function resolveAddr(t: TokenInfo): string {
  return t.address === "native" ? CONTRACTS.weth : t.address;
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm Sakura 🌸 — your AI guide. Ask me about NFTs, swaps, or say 'swap 0.1 zkLTC to ETH'. I speak any language." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOut, setVoiceOut] = useState(true);
  const callChat = useServerFn(chatAgent);
  const navigate = useNavigate();
  const { signer, address } = useWallet();
  const recRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  // ----- Voice input -----
  function toggleMic() {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const r = getRecognizer();
    if (!r) return toast.error("Voice input not supported in this browser");
    r.continuous = false; r.interimResults = false;
    r.lang = navigator.language || "en-US";
    r.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recRef.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); }
  }

  // ----- Voice output -----
  function speak(text: string) {
    if (!voiceOut || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.slice(0, 600));
      u.rate = 1.05; u.pitch = 1.1;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  // ----- Tool executors -----
  async function execTool(name: string, args: any): Promise<string> {
    try {
      if (name === "list_tokens") {
        return JSON.stringify(TOKENS.map((t) => ({ symbol: t.symbol, name: t.name, address: t.address })));
      }
      if (name === "get_swap_quote") {
        const from = findToken(args.fromSymbol); const to = findToken(args.toSymbol);
        if (!from || !to) return JSON.stringify({ error: "Unknown token" });
        const fromAddr = resolveAddr(from); const toAddr = resolveAddr(to);
        if (!isAddress(fromAddr) || !isAddress(toAddr)) return JSON.stringify({ error: "Missing contract for token" });
        const amtIn = parseEther(String(args.amountIn));
        // wrap/unwrap → 1:1
        if (fromAddr.toLowerCase() === toAddr.toLowerCase()) {
          return JSON.stringify({ amountOut: args.amountIn, route: [from.symbol, to.symbol], type: "wrap_or_unwrap", note: "1:1, no fee" });
        }
        const best = await findBestRoute(amtIn, fromAddr, toAddr);
        if (!best) return JSON.stringify({ error: "No liquidity route found" });
        return JSON.stringify({
          amountOut: formatEther(best.out),
          hops: best.hops,
          route: best.path.map((a) => TOKENS.find((t) => t.address !== "native" && t.address.toLowerCase() === a.toLowerCase())?.symbol ?? a.slice(0, 8)),
        });
      }
      if (name === "propose_swap") {
        if (!signer || !address) return JSON.stringify({ error: "Wallet not connected. Ask the user to connect their wallet." });
        const from = findToken(args.fromSymbol); const to = findToken(args.toSymbol);
        if (!from || !to) return JSON.stringify({ error: "Unknown token" });
        const slippage = Number(args.slippagePct ?? 0.5);
        const amtIn = parseEther(String(args.amountIn));
        const fromAddr = resolveAddr(from); const toAddr = resolveAddr(to);
        // wrap / unwrap
        const isWrap = from.address === "native" && toAddr.toLowerCase() === CONTRACTS.weth.toLowerCase();
        const isUnwrap = to.address === "native" && fromAddr.toLowerCase() === CONTRACTS.weth.toLowerCase();
        toast.loading("Confirm in wallet…", { id: "ai-swap" });
        if (isWrap) { await wrapNative(signer, String(args.amountIn)); toast.success("Wrapped", { id: "ai-swap" }); return JSON.stringify({ ok: true, action: "wrap" }); }
        if (isUnwrap) { await unwrapNative(signer, String(args.amountIn)); toast.success("Unwrapped", { id: "ai-swap" }); return JSON.stringify({ ok: true, action: "unwrap" }); }
        const best = await findBestRoute(amtIn, fromAddr, toAddr);
        if (!best) { toast.error("No route", { id: "ai-swap" }); return JSON.stringify({ error: "No route" }); }
        if (from.address === "native") await swapExactETHForTokens(signer, best.path[best.path.length - 1], String(args.amountIn), slippage);
        else if (to.address === "native") await swapExactTokensForETH(signer, from.address, amtIn, slippage);
        else await swapExactTokensForTokens(signer, amtIn, best.path, slippage);
        toast.success("Swap submitted ✓", { id: "ai-swap" });
        return JSON.stringify({ ok: true, action: "swap" });
      }
      if (name === "navigate") {
        navigate({ to: args.path });
        return JSON.stringify({ ok: true });
      }
      return JSON.stringify({ error: "Unknown tool" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Tool failed", { id: "ai-swap" });
      return JSON.stringify({ error: e?.shortMessage ?? e?.message ?? "Tool failed" });
    }
  }

  async function send(userText: string) {
    if (!userText.trim() || busy) return;
    const newMsgs: Msg[] = [...msgs, { role: "user", content: userText.trim() }];
    setMsgs(newMsgs); setInput(""); setBusy(true);

    try {
      // Up to 3 tool-call rounds
      let working: Msg[] = newMsgs;
      for (let round = 0; round < 3; round++) {
        // Only send roles the API expects; assistant tool-call rounds keep tool messages
        const res = await callChat({ data: { messages: working.filter((m) => m.role !== "system") as any } });
        if ("error" in res && res.error) {
          setMsgs((p) => [...p, { role: "assistant", content: `⚠️ ${res.error}` }]);
          break;
        }
        const { content, toolCalls } = res as { content: string; toolCalls: any[] };
        if (toolCalls && toolCalls.length > 0) {
          // Run tools, push tool replies, loop
          const toolMsgs: Msg[] = [];
          // Insert an assistant message stub so the API context stays consistent on next turn
          if (content) {
            working = [...working, { role: "assistant", content }];
            setMsgs((p) => [...p, { role: "assistant", content }]);
          }
          for (const tc of toolCalls) {
            let parsed: any = {};
            try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch {}
            const result = await execTool(tc.function.name, parsed);
            toolMsgs.push({ role: "tool", tool_call_id: tc.id, name: tc.function.name, content: result });
          }
          working = [...working, ...toolMsgs];
          continue;
        }
        if (content) {
          setMsgs((p) => [...p, { role: "assistant", content }]);
          speak(content);
        }
        break;
      }
    } catch (e: any) {
      setMsgs((p) => [...p, { role: "assistant", content: `⚠️ ${e?.message ?? "Failed"}` }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform ring-2 ring-white/20"
          aria-label="Open Sakura AI">
          <Sparkles className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-1.5rem)] h-[560px] max-h-[calc(100vh-2rem)] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10 bg-[#0c0718]">
          <div className="px-4 py-3 flex items-center gap-2 bg-gradient-to-r from-fuchsia-600/40 to-pink-600/40 border-b border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">Sakura AI</div>
              <div className="text-[10px] text-fuchsia-200/80 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Agent • DEX-enabled</div>
            </div>
            <button onClick={() => setVoiceOut((v) => !v)} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/80" title={voiceOut ? "Mute voice" : "Unmute voice"}>
              {voiceOut ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/80"><X className="w-4 h-4" /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {msgs.filter((m) => m.role === "user" || m.role === "assistant").map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-white/10" : "bg-gradient-to-br from-fuchsia-500 to-pink-500"}`}>
                  {m.role === "user" ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className={`px-3 py-2 rounded-2xl text-sm max-w-[78%] whitespace-pre-wrap break-words ${m.role === "user" ? "bg-fuchsia-500/20 text-white rounded-tr-sm" : "bg-white/5 text-white/90 rounded-tl-sm"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-2"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-white" /></div>
                <div className="px-3 py-2 rounded-2xl bg-white/5"><Loader2 className="w-4 h-4 animate-spin text-fuchsia-300" /></div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/10 bg-[#0c0718]">
            <div className="flex items-center gap-2 rounded-2xl bg-[#160c26] border border-white/10 px-2 py-1.5">
              <button onClick={toggleMic} disabled={busy}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${listening ? "bg-red-500/30 text-red-300 animate-pulse" : "hover:bg-white/10 text-white/70"}`}
                title="Voice input">
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder={listening ? "Listening…" : "Ask Sakura anything…"}
                disabled={busy}
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/40 min-w-0"
              />
              <Button onClick={() => send(input)} disabled={busy || !input.trim()} size="sm" className="rounded-xl h-9 px-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 border-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-white/40 text-center mt-1.5">Speaks every language · Powered by Lovable AI</p>
          </div>
        </div>
      )}
    </>
  );
}
