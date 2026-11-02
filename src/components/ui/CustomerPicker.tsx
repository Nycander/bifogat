import React, { useState, useMemo } from "react";
import { User } from "lucide-react";
import { filterCustomerSuggestions } from "../../domain/customers";

export interface CustomerPickerProps {
  value: string;
  onChange: (customerName: string) => void;
  onFinishEditing?: () => void;
  allCustomers?: string[];
  quickChips?: string[];
  label?: string;
  id?: string;
  placeholder?: string;
  chipLabel?: string;
  className?: string;
  inputStyle?: React.CSSProperties;
  showInput?: boolean;
  showChips?: boolean;
}

export interface CustomerQuickChipsProps {
  value: string;
  onChange: (customerName: string) => void;
  onFinishEditing?: () => void;
  chips: string[];
  chipLabel?: string;
  className?: string;
}

export const CustomerQuickChips: React.FC<CustomerQuickChipsProps> = ({
  value,
  onChange,
  onFinishEditing,
  chips,
  chipLabel = "Tidigare:",
  className = "",
}) => {
  if (!chips || chips.length === 0) return null;

  return (
    <div className={`customer-chips-row ${className}`.trim()} style={{ marginTop: "4px", marginBottom: "4px" }}>
      <span className="customer-chips-label">{chipLabel}</span>
      {chips.map((name) => (
        <button
          key={name}
          type="button"
          className={`customer-quick-chip ${value === name ? "selected" : ""}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange(name);
            onFinishEditing?.();
          }}
        >
          {name}
        </button>
      ))}
    </div>
  );
};

/**
 * Shared, reusable CustomerPicker component for HoneySaleModal and SwishInboxModal.
 * Features:
 * - Direct text input with autoComplete="off" (mobile-friendly, no intrusive browser popups)
 * - Native <datalist> backing
 * - Interactive suggestion dropdown with User icon on typing
 * - Quick chips (with onMouseDown preventDefault so software keyboard isn't dismissed)
 */
export const CustomerPicker: React.FC<CustomerPickerProps> = ({
  value,
  onChange,
  onFinishEditing,
  allCustomers = [],
  quickChips,
  label,
  id = "customer-picker-input",
  placeholder = "Valfritt namn...",
  chipLabel,
  className = "",
  inputStyle,
  showInput = true,
  showChips = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const matchingSuggestions = useMemo(() => {
    return filterCustomerSuggestions(allCustomers, value, 5);
  }, [allCustomers, value]);

  const defaultChips = useMemo(() => {
    if (quickChips && quickChips.length > 0) return quickChips;
    return allCustomers.slice(0, 4);
  }, [quickChips, allCustomers]);

  const displayedChips = value.trim() && !quickChips ? matchingSuggestions : defaultChips;
  const computedChipLabel = chipLabel ?? (value.trim() && !quickChips ? "Förslag:" : "Tidigare:");

  return (
    <div className={`customer-picker-container ${className}`.trim()} style={{ position: "relative" }}>
      {showInput && (
        <>
          {label && (
            <label className="form-label" htmlFor={id} style={{ fontSize: "0.8rem", marginBottom: "3px" }}>
              {label}
            </label>
          )}

          <div style={{ position: "relative" }}>
            <input
              id={id}
              type="text"
              list={`${id}-datalist`}
              className="form-input"
              style={{ padding: "6px 9px", fontSize: "0.88rem", width: "100%", ...inputStyle }}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                // Short delay so click on suggestion dropdown fires first
                setTimeout(() => setIsFocused(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                  onFinishEditing?.();
                }
              }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            <datalist id={`${id}-datalist`}>
              {allCustomers.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            {/* Live suggestions dropdown when typing */}
            {isFocused && value.trim().length > 0 && matchingSuggestions.length > 0 && (
              <div className="autocomplete-suggestions-dropdown">
                {matchingSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="autocomplete-suggestion-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(name);
                      setIsFocused(false);
                      onFinishEditing?.();
                    }}
                  >
                    <User size={13} className="suggestion-icon" />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Quick customer chips */}
      {showChips && displayedChips.length > 0 && (
        <CustomerQuickChips
          value={value}
          onChange={onChange}
          onFinishEditing={onFinishEditing}
          chips={displayedChips}
          chipLabel={computedChipLabel}
        />
      )}
    </div>
  );
};
