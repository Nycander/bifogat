import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "honey"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) => {
    // Map variant to base css classes
    const variantClass = {
      primary: "btn btn-primary",
      secondary: "btn btn-secondary",
      outline: "btn btn-outline",
      danger: "btn btn-danger",
      honey: "btn btn-honey",
      ghost: "btn btn-ghost",
    }[variant];

    const sizeClass = {
      sm: "btn-sm",
      md: "",
      lg: "btn-lg",
    }[size];

    const fullWidthStyle: React.CSSProperties = fullWidth
      ? { width: "100%", justifyContent: "center" }
      : {};

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`${variantClass} ${sizeClass} ${className}`.trim()}
        style={{
          ...fullWidthStyle,
          ...props.style,
        }}
        aria-busy={loading ? "true" : undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 size={size === "sm" ? 14 : size === "lg" ? 20 : 16} className="animate-spin" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="btn-icon-slot">{leftIcon}</span>}
            {children && <span>{children}</span>}
            {rightIcon && <span className="btn-icon-slot">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
