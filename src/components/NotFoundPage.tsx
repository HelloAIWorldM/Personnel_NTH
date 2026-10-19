import React, { useMemo } from 'react';
import { Home } from 'lucide-react';

interface NotFoundPageProps {
  brandName?: string;
  onGoHome?: () => void;
}

interface Star {
  id: number;
  top: number;
  left: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  brandName = 'TrungQuanDev',
  onGoHome,
}) => {
  // Generate random starry background
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: 120 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() < 0.2 ? 3 : Math.random() < 0.6 ? 2 : 1,
      opacity: 0.2 + Math.random() * 0.8,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3,
    }));
  }, []);

  const handleNavigateHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0c1427] text-white flex flex-col items-center justify-center overflow-hidden select-none font-sans">
      {/* 1. Procedural Twinkling Stars Background */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full bg-white transition-opacity"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
              animation: `spaceTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* 2. Main Content Container */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-lg">
        {/* Large 404 Heading */}
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight text-white leading-none mb-3 drop-shadow-[0_4px_20px_rgba(255,255,255,0.15)]">
          404
        </h1>

        {/* Subtitle with Strike-through & Highlighted Name */}
        <div className="text-sm sm:text-base font-semibold tracking-wide text-slate-200 mb-1">
          LOST IN <span className="line-through text-amber-500 font-bold decoration-2">SPACE</span>{' '}
          <span className="text-amber-500 font-bold">{brandName}</span>?
        </div>

        {/* Description text */}
        <p className="text-xs sm:text-sm text-slate-400 mb-8 font-normal">
          Hmm, looks like that page doesn&apos;t exist.
        </p>

        {/* 3. Celestial Illustration Area (Planet + Astronaut + Sparkles) */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-2">
          {/* Top-Left Sparkle Star */}
          <div
            className="absolute top-8 left-12 z-20"
            style={{ animation: 'sparklePulse 3s ease-in-out infinite' }}
          >
            <svg
              className="w-7 h-7 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0 C12 7 17 12 24 12 C17 12 12 17 12 24 C12 17 7 12 0 12 C7 12 12 7 12 0 Z" />
            </svg>
          </div>

          {/* Right Sparkle Star */}
          <div
            className="absolute bottom-16 right-8 z-20"
            style={{ animation: 'sparklePulse 2.5s ease-in-out 1.2s infinite' }}
          >
            <svg
              className="w-5 h-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0 C12 7 17 12 24 12 C17 12 12 17 12 24 C12 17 7 12 0 12 C7 12 12 7 12 0 Z" />
            </svg>
          </div>

          {/* Bottom-Left Subtle Sparkle */}
          <div
            className="absolute bottom-6 left-16 z-20"
            style={{ animation: 'sparklePulse 3.5s ease-in-out 0.6s infinite' }}
          >
            <svg
              className="w-3.5 h-3.5 text-white/80"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0 C12 7 17 12 24 12 C17 12 12 17 12 24 C12 17 7 12 0 12 C7 12 12 7 12 0 Z" />
            </svg>
          </div>

          {/* Red Planet (Mars) */}
          <div className="relative w-48 h-48 sm:w-52 sm:h-52 rounded-full shadow-[0_0_50px_rgba(244,63,94,0.35)] overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
              <defs>
                {/* Planet 3D gradient */}
                <radialGradient id="planetGlow" cx="35%" cy="30%" r="75%">
                  <stop offset="0%" stopColor="#ff526c" />
                  <stop offset="60%" stopColor="#ef233c" />
                  <stop offset="90%" stopColor="#d90429" />
                  <stop offset="100%" stopColor="#8d0801" />
                </radialGradient>

                {/* Crater Shadow Filter */}
                <filter id="craterInnerShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feOffset dx="1" dy="1.5" />
                  <feGaussianBlur stdDeviation="1" result="offset-blur" />
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                  <feFlood floodColor="#4a0005" floodOpacity="0.75" result="color" />
                  <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                  <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                </filter>
              </defs>

              {/* Planet Base Sphere */}
              <circle cx="100" cy="100" r="100" fill="url(#planetGlow)" />

              {/* Surface Craters */}
              {/* Crater 1 (Top Left) */}
              <circle cx="58" cy="52" r="11" fill="#c9184a" opacity="0.85" />
              <circle cx="56.5" cy="50.5" r="9" fill="#a4133c" opacity="0.9" />

              {/* Crater 2 (Middle Left) */}
              <circle cx="42" cy="105" r="8" fill="#c9184a" opacity="0.85" />
              <circle cx="41" cy="104" r="6.5" fill="#a4133c" opacity="0.9" />

              {/* Crater 3 (Center) */}
              <circle cx="95" cy="88" r="13" fill="#c9184a" opacity="0.8" />
              <circle cx="93.5" cy="86.5" r="11" fill="#a4133c" opacity="0.85" />

              {/* Crater 4 (Center Bottom) */}
              <circle cx="90" cy="132" r="15" fill="#a4133c" opacity="0.8" />
              <circle cx="88.5" cy="130.5" r="12.5" fill="#800f2f" opacity="0.9" />

              {/* Crater 5 (Large - Upper Right) */}
              <circle cx="140" cy="75" r="19" fill="#c9184a" opacity="0.85" />
              <circle cx="138" cy="73.5" r="16" fill="#a4133c" opacity="0.9" />

              {/* Crater 6 (Bottom Right) */}
              <circle cx="142" cy="138" r="10" fill="#800f2f" opacity="0.85" />
              <circle cx="141" cy="137" r="8" fill="#590d22" opacity="0.95" />

              {/* Crater 7 (Small Right) */}
              <circle cx="172" cy="108" r="6.5" fill="#800f2f" opacity="0.75" />
              <circle cx="171" cy="107.5" r="5" fill="#590d22" opacity="0.85" />

              {/* Planet Atmosphere / Crescent Shadow on bottom right */}
              <path
                d="M 100 0 A 100 100 0 0 1 200 100 A 100 100 0 0 1 100 200 A 98 98 0 0 0 100 0 Z"
                fill="#2b0004"
                opacity="0.35"
              />
            </svg>
          </div>

          {/* Floating Cartoon Astronaut */}
          <div
            className="absolute -top-4 right-8 sm:right-10 z-30"
            style={{
              animation: 'astronautFloat 4.5s ease-in-out infinite',
            }}
          >
            <svg
              className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transform rotate-12"
              viewBox="0 0 100 100"
              fill="none"
            >
              {/* Jetpack on back */}
              <rect x="24" y="32" width="14" height="28" rx="6" fill="#cbd5e1" />
              <rect x="22" y="36" width="6" height="20" rx="3" fill="#ea580c" />

              {/* Astronaut Body (Torso) */}
              <rect x="34" y="38" width="30" height="28" rx="10" fill="#f8fafc" />
              {/* Chest control panel / emblem */}
              <rect x="42" y="44" width="14" height="10" rx="3" fill="#0f172a" />
              <circle cx="46" cy="49" r="1.5" fill="#38bdf8" />
              <circle cx="52" cy="49" r="1.5" fill="#ef4444" />

              {/* Left Arm & Glove */}
              <rect
                x="26"
                y="42"
                width="10"
                height="18"
                rx="5"
                fill="#f8fafc"
                transform="rotate(20 26 42)"
              />
              <circle cx="28" cy="60" r="5" fill="#ea580c" />

              {/* Right Arm & Glove */}
              <rect
                x="62"
                y="40"
                width="10"
                height="18"
                rx="5"
                fill="#f8fafc"
                transform="rotate(-25 62 40)"
              />
              <circle cx="72" cy="56" r="5" fill="#ea580c" />

              {/* Left Leg & Boot */}
              <rect x="36" y="62" width="10" height="18" rx="5" fill="#f8fafc" />
              <path
                d="M34 76 C34 74, 48 74, 48 76 L48 81 C48 83, 34 83, 34 81 Z"
                fill="#ea580c"
              />

              {/* Right Leg & Boot */}
              <rect x="52" y="62" width="10" height="18" rx="5" fill="#f8fafc" />
              <path
                d="M50 76 C50 74, 64 74, 64 76 L64 81 C64 83, 50 83, 50 81 Z"
                fill="#ea580c"
              />

              {/* Helmet */}
              <circle cx="49" cy="27" r="17" fill="#f8fafc" />
              {/* Golden reflective visor */}
              <ellipse
                cx="50"
                cy="27"
                rx="12"
                ry="9"
                fill="url(#visorGradient)"
              />
              {/* Visor Glare/Highlight */}
              <path
                d="M44 22 Q52 20 58 23"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.8"
              />

              {/* Visor Gradient Def */}
              <defs>
                <linearGradient id="visorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="60%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* 4. Go Home Button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleNavigateHome}
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-slate-950 border border-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white text-xs font-semibold tracking-wide transition-all duration-200 shadow-lg shadow-black/40 hover:shadow-cyan-500/10 cursor-pointer backdrop-blur-md hover:scale-105 active:scale-95"
          >
            <Home className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
            <span>Go Home</span>
          </button>
        </div>
      </div>

      {/* Embedded CSS Keyframe Animations */}
      <style>{`
        @keyframes spaceTwinkle {
          0% {
            opacity: 0.2;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
          100% {
            opacity: 0.3;
            transform: scale(0.9);
          }
        }

        @keyframes astronautFloat {
          0% {
            transform: translateY(0px) rotate(12deg);
          }
          50% {
            transform: translateY(-14px) rotate(18deg) scale(1.03);
          }
          100% {
            transform: translateY(0px) rotate(12deg);
          }
        }

        @keyframes sparklePulse {
          0% {
            transform: scale(0.85) rotate(0deg);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.18) rotate(45deg);
            opacity: 1;
          }
          100% {
            transform: scale(0.85) rotate(90deg);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default NotFoundPage;
