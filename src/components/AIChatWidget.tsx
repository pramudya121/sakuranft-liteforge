import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Send, X, Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles, Bot, User, ArrowDownUp, Repeat, Plus, Minus, MessageSquare, Zap, Wallet } from "lucide-react";
import { chatAgent } from "@/lib/ai-chat.functions";
import { TOKENS, type TokenInfo } from "@/lib/tokens";
import { CONTRACTS } from "@/lib/web3/contracts";
import {
  findBestRoute, getNativeBalance, getTokenBalance,
  swapExactETHForTokens, swapExactTokensForETH, swapExactTokensForTokens,
  wrapNative, unwrapNative, addLiquidityETH, removeLiquidityETH, getPairInfo,
} from "@/lib/web3/ethers";
import { formatEther, parseEther, isAddress } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { TokenSelectButton } from "@/components/TokenSelectModal";
import { toast } from "sonner";

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string };

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

// ───────────────────────── Quick Swap inline panel ─────────────────────────
type TxStage = "idle" | "approving" | "swapping" | "confirming" | "done" | "error";

function QuickSwap({ onClose }: { onClose: () => void }) {
  const { signer, address } = useWallet();
  const [from, setFrom] = useState<TokenInfo>(TOKENS[0]);
  const [to, setTo]     = useState<TokenInfo>(TOKENS[2] ?? TOKENS[1]);
  const [amt, setAmt]   = useState("");
  const [out, setOut]   = useState("");
  const [route, setRoute] = useState<string[]>([]);
  const [balFrom, setBalFrom] = useState("0");
  const [balTo, setBalTo] = useState("0");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<TxStage>("idle");
  const [txHash, setTxHash] = useState<string>("");
  const [stageError, setStageError] = useState<string>("");
  const [tick, setTick] = useState(0);

  const fromAddr = from.address === "native" ? CONTRACTS.weth : from.address;
  const toAddr   = to.address   === "native" ? CONTRACTS.weth : to.address;
  const isWrap   = from.address === "native" && toAddr.toLowerCase() === CONTRACTS.weth.toLowerCase();
  const isUnwrap = to.address   === "native" && fromAddr.toLowerCase() === CONTRACTS.weth.toLowerCase();
  const isWrapMode = isWrap || isUnwrap;

  useEffect(() => {
    if (!address) return;
    let alive = true;
    (async () => {
      try {
        const f = from.address === "native" ? await getNativeBalance(address) : await getTokenBalance(from.address, address);
        if (alive) setBalFrom(formatEther(f));
      } catch { if (alive) setBalFrom("0"); }
      try {
        const t = to.address === "native" ? await getNativeBalance(address) : await getTokenBalance(to.address, address);
        if (alive) setBalTo(formatEther(t));
      } catch { if (alive) setBalTo("0"); }
    })();
    return () => { alive = false; };
  }, [address, from, to, tick]);

  useEffect(() => {
    if (isWrapMode) { setOut(amt || ""); setRoute([]); return; }
    if (!amt || isNaN(+amt) || +amt <= 0 || !isAddress(fromAddr) || !isAddress(toAddr) || fromAddr.toLowerCase() === toAddr.toLowerCase()) {
      setOut(""); setRoute([]); return;
    }
    let c = false;
    (async () => {
      try {
        const best = await findBestRoute(parseEther(amt), fromAddr, toAddr);
        if (c) return;
        if (!best) { setOut(""); setRoute([]); return; }
        setOut(formatEther(best.out)); setRoute(best.path);
      } catch { if (!c) { setOut(""); setRoute([]); } }
    })();
    return () => { c = true; };
  }, [amt, fromAddr, toAddr, isWrapMode]);

  function flip() { const a = from; setFrom(to); setTo(a); setAmt(out); setOut(""); }

  async function doSwap() {
    if (!signer) return toast.error("Connect wallet");
    if (!amt) return;
    setBusy(true);
    setStageError("");
    setTxHash("");
    const needsApproval = !isWrapMode && from.address !== "native";
    try {
      if (needsApproval) setStage("approving"); else setStage("swapping");
      toast.loading(needsApproval ? "Approve token in wallet…" : "Confirm in wallet…", { id: "qs" });
      let tx: any;
      if (isWrap)        { setStage("swapping"); tx = await wrapNative(signer, amt); }
      else if (isUnwrap) { setStage("swapping"); tx = await unwrapNative(signer, amt); }
      else if (route.length) {
        setStage("swapping");
        if (from.address === "native") tx = await swapExactETHForTokens(signer, route[route.length - 1], amt, 0.5);
        else if (to.address === "native") tx = await swapExactTokensForETH(signer, from.address, parseEther(amt), 0.5);
        else tx = await swapExactTokensForTokens(signer, parseEther(amt), route, 0.5);
      } else {
        toast.error("No route available for this pair", { id: "qs" });
        setStage("error"); setStageError("No liquidity route");
        return;
      }
      if (tx?.hash) setTxHash(tx.hash);
      setStage("confirming");
      toast.loading("Waiting for on-chain confirmation…", { id: "qs" });
      // ethers v6 returns ContractTransactionResponse; .wait() blocks until mined
      if (tx?.wait) { try { await tx.wait(); } catch {} }
      setStage("done");
      toast.success(isWrap ? "Wrapped ✓" : isUnwrap ? "Unwrapped ✓" : "Swap confirmed ✓", { id: "qs" });
      setAmt(""); setOut(""); setTick((t) => t + 1);
    } catch (e: any) {
      const msg = e?.shortMessage ?? e?.reason ?? e?.message ?? "Transaction failed";
      setStage("error");
      setStageError(msg);
      toast.error(msg, { id: "qs" });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      {/* Wallet status pill */}
      <div className="flex items-center gap-2 rounded-xl bg-background border border-border/80 px-3 py-2.5 text-xs">
        <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Wallet</span>
        <span className={`font-medium ml-auto ${address ? "text-green-400" : "text-foreground"}`}>
          {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected"}
        </span>
      </div>

      {/* From — solid opaque panel */}
      <div className="rounded-xl p-3.5 bg-background border border-border/80">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>You pay</span>
          <button onClick={() => setAmt(balFrom)} className="hover:text-primary font-medium">
            {(+balFrom).toFixed(4)} <span className="text-primary ml-1">MAX</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.0"
            className="flex-1 bg-transparent outline-none text-2xl font-bold min-w-0 text-foreground placeholder:text-muted-foreground/50" />
          <TokenSelectButton value={from} onChange={setFrom} />
        </div>
      </div>

      <div className="flex justify-center -my-2 relative z-10">
        <button onClick={flip} className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:rotate-180 transition-transform shadow-md">
          <ArrowDownUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* To — solid opaque panel */}
      <div className="rounded-xl p-3.5 bg-background border border-border/80">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>You receive</span><span>{(+balTo).toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-2">
          <input value={out} readOnly placeholder="0.0" className="flex-1 bg-transparent outline-none text-2xl font-bold min-w-0 text-foreground placeholder:text-muted-foreground/50" />
          <TokenSelectButton value={to} onChange={setTo} />
        </div>
      </div>

      <Button onClick={doSwap} disabled={busy || !signer || (!isWrapMode && !route.length && !!amt)}
        size="lg" className="w-full h-12 rounded-xl text-sm font-bold bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 border-0 text-white disabled:opacity-60">
        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
          : !signer ? "Connect Wallet"
          : !amt ? "Enter amount"
          : isWrap ? "Wrap" : isUnwrap ? "Unwrap"
          : !route.length ? "No route" : "Swap"}
      </Button>

      <button onClick={onClose} className="w-full text-center text-xs text-muted-foreground hover:text-primary py-1">
        🌸 Ask Sakura AI to do this for me
      </button>
    </div>
  );
}

// ───────────────────────── Main widget ─────────────────────────
export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm Sakura 🌸 — your AI guide.\n\nTry: *swap 0.1 zkLTC to ETH*, *add liquidity 1 zkLTC + 0.001 ETH*, or tap the Quick Swap button below." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const callChat = useServerFn(chatAgent);
  const navigate = useNavigate();
  const { signer, address } = useWallet();
  const recRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy, showSwap]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

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

  function speak(text: string) {
    if (!voiceOut || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.slice(0, 600));
      u.rate = 1.05; u.pitch = 1.1;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  async function execTool(name: string, args: any): Promise<string> {
    try {
      if (name === "list_tokens") {
        return JSON.stringify(TOKENS.map((t) => ({ symbol: t.symbol, name: t.name, address: t.address })));
      }
      if (name === "get_balance") {
        if (!address) return JSON.stringify({ error: "Wallet not connected" });
        const t = findToken(args.symbol);
        if (!t) return JSON.stringify({ error: "Unknown token" });
        const bal = t.address === "native" ? await getNativeBalance(address) : await getTokenBalance(t.address, address);
        return JSON.stringify({ symbol: t.symbol, balance: formatEther(bal) });
      }
      if (name === "get_swap_quote") {
        const from = findToken(args.fromSymbol); const to = findToken(args.toSymbol);
        if (!from || !to) return JSON.stringify({ error: "Unknown token" });
        const fromAddr = resolveAddr(from); const toAddr = resolveAddr(to);
        if (!isAddress(fromAddr) || !isAddress(toAddr)) return JSON.stringify({ error: "Missing contract" });
        const amtIn = parseEther(String(args.amountIn));
        if (fromAddr.toLowerCase() === toAddr.toLowerCase()) {
          return JSON.stringify({ amountOut: args.amountIn, route: [from.symbol, to.symbol], type: "wrap_or_unwrap" });
        }
        const best = await findBestRoute(amtIn, fromAddr, toAddr);
        if (!best) return JSON.stringify({ error: "No liquidity route" });
        return JSON.stringify({
          amountOut: formatEther(best.out),
          hops: best.hops,
          route: best.path.map((a) => TOKENS.find((t) => t.address !== "native" && t.address.toLowerCase() === a.toLowerCase())?.symbol ?? a.slice(0, 8)),
        });
      }
      if (name === "propose_swap") {
        if (!signer || !address) return JSON.stringify({ error: "Wallet not connected" });
        const from = findToken(args.fromSymbol); const to = findToken(args.toSymbol);
        if (!from || !to) return JSON.stringify({ error: "Unknown token" });
        const slippage = Number(args.slippagePct ?? 0.5);
        const amtIn = parseEther(String(args.amountIn));
        const fromAddr = resolveAddr(from); const toAddr = resolveAddr(to);
        const isWrap   = from.address === "native" && toAddr.toLowerCase() === CONTRACTS.weth.toLowerCase();
        const isUnwrap = to.address === "native" && fromAddr.toLowerCase() === CONTRACTS.weth.toLowerCase();
        toast.loading("Confirm in wallet…", { id: "ai-swap" });
        if (isWrap)   { await wrapNative(signer, String(args.amountIn));   toast.success("Wrapped ✓", { id: "ai-swap" }); return JSON.stringify({ ok: true, action: "wrap" }); }
        if (isUnwrap) { await unwrapNative(signer, String(args.amountIn)); toast.success("Unwrapped ✓", { id: "ai-swap" }); return JSON.stringify({ ok: true, action: "unwrap" }); }
        const best = await findBestRoute(amtIn, fromAddr, toAddr);
        if (!best) { toast.error("No route", { id: "ai-swap" }); return JSON.stringify({ error: "No route" }); }
        if (from.address === "native") await swapExactETHForTokens(signer, best.path[best.path.length - 1], String(args.amountIn), slippage);
        else if (to.address === "native") await swapExactTokensForETH(signer, from.address, amtIn, slippage);
        else await swapExactTokensForTokens(signer, amtIn, best.path, slippage);
        toast.success("Swap submitted ✓", { id: "ai-swap" });
        return JSON.stringify({ ok: true, action: "swap" });
      }
      if (name === "propose_add_liquidity") {
        if (!signer || !address) return JSON.stringify({ error: "Wallet not connected" });
        const t = findToken(args.tokenSymbol);
        if (!t || t.address === "native" || !isAddress(t.address)) return JSON.stringify({ error: "Bad token" });
        toast.loading("Adding liquidity…", { id: "ai-lp" });
        await addLiquidityETH(signer, t.address, parseEther(String(args.tokenAmount)), String(args.ethAmount));
        toast.success("Liquidity added ✓", { id: "ai-lp" });
        return JSON.stringify({ ok: true });
      }
      if (name === "propose_remove_liquidity") {
        if (!signer || !address) return JSON.stringify({ error: "Wallet not connected" });
        const t = findToken(args.tokenSymbol);
        if (!t || t.address === "native" || !isAddress(t.address)) return JSON.stringify({ error: "Bad token" });
        const info = await getPairInfo(CONTRACTS.weth, t.address, address);
        if (!info.pair || info.lpBalance === 0n) return JSON.stringify({ error: "No LP balance" });
        const pct = Math.max(1, Math.min(100, Number(args.percent)));
        const amt = (info.lpBalance * BigInt(pct)) / 100n;
        toast.loading("Removing liquidity…", { id: "ai-lp" });
        await removeLiquidityETH(signer, t.address, amt, info.pair);
        toast.success("Liquidity removed ✓", { id: "ai-lp" });
        return JSON.stringify({ ok: true });
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
      let working: Msg[] = newMsgs;
      for (let round = 0; round < 4; round++) {
        const res = await callChat({ data: { messages: working.filter((m) => m.role !== "system") as any } });
        if ("error" in res && res.error) {
          setMsgs((p) => [...p, { role: "assistant", content: `⚠️ ${res.error}` }]); break;
        }
        const { content, toolCalls } = res as { content: string; toolCalls: any[] };
        if (toolCalls && toolCalls.length > 0) {
          const toolMsgs: Msg[] = [];
          if (content) { working = [...working, { role: "assistant", content }]; setMsgs((p) => [...p, { role: "assistant", content }]); }
          for (const tc of toolCalls) {
            let parsed: any = {};
            try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch {}
            const result = await execTool(tc.function.name, parsed);
            toolMsgs.push({ role: "tool", tool_call_id: tc.id, name: tc.function.name, content: result });
          }
          working = [...working, ...toolMsgs];
          continue;
        }
        if (content) { setMsgs((p) => [...p, { role: "assistant", content }]); speak(content); }
        break;
      }
    } catch (e: any) {
      setMsgs((p) => [...p, { role: "assistant", content: `⚠️ ${e?.message ?? "Failed"}` }]);
    } finally { setBusy(false); inputRef.current?.focus(); }
  }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform ring-2 ring-primary/20"
          aria-label="Open Sakura AI">
          <Sparkles className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[400px] max-w-[calc(100vw-1.5rem)] h-[640px] max-h-[calc(100vh-2rem)] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border bg-card text-card-foreground">
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-2 bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 border-b border-border">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow"><Bot className="w-4.5 h-4.5 text-white" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Sakura AI</div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Agent · DEX-enabled</div>
            </div>
            <button onClick={() => setVoiceOut((v) => !v)} title={voiceOut ? "Mute voice" : "Unmute voice"}
              className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
              {voiceOut ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>

          {/* Tabs */}
          <div className="px-3 pt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setShowSwap(false)}
              className={`h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${!showSwap ? "bg-gradient-to-r from-fuchsia-500/30 to-pink-500/30 text-foreground border border-primary/40" : "bg-background border border-border text-muted-foreground hover:text-foreground"}`}>
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
            <button onClick={() => setShowSwap(true)}
              className={`h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${showSwap ? "bg-gradient-to-r from-fuchsia-500/30 to-pink-500/30 text-foreground border border-primary/40" : "bg-background border border-border text-muted-foreground hover:text-foreground"}`}>
              <Zap className="w-4 h-4" /> Quick Swap
            </button>
          </div>

          {/* Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {showSwap ? (
              <QuickSwap onClose={() => setShowSwap(false)} />
            ) : (
              <>
                {msgs.filter((m) => m.role === "user" || m.role === "assistant").map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-muted" : "bg-gradient-to-br from-fuchsia-500 to-pink-500"}`}>
                      {m.role === "user" ? <User className="w-3.5 h-3.5 text-foreground" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className={`px-3 py-2 rounded-2xl text-sm max-w-[78%] whitespace-pre-wrap break-words ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex gap-2"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-white" /></div>
                    <div className="px-3 py-2 rounded-2xl bg-muted"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Composer — only when on Chat tab */}
          {!showSwap && (
            <div className="p-3 border-t border-border bg-card">
              <div className="flex items-center gap-2 rounded-2xl bg-background border border-border px-2 py-1.5">
                <button onClick={toggleMic} disabled={busy}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${listening ? "bg-destructive/20 text-destructive animate-pulse" : "hover:bg-muted text-muted-foreground"}`}
                  title="Voice input">
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  placeholder={listening ? "Listening…" : "Ask Sakura anything…"}
                  disabled={busy}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground min-w-0"
                />
                <Button onClick={() => send(input)} disabled={busy || !input.trim()} size="sm" className="rounded-xl h-9 px-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 border-0 text-white">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">Multilingual · Powered by Lovable AI</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
