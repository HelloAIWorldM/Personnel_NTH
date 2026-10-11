import React from 'react';

interface DolphinLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const DolphinLogo: React.FC<DolphinLogoProps> = ({
  className = '',
  size = 40,
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm select-none"
      >
        <defs>
          {/* Aqua Cyan Dolphin Body Gradient */}
          <linearGradient id="dolphinBodyGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#00B4D8" />
            <stop offset="100%" stopColor="#0077B6" />
          </linearGradient>

          {/* Soft Aqua Belly Gradient */}
          <linearGradient id="dolphinBellyGrad" x1="30" y1="40" x2="70" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0F7FA" />
          </linearGradient>

          {/* Ocean Wave Gradient */}
          <linearGradient id="oceanWaveGrad" x1="0" y1="80" x2="100" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0077B6" />
            <stop offset="50%" stopColor="#00B4D8" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>

        {/* Ocean Wave Splash & Shadow Base */}
        <ellipse cx="50" cy="88" rx="40" ry="7" fill="#0077B6" opacity="0.25" />
        <ellipse cx="50" cy="88" rx="28" ry="4" fill="#0284C7" opacity="0.3" />

        {/* Water Ripple Waves at the bottom */}
        <path
          d="M10 85 C22 81 32 89 48 85 C62 81 74 89 90 85 C93 84 96 86 96 89 C96 92 88 95 50 95 C12 95 4 92 4 89 C4 86 7 84 10 85 Z"
          fill="url(#oceanWaveGrad)"
          stroke="#03045E"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Wave Foam Crest */}
        <path
          d="M14 85 Q28 80 42 84 Q56 80 70 84 Q82 81 88 85"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* 
          === LEAPING PLAYFUL DOLPHIN MASCOT ===
        */}
        <g id="dolphin-mascot">
          {/* Tail Flukes (Far Side) */}
          <path
            d="M20 72 C14 68 8 68 6 72 C5 75 11 77 18 76 Z"
            fill="#0284C7"
            stroke="#03045E"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Tail Flukes (Foreground Side) */}
          <path
            d="M21 75 C16 78 10 81 8 85 C11 87 17 84 22 79 Z"
            fill="#00B4D8"
            stroke="#03045E"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Dorsal Fin */}
          <path
            d="M48 26 C53 17 62 16 66 19 C64 25 58 31 52 33 Z"
            fill="#0096C7"
            stroke="#03045E"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />

          {/* Pectoral Fin (Far Side) */}
          <path
            d="M62 55 C67 59 74 61 77 59 C76 56 71 52 65 52 Z"
            fill="#0284C7"
            stroke="#03045E"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Main Dolphin Body (Graceful Leaping Arc) */}
          <path
            d="M19 75 C24 64 34 38 52 28 C68 20 83 23 88 33 C92 39 91 43 85 46 C80 48 76 46 72 49 C62 56 46 72 26 77 C22 78 18 77 19 75 Z"
            fill="url(#dolphinBodyGrad)"
            stroke="#03045E"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />

          {/* Dolphin Underbelly / Light Breast Patch */}
          <path
            d="M84 45 C78 47 75 46 71 49 C60 57 47 69 26 76 C29 74 38 67 48 58 C58 50 71 44 80 43 C83 43 85 44 84 45 Z"
            fill="url(#dolphinBellyGrad)"
            stroke="#03045E"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Pectoral Fin (Near Side / Foreground) */}
          <path
            d="M55 49 C57 58 64 64 68 63 C69 61 67 54 61 48 Z"
            fill="#38BDF8"
            stroke="#03045E"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Dolphin Beak / Smile Accent */}
          <path
            d="M87 40 C85 42 82 43 80 42"
            stroke="#03045E"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Cute Rosy Blush Cheek */}
          <ellipse cx="73" cy="42" rx="4" ry="2.5" fill="#FB7185" opacity="0.85" />

          {/* Happy Sparkling Eye */}
          <ellipse cx="74" cy="33" rx="3" ry="3.5" fill="#03045E" />
          <circle cx="73" cy="32" r="1.3" fill="#FFFFFF" />
          <circle cx="75.2" cy="34.2" r="0.6" fill="#FFFFFF" />

          {/* Curved Happy Eyelash / Brow */}
          <path
            d="M71 29 Q74 27 77 29"
            stroke="#03045E"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* 
          === OCEAN SPRAY & WATER DROPLETS ===
        */}
        <g id="water-splashes">
          {/* Main Top Droplet */}
          <path
            d="M89 18 C89 15 92 12 92 12 C92 12 95 15 95 18 C95 20 93.7 21.5 92 21.5 C90.3 21.5 89 20 89 18 Z"
            fill="#38BDF8"
            stroke="#03045E"
            strokeWidth="1.6"
          />
          {/* Small Droplet Left */}
          <circle cx="36" cy="18" r="2.2" fill="#67E8F9" stroke="#03045E" strokeWidth="1.4" />
          {/* Small Droplet Right */}
          <circle cx="95" cy="27" r="1.8" fill="#67E8F9" stroke="#03045E" strokeWidth="1.4" />
          {/* Water Bubble Mid */}
          <circle cx="14" cy="62" r="2.5" fill="#BAE6FD" stroke="#03045E" strokeWidth="1.5" />
          <path d="M13 60.5 Q14.5 59.5 15.5 60.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" fill="none" />
        </g>

        {/* Sparkle Star */}
        <path
          d="M40 10 L41.5 14 L45.5 15.5 L41.5 17 L40 21 L38.5 17 L34.5 15.5 L38.5 14 Z"
          fill="#FDE047"
          stroke="#03045E"
          strokeWidth="1.2"
        />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-black text-sm tracking-tight text-[#03045E] dark:text-[#E0F7FA] flex items-center gap-1">
            <span>NTH</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E0F7FA] dark:bg-[#0C4A6E] text-[#0284C7] dark:text-[#7DD3FC] font-bold border border-[#7DD3FC] dark:border-[#0284C7]">
              Cá Heo Aqua
            </span>
          </span>
          <span className="text-[10px] text-[#0369A1] dark:text-[#BAE6FD] font-medium">
            Raid & Bang Chiến
          </span>
        </div>
      )}
    </div>
  );
};

// Aliases for compatibility
export const CowLogo = DolphinLogo;
export const FrogLogo = DolphinLogo;
