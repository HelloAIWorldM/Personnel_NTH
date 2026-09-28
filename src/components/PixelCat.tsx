import React, { useState, useEffect, useRef, useMemo } from 'react';

// Palette for pixel cat
const PALETTE: Record<string, string> = {
  'K': '#1e293b', // Dark outline
  'O': '#f97316', // Orange tabby fur
  'L': '#fed7aa', // Light peach highlight
  'W': '#ffffff', // White belly / muzzle / paws
  'P': '#f472b6', // Pink inner ears / nose
  'E': '#0f172a', // Eyes
  'R': '#ef4444', // Red collar
  'Y': '#fbbf24', // Golden bell
};

// 20 columns x 14 rows matrices (facing RIGHT by default)
const RAW_RUN_1 = [
  '.............K...K..',
  '............KPK.KPK.',
  '...........KOOOKOOOK',
  '............KEOOKEOK',
  '.......K...KOOPPOOOK',
  '......KOK..KORROOOOK',
  '.......KOK.KOYOOOOOK',
  '.......KOKKOOOOOOOKK',
  '.......KOOOOOOOOOOOK',
  '.......KOOWWWWWWWWOK',
  '.......KOOWWWWWWWWK.',
  '........KWWWWWWWWK..',
  '.....KKWKK..KKWKK...',
  '.......KK.....KK....',
];

const RAW_RUN_2 = [
  '.............K...K..',
  '............KPK.KPK.',
  '...........KOOOKOOOK',
  '............KEOOKEOK',
  '.....K.....KOOPPOOOK',
  '....KOK....KORROOOOK',
  '.....KOK...KOYOOOOOK',
  '.....KOKKKKOOOOOOOKK',
  '......KOOOOOOOOOOOOK',
  '.......KOWWWWWWWWOOK',
  '.......KOWWWWWWWWK..',
  '........KWWWWWWWWK..',
  '...........KKWKK....',
  '............KK......',
];

const RAW_RUN_3 = [
  '.............K...K..',
  '............KPK.KPK.',
  '...........KOOOKOOOK',
  '............KEOOKEOK',
  '........K..KOOPPOOOK',
  '.......KOK.KORROOOOK',
  '.......KOK.KOYOOOOOK',
  '.......KOKKOOOOOOOKK',
  '.......KOOOOOOOOOOOK',
  '.......KOOWWWWWWWWOK',
  '.......KOOWWWWWWWWK.',
  '........KWWWWWWWWK..',
  '.....KKWKK...KKWKK..',
  '......KK......KK....',
];

const RAW_RUN_4 = [
  '.............K...K..',
  '............KPK.KPK.',
  '...........KOOOKOOOK',
  '............KEOOKEOK',
  '.......K...KOOPPOOOK',
  '......KOK..KORROOOOK',
  '.....KOK...KOYOOOOOK',
  '.....KOKKKKOOOOOOOKK',
  '......KOOOOOOOOOOOOK',
  '.......KOWWWWWWWWOOK',
  '.......KOWWWWWWWWK..',
  '........KWWWWWWWWK..',
  '..........KKWKK.....',
  '...........KK.......',
];

const RAW_SIT = [
  '.............K...K..',
  '............KPK.KPK.',
  '...........KOOOKOOOK',
  '............KEOOKEOK',
  '...........KOOPPOOOK',
  '.......K...KORROOOOK',
  '......KOK..KOYOOOOOK',
  '.......KOKKOOOOOOOKK',
  '.......KOOOOOOOOOOOK',
  '.......KOOWWWWWWWWOK',
  '.......KOOWWWWWWWWK.',
  '........KWWWWWWWWK..',
  '.......KKWKK.KKWKK..',
  '........KK....KK....',
];

const RAW_SLEEP = [
  '....................',
  '....................',
  '....................',
  '....................',
  '.............K...K..',
  '............KPK.KPK.',
  '...........KOOOKOOOK',
  '...........KPKKPKKPK',
  '......KKKK.KOOPPOOOK',
  '......KOOKOOOOOOOOOK',
  '......KOOOWWWWWWWWWK',
  '.......KWWWWWWWWWWK.',
  '........KKKKKKKKKK..',
  '....................',
];

interface PixelRect {
  x: number;
  y: number;
  fill: string;
}

function parseFrame(matrix: string[]): PixelRect[] {
  const rects: PixelRect[] = [];
  for (let y = 0; y < matrix.length; y++) {
    const row = matrix[y];
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      const color = PALETTE[char];
      if (color) {
        rects.push({ x, y, fill: color });
      }
    }
  }
  return rects;
}

const RUN_FRAMES = [
  parseFrame(RAW_RUN_1),
  parseFrame(RAW_RUN_2),
  parseFrame(RAW_RUN_3),
  parseFrame(RAW_RUN_4),
];
const SIT_FRAME = parseFrame(RAW_SIT);
const SLEEP_FRAME = parseFrame(RAW_SLEEP);

// Play a cute soft 8-bit retro meow using Web Audio API
function play8BitMeow() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle'; // Soft retro waveform
    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.16);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch {}
}

