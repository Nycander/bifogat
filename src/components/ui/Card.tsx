import React, { forwardRef } from "react";

export type CardVariant = "default" | "subtle" | "interactive" | "bordered";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = "default",
      padding = "md",
      interactive = false,
      className = "",
      style,
      onClick,
      ...props
    },
    ref
  ) => {
    const isClickable = interactive || variant === "interactive" || Boolean(onClick);

    const paddingStyles: Record<CardPadding, string> = {
      none: "p-0",
      sm: "card-p-sm",
      md: "card-p-md",
      lg: "card-p-lg",
    };

    const variantStyles: Record<CardVariant, string> = {
      default: "ui-card ui-card-default",
      subtle: "ui-card ui-card-subtle",
      interactive: "ui-card ui-card-interactive",
      bordered: "ui-card ui-card-bordered",
    };

    const combinedClasses = [
      variantStyles[variant],
      paddingStyles[padding],
      isClickable ? "ui-card-clickable" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        ref={ref}
        className={combinedClasses}
        onClick={onClick}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.(e as any);
                }
              }
            : undefined
        }
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  action,
  className = "",
  style,
  ...props
}) => {
  return (
    <div className={`ui-card-header ${className}`.trim()} style={style} {...props}>
      <div className="ui-card-header-main">{children}</div>
      {action && <div className="ui-card-header-action">{action}</div>}
    </div>
  );
};

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span";
  size?: "sm" | "md" | "lg";
}

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  as: Component = "h3",
  size = "md",
  className = "",
  style,
  ...props
}) => {
  const sizeClass = {
    sm: "ui-card-title-sm",
    md: "ui-card-title-md",
    lg: "ui-card-title-lg",
  }[size];

  return (
    <Component className={`ui-card-title ${sizeClass} ${className}`.trim()} style={style} {...props}>
      {children}
    </Component>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = "",
  style,
  ...props
}) => {
  return (
    <p className={`ui-card-description ${className}`.trim()} style={style} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  style,
  ...props
}) => {
  return (
    <div className={`ui-card-content ${className}`.trim()} style={style} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  style,
  ...props
}) => {
  return (
    <div className={`ui-card-footer ${className}`.trim()} style={style} {...props}>
      {children}
    </div>
  );
};
