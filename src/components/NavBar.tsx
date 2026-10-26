import React from "react";
import { Home, Layers, Droplet, Wallet, Settings } from "lucide-react";

export type NavTab = "overview" | "hives" | "harvests" | "economy" | "settings";

interface NavBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openTaskCount: number;
}

export const NavBar: React.FC<NavBarProps> = ({ activeTab, onSelectTab, openTaskCount }) => {
  const tabs = [
    { id: "overview" as NavTab, label: "Översikt", icon: Home },
    {
      id: "hives" as NavTab,
      label: "Kupor",
      icon: Layers,
      badge: openTaskCount > 0 ? openTaskCount : undefined,
    },
    { id: "harvests" as NavTab, label: "Skörd", icon: Droplet },
    { id: "economy" as NavTab, label: "Ekonomi", icon: Wallet },
    { id: "settings" as NavTab, label: "Inställningar", icon: Settings },
  ];

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));
  const tabWidthPercent = 100 / tabs.length;

  return (
    <nav className="bottom-nav" aria-label="Huvudnavigering">
      {/* Flying / Sliding Active Tab Pill Indicator */}
      <div
        className="nav-indicator-slider"
        style={{
          position: "absolute",
          top: "6px",
          bottom: "6px",
          left: 0,
          width: `${tabWidthPercent}%`,
          transform: `translateX(${activeIndex * 100}%)`,
          transition: "transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          padding: "0 5px",
          zIndex: 1,
        }}
      >
        <div
          className="nav-indicator-pill"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "14px",
            background: "var(--color-primary-surface)",
            border: "1.5px solid var(--color-primary-border)",
            boxShadow: "0 2px 10px rgba(119, 136, 115, 0.22)",
            position: "relative",
          }}
        >
          {/* Top illuminated active brand jewel */}
          <div
            style={{
              position: "absolute",
              top: "-1.5px",
              left: "22%",
              right: "22%",
              height: "3px",
              borderRadius: "999px",
              background: "var(--color-primary-base)",
            }}
          />
        </div>
      </div>

      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`nav-item ${isActive ? "active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            style={{ position: "relative", zIndex: 2 }}
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
              {tab.badge && (
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
                  {tab.badge}
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
