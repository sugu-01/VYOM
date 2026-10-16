import React, { useEffect, useState } from 'react';

interface OpeningAnimationProps {
  onComplete: () => void;
}

export const OpeningAnimation: React.FC<OpeningAnimationProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<number>(0);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    // Sequence stages:
    // 0: Initial black screen
    // 1: Center geometric hairline line emerges (150ms)
    // 2: Line expands symmetrically outward into faceted geometric shield/diamond (600ms)
    // 3: Wordmark "VYOM" resolves with champagne gold luminescence (1200ms)
    // 4: Complete transition (1900ms)
    const t1 = setTimeout(() => setStage(1), 150);
    const t2 = setTimeout(() => setStage(2), 650);
    const t3 = setTimeout(() => setStage(3), 1250);
    const t4 = setTimeout(() => {
      onComplete();
    }, 2050);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090c] transition-opacity duration-700 select-none overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex flex-col items-center justify-center w-full max-w-md px-6">
        {/* Geometric Abstract Mark SVG */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg
            viewBox="0 0 160 160"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Fine central geometric axis line */}
            <line
              x1="80"
              y1="20"
              x2="80"
              y2="140"
              stroke="#d4af37"
              strokeWidth="1.25"
              strokeDasharray="120"
              strokeDashoffset={stage >= 1 ? '0' : '120'}
              className="transition-all duration-500 ease-out"
            />

            {/* Symmetrically expanding outer diamond/polygon facets */}
            {stage >= 2 && (
              <g className="transition-all duration-700 ease-out opacity-100 scale-100">
                {/* Left facet */}
                <path
                  d="M 80,30 L 30,80 L 80,130"
                  stroke="#c5a028"
                  strokeWidth="1"
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
                {/* Right facet */}
                <path
                  d="M 80,30 L 130,80 L 80,130"
                  stroke="#d4af37"
                  strokeWidth="1"
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
                {/* Secondary precision diagonal ribs */}
                <line
                  x1="55"
                  y1="55"
                  x2="105"
                  y2="105"
                  stroke="rgba(212, 175, 55, 0.35)"
                  strokeWidth="0.75"
                />
                <line
                  x1="105"
                  y1="55"
                  x2="55"
                  y2="105"
                  stroke="rgba(212, 175, 55, 0.35)"
                  strokeWidth="0.75"
                />
                {/* Micro nodal coordinates */}
                <circle cx="80" cy="30" r="2" fill="#dfba4f" />
                <circle cx="130" cy="80" r="2" fill="#dfba4f" />
                <circle cx="80" cy="130" r="2" fill="#dfba4f" />
                <circle cx="30" cy="80" r="2" fill="#dfba4f" />
              </g>
            )}
          </svg>
        </div>

        {/* Wordmark Resolution */}
        <div
          className={`mt-6 text-center transition-all duration-700 ${
            stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="flex items-center justify-center tracking-[0.35em] text-2xl font-light text-[#f8fafc]">
            <span className="font-semibold text-[#f8fafc]">V</span>
            <span className="text-[#f8fafc]">Y</span>
            <span className="text-[#d4af37]">O</span>
            <span className="font-semibold text-[#f8fafc]">M</span>
          </div>
          <div className="mt-2 text-[10px] tracking-[0.25em] text-[#8492a6] uppercase font-mono">
            Catastrophe Risk Intelligence · Tamil Nadu
          </div>
        </div>

        {/* Skip action for impatient users */}
        <button
          onClick={onComplete}
          className="absolute bottom-[-60px] text-[11px] tracking-wider text-[#64748b] hover:text-[#d4af37] transition-colors cursor-pointer"
        >
          Skip intro →
        </button>
      </div>
    </div>
  );
};
