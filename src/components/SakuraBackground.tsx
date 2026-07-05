import { useEffect, useMemo, useState } from "react";

/**
 * Winter sakura ambience:
 *  - Layered 3D sakura tree silhouette (parallax on mouse)
 *  - Falling sakura petals (front + back layers for depth)
 *  - Drifting snowflakes
 *  - Soft aurora glow
 */
export function SakuraBackground({ count = 26 }: { count?: number }) {
  const [mounted, setMounted] = useState(false);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth - 0.5);
      const y = (e.clientY / window.innerHeight - 0.5);
      setTx(x); setTy(y);
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const petalsBack = useMemo(() => makePetals(Math.round(count * 0.5), true), [count]);
  const petalsFront = useMemo(() => makePetals(count, false), [count]);
  const flakes = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    i,
    left: Math.random() * 100,
    size: 3 + Math.random() * 5,
    dur: 14 + Math.random() * 14,
    delay: -Math.random() * 20,
    drift: Math.random() * 120 - 60,
    op: 0.5 + Math.random() * 0.5,
  })), []);

  if (!mounted) return <div aria-hidden className="pointer-events-none fixed inset-0 z-0" />;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {/* aurora glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[120vw] h-[80vh] rounded-full opacity-70 blur-3xl"
           style={{ background: "radial-gradient(closest-side, rgba(236,72,153,0.28), rgba(168,85,247,0.15) 45%, transparent 70%)" }} />
      <div className="absolute -bottom-32 -left-32 w-[70vw] h-[60vh] rounded-full opacity-60 blur-3xl"
           style={{ background: "radial-gradient(closest-side, rgba(125,211,252,0.35), transparent 70%)" }} />

      {/* 3D layered sakura tree (right side, parallax) */}
      <div className="sakura-tree" style={{
        transform: `translate3d(${tx * -30}px, ${ty * -20}px, 0)`,
      }}>
        <div className="tree-layer tree-back" style={{ transform: `translate3d(${tx * -12}px, ${ty * -8}px, 0)` }} />
        <div className="tree-layer tree-mid"  style={{ transform: `translate3d(${tx * -22}px, ${ty * -14}px, 0)` }} />
        <div className="tree-layer tree-front" style={{ transform: `translate3d(${tx * -36}px, ${ty * -22}px, 0)` }} />
        <div className="tree-glow" />
      </div>

      {/* back-layer petals (small, slow, blurred) */}
      {petalsBack.map((p) => (
        <span key={`b${p.i}`} className="petal petal-back" style={petalStyle(p)} />
      ))}
      {/* front-layer petals (crisp) */}
      {petalsFront.map((p) => (
        <span key={`f${p.i}`} className="petal" style={petalStyle(p)} />
      ))}

      {/* snowflakes */}
      {flakes.map((f) => (
        <span key={f.i} className="snowflake" style={{
          left: `${f.left}%`,
          width: f.size, height: f.size,
          opacity: f.op,
          animationDuration: `${f.dur}s`,
          animationDelay: `${f.delay}s`,
          ["--drift" as any]: `${f.drift}px`,
        }} />
      ))}
    </div>
  );
}

function makePetals(count: number, back: boolean) {
  return Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100;
    const size = (back ? 6 : 10) + Math.random() * (back ? 8 : 14);
    const dur = (back ? 16 : 10) + Math.random() * 10;
    const delay = -Math.random() * 20;
    const drift = (Math.random() * 220 - 110);
    const sway = 3 + Math.random() * 3;
    const hue = 335 + Math.random() * 25;
    return { i, left, size, dur, delay, drift, sway, hue };
  });
}

function petalStyle(p: ReturnType<typeof makePetals>[number]): React.CSSProperties {
  return {
    left: `${p.left}%`,
    width: p.size, height: p.size,
    animationDuration: `${p.dur}s, ${p.sway}s`,
    animationDelay: `${p.delay}s, ${p.delay}s`,
    ["--drift" as any]: `${p.drift}px`,
    background: `radial-gradient(circle at 30% 30%, oklch(0.96 0.05 ${p.hue}), oklch(0.68 0.2 ${p.hue}))`,
  };
}
