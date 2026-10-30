import { useRef, useState, useEffect } from "react";
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
 * Universal, high-performance touch & pointer bottom sheet gesture hook.
 *
 * Implements strict mobile scroll-locking and hardware-accelerated 1:1 finger tracking:
 * 1. Locks document.body and backdrop scrolling completely on mount (no rubber-band conflict).
 * 2. Immediately removes CSS keyframe animations and transitions upon touching drag areas.
 * 3. Uses active touch listeners to preventDefault() on downward swipes so mobile browsers
 *    never hijack the gesture.
 * 4. Applies translate3d directly with CSS priority to guarantee 60fps tracking during movement.
 */
export function useBottomSheet({ onClose, options }: UseBottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // 1. Manage strict viewport scroll lock while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  // 2. Gesture tracking
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    let startY = 0;
    let startTime = 0;
    let isDragging = false;
    let activeTouchId: number | null = null;
    let activePointerId: number | null = null;

    const getBackdrop = (): HTMLElement | null => {
      if (backdropRef.current) return backdropRef.current;
      const closest = el.closest(".modal-backdrop") as HTMLElement | null;
      if (closest) return closest;
      return el.parentElement as HTMLElement | null;
    };

    const isInteractiveElement = (target: HTMLElement | null): boolean => {
      if (!target) return false;
      return Boolean(
        target.closest("button") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("select") ||
        target.closest("a") ||
        target.closest("[data-no-drag]")
      );
    };

    const checkDragZone = (target: HTMLElement | null): { allowed: boolean; isDirectHandle: boolean } => {
      if (!target || isInteractiveElement(target)) {
        return { allowed: false, isDirectHandle: false };
      }

      // Check handle or header
      const isHandle = Boolean(
        target.closest(".sheet-drag-handle-container") ||
        target.closest(".sheet-drag-handle")
      );
      const isHeader = Boolean(
        target.closest(".modal-header") ||
        target.closest(".wizard-header") ||
        target.closest(".wizard-progress-track") ||
        target.closest(".wizard-context-banner")
      );

      if (isHandle || isHeader) {
        return { allowed: true, isDirectHandle: true };
      }

      // Inside content body: only allow if at top of scroll
      const scrollContainer = el.querySelector(
        ".modal-scroll-body, .modal-body, .wizard-step-content"
      ) as HTMLElement | null;
      const isAtTop = !scrollContainer || scrollContainer.scrollTop <= 0;

      return { allowed: isAtTop, isDirectHandle: false };
    };

    /* -------------------------------------------------------------------------
       TOUCH GESTURE (Mobile Touchscreen)
       ------------------------------------------------------------------------- */
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || isClosing) return;

      const target = e.target as HTMLElement | null;
      const { allowed, isDirectHandle } = checkDragZone(target);
      if (!allowed) return;

      const touch = e.touches[0];
      startY = touch.clientY;
      startTime = performance.now();
      activeTouchId = touch.identifier;

      if (isDirectHandle) {
        // Immediate drag engagement on handle or header
        isDragging = true;
        el.style.animation = "none";
        el.style.setProperty("transition", "none", "important");
        const bd = getBackdrop();
        if (bd) bd.style.setProperty("transition", "none", "important");
      } else {
        isDragging = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (activeTouchId === null || isClosing) return;

      const touch = Array.from(e.touches).find((t) => t.identifier === activeTouchId);
      if (!touch) return;

      const currentY = touch.clientY;
      const deltaY = currentY - startY;

      // For body area, start dragging once pulling downwards
      if (!isDragging && deltaY > 3) {
        isDragging = true;
        el.style.animation = "none";
        el.style.setProperty("transition", "none", "important");
        const bd = getBackdrop();
        if (bd) bd.style.setProperty("transition", "none", "important");
      }

      if (isDragging) {
        // Always prevent native browser scroll / overscroll during drag
        if (e.cancelable) {
          e.preventDefault();
        }

        const translation = calculateSheetTranslation(startY, currentY, optionsRef.current);
        const clampedY = Math.max(0, translation);

        el.style.setProperty("transform", `translate3d(0, ${clampedY}px, 0)`, "important");

        const bd = getBackdrop();
        if (bd) {
          const progress = Math.min(1, clampedY / 360);
          const currentOpacity = Math.max(0.12, 1 - progress * 0.8);
          bd.style.setProperty("opacity", `${currentOpacity}`, "important");
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (activeTouchId === null) return;

      const touch = Array.from(e.changedTouches).find((t) => t.identifier === activeTouchId);
      activeTouchId = null;

      if (!isDragging) {
        isDragging = false;
        return;
      }
      isDragging = false;

      const endY = touch ? touch.clientY : startY;
      const endTime = performance.now();
      const shouldDismiss = shouldDismissSheet(
        startY,
        endY,
        startTime,
        endTime,
        optionsRef.current
      );

      const bd = getBackdrop();

      if (shouldDismiss) {
        setIsClosing(true);
        el.style.setProperty("transition", "transform 0.22s cubic-bezier(0.32, 0, 0.67, 0)", "important");
        el.style.setProperty("transform", "translate3d(0, 100%, 0)", "important");

        if (bd) {
          bd.style.setProperty("transition", "opacity 0.2s ease-out", "important");
          bd.style.setProperty("opacity", "0", "important");
        }

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }

        window.setTimeout(() => {
          onCloseRef.current();
        }, 210);
      } else {
        // Spring back smoothly to rest position
        el.style.setProperty("transition", "transform 0.26s cubic-bezier(0.175, 0.885, 0.32, 1.15)", "important");
        el.style.setProperty("transform", "translate3d(0, 0px, 0)", "important");

        if (bd) {
          bd.style.setProperty("transition", "opacity 0.24s ease-out", "important");
          bd.style.setProperty("opacity", "1", "important");
        }
      }
    };

    const handleTouchCancel = () => {
      activeTouchId = null;
      if (isDragging) {
        isDragging = false;
        el.style.setProperty("transition", "transform 0.24s ease-out", "important");
        el.style.setProperty("transform", "translate3d(0, 0px, 0)", "important");
        const bd = getBackdrop();
        if (bd) {
          bd.style.setProperty("transition", "opacity 0.24s ease-out", "important");
          bd.style.setProperty("opacity", "1", "important");
        }
      }
    };

    /* -------------------------------------------------------------------------
       POINTER GESTURE (Mouse / Desktop)
       ------------------------------------------------------------------------- */
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // Handled by touch events above
      if (e.button !== 0 || isClosing) return;

      const target = e.target as HTMLElement | null;
      const { allowed, isDirectHandle } = checkDragZone(target);
      if (!allowed) return;

      startY = e.clientY;
      startTime = performance.now();
      activePointerId = e.pointerId;

      if (isDirectHandle) {
        isDragging = true;
        el.style.animation = "none";
        el.style.setProperty("transition", "none", "important");
        const bd = getBackdrop();
        if (bd) bd.style.setProperty("transition", "none", "important");
      } else {
        isDragging = false;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (activePointerId === null || e.pointerId !== activePointerId || isClosing) return;

      const currentY = e.clientY;
      const deltaY = currentY - startY;

      if (!isDragging && deltaY > 3) {
        isDragging = true;
        el.style.animation = "none";
        el.style.setProperty("transition", "none", "important");
        const bd = getBackdrop();
        if (bd) bd.style.setProperty("transition", "none", "important");
      }

      if (isDragging) {
        const translation = calculateSheetTranslation(startY, currentY, optionsRef.current);
        const clampedY = Math.max(0, translation);
        el.style.setProperty("transform", `translate3d(0, ${clampedY}px, 0)`, "important");

        const bd = getBackdrop();
        if (bd) {
          const progress = Math.min(1, clampedY / 360);
          const currentOpacity = Math.max(0.12, 1 - progress * 0.8);
          bd.style.setProperty("opacity", `${currentOpacity}`, "important");
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (activePointerId === null || e.pointerId !== activePointerId) return;
      activePointerId = null;

      if (!isDragging) {
        isDragging = false;
        return;
      }
      isDragging = false;

      const endTime = performance.now();
      const shouldDismiss = shouldDismissSheet(
        startY,
        e.clientY,
        startTime,
        endTime,
        optionsRef.current
      );

      const bd = getBackdrop();

      if (shouldDismiss) {
        setIsClosing(true);
        el.style.setProperty("transition", "transform 0.22s cubic-bezier(0.32, 0, 0.67, 0)", "important");
        el.style.setProperty("transform", "translate3d(0, 100%, 0)", "important");

        if (bd) {
          bd.style.setProperty("transition", "opacity 0.2s ease-out", "important");
          bd.style.setProperty("opacity", "0", "important");
        }

        window.setTimeout(() => {
          onCloseRef.current();
        }, 210);
      } else {
        el.style.setProperty("transition", "transform 0.26s cubic-bezier(0.175, 0.885, 0.32, 1.15)", "important");
        el.style.setProperty("transform", "translate3d(0, 0px, 0)", "important");

        if (bd) {
          bd.style.setProperty("transition", "opacity 0.24s ease-out", "important");
          bd.style.setProperty("opacity", "1", "important");
        }
      }
    };

    // Attach touch listeners to element and window with active move handler
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    // Pointer events for mouse/desktop
    el.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);

      el.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isClosing]);

  return {
    contentRef,
    backdropRef,
    isClosing,
    bottomSheetHandlers: {},
  };
}
