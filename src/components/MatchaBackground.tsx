import React, { useMemo } from 'react';

// Cute mini matcha cup SVG icons (tilted, with foam, straw, or latte art)
const MatchaIcedCup: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Straw */}
    <path
      d="M36 4L42 18"
      stroke="#A3E635"
      strokeWidth="4"
      strokeLinecap="round"
    />
    {/* Cup Lid Rim */}
    <ellipse cx="32" cy="18" rx="18" ry="4" fill="#E2E8F0" opacity="0.9" />
    <path
      d="M14 18C14 15 22 13 32 13C42 13 50 15 50 18"
      stroke="#CBD5E1"
      strokeWidth="2"
      fill="none"
    />
    {/* Glass Body */}
    <path
      d="M17 20L21 54C21.5 58 24 60 32 60C40 60 42.5 58 43 54L47 20"
      fill="url(#matcha-glass-gradient)"
      stroke="#94A3B8"
      strokeWidth="2"
    />
    {/* Matcha Tea Liquid (Bottom 60%) */}
    <path
      d="M19.2 32L21 54C21.5 57 24 58.5 32 58.5C40 58.5 42.5 57 43 54L44.8 32C41 33.5 36 34 32 34C28 34 23 33.5 19.2 32Z"
      fill="url(#matcha-liquid-grad)"
    />
    {/* Froth / Milk Layer */}
    <path
      d="M18 24L19.2 32C23 33.5 28 34 32 34C36 34 41 33.5 44.8 32L46 24C42 25.5 37 26 32 26C27 26 22 25.5 18 24Z"
      fill="#F1F8F4"
      opacity="0.92"
    />
    {/* Little Tea Leaf on Cup */}
    <path
      d="M32 40C30 36 33 33 36 35C38 37 36 41 32 40Z"
      fill="#22C55E"
    />
    <path
      d="M32 40C34 43 37 43 36 40"
      stroke="#15803D"
      strokeWidth="1"
      strokeLinecap="round"
    />
    {/* Defs */}
    <defs>
      <linearGradient id="matcha-glass-gradient" x1="17" y1="20" x2="47" y2="60" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFFFF" stopOpacity="0.4" />
        <stop offset="1" stopColor="#E2E8F0" stopOpacity="0.15" />
      </linearGradient>
      <linearGradient id="matcha-liquid-grad" x1="21" y1="32" x2="43" y2="58" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4ADE80" />
        <stop offset="0.6" stopColor="#22C55E" />
        <stop offset="1" stopColor="#15803D" />
      </linearGradient>
    </defs>
  </svg>
);

const MatchaBowlChawan: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Steam / Aroma swirls */}
    <path
      d="M26 12C25 8 28 6 27 2"
      stroke="#86EFAC"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.75"
    />
    <path
      d="M36 10C35 7 38 5 37 1"
      stroke="#86EFAC"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.75"
    />
    {/* Bowl Rim Oval */}
    <ellipse cx="32" cy="24" rx="22" ry="7" fill="#1C3826" stroke="#4ADE80" strokeWidth="2" />
    {/* Whisked Matcha Foam inside bowl */}
    <ellipse cx="32" cy="24" rx="19" ry="5.5" fill="url(#chawan-foam-grad)" />
    {/* Whisk Bubbles */}
    <circle cx="28" cy="23" r="1.5" fill="#DCFCE7" />
    <circle cx="34" cy="25" r="1.2" fill="#DCFCE7" />
    <circle cx="37" cy="22.5" r="1" fill="#DCFCE7" />
    <circle cx="25" cy="25" r="1" fill="#DCFCE7" />
    {/* Ceramic Bowl Body */}
    <path
      d="M10 24C10 40 18 52 32 52C46 52 54 40 54 24"
      fill="url(#chawan-body-grad)"
      stroke="#3B6946"
      strokeWidth="2.5"
    />
    {/* Bowl Foot Ring */}
    <path
      d="M24 52L23 57C23 58 27 59 32 59C37 59 41 58 41 57L40 52"
      fill="#1A2D20"
      stroke="#3B6946"
      strokeWidth="2"
    />
    <defs>
      <linearGradient id="chawan-foam-grad" x1="13" y1="24" x2="51" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#86EFAC" />
        <stop offset="0.5" stopColor="#4ADE80" />
        <stop offset="1" stopColor="#22C55E" />
      </linearGradient>
      <linearGradient id="chawan-body-grad" x1="10" y1="24" x2="54" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#223D2B" />
        <stop offset="0.6" stopColor="#192E20" />
        <stop offset="1" stopColor="#122117" />
      </linearGradient>
    </defs>
  </svg>
);

