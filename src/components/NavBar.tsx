import React from "react";
import { Home, Layers, CheckSquare, Droplet, Wallet, Settings } from "lucide-react";

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

  return (
    <nav className="bottom-nav" aria-label="Huvudnavigering">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`nav-item ${isActive ? "active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <div style={{ position: "relative", display: "inline-flex" }}>
              <Icon size={20} />
              {tab.badge && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -8,
                    background: "var(--color-primary)",
                    color: "#1e1915",
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
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
