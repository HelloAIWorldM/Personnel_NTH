import React, { useState, useEffect, useRef } from 'react';
import nyanCatImg from '../assets/pixels/nyan_cat.png';
import corgiImg from '../assets/pixels/corgi.png';
import crocImg from '../assets/pixels/croc.png';
import sailorMoonImg from '../assets/pixels/sailor_moon.png';

export type PixelCharId = 'nyan' | 'corgi' | 'croc' | 'sailor';

// Retro 8-bit Sound Effects via Web Audio API
function playRetroSound(type: PixelCharId) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'nyan') {
      // Upbeat 8-bit Nyan arpeggio: F#5 -> G#5 -> D#5 -> B4 -> D#5
      const notes = [740, 830, 622, 493, 622];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        const start = ctx.currentTime + idx * 0.06;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.06, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.07);
      });
    } else if (type === 'corgi') {
      // Cheerful puppy double bark: high yip then settle
      [480, 620].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = ctx.currentTime + idx * 0.1;
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.3, start + 0.04);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.09);
      });
    } else if (type === 'croc') {
      // Low bubbly chomps
      [220, 280, 200].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const start = ctx.currentTime + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.05, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.07);
      });
    } else if (type === 'sailor') {
      // Magical sparkling harp chime: C5 -> E5 -> G5 -> C6 -> E6
      const notes = [523, 659, 784, 1046, 1318];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = ctx.currentTime + idx * 0.05;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.16);
      });
    }
  } catch {}
}

const MESSAGES: Record<PixelCharId, string[]> = {
  nyan: [
    'Nyan Nyan Nyan! 🌈✨',
    'Poptart bay vù vù~ 🍓',
    'Cầu vồng dẫn lối NTH! ⭐',
    'Meo meo meo nyan~ 🐾',
    'To infinity and beyond! 🚀',
  ],
  corgi: [
    'Gâu gâu! Mông trái đào nè~ 🍑',
    'Chân ngắn nhưng chạy bao nhanh! 🐾',
    'Sen ơi xếp xong cho xin khúc xương! 🍖',
    'Wiggle wiggle mông xinh~ ✨',
    'Gâu gâu gâu! Cố lên team NTH! 🐶',
  ],
  croc: [
    'Gaooo! Cá sấu cute nhất server! 🐊',
    'Đừng sợ, tớ ăn chay mà~ 🥦',
    'Đợi tớ với các bạn ơiii! 💨',
    'Ngoạm một cái lấy tinh thần! 💚',
    'Lưng có gai nhưng bụng rất mềm! 🐊',
  ],
  sailor: [
    'Thay mặt Mặt Trăng trừng trị kẻ lười biếng! 🌙✨',
    'Moon Prism Power, Make Up! 💖',
    'Cả đội NTH tiến lên giành Top 1! ⭐',
    'Phép thuật Mặt Trăng: Xếp team thần tốc! 🪄',
    'Đoàn kết là sức mạnh, cố lên mọi người! 🌟',
  ],
};

interface PixelSquadProps {
  isSearching?: boolean;
}

