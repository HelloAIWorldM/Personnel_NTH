import React, { useMemo } from 'react';

// Cute floating Lily Pad SVG
const LilyPad: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Base Lily Pad with notch */}
    <path
      d="M32 6C46.3 6 58 17.7 58 32C58 46.3 46.3 58 32 58C17.7 58 6 46.3 6 32C6 17.7 17.7 6 32 6ZM32 32L54 20C55 24 55 28 55 32L32 32Z"
      fill="url(#lilypad-grad)"
      stroke="#438D2F"
      strokeWidth="1.8"
    />
    {/* Veins */}
    <path
      d="M32 32L12 28M32 32L16 46M32 32L32 55M32 32L48 48M32 32L24 12"
      stroke="#6AC252"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    {/* Tiny water droplet on lily pad */}
    <ellipse cx="26" cy="22" rx="3" ry="2.2" fill="#FFFFFF" opacity="0.75" />
    <defs>
      <linearGradient id="lilypad-grad" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#9DE577" />
        <stop offset="0.7" stopColor="#76CE4E" />
        <stop offset="1" stopColor="#53A831" />
      </linearGradient>
    </defs>
  </svg>
);

// Cute floating Pink Lotus Blossom
const LotusFlower: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Outer Petals */}
    <path
      d="M32 10C24 22 20 38 32 48C44 38 40 22 32 10Z"
      fill="#FFAEC9"
      stroke="#E06287"
      strokeWidth="1.5"
    />
    <path
      d="M14 26C16 36 24 44 32 48C26 38 22 28 14 26Z"
      fill="#FFB6C1"
      stroke="#E06287"
      strokeWidth="1.2"
    />
    <path
      d="M50 26C48 36 40 44 32 48C38 38 42 28 50 26Z"
      fill="#FFB6C1"
      stroke="#E06287"
      strokeWidth="1.2"
    />
    {/* Inner Petal Layers */}
    <path
      d="M32 20C27 28 26 38 32 44C38 38 37 28 32 20Z"
      fill="#FF8DA1"
    />
    {/* Golden Core */}
    <circle cx="32" cy="40" r="4.5" fill="#FFE699" stroke="#E6A817" strokeWidth="1" />
  </svg>
);

// Mini Frog with Leaf Umbrella
const MiniPeekingFrog: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Leaf Canopy */}
    <path
      d="M48 10C40 6 30 8 26 14C23 18 28 22 34 21C42 20 49 15 48 10Z"
      fill="#8BE362"
      stroke="#3A7B26"
      strokeWidth="1.5"
    />
    <path d="M36 21C40 26 42 34 44 42" stroke="#3A7B26" strokeWidth="2.5" strokeLinecap="round" />
    {/* Frog Head */}
    <ellipse cx="28" cy="38" rx="16" ry="12" fill="#90E466" stroke="#3A7B26" strokeWidth="1.8" />
    <circle cx="18" cy="28" r="6" fill="#90E466" stroke="#3A7B26" strokeWidth="1.8" />
    <circle cx="38" cy="28" r="6" fill="#90E466" stroke="#3A7B26" strokeWidth="1.8" />
    <circle cx="18" cy="28" r="4.2" fill="#2E1C14" />
    <circle cx="38" cy="28" r="4.2" fill="#2E1C14" />
    <circle cx="16.5" cy="26.5" r="1.8" fill="#FFFFFF" />
    <circle cx="36.5" cy="26.5" r="1.8" fill="#FFFFFF" />
    {/* Blush */}
    <ellipse cx="14" cy="39" rx="3" ry="1.8" fill="#FF9EAA" opacity="0.8" />
    <ellipse cx="42" cy="39" rx="3" ry="1.8" fill="#FF9EAA" opacity="0.8" />
    {/* Mouth */}
    <path d="M24 39C25.5 41 27 41 28 39C29 41 30.5 41 32 39" stroke="#2E1C14" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Concentric Water Ripple
