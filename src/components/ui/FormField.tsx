import React from "react";

export interface FormFieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  helperText?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required = false,
  optional = false,
  helperText,
  error,
  children,
  className = "",
  style,
}) => {
  return (
    <div className={`form-group ${className}`.trim()} style={style}>
      {label && (
        <div className="ui-form-label-row">
          <label htmlFor={htmlFor} className="form-label">
            {label}
            {required && <span className="ui-required-mark" aria-hidden="true">*</span>}
          </label>
          {optional && !required && (
            <span className="ui-optional-badge">Valfritt</span>
          )}
        </div>
      )}

      {children}

      {error ? (
        <div className="form-error" role="alert">
          {error}
        </div>
      ) : helperText ? (
        <div className="form-help">
          {helperText}
        </div>
      ) : null}
    </div>
  );
};
