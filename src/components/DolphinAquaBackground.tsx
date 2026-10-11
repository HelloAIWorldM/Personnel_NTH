import React, { useMemo } from 'react';

// Mini Leaping Dolphin SVG
const MiniJumpingDolphin: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 50 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Dorsal Fin */}
    <path
      d="M24 10 C27 4 33 4 35 6 C34 10 30 13 27 14 Z"
      fill="#0096C7"
      stroke="#03045E"
      strokeWidth="1.5"
    />
    {/* Tail Flukes */}
    <path
      d="M10 28 C7 25 3 26 2 28 C3 30 6 31 10 30 Z"
      fill="#0284C7"
      stroke="#03045E"
      strokeWidth="1.4"
    />
    <path
      d="M11 29 C8 31 5 33 4 35 C6 36 9 34 12 31 Z"
      fill="#00B4D8"
      stroke="#03045E"
      strokeWidth="1.4"
    />
    {/* Main Body */}
    <path
      d="M10 29 C13 22 19 12 28 8 C36 5 44 7 47 13 C49 17 48 20 44 21 C41 22 39 21 37 23 C31 27 23 32 12 30 Z"
      fill="#00B4D8"
      stroke="#03045E"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* White / Pale Aqua Belly */}
    <path
      d="M44 21 C40 22 38 21 36 23 C29 27 22 31 13 30 C15 28 20 24 26 19 C32 15 38 13 42 16 C44 18 45 20 44 21 Z"
      fill="#E0F7FA"
      stroke="#03045E"
      strokeWidth="1.4"
    />
    {/* Pectoral Fin */}
    <path
      d="M30 22 C31 27 35 30 37 29 C37 27 35 24 33 21 Z"
      fill="#38BDF8"
      stroke="#03045E"
      strokeWidth="1.5"
    />
    {/* Cheek Blush */}
    <ellipse cx="40" cy="18" rx="2" ry="1.2" fill="#FB7185" opacity="0.8" />
    {/* Eye */}
    <circle cx="41" cy="14" r="1.5" fill="#03045E" />
    <circle cx="40.5" cy="13.5" r="0.6" fill="#FFFFFF" />
  </svg>
);

// Translucent Glistening Aqua Bubble SVG
const AquaBubble: React.FC<{ className?: string; size?: string }> = ({
  className = 'w-7 h-7',
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="16" cy="16" r="14" fill="#00B4D8" fillOpacity="0.15" stroke="#0077B6" strokeWidth="1.8" />
    <ellipse cx="11" cy="10" rx="4" ry="2.5" fill="#FFFFFF" fillOpacity="0.75" transform="rotate(-30 11 10)" />
    <circle cx="21" cy="22" r="1.5" fill="#FFFFFF" fillOpacity="0.6" />
  </svg>
);

// Ocean Wave Ripple SVG
const OceanWaveRipple: React.FC<{ className?: string }> = ({ className = 'w-12 h-6' }) => (
  <svg
    viewBox="0 0 60 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4 14 C12 8 18 8 26 14 C34 20 40 20 48 14 C52 11 55 12 58 14"
      stroke="#0284C7"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 18 C18 14 22 14 28 18 C34 22 38 22 44 18"
      stroke="#38BDF8"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.8"
    />
    <circle cx="28" cy="8" r="1.5" fill="#67E8F9" />
    <circle cx="46" cy="6" r="1" fill="#BAE6FD" />
  </svg>
);

// Cute Sea Star SVG
const SeaStar: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-6 h-6',
  color = '#FB7185',
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M16 2 L19.5 11 L29 11.5 L21.5 17.5 L24.5 27 L16 21.5 L7.5 27 L10.5 17.5 L3 11.5 L12.5 11 Z"
      fill={color}
      stroke="#03045E"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="15" r="1.5" fill="#FFFDF9" opacity="0.8" />
  </svg>
);

// Sparkling Water Droplet SVG
const WaterDroplet: React.FC<{ className?: string }> = ({ className = 'w-5 h-6' }) => (
  <svg
    viewBox="0 0 20 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10 2 C10 2 2 13 2 18 C2 22.4 5.6 26 10 26 C14.4 26 18 22.4 18 18 C18 13 10 2 10 2 Z"
      fill="#38BDF8"
      stroke="#03045E"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M6 18 C6 15 8 13 10 12"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.85"
    />
  </svg>
);

export const DolphinAquaBackground: React.FC = () => {
  // Coordinated floating aquatic background elements
  const floatingItems = useMemo(
    () => [
      { id: 1, type: 'dolphin', left: 5, top: 10, duration: 24, delay: 0, scale: 1.15, rotate: -6 },
      { id: 2, type: 'bubble', left: 18, top: 26, duration: 16, delay: 2, scale: 1.0, rotate: 10 },
      { id: 3, type: 'wave', left: 86, top: 14, duration: 22, delay: 1, scale: 1.2, rotate: -4 },
      { id: 4, type: 'star', left: 82, top: 38, duration: 20, delay: 4, scale: 0.95, rotate: 15, color: '#FB7185' },
      { id: 5, type: 'droplet', left: 93, top: 66, duration: 18, delay: 3, scale: 1.1, rotate: 8 },
      { id: 6, type: 'bubble', left: 72, top: 82, duration: 17, delay: 5, scale: 1.2, rotate: -8 },
      { id: 7, type: 'dolphin', left: 7, top: 76, duration: 25, delay: 6, scale: 1.1, rotate: 8 },
      { id: 8, type: 'wave', left: 24, top: 60, duration: 21, delay: 2, scale: 1.0, rotate: -12 },
      { id: 9, type: 'star', left: 50, top: 6, duration: 23, delay: 7, scale: 0.85, rotate: 6, color: '#FBBF24' },
      { id: 10, type: 'bubble', left: 36, top: 86, duration: 19, delay: 4, scale: 0.9, rotate: -5 },
      { id: 11, type: 'droplet', left: 64, top: 46, duration: 19, delay: 3, scale: 1.0, rotate: -10 },
    ],
    []
  );

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none opacity-45 dark:opacity-25 transition-opacity"
    >
      {floatingItems.map((item) => (
        <div
          key={item.id}
          className="absolute transform-gpu"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            transform: `scale(${item.scale}) rotate(${item.rotate}deg)`,
            animation: `dolphinAquaFloatAnim ${item.duration}s ease-in-out infinite alternate`,
            animationDelay: `${item.delay}s`,
          }}
        >
          {item.type === 'dolphin' && <MiniJumpingDolphin className="w-10 h-8 sm:w-13 sm:h-10" />}
          {item.type === 'bubble' && <AquaBubble className="w-7 h-7 sm:w-8 sm:h-8" />}
          {item.type === 'wave' && <OceanWaveRipple className="w-11 h-6 sm:w-14 sm:h-7" />}
          {item.type === 'star' && <SeaStar className="w-6 h-6 sm:w-7 sm:h-7" color={item.color} />}
          {item.type === 'droplet' && <WaterDroplet className="w-5 h-6 sm:w-6 sm:h-7" />}
        </div>
      ))}

      {/* Global gentle aquatic floating animation */}
      <style>{`
        @keyframes dolphinAquaFloatAnim {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-18px) rotate(5deg);
          }
          100% {
            transform: translateY(14px) rotate(-5deg);
          }
        }
      `}</style>
    </div>
  );
};

// Aliases for compatibility
export const CowStrawberryBackground = DolphinAquaBackground;
export const MatchaBackground = DolphinAquaBackground;
export const FrogPondBackground = DolphinAquaBackground;
