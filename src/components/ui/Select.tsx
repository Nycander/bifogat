import React, { forwardRef, useId } from "react";
import { FormField } from "./FormField";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  optional?: boolean;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      optional,
      required,
      options,
      children,
      id,
      className = "",
      style,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || (label ? generatedId : undefined);

    const baseSelect = (
      <select
        ref={ref}
        id={selectId}
        required={required}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        className={`form-select ${error ? "form-select-error" : ""} ${className}`.trim()}
        style={style}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    );

    if (label || helperText || error) {
      return (
        <FormField
          label={label}
          htmlFor={selectId}
          required={required}
          optional={optional}
          helperText={helperText}
          error={error}
        >
          {baseSelect}
        </FormField>
      );
    }

    return baseSelect;
  }
);

Select.displayName = "Select";
