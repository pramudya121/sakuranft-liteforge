import { useEffect, useMemo, useState } from "react";
import { Contract, formatUnits, parseEther, parseUnits, isAddress } from "ethers";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Send, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TOKENS, type TokenInfo } from "@/lib/tokens";
import { CHAIN, ERC20_ABI } from "@/lib/web3/contracts";
import { readProvider } from "@/lib/web3/ethers";
import { useWallet } from "@/contexts/WalletContext";
import { toast } from "sonner";

type Holding = TokenInfo & { balance: number; usd: number };

const COLORS = ["oklch(0.72 0.18 350)", "oklch(0.7 0.18 250)", "oklch(0.75 0.18 170)", "oklch(0.78 0.18 80)", "oklch(0.7 0.18 30)", "oklch(0.7 0.18 300)", "oklch(0.7 0.18 200)", "oklch(0.7 0.18 120)"];

export function PortfolioPanel() {
  const { address, signer, balance } = useWallet();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  // Send form
  const [sendToken, setSendToken] = useState<TokenInfo>(TOKENS[0]);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!address) { setHoldings([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const items: Holding[] = [];
      for (const t of TOKENS) {
        try {
          if (t.address === "native") {
            items.push({ ...t, balance: +balance, usd: +balance });
            continue;
          }
          if (!t.address || !isAddress(t.address)) continue;
          const c = new Contract(t.address, ERC20_ABI, readProvider);
          const raw: bigint = await c.balanceOf(address);
          const bal = +formatUnits(raw, t.decimals);
          if (bal > 0) items.push({ ...t, balance: bal, usd: bal });
        } catch {}
      }
      setHoldings(items);
      setLoading(false);
    })();
  }, [address, balance]);

  const chartData = useMemo(() =>
    holdings.filter((h) => h.balance > 0).map((h) => ({ name: h.symbol, value: h.balance })), [holdings]);

  async function handleSend() {
    if (!signer || !address) return toast.error("Connect wallet");
    if (!isAddress(to)) return toast.error("Invalid recipient address");
    if (!amount || +amount <= 0) return toast.error("Enter amount");
    setBusy(true);
    try {
      toast.loading("Confirm in wallet...", { id: "send" });
      if (sendToken.address === "native") {
        const tx = await signer.sendTransaction({ to, value: parseEther(amount) });
        await tx.wait();
      } else {
        const c = new Contract(sendToken.address, ERC20_ABI, signer);
        const tx = await c.transfer(to, parseUnits(amount, sendToken.decimals));
        await tx.wait();
      }
      toast.success(`Sent ${amount} ${sendToken.symbol}!`, { id: "send" });
      setTo(""); setAmount("");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Send failed", { id: "send" });
    } finally { setBusy(false); }
  }

  if (!address) return null;

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Wallet className="w-4 h-4" /> Token Balances</h3>
          {loading ? <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p> :
            holdings.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No tokens detected.</p> : (
              <div className="space-y-2">
                {holdings.map((h) => (
                  <div key={h.symbol} className="flex items-center justify-between p-2 rounded-xl hover:bg-accent/30 transition">
                    <div className="flex items-center gap-3">
                      <img src={h.logo} alt="" className="w-8 h-8 rounded-full bg-muted" onError={(e) => { (e.currentTarget.style.display = "none"); }} />
                      <div>
                        <div className="font-medium text-sm">{h.symbol}</div>
                        <div className="text-xs text-muted-foreground">{h.name}</div>
                      </div>
                    </div>
                    <div className="font-mono text-sm font-bold">{h.balance.toFixed(4)}</div>
                  </div>
                ))}
              </div>
            )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-3">Allocation</h3>
          {chartData.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No balances to chart.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45} paddingAngle={2}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => Number(v).toFixed(4)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><Send className="w-4 h-4" /> Send Token</h3>
        <div className="grid md:grid-cols-[200px_1fr_120px_auto] gap-2">
          <select className="rounded-lg bg-background/40 border px-3 py-2 text-sm" value={sendToken.symbol}
            onChange={(e) => setSendToken(TOKENS.find((t) => t.symbol === e.target.value)!)}>
            {TOKENS.filter((t) => t.address === "native" || isAddress(t.address)).map((t) => (
              <option key={t.symbol} value={t.symbol}>{t.symbol} — {t.name}</option>
            ))}
          </select>
          <Input placeholder="0xRecipient..." value={to} onChange={(e) => setTo(e.target.value)} className="font-mono text-sm" />
          <Input type="number" step="0.0001" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button onClick={handleSend} disabled={busy} className="rounded-full px-6">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1.5" /> Send</>}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Sends real on-chain assets — double-check address.</p>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold mb-3">Holdings (Bar)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