const WaterRipple: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <ellipse cx="32" cy="32" rx="28" ry="10" stroke="#78C4F8" strokeWidth="1.5" opacity="0.5" />
    <ellipse cx="32" cy="32" rx="18" ry="6.5" stroke="#78C4F8" strokeWidth="1.5" opacity="0.75" />
    <ellipse cx="32" cy="32" rx="8" ry="3" stroke="#38BDF8" strokeWidth="1.5" opacity="0.9" />
  </svg>
);

export const FrogPondBackground: React.FC = () => {
  // Pre-calculated calm organic floating positions
  const floatItems = useMemo(
    () => [
      { id: 1, type: 'lilypad', left: 4, top: 8, duration: 24, delay: 0, scale: 1.15, rotate: 12 },
      { id: 2, type: 'lotus', left: 16, top: 22, duration: 28, delay: 3, scale: 0.95, rotate: -8 },
      { id: 3, type: 'frog', left: 88, top: 12, duration: 26, delay: 1, scale: 1.1, rotate: -10 },
      { id: 4, type: 'ripple', left: 92, top: 38, duration: 20, delay: 4, scale: 1.2, rotate: 5 },
      { id: 5, type: 'lilypad', left: 8, top: 52, duration: 30, delay: 2, scale: 1.3, rotate: -15 },
      { id: 6, type: 'lotus', left: 82, top: 68, duration: 27, delay: 5, scale: 1.05, rotate: 18 },
      { id: 7, type: 'frog', left: 6, top: 82, duration: 25, delay: 6, scale: 1.0, rotate: 8 },
      { id: 8, type: 'ripple', left: 24, top: 74, duration: 22, delay: 2.5, scale: 1.1, rotate: -6 },
      { id: 9, type: 'lilypad', left: 94, top: 86, duration: 29, delay: 4.5, scale: 1.25, rotate: 25 },
      { id: 10, type: 'lotus', left: 52, top: 92, duration: 32, delay: 7, scale: 0.9, rotate: -12 },
      { id: 11, type: 'ripple', left: 48, top: 14, duration: 24, delay: 1.5, scale: 1.0, rotate: 0 },
    ],
    []
  );

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* Background Soft Atmospheric Gradient Tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#EBF7ED]/70 via-[#E5F3EE]/50 to-[#DEF0FA]/60 dark:from-[#091510]/80 dark:via-[#0D1C15]/70 dark:to-[#08131B]/80 transition-colors duration-500" />

      {/* Floating Whimsical Pond Elements */}
      {floatItems.map((item) => (
        <div
          key={item.id}
          className="absolute opacity-35 dark:opacity-20 transition-opacity duration-300"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            animation: `frogFloatAnim ${item.duration}s ease-in-out infinite alternate`,
            animationDelay: `${item.delay}s`,
            transform: `scale(${item.scale}) rotate(${item.rotate}deg)`,
          }}
        >
          {item.type === 'lilypad' && <LilyPad className="w-10 h-10 sm:w-12 sm:h-12" />}
          {item.type === 'lotus' && <LotusFlower className="w-8 h-8 sm:w-10 sm:h-10" />}
          {item.type === 'frog' && <MiniPeekingFrog className="w-9 h-9 sm:w-11 sm:h-11" />}
          {item.type === 'ripple' && <WaterRipple className="w-12 h-12 sm:w-14 sm:h-14" />}
        </div>
      ))}

      {/* Inline styles for gentle organic floating */}
      <style>{`
        @keyframes frogFloatAnim {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          33% {
            transform: translate3d(12px, -18px, 0) rotate(6deg);
          }
          66% {
            transform: translate3d(-10px, -32px, 0) rotate(-4deg);
          }
          100% {
            transform: translate3d(8px, -45px, 0) rotate(8deg);
          }
        }
      `}</style>
    </div>
  );
};

// Backwards compatibility alias
export const MatchaBackground = FrogPondBackground;
