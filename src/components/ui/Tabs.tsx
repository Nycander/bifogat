import React from "react";

export interface TabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  fullWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Tabs<T extends string = string>({
  items,
  activeId,
  onChange,
  fullWidth = true,
  className = "",
  style,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={`tabs-header ${className}`.trim()}
      style={{
        width: fullWidth ? "100%" : "auto",
        ...style,
      }}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            className={`tab-btn ${isActive ? "active" : ""}`}
            onClick={() => onChange(item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            {item.icon && <span className="tab-icon">{item.icon}</span>}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "10px",
                  backgroundColor: isActive
                    ? "var(--color-primary-base)"
                    : "var(--color-surface-hover)",
                  color: isActive ? "var(--color-primary-text)" : "var(--color-text-muted)",
                }}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
