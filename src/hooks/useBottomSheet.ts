import { useRef, useEffect } from "react";
import {
  calculateSheetTranslation,
  shouldDismissSheet,
  SheetDecisionOptions,
  easeOutCubic,
  easeOutBack,
  interpolatePosition,
  interpolateOpacity,
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
 * 4. Animates exit and spring-back using frame-by-frame requestAnimationFrame with C1 continuity,
 *    bypassing browser CSS transition bugs and delivering silky-smooth 60/120fps physics.
 */
export function useBottomSheet({ onClose, options }: UseBottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

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

  // 2. Gesture tracking and continuous frame-by-frame physics
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    let startY = 0;
    let startTime = 0;
    let currentDragY = 0;
    let isDragging = false;
    let isExiting = false;
    let activeTouchId: number | null = null;
    let activePointerId: number | null = null;
    let activeScrollContainer: HTMLElement | null = null;
    let rafId: number | null = null;

    const cancelCurrentAnimation = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

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

    const findScrollContainer = (target: HTMLElement | null): HTMLElement | null => {
      let curr = target;
      while (curr && curr !== el && curr !== document.body) {
        const style = window.getComputedStyle(curr);
        const overflowY = style.overflowY;
        if (
          (overflowY === "auto" || overflowY === "scroll" || curr.classList.contains("modal-scroll-body") || curr.classList.contains("modal-body")) &&
          curr.scrollHeight > curr.clientHeight
        ) {
          return curr;
        }
        curr = curr.parentElement;
      }
      // Check fallback inside modal
      const fallback = el.querySelector(
        ".modal-scroll-body, .modal-body, .wizard-step-content"
      ) as HTMLElement | null;
      if (fallback && (fallback.scrollHeight > fallback.clientHeight || fallback.scrollTop > 0)) {
        return fallback;
      }
      return null;
    };

    const checkDragZone = (
      target: HTMLElement | null,
    ): { allowed: boolean; isDirectHandle: boolean; scrollContainer: HTMLElement | null } => {
      if (!target || isInteractiveElement(target)) {
        return { allowed: false, isDirectHandle: false, scrollContainer: null };
      }

      // Check handle or header
      const isHandle = Boolean(
        target.closest(".sheet-drag-handle-container") ||
        target.closest(".sheet-drag-handle") ||
        target.closest(".modal-header") ||
        target.closest(".wizard-header") ||
        target.closest(".wizard-progress-track") ||
        target.closest(".wizard-context-banner")
      );

      if (isHandle) {
        return { allowed: true, isDirectHandle: true, scrollContainer: null };
      }

      // Inside content body: find scroll container
      const scrollContainer = findScrollContainer(target);
      // If user is scrolled down into content, NEVER allow dragging (user is scrolling content up/down!)
      if (scrollContainer && scrollContainer.scrollTop > 0) {
        return { allowed: false, isDirectHandle: false, scrollContainer };
      }

      return { allowed: true, isDirectHandle: false, scrollContainer };
    };

    const animateExit = (startOffset: number) => {
      isExiting = true;
      cancelCurrentAnimation();

      const exitDistance = Math.max(window.innerHeight, (el.offsetHeight || 500) + 120);
      const duration = 260; // ms
      const animStartTime = performance.now();

      const bd = getBackdrop();
      const startOpacity = bd ? parseFloat(window.getComputedStyle(bd).opacity) || 1 : 1;

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
      }

      const runExitFrame = (now: number) => {
        const elapsed = now - animStartTime;
        const progress = Math.min(1, elapsed / duration);
        const y = interpolatePosition(startOffset, exitDistance, progress, easeOutCubic);
        const opacity = interpolateOpacity(startOpacity, 0, progress);

        el.style.setProperty("transform", `translate3d(0, ${y}px, 0)`, "important");
        if (bd) {
          bd.style.setProperty("opacity", `${opacity}`, "important");
        }

        if (progress < 1) {
          rafId = requestAnimationFrame(runExitFrame);
        } else {
          rafId = null;
          onCloseRef.current();
        }
      };

      rafId = requestAnimationFrame(runExitFrame);
    };

    const animateSpringBack = (startOffset: number) => {
      cancelCurrentAnimation();

      const duration = 240; // ms
      const animStartTime = performance.now();

      const bd = getBackdrop();
      const startOpacity = bd ? parseFloat(window.getComputedStyle(bd).opacity) || 1 : 1;

      const runSpringFrame = (now: number) => {
        const elapsed = now - animStartTime;
        const progress = Math.min(1, elapsed / duration);
        const y = interpolatePosition(startOffset, 0, progress, easeOutBack);
        const opacity = interpolateOpacity(startOpacity, 1, progress);

        el.style.setProperty("transform", `translate3d(0, ${Math.max(0, y)}px, 0)`, "important");
        if (bd) {
          bd.style.setProperty("opacity", `${opacity}`, "important");
        }

        if (progress < 1) {
          rafId = requestAnimationFrame(runSpringFrame);
        } else {
          rafId = null;
          currentDragY = 0;
          el.style.removeProperty("transform");
          if (bd) {
            bd.style.removeProperty("opacity");
          }
        }
      };

      rafId = requestAnimationFrame(runSpringFrame);
    };

    /* -------------------------------------------------------------------------
       TOUCH GESTURE (Mobile Touchscreen)
       ------------------------------------------------------------------------- */
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || isExiting) return;

      const target = e.target as HTMLElement | null;
      const { allowed, isDirectHandle, scrollContainer } = checkDragZone(target);
      if (!allowed) {
        activeTouchId = null;
        isDragging = false;
        activeScrollContainer = null;
        return;
      }

      cancelCurrentAnimation();

      const touch = e.touches[0];
      startY = touch.clientY;
      startTime = performance.now();
      activeTouchId = touch.identifier;
      activeScrollContainer = scrollContainer;

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
      if (activeTouchId === null || isExiting) return;

      const touch = Array.from(e.touches).find((t) => t.identifier === activeTouchId);
      if (!touch) return;

      const currentY = touch.clientY;
      const deltaY = currentY - startY;

      // CRITICAL: If the user is inside a scroll container and has scrolled down (scrollTop > 0),
      // any downward motion is the user scrolling UP in content. NEVER hijack it!
      if (activeScrollContainer && activeScrollContainer.scrollTop > 0) {
        if (isDragging) {
          isDragging = false;
          el.style.removeProperty("transform");
        }
        return;
      }

      // For body area: only engage drag if pulling downwards at the very top (deltaY > 20px)
      if (!isDragging) {
        if (deltaY > 20) {
          // Double check scroll position in case momentum or user scrolled
          if (activeScrollContainer && activeScrollContainer.scrollTop > 0) {
            return;
          }
          isDragging = true;
          el.style.animation = "none";
          el.style.setProperty("transition", "none", "important");
          const bd = getBackdrop();
          if (bd) bd.style.setProperty("transition", "none", "important");
        } else {
          return;
        }
      }

      if (isDragging) {
        // Always prevent native browser scroll / overscroll during active drag
        if (e.cancelable) {
          e.preventDefault();
        }

        const translation = calculateSheetTranslation(startY, currentY, optionsRef.current);
        const clampedY = Math.max(0, translation);
        currentDragY = clampedY;

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
      activeScrollContainer = null;

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

      if (shouldDismiss) {
        animateExit(currentDragY);
      } else {
        animateSpringBack(currentDragY);
      }
    };

    const handleTouchCancel = () => {
      activeTouchId = null;
      activeScrollContainer = null;
      if (isDragging) {
        isDragging = false;
        animateSpringBack(currentDragY);
      }
    };

    /* -------------------------------------------------------------------------
       POINTER GESTURE (Mouse / Desktop)
       ------------------------------------------------------------------------- */
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // Handled by touch events above
      if (e.button !== 0 || isExiting) return;

      const target = e.target as HTMLElement | null;
      const { allowed, isDirectHandle, scrollContainer } = checkDragZone(target);
      if (!allowed) {
        activePointerId = null;
        isDragging = false;
        activeScrollContainer = null;
        return;
      }

      cancelCurrentAnimation();

      startY = e.clientY;
      startTime = performance.now();
      activePointerId = e.pointerId;
      activeScrollContainer = scrollContainer;

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
      if (activePointerId === null || e.pointerId !== activePointerId || isExiting) return;

      const currentY = e.clientY;
      const deltaY = currentY - startY;

      if (activeScrollContainer && activeScrollContainer.scrollTop > 0) {
        if (isDragging) {
          isDragging = false;
          el.style.removeProperty("transform");
        }
        return;
      }

      if (!isDragging) {
        if (deltaY > 20) {
          if (activeScrollContainer && activeScrollContainer.scrollTop > 0) {
            return;
          }
          isDragging = true;
          el.style.animation = "none";
          el.style.setProperty("transition", "none", "important");
          const bd = getBackdrop();
          if (bd) bd.style.setProperty("transition", "none", "important");
        } else {
          return;
        }
      }

      if (isDragging) {
        const translation = calculateSheetTranslation(startY, currentY, optionsRef.current);
        const clampedY = Math.max(0, translation);
        currentDragY = clampedY;

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
      activeScrollContainer = null;

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

      if (shouldDismiss) {
        animateExit(currentDragY);
      } else {
        animateSpringBack(currentDragY);
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
      cancelCurrentAnimation();

      el.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);

      el.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  return {
    contentRef,
    backdropRef,
    isClosing: false,
    bottomSheetHandlers: {},
  };
}
