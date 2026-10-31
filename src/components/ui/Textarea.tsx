import React, { forwardRef, useId } from "react";
import { FormField } from "./FormField";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  optional?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      optional,
      required,
      id,
      className = "",
      style,
      disabled,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || (label ? generatedId : undefined);

    const baseTextarea = (
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        className={`form-textarea ${error ? "form-textarea-error" : ""} ${className}`.trim()}
        style={style}
        autoComplete={props.autoComplete ?? "off"}
        {...props}
      />
    );

    if (label || helperText || error) {
      return (
        <FormField
          label={label}
          htmlFor={textareaId}
          required={required}
          optional={optional}
          helperText={helperText}
          error={error}
        >
          {baseTextarea}
        </FormField>
      );
    }

    return baseTextarea;
  }
);

Textarea.displayName = "Textarea";
