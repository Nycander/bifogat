import { useRef, useCallback } from "react";
import { NavTab } from "../components/NavBar";
import {
  detectSwipeDirection,
  getAdjacentTab,
  SwipePoint,
  SwipeDecisionOptions,
} from "../utils/swipeNavigation";

export interface UseSwipeNavigationProps {
  activeTab: NavTab;
  tabOrder: NavTab[];
  onSelectTab: (tab: NavTab) => void;
  isModalOpen?: boolean;
  options?: SwipeDecisionOptions;
}

/**
 * Hook providing touch swipe gesture handlers for intuitive mobile navigation
 * across tabs. Rejects vertical scrolls, form element touches, and active modals.
 */
export function useSwipeNavigation({
  activeTab,
  tabOrder,
  onSelectTab,
  isModalOpen = false,
  options,
}: UseSwipeNavigationProps) {
  const touchStartRef = useRef<SwipePoint | null>(null);
  const touchOriginElementRef = useRef<HTMLElement | null>(null);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isModalOpen || e.touches.length !== 1) {
        touchStartRef.current = null;
        return;
      }

      const target = e.target as HTMLElement | null;
      touchOriginElementRef.current = target;

      // Ignore touches originating from interactive form controls
      if (
        target &&
        (target.closest("input") ||
          target.closest("textarea") ||
          target.closest("select") ||
          target.closest("button") ||
          target.closest(".modal-overlay") ||
          target.closest(".modal-content") ||
          target.closest(".nav-item") ||
          target.closest("[data-no-swipe]"))
      ) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: performance.now(),
      };
    },
    [isModalOpen],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;

      if (!start || isModalOpen) {
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) return;

      const end: SwipePoint = {
        x: touch.clientX,
        y: touch.clientY,
        time: performance.now(),
      };

      const direction = detectSwipeDirection(start, end, options);
      if (!direction) {
        return;
      }

      const nextTab = getAdjacentTab(activeTab, tabOrder, direction);
      if (nextTab && nextTab !== activeTab) {
        onSelectTab(nextTab);
      }
    },
    [activeTab, tabOrder, onSelectTab, isModalOpen, options],
  );

  const onTouchCancel = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchCancel,
  };
}
