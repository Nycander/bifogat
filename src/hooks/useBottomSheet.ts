import { useRef, useCallback, useState, useEffect } from "react";
import {
  calculateSheetTranslation,
  shouldDismissSheet,
  SheetDecisionOptions,
} from "../utils/bottomSheetGesture";

export interface UseBottomSheetProps {
  onClose: () => void;
  options?: SheetDecisionOptions;
}

/**
 * High-performance pointer-based bottom sheet gesture hook.
 * Directly tracks finger/pointer movement with setPointerCapture and transforms
 * the DOM node in real-time with translate3d for 60fps silky smooth tracking.
 */
export function useBottomSheet({ onClose, options }: UseBottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ y: number; time: number; pointerId: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Only single primary pointer (touch, pen, left mouse click)
      if (!e.isPrimary || e.button !== 0 || isClosing) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore if user tapped interactive form controls
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("select") ||
        target.closest("a") ||
        target.closest("[data-no-drag]")
      ) {
        return;
      }

      // Check if handle, header, or top non-scrollable area
      const isHandle = Boolean(target.closest(".sheet-drag-handle-container") || target.closest(".sheet-drag-handle"));
      const isHeader = Boolean(target.closest(".modal-header") || target.closest(".wizard-header"));
      
      const scrollBody = contentRef.current?.querySelector(".modal-scroll-body, .modal-body, .wizard-step-content") as HTMLElement | null;
      const isAtTop = !scrollBody || scrollBody.scrollTop <= 0;

      if (!isHandle && !isHeader && !isAtTop) {
        return;
      }

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture not supported or already captured
      }

      dragStartRef.current = {
        y: e.clientY,
        time: performance.now(),
        pointerId: e.pointerId,
      };
      isDraggingRef.current = false;

      if (contentRef.current) {
        contentRef.current.style.transition = "none";
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition = "none";
      }
    },
    [isClosing],
  );

  const moveDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const start = dragStartRef.current;
      if (!start || isClosing || start.pointerId !== e.pointerId) return;

      const deltaY = e.clientY - start.y;

      // Only begin visual tracking once pointer has moved at least 3px
      if (deltaY > 3 || isDraggingRef.current) {
        isDraggingRef.current = true;
        const translation = calculateSheetTranslation(start.y, e.clientY, options);
        const clampedY = Math.max(0, translation);

        if (contentRef.current) {
          contentRef.current.style.transform = `translate3d(0, ${clampedY}px, 0)`;
        }

        if (backdropRef.current) {
          // Proportionally fade backdrop as sheet is pulled down
          const progress = Math.min(1, clampedY / 350);
          const currentOpacity = Math.max(0.15, 1 - progress * 0.75);
          backdropRef.current.style.opacity = `${currentOpacity}`;
        }
      }
    },
    [isClosing, options],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const start = dragStartRef.current;
      dragStartRef.current = null;

      if (!start || start.pointerId !== e.pointerId) {
        isDraggingRef.current = false;
        return;
      }

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Capture already released
      }

      if (!isDraggingRef.current || isClosing) {
        isDraggingRef.current = false;
        return;
      }
      isDraggingRef.current = false;

      const endTime = performance.now();
      const shouldDismiss = shouldDismissSheet(
        start.y,
        e.clientY,
        start.time,
        endTime,
        options,
      );

      if (contentRef.current) {
        if (shouldDismiss) {
          setIsClosing(true);
          contentRef.current.style.transition = "transform 0.22s cubic-bezier(0.32, 0, 0.67, 0)";
          contentRef.current.style.transform = "translate3d(0, 100%, 0)";

          if (backdropRef.current) {
            backdropRef.current.style.transition = "opacity 0.2s ease-out";
            backdropRef.current.style.opacity = "0";
          }

          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(10);
          }

          window.setTimeout(() => {
            onClose();
          }, 210);
        } else {
          // Spring back smoothly to rest position
          contentRef.current.style.transition = "transform 0.26s cubic-bezier(0.175, 0.885, 0.32, 1.15)";
          contentRef.current.style.transform = "translate3d(0, 0px, 0)";

          if (backdropRef.current) {
            backdropRef.current.style.transition = "opacity 0.26s ease-out";
            backdropRef.current.style.opacity = "1";
          }
        }
      }
    },
    [onClose, options, isClosing],
  );

  const cancelDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      dragStartRef.current = null;
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      if (contentRef.current && !isClosing) {
        contentRef.current.style.transition = "transform 0.24s ease-out";
        contentRef.current.style.transform = "translate3d(0, 0px, 0)";
      }
      if (backdropRef.current && !isClosing) {
        backdropRef.current.style.transition = "opacity 0.24s ease-out";
        backdropRef.current.style.opacity = "1";
      }
    },
    [isClosing],
  );

  return {
    contentRef,
    backdropRef,
    isClosing,
    bottomSheetHandlers: {
      onPointerDown: startDrag,
      onPointerMove: moveDrag,
      onPointerUp: endDrag,
      onPointerCancel: cancelDrag,
    },
  };
}