const MatchaLatteArtCup: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Saucer */}
    <ellipse cx="32" cy="52" rx="26" ry="6" fill="#1C3023" stroke="#33593D" strokeWidth="2" />
    <ellipse cx="32" cy="51" rx="18" ry="3.5" fill="#25422E" />
    {/* Handle */}
    <path
      d="M45 28C52 28 55 36 50 42C47 44 43 44 41 42"
      fill="none"
      stroke="#3B6946"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    {/* Cup Body */}
    <path
      d="M15 24C15 42 22 48 32 48C42 48 49 42 49 24H15Z"
      fill="url(#cup-body-grad)"
      stroke="#3B6946"
      strokeWidth="2.5"
    />
    {/* Cup Rim */}
    <ellipse cx="32" cy="24" rx="17" ry="5.5" fill="#22C55E" stroke="#4ADE80" strokeWidth="1.5" />
    {/* White Foam Heart Latte Art */}
    <path
      d="M32 27.5C30.5 25.5 27 24 27 22.5C27 21 28.5 20 30 20C31 20 31.8 20.8 32 21.5C32.2 20.8 33 20 34 20C35.5 20 37 21 37 22.5C37 24 33.5 25.5 32 27.5Z"
      fill="#F0FDF4"
      opacity="0.95"
    />
    <defs>
      <linearGradient id="cup-body-grad" x1="15" y1="24" x2="49" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#274630" />
        <stop offset="1" stopColor="#172C1E" />
      </linearGradient>
    </defs>
  </svg>
);

interface MatchaCupParticle {
  id: number;
  type: 0 | 1 | 2;
  size: number;
  startX: number; // percentage (0 - 100)
  startY: number; // percentage (0 - 100)
  deltaX: number; // horizontal drift distance
  deltaY: number; // vertical drift distance
  duration: number; // seconds
  delay: number; // seconds (negative so it's pre-rendered)
  tiltAngle: number; // degrees tilted
  opacity: number;
}

