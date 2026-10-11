import React from 'react';

interface CowLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const CowLogo: React.FC<CowLogoProps> = ({
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
        {/* Soft Strawberry Milk Shadow */}
        <ellipse cx="50" cy="88" rx="38" ry="7" fill="#E8A5B0" opacity="0.4" />
        <ellipse cx="50" cy="88" rx="28" ry="4" fill="#D37E8C" opacity="0.3" />

        {/* 
          === SPOTTED DAIRY COW MASCOT (Matches reference image) ===
        */}
        <g id="cow-mascot">
          {/* Tail */}
          <path
            d="M24 50 C18 52 14 58 15 63 C17 64 20 63 21 60 C22 56 25 54 26 52"
            fill="#2B1810"
            stroke="#2B1810"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Udder (Pink with teats) */}
          <ellipse cx="43" cy="65" rx="7" ry="5" fill="#FFBCC6" stroke="#2B1810" strokeWidth="2.5" />
          <path d="M39 68 L38 72" stroke="#2B1810" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M43 69 L43 73" stroke="#2B1810" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M47 68 L48 72" stroke="#2B1810" strokeWidth="2.5" strokeLinecap="round" />

          {/* Back Left Leg (Far) */}
          <rect x="33" y="62" width="8" height="18" rx="4" fill="#E8E8E8" stroke="#2B1810" strokeWidth="2.5" />
          <path d="M33 74 H41 V77 C41 78.5 39.5 80 37 80 C34.5 80 33 78.5 33 77 Z" fill="#2B1810" />

          {/* Front Left Leg (Far) */}
          <rect x="58" y="62" width="8" height="18" rx="4" fill="#E8E8E8" stroke="#2B1810" strokeWidth="2.5" />
          <path d="M58 74 H66 V77 C66 78.5 64.5 80 62 80 C59.5 80 58 78.5 58 77 Z" fill="#2B1810" />

          {/* Main Body (Torso) */}
          <path
            d="M28 46 C26 36 36 32 50 33 C64 34 72 38 74 48 C76 58 72 67 60 68 C46 69 34 68 28 64 C24 61 24 53 28 46 Z"
            fill="#FFFDF9"
            stroke="#2B1810"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />

          {/* Black Spots on Cow Body */}
          {/* Spot 1: Rump & Back */}
          <path
            d="M26 44 C26 36 34 33 42 34 C44 42 39 48 32 49 C27 49 26 46 26 44 Z"
            fill="#2B1810"
          />
          {/* Spot 2: Center Flank Spot */}
          <path
            d="M44 46 C47 43 55 42 56 48 C57 54 52 58 46 56 C42 55 41 49 44 46 Z"
            fill="#2B1810"
          />
          {/* Spot 3: Small lower flank patch */}
          <path
            d="M34 54 C37 53 39 55 38 58 C37 60 34 61 33 59 C32 57 33 55 34 54 Z"
            fill="#2B1810"
          />

          {/* Back Right Leg (Foreground) */}
          <rect x="27" y="63" width="9" height="19" rx="4.5" fill="#FFFDF9" stroke="#2B1810" strokeWidth="2.8" />
          <path d="M27 75 H36 V78.5 C36 80.5 34.5 82 31.5 82 C28.5 82 27 80.5 27 78.5 Z" fill="#2B1810" />

          {/* Front Right Leg (Foreground) */}
          <rect x="52" y="63" width="9" height="19" rx="4.5" fill="#FFFDF9" stroke="#2B1810" strokeWidth="2.8" />
          <path d="M52 75 H61 V78.5 C61 80.5 59.5 82 56.5 82 C53.5 82 52 80.5 52 78.5 Z" fill="#2B1810" />

          {/* Head & Neck */}
          <path
            d="M62 44 C62 34 68 26 77 28 C85 30 87 40 85 48 C83 55 75 58 68 55 C63 53 62 48 62 44 Z"
            fill="#FFFDF9"
            stroke="#2B1810"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />

          {/* Black Patch on Head / Eye */}
          <path
            d="M66 31 C72 27 82 29 82 37 C81 44 76 45 71 43 C66 41 64 36 66 31 Z"
            fill="#2B1810"
          />

          {/* Left Horn */}
          <path d="M68 28 C67 24 68 21 70 20 C71 21 71 25 70 28" fill="#F4D06F" stroke="#2B1810" strokeWidth="2" />
          {/* Right Horn */}
          <path d="M78 28 C79 24 81 22 83 22 C83 24 81 27 79 29" fill="#F4D06F" stroke="#2B1810" strokeWidth="2" />

          {/* Left Ear */}
          <path d="M62 34 C58 33 55 36 57 38 C60 40 64 37 64 35" fill="#FFFDF9" stroke="#2B1810" strokeWidth="2.2" />
          {/* Right Ear */}
          <path d="M85 34 C89 33 92 36 90 38 C87 40 83 37 83 35" fill="#2B1810" stroke="#2B1810" strokeWidth="2" />

          {/* Snout / Muzzle (Pink with Nostrils) */}
          <ellipse cx="80" cy="48" rx="8.5" ry="6.5" fill="#FFBCC6" stroke="#2B1810" strokeWidth="2.8" />
          <circle cx="78" cy="48" r="1.2" fill="#2B1810" />
          <circle cx="83" cy="49" r="1.2" fill="#2B1810" />

          {/* Cute Dot Eye */}
          <circle cx="75" cy="38" r="2.2" fill="#FFFDF9" stroke="#2B1810" strokeWidth="1.5" />
          <circle cx="75.2" cy="38" r="1.4" fill="#2B1810" />
          <circle cx="74.5" cy="37.5" r="0.6" fill="#FFFFFF" />
        </g>

        {/* 
          === STRAWBERRY MILK CARTON (Top Right) ===
        */}
        <g id="milk-carton" transform="translate(68, 6) rotate(12) scale(0.32)">
          {/* Carton Base Roof */}
          <path d="M20 30 L40 10 L60 10 L80 30 Z" fill="#F87593" stroke="#2B1810" strokeWidth="6" strokeLinejoin="round" />
          <path d="M40 10 L40 0 L60 0 L60 10 Z" fill="#E85D7B" stroke="#2B1810" strokeWidth="6" strokeLinejoin="round" />
          {/* Carton Main Body */}
          <rect x="20" y="30" width="60" height="65" rx="4" fill="#FF8FA3" stroke="#2B1810" strokeWidth="6" strokeLinejoin="round" />
          {/* White Cream Belly Banner */}
          <rect x="23" y="46" width="54" height="24" fill="#FFFDF9" stroke="#2B1810" strokeWidth="4" />
          {/* "MILK" text on Roof */}
          <text x="50" y="26" textAnchor="middle" fill="#FFFFFF" fontWeight="900" fontSize="13" fontFamily="sans-serif" letterSpacing="1">MILK</text>
          {/* Strawberry in Circle */}
          <circle cx="50" cy="58" r="9" fill="#E63946" stroke="#2B1810" strokeWidth="3" />
          <path d="M46 54 Q50 51 54 54 Q50 64 46 54 Z" fill="#C1121F" />
          {/* Green Strawberry Cap */}
          <path d="M48 53 L50 50 L52 53" stroke="#52B788" strokeWidth="3" strokeLinecap="round" />
          {/* Seeds */}
          <circle cx="48.5" cy="56" r="0.8" fill="#FFF" />
          <circle cx="51.5" cy="57" r="0.8" fill="#FFF" />
        </g>

        {/* 
          === CUTE PINK HEARTS ===
        */}
        <g id="sweet-hearts">
          {/* Heart Left */}
          <path
            d="M14 26 C14 22 18 20 20 23 C22 20 26 22 26 26 C26 31 20 35 20 35 C20 35 14 31 14 26 Z"
            fill="#FF8FA3"
            stroke="#2B1810"
            strokeWidth="1.8"
            transform="rotate(-15 20 27) scale(0.65)"
          />
          {/* Heart Bottom */}
          <path
            d="M86 78 C86 75 89 73 91 75 C93 73 96 75 96 78 C96 82 91 85 91 85 C91 85 86 82 86 78 Z"
            fill="#FFBCC6"
            stroke="#2B1810"
            strokeWidth="1.5"
            transform="rotate(10 91 79) scale(0.65)"
          />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-black text-sm tracking-tight text-[#2B1810] dark:text-[#FFE5EC] flex items-center gap-1">
            <span>NTH</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFE5EC] dark:bg-[#4A2E35] text-[#C93B66] dark:text-[#FFB3C1] font-bold border border-[#F5B7B1] dark:border-[#854D59]">
              Bò Sữa Dâu
            </span>
          </span>
          <span className="text-[10px] text-[#8D4A5B] dark:text-[#E8A5B0] font-medium">
            Raid & Bang Chiến
          </span>
        </div>
      )}
    </div>
  );
};
