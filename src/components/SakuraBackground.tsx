import { useEffect, useMemo, useState } from "react";

export function SakuraBackground({ count = 35 }: { count?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div aria-hidden className="pointer-events-none fixed inset-0 z-0" />;

  const petals = useMemo(() => Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100;
    const size = 10 + Math.random() * 18;
    const dur = 9 + Math.random() * 12;
    const delay = -Math.random() * 15;
    const drift = (Math.random() * 160 - 80);
    const sway = 3 + Math.random() * 4;
    const hue = 340 + Math.random() * 20;
    return { i, left, size, dur, delay, drift, sway, hue };
  }), [count]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {/* sakura tree silhouette */}
      <svg className="absolute bottom-0 left-0 w-[55%] max-w-[800px] opacity-70 float"
        viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bloom" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.92 0.1 350)" stopOpacity="0.95" />
            <stop offset="60%" stopColor="oklch(0.78 0.16 350)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="oklch(0.6 0.18 350)" stopOpacity="0.2" />
          </radialGradient>
          <linearGradient id="trunk" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3b2a26" />
            <stop offset="1" stopColor="#1d1411" />
          </linearGradient>
        </defs>
        <path d="M300 600 C295 480 310 420 285 350 C270 300 260 260 240 220 C225 195 215 170 200 145" stroke="url(#trunk)" strokeWidth="22" fill="none" strokeLinecap="round"/>
        <path d="M285 350 C320 320 360 300 410 280" stroke="url(#trunk)" strokeWidth="12" fill="none" strokeLinecap="round"/>
        <path d="M260 270 C220 260 170 250 130 240" stroke="url(#trunk)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d="M240 220 C260 180 290 150 310 110" stroke="url(#trunk)" strokeWidth="9" fill="none" strokeLinecap="round"/>
        {/* blossom clusters */}
        {Array.from({ length: 22 }).map((_, i) => {
          const cx = 60 + Math.random() * 480;
          const cy = 60 + Math.random() * 280;
          const r = 35 + Math.random() * 55;
          return <circle key={i} cx={cx} cy={cy} r={r} fill="url(#bloom)" />;
        })}
        {/* snow on branches */}
        {Array.from({ length: 14 }).map((_, i) => (
          <ellipse key={i} cx={120 + Math.random()*360} cy={120 + Math.random()*200} rx={20 + Math.random()*30} ry={4} fill="white" opacity="0.55" />
        ))}
        {/* snow ground */}
        <ellipse cx="300" cy="595" rx="380" ry="22" fill="white" opacity="0.7" />
      </svg>

      {/* secondary tree right */}
      <svg className="absolute bottom-0 right-0 w-[40%] max-w-[600px] opacity-50 float" style={{ animationDelay: "1.5s" }}
        viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
        <use href="#" />
        <path d="M300 600 C300 480 280 420 310 340 C330 290 350 250 380 210" stroke="#2a1d1a" strokeWidth="18" fill="none" strokeLinecap="round"/>
        <path d="M310 340 C270 310 230 290 180 270" stroke="#2a1d1a" strokeWidth="10" fill="none" strokeLinecap="round"/>
        {Array.from({ length: 14 }).map((_, i) => {
          const cx = 80 + Math.random() * 480;
          const cy = 100 + Math.random() * 240;
          const r = 30 + Math.random() * 50;
          return <circle key={i} cx={cx} cy={cy} r={r} fill="oklch(0.85 0.12 350 / 0.7)" />;
        })}
      </svg>

      {/* falling petals */}
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
            background: `radial-gradient(circle at 30% 30%, oklch(0.95 0.06 ${p.hue}), oklch(0.65 0.2 ${p.hue}))`,
          }}
        />
      ))}

      {/* gentle snow */}
      {Array.from({ length: 30 }).map((_, i) => {
        const left = Math.random() * 100;
        const dur = 12 + Math.random() * 18;
        const delay = -Math.random() * 20;
        const size = 2 + Math.random() * 4;
        return (
          <span key={`s-${i}`}
            className="petal"
            style={{
              left: `${left}%`,
              width: size, height: size, borderRadius: "50%",
              background: "white",
              filter: "blur(0.5px) drop-shadow(0 0 4px white)",
              animationDuration: `${dur}s, ${dur/2}s`,
              animationDelay: `${delay}s, ${delay}s`,
              ["--drift" as any]: `${Math.random() * 60 - 30}px`,
            }}
          />
        );
      })}
    </div>
  );
}
