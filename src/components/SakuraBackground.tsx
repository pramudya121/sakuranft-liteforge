import { useEffect, useMemo, useState } from "react";

/**
 * Lightweight falling sakura petals — no trees, no snow.
 * Pauses rendering until mount to avoid SSR/CSR hydration mismatch.
 */
export function SakuraBackground({ count = 22 }: { count?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const petals = useMemo(() => Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100;
    const size = 10 + Math.random() * 14;
    const dur = 10 + Math.random() * 10;
    const delay = -Math.random() * 18;
    const drift = (Math.random() * 200 - 100);
    const sway = 3 + Math.random() * 3;
    const hue = 340 + Math.random() * 20;
    return { i, left, size, dur, delay, drift, sway, hue };
  }), [count]);

  if (!mounted) return <div aria-hidden className="pointer-events-none fixed inset-0 z-0" />;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {petals.map((p) => (
        <span
          key={p.i}
          className="petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDuration: `${p.dur}s, ${p.sway}s`,
            animationDelay: `${p.delay}s, ${p.delay}s`,
            ["--drift" as any]: `${p.drift}px`,
            background: `radial-gradient(circle at 30% 30%, oklch(0.96 0.05 ${p.hue}), oklch(0.68 0.2 ${p.hue}))`,
          }}
        />
      ))}
    </div>
  );
}
