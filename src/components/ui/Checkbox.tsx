import React, { forwardRef, useEffect, useRef } from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
  size?: "default" | "large";
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error,
      size = "default",
      indeterminate = false,
      id,
      className = "",
      style,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    // Generate stable ID if none provided and label exists
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const internalRef = useRef<HTMLInputElement>(null);

    // Merge internalRef with forwarded ref
    useEffect(() => {
      const element = internalRef.current;
      if (element) {
        element.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const handleRef = (el: HTMLInputElement | null) => {
      (internalRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof ref === "function") {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
      }
    };

    const isLarge = size === "large";
    const checkboxClass = isLarge ? "task-checkbox" : "";

    const content = (
      <input
        ref={handleRef}
        type="checkbox"
        id={inputId}
        disabled={disabled}
        checked={checked}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={
          error ? `${inputId}-error` : description ? `${inputId}-desc` : undefined
        }
        className={`${checkboxClass} ${className}`.trim()}
        style={style}
        {...props}
      />
    );

    if (!label && !description && !error) {
      return content;
    }

    return (
      <div className={`ui-checkbox-wrapper ${disabled ? "ui-checkbox-disabled" : ""}`}>
        <div className="ui-checkbox-row">
          {content}
          {label && (
            <label htmlFor={inputId} className="ui-checkbox-label">
              {label}
            </label>
          )}
        </div>
        {description && (
          <div id={`${inputId}-desc`} className="ui-checkbox-description">
            {description}
          </div>
        )}
        {error && (
          <div id={`${inputId}-error`} className="ui-form-error" role="alert">
            {error}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
