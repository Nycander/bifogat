import React, { useState, useEffect, useRef } from "react";
import { Home, Layers, Droplet, Wallet, Settings } from "lucide-react";
import {
  FlightPattern,
  calculateFlightPhysics,
  computeUnifiedFlightFrame,
} from "../utils/beeFlightPhysics";

export type { FlightPattern };

export type NavTab = "overview" | "hives" | "harvests" | "economy" | "settings";

interface NavBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openTaskCount: number;
}

const TABS: Array<{ id: NavTab; label: string; icon: React.FC<{ size: number; style?: React.CSSProperties }> }> = [
  { id: "overview", label: "Översikt", icon: Home },
  { id: "hives", label: "Kupor", icon: Layers },
  { id: "harvests", label: "Skörd", icon: Droplet },
  { id: "economy", label: "Ekonomi", icon: Wallet },
  { id: "settings", label: "Inställningar", icon: Settings },
];

export type FlightState = "resting" | "flying";

export const NavBar: React.FC<NavBarProps> = ({ activeTab, onSelectTab, openTaskCount }) => {
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.id === activeTab));
  const tabWidthPercent = 100 / TABS.length;

  const navRef = useRef<HTMLElement | null>(null);
  const beeTrackRef = useRef<HTMLDivElement | null>(null);
  const beeFlightBodyRef = useRef<HTMLDivElement | null>(null);

  // Preserve previous position in state so React render does not snap the DOM before useEffect measures it
  const [trackLeftPercent, setTrackLeftPercent] = useState<number>(
    () => (activeIndex + 0.5) * tabWidthPercent,
  );

  const prevIndexRef = useRef<number>(activeIndex);
  // Start quietly in resting state: no initial startup flight on page load
  const [flightState, setFlightState] = useState<FlightState>("resting");
  const [facing, setFacing] = useState<1 | -1>(1);

  const currentPercentRef = useRef<number>((activeIndex + 0.5) * tabWidthPercent);
  const animFrameRef = useRef<number | null>(null);

  // Smooth, unified continuous flight loop:
  // Coordinates horizontal translation, takeoff morph, 3D banking, and touchdown in a single C1-continuous RAF engine
  useEffect(() => {
    const fromIndex = prevIndexRef.current;
    const toIndex = activeIndex;
    prevIndexRef.current = activeIndex;

    const navElement = navRef.current;
    const trackElement = beeTrackRef.current;
    const bodyEl = beeFlightBodyRef.current;
    const targetPercent = (activeIndex + 0.5) * tabWidthPercent;

    if (!navElement || !trackElement || !bodyEl) return;

    if (fromIndex === toIndex && flightState === "resting") {
      return;
    }

    // Determine exact start position:
    // If resting, starts exactly from the center of previous tab
    // If mid-flight from fast repeated clicks, continues seamlessly from current animated position
    let startPercent: number;
    if (flightState === "resting") {
      startPercent = (fromIndex + 0.5) * tabWidthPercent;
    } else {
      startPercent = currentPercentRef.current;
    }

    const distancePercent = Math.abs(targetPercent - startPercent);
    if (distancePercent < 0.1) {
      return;
    }

    const movingRight = targetPercent >= startPercent;
    const dir: 1 | -1 = movingRight ? 1 : -1;

    // Roll flight pattern (or use test pattern if set via test runner):
    // ~25% chance: grand aerial loop-the-loop (stor ögla med 360°-kurva)
    // ~25% chance: grand orientation flight (stor åtta)
    // ~25% chance: playful waggle dance (lemniskat-åtta)
    // ~25% chance: aerodynamic cruise
    const forcedPattern = typeof window !== "undefined" ? (window as any).__forcedBeePattern : undefined;
    let pattern: FlightPattern = forcedPattern || "cruise";

    if (!forcedPattern) {
      const roll = Math.random();
      if (roll < 0.25) {
        pattern = "loop";
      } else if (roll < 0.50) {
        pattern = "orientation";
      } else if (roll < 0.75) {
        pattern = "dance";
      } else {
        pattern = "cruise";
      }
    }

    // Physics calculations enforce max speed (30%/s) and maneuver minimum duration
    const physics = calculateFlightPhysics(distancePercent, pattern);
    const duration = physics.durationMs;

    setFacing(dir);
    setFlightState("flying");

    // Cancel any previous in-flight animation frame immediately
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = Math.max(0, now - startTime);

      const frame = computeUnifiedFlightFrame({
        startPercent,
        targetPercent,
        pattern,
        elapsedMs: elapsed,
        totalDurationMs: duration,
        facing: dir,
      });

      currentPercentRef.current = frame.trackPercent;

      if (trackElement) {
        trackElement.style.transition = "none";
        trackElement.style.left = `${frame.trackPercent}%`;
      }

      if (bodyEl) {
        bodyEl.style.transform = `translate(${frame.x}px, ${frame.y}px) scaleX(${dir}) rotate(${frame.roll}deg) scale(${frame.scale})`;
        bodyEl.style.opacity = `${frame.opacity}`;
      }

      if (!frame.isComplete) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        // Flight successfully completed & settled into resting watermark
        animFrameRef.current = null;
        setFlightState("resting");
        currentPercentRef.current = targetPercent;
        setTrackLeftPercent(targetPercent);

        if (trackElement) {
          trackElement.style.left = `${targetPercent}%`;
        }
        if (bodyEl) {
          bodyEl.style.transform = "";
          bodyEl.style.opacity = "";
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [activeIndex, tabWidthPercent]);

  const isAirborne = flightState === "flying";

  const getFlightAnimation = () => {
    switch (flightState) {
      case "flying":
        return "none"; // Fully managed by unified C1-continuous RAF engine
      case "resting":
      default:
        return "beeWatermarkPulse 4.2s ease-in-out infinite";
    }
  };

  return (
    <nav ref={navRef} className="bottom-nav" aria-label="Huvudnavigering">
      {/* Animated Bee: Morphs between large dimmed background watermark & flying bee */}
      <div
        ref={beeTrackRef}
        className="nav-bee-track"
        style={{
          position: "absolute",
          left: `${trackLeftPercent}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: isAirborne ? 15 : 1,
        }}
      >
        <div
          ref={beeFlightBodyRef}
          className="nav-bee-flight-body"
          style={
            {
              transformOrigin: "center center",
              transform: flightState === "flying" ? undefined : `scaleX(${facing})`,
              animation: getFlightAnimation(),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            } as React.CSSProperties
          }
        >
          {/* SVG Bee: Morphs smoothly between flying bee and background watermark */}
          <svg
            width="26"
            height="24"
            viewBox="0 0 44 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: isAirborne
                ? "drop-shadow(0 5px 10px rgba(0, 0, 0, 0.25))"
                : "drop-shadow(0 2px 8px rgba(119, 136, 115, 0.25))",
              display: "block",
              transition: "filter 0.4s ease",
            }}
          >
            {/* Insect Wings with authentic high-frequency vibration shimmer */}
            <g
              style={{
                transformOrigin: "20px 14px",
                animation: isAirborne ? "beeWingVibrate 0.038s linear infinite" : "none",
              }}
            >
              {/* Left Wing */}
              <ellipse
                cx="14"
                cy="10"
                rx="7.5"
                ry="12"
                transform="rotate(-26 14 10)"
                fill="#ffffff"
                fillOpacity="0.88"
                stroke="#778873"
                strokeWidth="1.2"
              />
              <line x1="14" y1="18" x2="14" y2="4" stroke="#778873" strokeWidth="0.8" strokeOpacity="0.5" />

              {/* Right Wing */}
              <ellipse
                cx="26"
                cy="10"
                rx="7.5"
                ry="12"
                transform="rotate(26 26 10)"
                fill="#ffffff"
                fillOpacity="0.88"
                stroke="#778873"
                strokeWidth="1.2"
              />
              <line x1="26" y1="18" x2="26" y2="4" stroke="#778873" strokeWidth="0.8" strokeOpacity="0.5" />
            </g>

            {/* Bee Abdomen / Body */}
            <ellipse cx="20" cy="23" rx="9.5" ry="11.5" fill="#273026" />

            {/* Golden Honey Stripes */}
            <path
              d="M 12 19.5 Q 20 21.5 28 19.5 L 28.5 22.5 Q 20 24.5 11.5 22.5 Z"
              fill="#f59e0b"
            />
            <path
              d="M 11.5 25 Q 20 27 28.5 25 L 28 28 Q 20 30 12 28 Z"
              fill="#fbbf24"
            />

            {/* Stinger */}
            <polygon points="20,35 18.5,32 21.5,32" fill="#1b211a" />

            {/* Head */}
            <circle cx="20" cy="13" r="5.5" fill="#273026" />

            {/* Eyes */}
            <circle cx="17.5" cy="12.5" r="1.6" fill="#f1f3e0" />
            <circle cx="17.7" cy="12.7" r="0.9" fill="#1c241c" />
            <circle cx="22.5" cy="12.5" r="1.6" fill="#f1f3e0" />
            <circle cx="22.3" cy="12.7" r="0.9" fill="#1c241c" />

            {/* Antennae with Golden Tips */}
            <path
              d="M 18 8.5 Q 15 4.5 12 6"
              stroke="#273026"
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="11.5" cy="6.2" r="1.1" fill="#f59e0b" />
            <path
              d="M 22 8.5 Q 25 4.5 28 6"
              stroke="#273026"
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="28.5" cy="6.2" r="1.1" fill="#f59e0b" />
          </svg>
        </div>
      </div>

      {/* Tab Buttons */}
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const badgeCount = tab.id === "hives" && openTaskCount > 0 ? openTaskCount : undefined;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`nav-item ${isActive ? "active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            style={{ position: "relative", zIndex: 4, background: "transparent" }}
          >
            <div style={{ position: "relative", display: "inline-flex" }}>
              <Icon
                size={20}
                style={{
                  color: isActive ? "var(--color-primary-base)" : "inherit",
                  strokeWidth: isActive ? 2.6 : 2,
                  transition: "transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1)",
                  transform: isActive ? "scale(1.12)" : "scale(1)",
                }}
              />
              {badgeCount && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -8,
                    background: "var(--color-primary-base)",
                    color: "var(--color-primary-text)",
                    borderRadius: "9999px",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "0 4px",
                    minWidth: "14px",
                    textAlign: "center",
                  }}
                >
                  {badgeCount}
                </span>
              )}
            </div>
            <span
              style={{
                color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)",
                fontWeight: isActive ? 800 : 500,
                fontSize: "11px",
                transition: "all 0.2s ease",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
