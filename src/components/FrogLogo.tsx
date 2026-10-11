import React from 'react';

interface FrogLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const FrogLogo: React.FC<FrogLogoProps> = ({
  className = '',
  size = 36,
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm select-none"
      >
        {/* Soft Lilypad Shadow / Base Ripple */}
        <ellipse cx="32" cy="58" rx="26" ry="5" fill="#3E8848" opacity="0.22" />
        <ellipse cx="32" cy="58" rx="20" ry="3.5" fill="#58B868" opacity="0.3" />

        {/* Leaf Umbrella Stem */}
        <path
          d="M38 38C43 32 47 22 52 14"
          stroke="#448B32"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Leaf Umbrella Canopy */}
        <path
          d="M52 14C45 9 32 10 27 16C24 20 28 26 36 25C44 24 53 20 52 14Z"
          fill="#7ED957"
          stroke="#387728"
          strokeWidth="2"
        />
        <path
          d="M32 15C38 18 45 19 50 15"
          stroke="#4EA82E"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M36 17C38 21 41 22 45 20"
          stroke="#4EA82E"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Water Ripple Ring around Frog */}
        <ellipse cx="28" cy="54" rx="18" ry="4.5" stroke="#78C4F8" strokeWidth="1.5" fill="none" opacity="0.65" />

        {/* Frog Body / Legs */}
        <ellipse cx="28" cy="46" rx="15" ry="12" fill="#8CE064" stroke="#3E802A" strokeWidth="2" />

        {/* Frog Pale Cream Belly */}
        <ellipse cx="28" cy="48" rx="10" ry="8" fill="#F0F9DC" />

        {/* Frog Head */}
        <ellipse cx="28" cy="34" rx="17" ry="13" fill="#8CE064" stroke="#3E802A" strokeWidth="2" />

        {/* Cute Eye Bumps */}
        <circle cx="18" cy="24" r="7" fill="#8CE064" stroke="#3E802A" strokeWidth="2" />
        <circle cx="38" cy="24" r="7" fill="#8CE064" stroke="#3E802A" strokeWidth="2" />

        {/* Eye Inner Highlights (Big Sparkling Eyes) */}
        <circle cx="18" cy="24" r="5" fill="#2E1C14" />
        <circle cx="38" cy="24" r="5" fill="#2E1C14" />
        <circle cx="16.5" cy="22" r="2.2" fill="#FFFFFF" />
        <circle cx="19.5" cy="25.5" r="1.1" fill="#FFFFFF" />
        <circle cx="36.5" cy="22" r="2.2" fill="#FFFFFF" />
        <circle cx="39.5" cy="25.5" r="1.1" fill="#FFFFFF" />

        {/* Pink Rosy Cheeks */}
        <ellipse cx="14" cy="35" rx="3.2" ry="2" fill="#FF9EAA" opacity="0.85" />
        <ellipse cx="42" cy="35" rx="3.2" ry="2" fill="#FF9EAA" opacity="0.85" />

        {/* W-Shaped Cute Frog Mouth */}
        <path
          d="M23 35C24.5 37 26.5 37 28 35C29.5 37 31.5 37 33 35"
          stroke="#2E1C14"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Hand holding leaf */}
        <circle cx="38" cy="38" r="3.2" fill="#8CE064" stroke="#3E802A" strokeWidth="1.5" />

        {/* Tiny Pink Water Lily on Lilypad edge */}
        <circle cx="49" cy="52" r="2" fill="#FFE699" />
        <path
          d="M49 47C47 49 47 52 49 53C51 52 51 49 49 47Z"
          fill="#FF9EAA"
        />
        <path
          d="M45 50C47 51 49 52 49 53C47 54 44 52 45 50Z"
          fill="#FFAEC9"
        />
        <path
          d="M53 50C51 51 49 52 49 53C51 54 54 52 53 50Z"
          fill="#FFAEC9"
        />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-black text-sm tracking-tight text-emerald-950 dark:text-emerald-100 flex items-center gap-1">
            <span>NTH</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700/60">
              Ếch Xanh
            </span>
          </span>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-medium">
            Raid & Bang Chiến
          </span>
        </div>
      )}
    </div>
  );
};
