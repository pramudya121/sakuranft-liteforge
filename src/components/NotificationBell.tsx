import { Bell, Check } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useNotifications } from "@/lib/supabase-hooks";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { safeInternalPath } from "@/lib/safe-url";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NotificationBell() {
  const { address } = useWallet();
  const { list, unread, markAllRead } = useNotifications(address);

  if (!address) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-105 transition" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 glass">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="w-3 h-3 mr-1" /> Mark read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {list.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground px-4">
              🌸 No notifications yet.<br />Activity will appear here.
            </div>
          ) : (
            list.map((n) => (
              <Link
                key={n.id}
                to={safeInternalPath(n.link)}
                className={`block px-4 py-3 border-b border-border/30 hover:bg-accent/30 transition ${!n.read ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{n.title}</div>
                    {n.message && <div className="text-xs text-muted-foreground truncate">{n.message}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
