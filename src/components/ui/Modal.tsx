import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "./BottomSheetDragHandle";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidth?: string | number;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  showDragHandle?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = 520,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  children,
  footer,
  className = "",
  showDragHandle = true,
}) => {
  const { contentRef, backdropRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const styleMaxWidth = typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      onClick={closeOnBackdropClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        ref={contentRef}
        className={`modal-content ${className}`.trim()}
        style={{ maxWidth: styleMaxWidth }}
        onClick={(e) => e.stopPropagation()}
        {...bottomSheetHandlers}
      >
        {showDragHandle && <BottomSheetDragHandle />}

        {(title || subtitle) && (
          <div className="modal-header">
            <div>
              {title && <h2 className="modal-title">{title}</h2>}
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-icon-only"
              onClick={onClose}
              aria-label="Stäng dialog"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="modal-body modal-scroll-body">{children}</div>

        {footer && <div className="modal-actions">{footer}</div>}
      </div>
    </div>
  );
};
