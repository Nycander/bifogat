import React, { useState, useEffect, useRef } from "react";
import { Plus, ClipboardList, Droplet, CheckSquare, Layers } from "lucide-react";

export interface FloatingActionButtonProps {
  onLogVisit: () => void;
  onSellHoney: () => void;
  onCreateTask: () => void;
  onCreateHarvest: () => void;
  isModalOpen?: boolean;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onLogVisit,
  onSellHoney,
  onCreateTask,
  onCreateHarvest,
  isModalOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when any modal opens
  useEffect(() => {
    if (isModalOpen) {
      setIsOpen(false);
    }
  }, [isModalOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (isModalOpen) {
    return null;
  }

  const handleToggle = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
    setIsOpen((prev) => !prev);
  };

  const handleActionClick = (actionFn: () => void) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(12);
    }
    setIsOpen(false);
    actionFn();
  };

  const actions = [
    {
      id: "log-visit",
      label: "Logga kupbesök",
      sublabel: "Anteckna inspektion & skick",
      icon: ClipboardList,
      btnClass: "speed-dial-btn-visit",
      onClick: () => handleActionClick(onLogVisit),
    },
    {
      id: "sell-honey",
      label: "Sälj honung",
      sublabel: "Bokför sålda burkar",
      icon: Droplet,
      btnClass: "speed-dial-btn-sale",
      onClick: () => handleActionClick(onSellHoney),
    },
    {
      id: "create-task",
      label: "Ny uppgift",
      sublabel: "Att göra vid nästa besök",
      icon: CheckSquare,
      btnClass: "speed-dial-btn-task",
      onClick: () => handleActionClick(onCreateTask),
    },
    {
      id: "create-harvest",
      label: "Registrera skörd",
      sublabel: "Slungning & burkning",
      icon: Layers,
      btnClass: "speed-dial-btn-harvest",
      onClick: () => handleActionClick(onCreateHarvest),
    },
  ];

  return (
    <>
      {/* Backdrop scrim when Speed Dial is open */}
      {isOpen && (
        <div
          className="speed-dial-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        ref={containerRef}
        className={`speed-dial-container ${isOpen ? "open" : ""}`}
        role="region"
        aria-label="Snabbåtgärder"
      >
        {/* Speed Dial Menu Items */}
        {isOpen && (
          <div className="speed-dial-menu" role="menu">
            {actions.map((act, index) => {
              const Icon = act.icon;
              return (
                <div
                  key={act.id}
                  className="speed-dial-item"
                  style={{ animationDelay: `${index * 35}ms` }}
                  onClick={act.onClick}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      act.onClick();
                    }
                  }}
                >
                  <div className="speed-dial-label-chip">
                    <span className="speed-dial-label-title">{act.label}</span>
                    <span className="speed-dial-label-sub">{act.sublabel}</span>
                  </div>
                  <button
                    type="button"
                    className={`speed-dial-btn ${act.btnClass}`}
                    aria-label={act.label}
                    onClick={act.onClick}
                  >
                    <Icon size={20} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Main Floating Action Button */}
        <button
          type="button"
          className={`fab-main-btn ${isOpen ? "fab-open" : ""}`}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Stäng snabbmeny" : "Öppna snabbmeny"}
        >
          <Plus
            size={28}
            className={`fab-icon ${isOpen ? "fab-icon-rotated" : ""}`}
          />
        </button>
      </div>
    </>
  );
};
