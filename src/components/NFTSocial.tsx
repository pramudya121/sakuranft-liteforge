import { useState } from "react";
import { Heart, MessageCircle, Trash2, Send } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNFTLikes, useNFTComments } from "@/lib/supabase-hooks";
import { useWallet } from "@/contexts/WalletContext";
import { shortAddr } from "@/lib/web3/ethers";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function LikeButton({ tokenId }: { tokenId: string | bigint }) {
  const { address } = useWallet();
  const { count, liked, toggle } = useNFTLikes(tokenId, address);
  return (
    <Button
      size="sm"
      variant={liked ? "default" : "outline"}
      className="rounded-full gap-2"
      onClick={() => {
        if (!address) return toast.error("Connect wallet to like");
        toggle();
      }}
    >
      <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} /> {count}
    </Button>
  );
}

export function CommentsPanel({ tokenId }: { tokenId: string | bigint }) {
  const { address } = useWallet();
  const { comments, post, remove } = useNFTComments(tokenId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!address) return toast.error("Connect wallet to comment");
    if (!text.trim()) return;
    setBusy(true);
    try {
      await post(address, text);
      setText("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageCircle className="w-4 h-4" /> {comments.length} comments
      </div>
      <div className="flex gap-2">
        <Textarea
          placeholder={address ? "Share your thoughts..." : "Connect wallet to comment"}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 1000))}
          maxLength={1000}
          rows={2}
          disabled={!address || busy}
          className="resize-none"
        />
        <Button onClick={submit} disabled={!address || busy || !text.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No comments yet. Be the first 🌸
          </p>
        )}
        {comments.map((c) => {
          const mine = address?.toLowerCase() === c.wallet_address.toLowerCase();
          return (
            <div key={c.id} className="glass rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <Link
                  to="/u/$address"
                  params={{ address: c.wallet_address }}
                  className="text-xs font-mono text-primary hover:underline"
                >
                  {shortAddr(c.wallet_address)}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                  {mine && (
                    <button
                      onClick={() => remove(c.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
