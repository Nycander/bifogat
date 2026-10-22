import React from "react";

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "honey"
  | "primary"
  | "neutral";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  icon,
  className = "",
  style,
  ...props
}) => {
  const variantClass = {
    success: "badge-active",
    warning: "badge-treatment",
    danger: "badge-danger",
    honey: "badge-event-harvest",
    primary: "badge-event-colony_change",
    neutral: "badge-inactive",
  }[variant];

  const sizeClass = size === "sm" ? "badge-sm" : "";

  return (
    <span
      className={`badge ${variantClass} ${sizeClass} ${className}`.trim()}
      style={style}
      {...props}
    >
      {icon && <span className="badge-icon">{icon}</span>}
      {children}
    </span>
  );
};