const MEOW_MESSAGES = [
  'Meo meo~ 🐾',
  'Tìm ai thế sen? 🔍',
  'NTH Raid số 1! ⚔️',
  'Xong việc nhớ cho bé pate 🐟',
  'Purrrr... ❤️',
  'Cố lên leader ơi! ⭐',
  'Chạy mỏi chân quá meo meo~ ✨',
];

interface PixelCatProps {
  isSearching?: boolean;
}

export const PixelCat: React.FC<PixelCatProps> = ({ isSearching = false }) => {
  const [positionX, setPositionX] = useState<number>(10); // Percentage 0% to 92%
  const [direction, setDirection] = useState<1 | -1>(1); // 1: right, -1: left
  const [actionState, setActionState] = useState<'RUNNING' | 'SITTING' | 'SLEEPING'>('RUNNING');
  const [frameIdx, setFrameIdx] = useState<number>(0);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const bubbleTimeoutRef = useRef<any>(null);
  const pauseTimeoutRef = useRef<any>(null);

  // Position stepping animation loop
  useEffect(() => {
    if (actionState !== 'RUNNING' || isHovered) return;

    const baseSpeed = isSearching ? 0.45 : 0.18; // Speed in percentage per tick
    const intervalTime = 30; // 33 fps

    const moveInterval = setInterval(() => {
      setPositionX((prev) => {
        let next = prev + direction * baseSpeed;

        // Reach right boundary
        if (next >= 91) {
          next = 91;
          setActionState('SITTING');
          setDirection(-1);
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = setTimeout(() => {
            setActionState('RUNNING');
          }, 1800);
          return next;
        }

        // Reach left boundary
        if (next <= 2) {
          next = 2;
          setActionState('SITTING');
          setDirection(1);
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = setTimeout(() => {
            setActionState('RUNNING');
          }, 1800);
          return next;
        }

        return next;
      });
    }, intervalTime);

    return () => clearInterval(moveInterval);
  }, [actionState, direction, isSearching, isHovered]);

  // Sprite frame swap loop
  useEffect(() => {
    if (actionState !== 'RUNNING' || isHovered) return;

    const frameRate = isSearching ? 75 : 120; // ms per sprite frame
    const frameInterval = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % RUN_FRAMES.length);
    }, frameRate);

    return () => clearInterval(frameInterval);
  }, [actionState, isSearching, isHovered]);

  // Click handler: jump and meow!
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    play8BitMeow();

    // Trigger jump
    setIsJumping(true);
    setTimeout(() => setIsJumping(false), 400);

    // Random meow message
    const msg = MEOW_MESSAGES[Math.floor(Math.random() * MEOW_MESSAGES.length)];
    setBubbleText(msg);

    clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = setTimeout(() => {
      setBubbleText(null);
    }, 2400);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!bubbleText) {
      setBubbleText('Meo meo~ ❤️');
      clearTimeout(bubbleTimeoutRef.current);
      bubbleTimeoutRef.current = setTimeout(() => {
        setBubbleText(null);
      }, 1800);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Determine current active sprite rects
  const currentRects = useMemo(() => {
    if (actionState === 'SLEEPING') return SLEEP_FRAME;
    if (actionState === 'SITTING' || isHovered) return SIT_FRAME;
    return RUN_FRAMES[frameIdx];
  }, [actionState, frameIdx, isHovered]);

  return (
    <div
      className="absolute -top-7 left-0 right-0 h-7 pointer-events-none select-none z-20 overflow-visible"
      aria-hidden="true"
    >
      <div
        className="absolute bottom-0 transition-transform duration-75 cursor-pointer pointer-events-auto group"
        style={{
          left: `${positionX}%`,
          transform: `translateX(-50%) ${isJumping ? 'translateY(-10px)' : 'translateY(1px)'}`,
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Bấm vào bé mèo pixel để nghe kêu meo meo! 🐾"
      >
        {/* Cute Speech / Meow Bubble */}
        {bubbleText && (
          <div
            className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-800 shadow-md border border-slate-200 animate-in fade-in zoom-in-90 duration-150 z-30 flex items-center gap-1"
            style={{
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            <span>{bubbleText}</span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
          </div>
        )}

        {/* Chasing Wool Ball / Yarn when searching */}
        {isSearching && actionState === 'RUNNING' && (
          <div
            className="absolute -top-1 animate-bounce"
            style={{
              left: direction === 1 ? '38px' : '-16px',
            }}
          >
            <span className="text-xs">🧶</span>
          </div>
        )}

        {/* Pixel Cat SVG Sprite */}
        <div
          className="transition-transform duration-200"
          style={{
            transform: `scaleX(${direction})`,
            transformOrigin: 'center center',
          }}
        >
          <svg
            width="34"
            height="24"
            viewBox="0 0 20 14"
            shapeRendering="crispEdges"
            className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] filter"
          >
            {currentRects.map((r, i) => (
              <rect
                key={i}
                x={r.x}
                y={r.y}
                width="1"
                height="1"
                fill={r.fill}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};
