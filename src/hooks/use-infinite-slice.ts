import { useEffect, useRef, useState } from "react";

/**
 * Progressive rendering: returns the first `visible` items + a sentinel ref.
 * When the sentinel enters the viewport, `visible` grows by `step`.
 */
export function useInfiniteSlice<T>(items: T[], step = 24, initial = 24) {
  const [visible, setVisible] = useState(initial);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset when the underlying list shrinks (e.g. filter change).
  useEffect(() => {
    if (visible > items.length) setVisible(Math.max(initial, Math.min(items.length, initial)));
  }, [items.length, initial, visible]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((v) => Math.min(items.length, v + step));
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [items.length, step]);

  return { slice: items.slice(0, visible), sentinelRef, hasMore: visible < items.length, visible };
}
