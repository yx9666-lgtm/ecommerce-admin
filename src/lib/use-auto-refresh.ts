"use client";

import { useEffect, useRef } from "react";

/**
 * Refreshes data when the page regains visibility.
 * Includes a cooldown to prevent rapid duplicate fires.
 */
export function useAutoRefresh(callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const lastFiredRef = useRef(0);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        if (now - lastFiredRef.current < 2000) return;
        lastFiredRef.current = now;
        callbackRef.current();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
