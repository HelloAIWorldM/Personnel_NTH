import React, { useMemo } from 'react';

// Cute Strawberry Milk Carton SVG
const StrawberryMilkCarton: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 60 70"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Carton Roof / Gable Top */}
    <path
      d="M12 24 L24 8 L36 8 L48 24 Z"
      fill="#F87593"
      stroke="#2B1810"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M24 8 L24 2 L36 2 L36 8 Z"
      fill="#E85D7B"
      stroke="#2B1810"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* "MILK" text on Roof */}
    <text
      x="30"
      y="20"
      textAnchor="middle"
      fill="#FFFFFF"
      fontWeight="900"
      fontSize="9"
      fontFamily="'Courier New', monospace, sans-serif"
      letterSpacing="1"
    >
      MILK
    </text>

    {/* Carton Body */}
    <rect
      x="12"
      y="24"
      width="36"
      height="42"
      rx="3"
      fill="#FF8FA3"
      stroke="#2B1810"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />

    {/* Wavy Milk Foam Banner */}
    <path
      d="M13 36 Q21 32 30 36 Q39 40 47 36 L47 48 Q39 52 30 48 Q21 44 13 48 Z"
      fill="#FFFDF9"
      stroke="#2B1810"
      strokeWidth="1.8"
    />

    {/* Strawberry Emblem */}
    <circle cx="30" cy="42" r="6.5" fill="#E63946" stroke="#2B1810" strokeWidth="1.8" />
    <path d="M27 39 Q30 37 33 39 Q30 46 27 39 Z" fill="#C1121F" />
    {/* Strawberry Cap */}
    <path d="M28.5 38.5 L30 36.5 L31.5 38.5" stroke="#52B788" strokeWidth="2" strokeLinecap="round" />
    {/* Tiny Seed Dots */}
    <circle cx="29" cy="41" r="0.5" fill="#FFF" />
    <circle cx="31" cy="42" r="0.5" fill="#FFF" />
  </svg>
);

// Cute Kawaii Heart SVG with retro outline
const KawaiiHeart: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-6 h-6',
  color = '#FF8FA3',
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M16 26 C16 26 5 19 5 11 C5 6.5 8.5 4 12 4 C14.5 4 15.5 5.5 16 6.5 C16.5 5.5 17.5 4 20 4 C23.5 4 27 6.5 27 11 C27 19 16 26 16 26 Z"
      fill={color}
      stroke="#2B1810"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Inner highlight spark */}
    <path
      d="M9 10 C9 8 11 6.5 13 6.5"
      stroke="#FFFFFF"
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity="0.8"
    />
  </svg>
);

// Fresh Kawaii Strawberry SVG
const SweetStrawberry: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Berry Shape */}
    <path
      d="M16 28 C9 24 6 17 7 11 C8 7 12 6 16 6 C20 6 24 7 25 11 C26 17 23 24 16 28 Z"
      fill="#E63946"
      stroke="#2B1810"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Leaves */}
    <path
      d="M16 6 C14 3 10 3 9 5 M16 6 C18 3 22 3 23 5 M16 6 L16 2"
      stroke="#52B788"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Seeds */}
    <circle cx="12" cy="12" r="0.8" fill="#FFFDF9" />
    <circle cx="16" cy="14" r="0.8" fill="#FFFDF9" />
    <circle cx="20" cy="12" r="0.8" fill="#FFFDF9" />
    <circle cx="14" cy="19" r="0.8" fill="#FFFDF9" />
    <circle cx="18" cy="19" r="0.8" fill="#FFFDF9" />
    <circle cx="16" cy="23" r="0.7" fill="#FFFDF9" />
  </svg>
);

