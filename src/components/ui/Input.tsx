import React, { forwardRef, useId } from "react";
import { FormField } from "./FormField";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  optional?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      optional,
      required,
      leftIcon,
      rightIcon,
      rightAddon,
      id,
      className = "",
      style,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || (label ? generatedId : undefined);

    const hasAffixes = leftIcon || rightIcon || rightAddon;

    const baseInput = (
      <input
        ref={ref}
        id={inputId}
        required={required}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        className={`form-input ${error ? "form-input-error" : ""} ${className}`.trim()}
        style={{
          paddingLeft: leftIcon ? "2.25rem" : undefined,
          paddingRight: rightIcon ? "2.25rem" : rightAddon ? "3rem" : undefined,
          ...style,
        }}
        autoComplete={props.autoComplete ?? "off"}
        {...props}
      />
    );

    const inputWithAffixes = hasAffixes ? (
      <div className="ui-input-wrapper">
        {leftIcon && <span className="ui-input-left-icon">{leftIcon}</span>}
        {baseInput}
        {rightIcon && <span className="ui-input-right-icon">{rightIcon}</span>}
        {rightAddon && <span className="ui-input-right-addon">{rightAddon}</span>}
      </div>
    ) : (
      baseInput
    );

    if (label || helperText || error) {
      return (
        <FormField
          label={label}
          htmlFor={inputId}
          required={required}
          optional={optional}
          helperText={helperText}
          error={error}
        >
          {inputWithAffixes}
        </FormField>
      );
    }

    return inputWithAffixes;
  }
);

Input.displayName = "Input";