export const MatchaBackground: React.FC = () => {
  // Generate random static particle list once
  const particles: MatchaCupParticle[] = useMemo(() => {
    // 16 tilted mini matcha cups drifting diagonally
    const list: MatchaCupParticle[] = [
      { id: 1, type: 0, size: 30, startX: 5, startY: 88, deltaX: 180, deltaY: -280, duration: 22, delay: -4, tiltAngle: 18, opacity: 0.22 },
      { id: 2, type: 1, size: 26, startX: 18, startY: 65, deltaX: 190, deltaY: -260, duration: 26, delay: -12, tiltAngle: -22, opacity: 0.18 },
      { id: 3, type: 2, size: 32, startX: 32, startY: 95, deltaX: 170, deltaY: -290, duration: 24, delay: -8, tiltAngle: 24, opacity: 0.20 },
      { id: 4, type: 0, size: 24, startX: 45, startY: 75, deltaX: 160, deltaY: -270, duration: 28, delay: -19, tiltAngle: -16, opacity: 0.16 },
      { id: 5, type: 1, size: 34, startX: 60, startY: 90, deltaX: 200, deltaY: -310, duration: 25, delay: -2, tiltAngle: 20, opacity: 0.22 },
      { id: 6, type: 2, size: 28, startX: 75, startY: 82, deltaX: 175, deltaY: -280, duration: 27, delay: -15, tiltAngle: -25, opacity: 0.18 },
      { id: 7, type: 0, size: 32, startX: 88, startY: 70, deltaX: 185, deltaY: -290, duration: 23, delay: -9, tiltAngle: 19, opacity: 0.21 },
      { id: 8, type: 1, size: 25, startX: 10, startY: 35, deltaX: 180, deltaY: -260, duration: 26, delay: -21, tiltAngle: -20, opacity: 0.17 },
      { id: 9, type: 2, size: 28, startX: 28, startY: 42, deltaX: 165, deltaY: -275, duration: 24, delay: -6, tiltAngle: 22, opacity: 0.19 },
      { id: 10, type: 0, size: 36, startX: 52, startY: 30, deltaX: 195, deltaY: -300, duration: 29, delay: -17, tiltAngle: -18, opacity: 0.20 },
      { id: 11, type: 1, size: 26, startX: 68, startY: 48, deltaX: 170, deltaY: -265, duration: 25, delay: -11, tiltAngle: 25, opacity: 0.16 },
      { id: 12, type: 2, size: 30, startX: 84, startY: 38, deltaX: 185, deltaY: -285, duration: 27, delay: -23, tiltAngle: -21, opacity: 0.21 },
      { id: 13, type: 0, size: 27, startX: 2, startY: 10, deltaX: 175, deltaY: -250, duration: 28, delay: -14, tiltAngle: 17, opacity: 0.17 },
      { id: 14, type: 1, size: 31, startX: 38, startY: 15, deltaX: 180, deltaY: -270, duration: 23, delay: -5, tiltAngle: -23, opacity: 0.19 },
      { id: 15, type: 2, size: 26, startX: 64, startY: 8, deltaX: 165, deltaY: -260, duration: 26, delay: -18, tiltAngle: 21, opacity: 0.16 },
      { id: 16, type: 0, size: 33, startX: 92, startY: 12, deltaX: 190, deltaY: -290, duration: 24, delay: -7, tiltAngle: -19, opacity: 0.20 },
    ];
    return list;
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
    >
      <style>{`
        @keyframes floatMatchaDiagonal {
          0% {
            transform: translate3d(0, 0, 0) rotate(var(--cup-tilt));
            opacity: 0;
          }
          12% {
            opacity: var(--cup-opacity);
          }
          88% {
            opacity: var(--cup-opacity);
          }
          100% {
            transform: translate3d(var(--drift-x), var(--drift-y), 0) rotate(calc(var(--cup-tilt) + 8deg));
            opacity: 0;
          }
        }
      `}</style>

      {particles.map((p) => {
        const CupIcon =
          p.type === 0
            ? MatchaIcedCup
            : p.type === 1
            ? MatchaBowlChawan
            : MatchaLatteArtCup;

        return (
          <div
            key={p.id}
            className="absolute will-change-transform drop-shadow-[0_2px_8px_rgba(34,197,94,0.15)]"
            style={
              {
                left: `${p.startX}%`,
                top: `${p.startY}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                '--cup-tilt': `${p.tiltAngle}deg`,
                '--drift-x': `${p.deltaX}px`,
                '--drift-y': `${p.deltaY}px`,
                '--cup-opacity': p.opacity,
                animation: `floatMatchaDiagonal ${p.duration}s cubic-bezier(0.4, 0.0, 0.2, 1) infinite`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties
            }
          >
            <CupIcon className="w-full h-full filter drop-shadow-sm" />
          </div>
        );
      })}

      {/* Gentle ambient matcha gradient glow in corners */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/5 dark:bg-[#22C55E]/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-600/5 dark:bg-[#15803D]/8 blur-3xl pointer-events-none" />
    </div>
  );
};
