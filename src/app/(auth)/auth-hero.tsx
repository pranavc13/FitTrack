import { Footprints, Flame, ScanLine } from "lucide-react";

/** Illustrated hero for the sign-in screens: a thali being scanned, with the kind of numbers the app gives back. */
export function AuthHero() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px] lg:max-w-[460px]" aria-hidden>
      <div className="absolute inset-[8%] rounded-full bg-lime/10 blur-3xl" />
      <svg viewBox="0 0 400 400" className="relative h-full w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)]">
        <defs>
          <radialGradient id="plate" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#3a423c" />
            <stop offset="75%" stopColor="#262d28" />
            <stop offset="100%" stopColor="#1b201c" />
          </radialGradient>
          <radialGradient id="dal" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#ffd86b" />
            <stop offset="100%" stopColor="#e9a72a" />
          </radialGradient>
          <radialGradient id="sabzi" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#9fd85a" />
            <stop offset="100%" stopColor="#4f8f2a" />
          </radialGradient>
          <radialGradient id="raita" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d9e3dc" />
          </radialGradient>
          <radialGradient id="paneer" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#ff9e5e" />
            <stop offset="100%" stopColor="#d4561f" />
          </radialGradient>
          <linearGradient id="katori" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c9d1cb" />
            <stop offset="100%" stopColor="#6f7a72" />
          </linearGradient>
          <radialGradient id="roti" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#f1d199" />
            <stop offset="100%" stopColor="#c8954c" />
          </radialGradient>
        </defs>

        {/* plate */}
        <circle cx="200" cy="200" r="168" fill="url(#plate)" />
        <circle cx="200" cy="200" r="168" fill="none" stroke="#4a544d" strokeWidth="3" />
        <circle cx="200" cy="200" r="146" fill="none" stroke="#323a34" strokeWidth="1.5" />

        {/* rice */}
        <g>
          <ellipse cx="205" cy="255" rx="62" ry="44" fill="#f4f1e8" />
          {Array.from({ length: 46 }, (_, i) => {
            const a = (i * 137.5 * Math.PI) / 180;
            const r = 6 + ((i * 7) % 38);
            return <ellipse key={i} cx={205 + Math.cos(a) * r * 1.3} cy={255 + Math.sin(a) * r * 0.85} rx="4.2" ry="1.6" fill="#ffffff" opacity="0.9" transform={`rotate(${(i * 47) % 180} ${205 + Math.cos(a) * r * 1.3} ${255 + Math.sin(a) * r * 0.85})`} />;
          })}
          <circle cx="190" cy="248" r="2.4" fill="#6b8f3a" />
          <circle cx="222" cy="262" r="2" fill="#6b8f3a" />
        </g>

        {/* rotis */}
        <g transform="rotate(-18 112 236)">
          <ellipse cx="112" cy="236" rx="52" ry="46" fill="url(#roti)" />
          <ellipse cx="104" cy="230" rx="52" ry="46" fill="url(#roti)" stroke="#b98443" strokeWidth="1" />
          {[[-14, -10, 7], [12, 6, 5], [-4, 18, 6], [20, -16, 4], [-26, 10, 4]].map(([x, y, r], i) => <circle key={i} cx={104 + x!} cy={230 + y!} r={r} fill="#9a6a2c" opacity="0.45" />)}
        </g>

        {/* katoris */}
        {[
          { cx: 140, cy: 128, fill: "url(#dal)", dots: "#c97a12" },
          { cx: 248, cy: 112, fill: "url(#sabzi)", dots: "#2f6a18" },
          { cx: 300, cy: 200, fill: "url(#paneer)", dots: "#fff3e0" },
          { cx: 288, cy: 290, fill: "url(#raita)", dots: "#8fcc22" },
        ].map((k, i) => (
          <g key={i}>
            <circle cx={k.cx} cy={k.cy + 4} r="44" fill="#000" opacity="0.25" />
            <circle cx={k.cx} cy={k.cy} r="44" fill="url(#katori)" />
            <circle cx={k.cx} cy={k.cy} r="36" fill={k.fill} />
            {[[-12, -8], [10, -12], [14, 10], [-8, 14], [2, 0], [-18, 6]].map(([x, y], j) => (
              <circle key={j} cx={k.cx + x!} cy={k.cy + y!} r={i === 2 ? 4.5 : 2.4} fill={k.dots} opacity={i === 2 ? 0.85 : 0.6} />
            ))}
          </g>
        ))}

        {/* scan frame */}
        <g stroke="#b6f34a" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M28 70 V40 a12 12 0 0 1 12 -12 H70" />
          <path d="M330 28 H360 a12 12 0 0 1 12 12 V70" />
          <path d="M372 330 V360 a12 12 0 0 1 -12 12 H330" />
          <path d="M70 372 H40 a12 12 0 0 1 -12 -12 V330" />
        </g>
        <rect x="40" y="196" width="320" height="3" rx="1.5" fill="#b6f34a" opacity="0.85">
          <animate attributeName="y" values="70;330;70" dur="4.5s" repeatCount="indefinite" />
        </rect>
      </svg>

      {/* result chips */}
      <div className="absolute -left-1 top-[30%] rounded-2xl border border-line bg-surface/90 px-3 py-2 text-left shadow-xl backdrop-blur">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-lime"><ScanLine className="h-3 w-3" /> Dal tadka</p>
        <p className="text-sm font-bold tabular">1 katori · ~150 g</p>
      </div>
      <div className="absolute -right-1 top-[6%] rounded-2xl border border-line bg-surface/90 px-3 py-2 text-left shadow-xl backdrop-blur">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-orange"><Flame className="h-3 w-3" /> This plate</p>
        <p className="text-sm font-bold tabular">612 kcal · 24 g protein</p>
      </div>
      <div className="absolute bottom-[4%] left-[10%] rounded-2xl border border-line bg-surface/90 px-3 py-2 text-left shadow-xl backdrop-blur">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-cyan"><Footprints className="h-3 w-3" /> Google Fit today</p>
        <p className="text-sm font-bold tabular">8,240 steps · 32 ♥ pts</p>
      </div>
    </div>
  );
}