// Mini Peeking Spotted Cow Mascot
const MiniPeekingCow: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 50 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Cow Head */}
    <path
      d="M12 24 C10 14 18 8 26 8 C34 8 42 14 40 24 C38 32 32 35 26 35 C20 35 14 32 12 24 Z"
      fill="#FFFDF9"
      stroke="#2B1810"
      strokeWidth="2.2"
    />
    {/* Black Patch over Right Eye */}
    <path
      d="M26 9 C32 9 39 12 39 20 C38 25 34 26 30 24 C27 22 25 16 26 9 Z"
      fill="#2B1810"
    />
    {/* Horns */}
    <path d="M18 9 C17 5 19 3 20 4 C21 6 20 8 19 9" fill="#F4D06F" stroke="#2B1810" strokeWidth="1.5" />
    <path d="M32 9 C33 5 31 3 30 4 C29 6 30 8 31 9" fill="#F4D06F" stroke="#2B1810" strokeWidth="1.5" />
    {/* Ears */}
    <ellipse cx="11" cy="15" rx="4" ry="2.5" fill="#FFFDF9" stroke="#2B1810" strokeWidth="1.6" transform="rotate(-20 11 15)" />
    <ellipse cx="40" cy="15" rx="4" ry="2.5" fill="#2B1810" stroke="#2B1810" strokeWidth="1.6" transform="rotate(20 40 15)" />
    {/* Pink Muzzle */}
    <ellipse cx="26" cy="27" rx="8" ry="5.5" fill="#FFBCC6" stroke="#2B1810" strokeWidth="2" />
    <circle cx="23.5" cy="27" r="1" fill="#2B1810" />
    <circle cx="28.5" cy="27" r="1" fill="#2B1810" />
    {/* Dot Eyes */}
    <circle cx="20" cy="18" r="1.5" fill="#2B1810" />
    <circle cx="31" cy="18" r="1.5" fill="#2B1810" />
  </svg>
);

export const CowStrawberryBackground: React.FC = () => {
  // Fixed floating background elements
  const floatingItems = useMemo(
    () => [
      { id: 1, type: 'carton', left: 4, top: 12, duration: 22, delay: 0, scale: 1.1, rotate: -8 },
      { id: 2, type: 'heart', left: 16, top: 28, duration: 18, delay: 3, scale: 0.9, rotate: 12, color: '#FF8FA3' },
      { id: 3, type: 'cow', left: 88, top: 15, duration: 26, delay: 1, scale: 1.2, rotate: -10 },
      { id: 4, type: 'strawberry', left: 80, top: 38, duration: 20, delay: 5, scale: 1.0, rotate: 15 },
      { id: 5, type: 'carton', left: 92, top: 68, duration: 24, delay: 2, scale: 1.0, rotate: 10 },
      { id: 6, type: 'heart', left: 74, top: 82, duration: 19, delay: 4, scale: 1.1, rotate: -14, color: '#FFBCC6' },
      { id: 7, type: 'cow', left: 6, top: 78, duration: 25, delay: 6, scale: 1.1, rotate: 8 },
      { id: 8, type: 'strawberry', left: 22, top: 62, duration: 21, delay: 2, scale: 0.9, rotate: -20 },
      { id: 9, type: 'heart', left: 48, top: 8, duration: 22, delay: 7, scale: 0.8, rotate: 5, color: '#FFAAB9' },
      { id: 10, type: 'carton', left: 38, top: 88, duration: 23, delay: 5, scale: 0.9, rotate: -6 },
    ],
    []
  );

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none opacity-45 dark:opacity-20 transition-opacity"
    >
      {floatingItems.map((item) => (
        <div
          key={item.id}
          className="absolute transform-gpu"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            transform: `scale(${item.scale}) rotate(${item.rotate}deg)`,
            animation: `cowFloatAnim ${item.duration}s ease-in-out infinite alternate`,
            animationDelay: `${item.delay}s`,
          }}
        >
          {item.type === 'carton' && <StrawberryMilkCarton className="w-9 h-9 sm:w-11 sm:h-11" />}
          {item.type === 'heart' && <KawaiiHeart className="w-6 h-6 sm:w-7 sm:h-7" color={item.color} />}
          {item.type === 'cow' && <MiniPeekingCow className="w-10 h-8 sm:w-12 sm:h-10" />}
          {item.type === 'strawberry' && <SweetStrawberry className="w-6 h-6 sm:w-7 sm:h-7" />}
        </div>
      ))}

      {/* Global gentle floating animation */}
      <style>{`
        @keyframes cowFloatAnim {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-16px) rotate(4deg);
          }
          100% {
            transform: translateY(12px) rotate(-4deg);
          }
        }
      `}</style>
    </div>
  );
};

// Aliases for compatibility
export const MatchaBackground = CowStrawberryBackground;
export const FrogPondBackground = CowStrawberryBackground;
