"use client";

import { useEffect, useState, useRef } from "react";

interface AutoTestOverlayProps {
  active: boolean;
  onComplete: () => void;
}

interface TestStep {
  label: string;
  x: number; // cursor target (%)
  y: number; // cursor target (%)
  boxX: number; // highlight box position (%)
  boxY: number;
  boxW: number; // highlight box size (px)
  boxH: number;
}

const STEPS: TestStep[] = [
  { label: "UI 레이아웃", x: 30, y: 25, boxX: 15, boxY: 15, boxW: 180, boxH: 80 },
  { label: "인터랙션", x: 60, y: 50, boxX: 45, boxY: 40, boxW: 160, boxH: 70 },
  { label: "반응형", x: 50, y: 75, boxX: 30, boxY: 65, boxW: 200, boxH: 75 },
];

export default function AutoTestOverlay({ active, onComplete }: AutoTestOverlayProps) {
  const [phase, setPhase] = useState(0);
  // 0 = fade-in + banner
  // 1 = cursor visible, moving to step 0
  // 2 = click step 0
  // 3 = moving to step 1
  // 4 = click step 1
  // 5 = moving to step 2
  // 6 = click step 2
  // 7 = all green
  // 8 = badge
  // 9 = fade-out

  const [cursorPos, setCursorPos] = useState({ x: 5, y: 10 });
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number } | null>(null);
  const [activeHighlights, setActiveHighlights] = useState<number[]>([]);
  const [allGreen, setAllGreen] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [statusText, setStatusText] = useState("기능 검증 시작...");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!active) return;

    const t = (fn: () => void, delay: number) => {
      const id = setTimeout(fn, delay);
      timersRef.current.push(id);
      return id;
    };

    // Phase 0: fade-in + banner (0s)
    setPhase(0);
    setStatusText("기능 검증 시작...");

    // Phase 1: cursor appears (0.3s)
    t(() => {
      setPhase(1);
      setCursorPos({ x: STEPS[0].x, y: STEPS[0].y });
      setStatusText("UI 레이아웃 검사 중...");
    }, 300);

    // Phase 2: click step 0 (1.2s)
    t(() => {
      setPhase(2);
      setClickRipple({ x: STEPS[0].x, y: STEPS[0].y });
      setActiveHighlights([0]);
    }, 1200);
    t(() => setClickRipple(null), 1800);

    // Phase 3: move to step 1 (1.2s → 2.1s)
    t(() => {
      setPhase(3);
      setCursorPos({ x: STEPS[1].x, y: STEPS[1].y });
      setStatusText("인터랙션 검사 중...");
    }, 1200);

    // Phase 4: click step 1 (2.1s)
    t(() => {
      setPhase(4);
      setClickRipple({ x: STEPS[1].x, y: STEPS[1].y });
      setActiveHighlights([0, 1]);
    }, 2100);
    t(() => setClickRipple(null), 2700);

    // Phase 5: move to step 2 (2.1s → 3.0s)
    t(() => {
      setPhase(5);
      setCursorPos({ x: STEPS[2].x, y: STEPS[2].y });
      setStatusText("반응형 검사 중...");
    }, 2100);

    // Phase 6: click step 2 (3.0s)
    t(() => {
      setPhase(6);
      setClickRipple({ x: STEPS[2].x, y: STEPS[2].y });
      setActiveHighlights([0, 1, 2]);
    }, 3000);
    t(() => setClickRipple(null), 3600);

    // Phase 7: all green (3.0s → 3.8s)
    t(() => {
      setPhase(7);
      setAllGreen(true);
      setStatusText("모든 검사 통과!");
    }, 3800);

    // Phase 8: badge (3.8s → 4.5s)
    t(() => {
      setPhase(8);
      setShowBadge(true);
    }, 4200);

    // Phase 9: fade-out (5.0s)
    t(() => {
      setPhase(9);
      setFadeOut(true);
    }, 5000);

    // Complete (5.5s)
    t(() => {
      onComplete();
    }, 5500);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <div
      className="absolute inset-0 z-30 pointer-events-none"
      style={{
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.5s ease-out",
      }}
    >
      {/* Inline keyframes */}
      <style>{`
        @keyframes fn-ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes fn-pulse-border {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes fn-badge-in {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          60% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes fn-check-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      {/* Semi-transparent backdrop */}
      <div
        className="absolute inset-0 bg-black/10"
        style={{
          opacity: phase >= 0 ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />

      {/* Top banner */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center gap-2 px-3 py-2 text-white text-[12px] font-medium"
        style={{
          background: allGreen
            ? "linear-gradient(90deg, #00b894, #00cec9)"
            : "linear-gradient(90deg, #0079F2, #00b4d8)",
          opacity: phase >= 0 ? 1 : 0,
          transition: "all 0.3s ease-out",
        }}
      >
        <span className="animate-pulse">{allGreen ? "✅" : "🔍"}</span>
        <span>{statusText}</span>
        <div className="ml-auto flex gap-1">
          {STEPS.map((step, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                background: activeHighlights.includes(i)
                  ? allGreen
                    ? "rgba(255,255,255,0.3)"
                    : "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.1)",
                transition: "background 0.3s",
              }}
            >
              {activeHighlights.includes(i) ? "✓" : "○"} {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* Highlight boxes */}
      {STEPS.map((step, i) => {
        if (!activeHighlights.includes(i)) return null;
        const isGreen = allGreen;
        return (
          <div
            key={i}
            className="absolute rounded-lg"
            style={{
              left: `${step.boxX}%`,
              top: `${step.boxY}%`,
              width: step.boxW,
              height: step.boxH,
              border: isGreen ? "2px solid #00b894" : "2px dashed #0079F2",
              background: isGreen ? "rgba(0, 184, 148, 0.08)" : "rgba(0, 121, 242, 0.06)",
              animation: isGreen ? "fn-check-pulse 1s ease-in-out" : "fn-pulse-border 1.5s ease-in-out infinite",
              transition: "border 0.4s, background 0.4s",
            }}
          >
            <span
              className="absolute -top-5 left-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                color: isGreen ? "#00b894" : "#0079F2",
                background: isGreen ? "rgba(0, 184, 148, 0.15)" : "rgba(0, 121, 242, 0.12)",
              }}
            >
              {step.label} {isGreen ? "✓" : "..."}
            </span>
          </div>
        );
      })}

      {/* Fake cursor */}
      {phase >= 1 && (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          className="absolute z-40"
          style={{
            left: `${cursorPos.x}%`,
            top: `${cursorPos.y}%`,
            transition: "all 0.9s ease-in-out",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            opacity: phase >= 8 ? 0 : 1,
          }}
        >
          <path
            d="M5 3l14 8-6.5 1.5L10 19z"
            fill="white"
            stroke="#1D2433"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Click ripple */}
      {clickRipple && (
        <div
          className="absolute z-35"
          style={{
            left: `${clickRipple.x}%`,
            top: `${clickRipple.y}%`,
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: 24,
              height: 24,
              marginLeft: -12,
              marginTop: -12,
              background: "rgba(0, 121, 242, 0.3)",
              animation: "fn-ripple 0.6s ease-out forwards",
            }}
          />
        </div>
      )}

      {/* Completion badge */}
      {showBadge && (
        <div
          className="absolute z-50"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            animation: "fn-badge-in 0.5s ease-out forwards",
          }}
        >
          <div
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-[14px] shadow-xl"
            style={{
              background: "linear-gradient(135deg, #00b894, #00cec9)",
              boxShadow: "0 8px 32px rgba(0, 184, 148, 0.4)",
            }}
          >
            <span className="text-[18px]">✅</span>
            기능 검증 완료
          </div>
        </div>
      )}
    </div>
  );
}