export const PixelSquad: React.FC<PixelSquadProps> = ({ isSearching = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [posX, setPosX] = useState<number>(10); // in pixels
  const [direction, setDirection] = useState<1 | -1>(1); // 1: moving right, -1: moving left
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [bubble, setBubble] = useState<{ charId: PixelCharId; text: string } | null>(null);

  const bubbleTimeoutRef = useRef<any>(null);
  const pauseTimeoutRef = useRef<any>(null);

  // Convoy movement loop
  useEffect(() => {
    if (isPaused || isHovered) return;

    const baseSpeed = isSearching ? 2.8 : 1.25; // pixels per tick
    const tickTime = 30; // ~33 fps
    const convoyWidth = 168; // Total width of 4 characters + gaps

    const interval = setInterval(() => {
      setPosX((prev) => {
        const containerWidth = containerRef.current?.parentElement?.clientWidth || 360;
        const maxPos = Math.max(10, containerWidth - convoyWidth - 4);
        const minPos = 4;

        let next = prev + direction * baseSpeed;

        // Reach right boundary
        if (next >= maxPos) {
          next = maxPos;
          setIsPaused(true);
          setDirection(-1);
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = setTimeout(() => {
            setIsPaused(false);
          }, 1400);
          return next;
        }

        // Reach left boundary
        if (next <= minPos) {
          next = minPos;
          setIsPaused(true);
          setDirection(1);
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = setTimeout(() => {
            setIsPaused(false);
          }, 1400);
          return next;
        }

        return next;
      });
    }, tickTime);

    return () => clearInterval(interval);
  }, [isPaused, isHovered, direction, isSearching]);

  // Click on a specific character
  const handleCharClick = (charId: PixelCharId, e: React.MouseEvent) => {
    e.stopPropagation();
    playRetroSound(charId);

    // Trigger squad jump
    setIsJumping(true);
    setTimeout(() => setIsJumping(false), 450);

    // Pick random line
    const lines = MESSAGES[charId];
    const text = lines[Math.floor(Math.random() * lines.length)];
    setBubble({ charId, text });

    clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = setTimeout(() => {
      setBubble(null);
    }, 2500);
  };

  const animDuration = isSearching ? '0.26s' : '0.52s';

  return (
    <>
      {/* Inline styles for razor-sharp pixel art and distinct custom pet animations */}
      <style>{`
        .pixel-crisp {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: -moz-crisp-edges;
          image-rendering: -webkit-crisp-edges;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }

        /* 1. Nyan Cat: Smooth Anti-gravity Zero-G float with wave tilt */
        @keyframes squadNyanFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-4.5px) rotate(-2.5deg);
          }
          50% {
            transform: translateY(-1.5px) rotate(1deg);
          }
          75% {
            transform: translateY(-5px) rotate(-1deg);
          }
        }

        /* 2. Corgi: Joyful bouncy trot with peach butt wiggle and squash-stretch */
        @keyframes squadCorgiRun {
          0%, 100% {
            transform: translateY(0px) scale(1, 1) rotate(0deg);
          }
          20% {
            transform: translateY(-5px) scale(0.96, 1.08) rotate(-4deg);
          }
          45% {
            transform: translateY(-1px) scale(1.03, 0.97) rotate(0deg);
          }
          65% {
            transform: translateY(-4.5px) scale(0.96, 1.06) rotate(4deg);
          }
          85% {
            transform: translateY(0px) scale(1.06, 0.92) rotate(1deg);
          }
        }

        /* 3. Croc: Clumsy waddle (lạch bạch) with side-to-side roll and heavy tail sway */
        @keyframes squadCrocWaddle {
          0%, 100% {
            transform: translateY(0px) rotate(0deg) scale(1, 1);
          }
          25% {
            transform: translateY(-3.5px) rotate(-6deg) scale(1.03, 0.97);
          }
          50% {
            transform: translateY(0px) rotate(0deg) scale(0.98, 1.02);
          }
          75% {
            transform: translateY(-3.5px) rotate(6deg) scale(1.03, 0.97);
          }
        }

        /* 4. Sailor Moon: Cheerful idol cheerleader jump with twintail bounce */
        @keyframes squadSailorCheer {
          0%, 100% {
            transform: translateY(0px) rotate(0deg) scale(1, 1);
          }
          20% {
            transform: translateY(-5.5px) rotate(-2.5deg) scale(1.04, 1.02);
          }
          45% {
            transform: translateY(-1.5px) rotate(1deg) scale(0.98, 1.01);
          }
          65% {
            transform: translateY(-4.5px) rotate(3deg) scale(1.03, 1.01);
          }
          85% {
            transform: translateY(0px) rotate(-1deg) scale(1.04, 0.96);
          }
        }

        /* Idle pause look around */
        @keyframes squadIdleBreath {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.95) translateY(-0.5px); }
        }
      `}</style>

      <div
        ref={containerRef}
        className="absolute -top-9.5 left-0 right-0 h-9.5 pointer-events-none select-none z-20 overflow-visible"
        aria-hidden="true"
      >
        <div
          className="absolute bottom-0 transition-transform duration-75 cursor-pointer pointer-events-auto group"
          style={{
            left: `${posX}px`,
            transform: `translateY(${isJumping ? '-12px' : '0px'})`,
            transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title="Bấm vào các bé pet để nghe âm thanh và xem lời thoại! 🐾✨"
        >
          {/* Speech Bubble (counter-scaled so text stays un-mirrored) */}
          {bubble && (
            <div
              className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-amber-300 shadow-xl border border-amber-300/90 dark:border-amber-500/70 animate-in fade-in zoom-in-90 duration-150 z-30 flex items-center gap-1"
              style={{
                fontFamily: "'Courier New', Courier, monospace",
              }}
            >
              <span>{bubble.text}</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-300 dark:border-t-amber-500/70" />
            </div>
          )}

          {/* Chasing Star when searching */}
          {isSearching && (
            <div
              className="absolute -top-1 animate-spin"
              style={{
                left: direction === 1 ? '174px' : '-18px',
                animationDuration: '1s',
              }}
            >
              <span className="text-xs">⭐</span>
            </div>
          )}

          {/* Convoy wrapper: flipped horizontally with scaleX based on running direction */}
          <div
            className="flex items-end gap-2 transition-transform duration-200"
            style={{
              transform: `scaleX(${direction})`,
              transformOrigin: 'center center',
            }}
          >
            {/* 4. Sailor Moon (At the rear / cheerleader) */}
            <div
              onClick={(e) => handleCharClick('sailor', e)}
              className="relative transition-transform hover:scale-115 active:scale-95 shrink-0"
              style={{
                animation: isPaused
                  ? 'squadIdleBreath 1.2s infinite ease-in-out'
                  : `squadSailorCheer ${animDuration} infinite ease-in-out`,
                animationDelay: '0.36s',
              }}
              title="Thủy Thủ Mặt Trăng 🌙 (Bấm để nghe thoại!)"
            >
              <img
                src={sailorMoonImg}
                alt="Sailor Moon"
                className="pixel-crisp h-[32px] w-auto drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
                draggable={false}
              />
            </div>

            {/* 3. Crocodile / Dinosaur (Nhún nhảy lắc lư lạch bạch) */}
            <div
              onClick={(e) => handleCharClick('croc', e)}
              className="relative transition-transform hover:scale-115 active:scale-95 shrink-0"
              style={{
                animation: isPaused
                  ? 'squadIdleBreath 1.2s infinite ease-in-out'
                  : `squadCrocWaddle ${animDuration} infinite ease-in-out`,
                animationDelay: '0.24s',
              }}
              title="Cá sấu tí hon 🐊 (Bấm để nghe thoại!)"
            >
              <img
                src={crocImg}
                alt="Crocodile"
                className="pixel-crisp h-[27px] w-auto drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
                draggable={false}
              />
            </div>

            {/* 2. Corgi (Mông tròn trái đào nhún nhảy) */}
            <div
              onClick={(e) => handleCharClick('corgi', e)}
              className="relative transition-transform hover:scale-115 active:scale-95 shrink-0"
              style={{
                animation: isPaused
                  ? 'squadIdleBreath 1.2s infinite ease-in-out'
                  : `squadCorgiRun ${animDuration} infinite ease-in-out`,
                animationDelay: '0.12s',
              }}
              title="Corgi mông đào 🍑 (Bấm để nghe thoại!)"
            >
              <img
                src={corgiImg}
                alt="Corgi"
                className="pixel-crisp h-[27px] w-auto drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
                draggable={false}
              />
            </div>

            {/* 1. Nyan Cat (Tiên phong bay bổng với dải cầu vồng) */}
            <div
              onClick={(e) => handleCharClick('nyan', e)}
              className="relative transition-transform hover:scale-115 active:scale-95 shrink-0"
              style={{
                animation: isPaused
                  ? 'squadIdleBreath 1.2s infinite ease-in-out'
                  : `squadNyanFloat ${animDuration} infinite ease-in-out`,
                animationDelay: '0s',
              }}
              title="Nyan Cat cầu vồng 🌈 (Bấm để nghe thoại!)"
            >
              <img
                src={nyanCatImg}
                alt="Nyan Cat"
                className="pixel-crisp h-[27px] w-auto drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Backwards compatibility alias
export const PixelCat = PixelSquad;
