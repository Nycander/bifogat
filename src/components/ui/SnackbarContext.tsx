import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X, RotateCcw } from "lucide-react";

export interface SnackbarOptions {
  id?: string;
  message: string;
  submessage?: string;
  type?: "success" | "info" | "warning" | "error";
  actionLabel?: string; // e.g. "Ångra"
  onAction?: () => void | Promise<void>;
  duration?: number; // default 4500ms
}

interface SnackbarItem extends SnackbarOptions {
  id: string;
  createdAt: number;
}

interface SnackbarContextType {
  showSnackbar: (options: SnackbarOptions) => string;
  dismissSnackbar: (id?: string) => void;
}

const SnackbarContext = createContext<SnackbarContextType | null>(null);

export const useSnackbar = (): SnackbarContextType => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
};

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<SnackbarItem | null>(null);
  const timerRef = useRef<number | null>(null);

  const dismissSnackbar = useCallback((id?: string) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCurrent((prev) => {
      if (!id || (prev && prev.id === id)) {
        return null;
      }
      return prev;
    });
  }, []);

  const showSnackbar = useCallback(
    (options: SnackbarOptions) => {
      const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const duration = options.duration ?? 4500;

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(8);
      }

      const item: SnackbarItem = {
        ...options,
        id,
        duration,
        type: options.type || "success",
        createdAt: Date.now(),
      };

      setCurrent(item);

      timerRef.current = window.setTimeout(() => {
        dismissSnackbar(id);
      }, duration);

      return id;
    },
    [dismissSnackbar],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleAction = async () => {
    if (!current?.onAction) return;
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(12);
      }
      const action = current.onAction;
      dismissSnackbar(current.id);
      await action();
    } catch (err) {
      console.error("Failed to execute snackbar action:", err);
    }
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar, dismissSnackbar }}>
      {children}

      {/* Floating Material 3 Snackbar */}
      {current && (
        <aside
          className="snackbar-container"
          role="status"
          aria-live="polite"
        >
          <div className={`snackbar-card snackbar-${current.type || "success"}`}>
            <div className="snackbar-content">
              <div className="snackbar-icon" aria-hidden="true">
                {current.type === "error" ? (
                  <AlertCircle size={20} color="#f87171" />
                ) : current.type === "warning" ? (
                  <AlertCircle size={20} color="#fbbf24" />
                ) : current.type === "info" ? (
                  <Info size={20} color="#60a5fa" />
                ) : (
                  <CheckCircle2 size={20} color="#4ade80" />
                )}
              </div>

              <div className="snackbar-text-group">
                <p className="snackbar-message">{current.message}</p>
                {current.submessage && (
                  <span className="snackbar-submessage">{current.submessage}</span>
                )}
              </div>
            </div>

            <div className="snackbar-actions">
              {current.actionLabel && current.onAction && (
                <button
                  type="button"
                  className="snackbar-undo-btn"
                  onClick={handleAction}
                  aria-label={`${current.actionLabel}: ${current.message}`}
                >
                  <RotateCcw size={15} />
                  <span>{current.actionLabel}</span>
                </button>
              )}
              <button
                type="button"
                className="snackbar-close-btn"
                onClick={() => dismissSnackbar(current.id)}
                aria-label="Stäng meddelande"
              >
                <X size={16} />
              </button>
            </div>

            {/* Countdown timer line */}
            <div
              className="snackbar-progress-bar"
              style={{ animationDuration: `${current.duration}ms` }}
            />
          </div>
        </aside>
      )}
    </SnackbarContext.Provider>
  );
};
