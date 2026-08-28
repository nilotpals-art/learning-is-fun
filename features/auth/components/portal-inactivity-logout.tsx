"use client";

import { useCallback, useEffect, useRef } from "react";

import { logout } from "@/features/auth/actions/auth-actions";

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000;
const ACTIVITY_STORAGE_KEY = "lif_portal_last_activity";
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "click",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
];

export function PortalInactivityLogout() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutStartedRef = useRef(false);

  const performLogout = useCallback(async () => {
    if (logoutStartedRef.current) return;
    logoutStartedRef.current = true;

    try {
      localStorage.removeItem(ACTIVITY_STORAGE_KEY);
      await logout();
    } finally {
      window.location.replace("/login?reason=inactive");
    }
  }, []);

  const scheduleCheck = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const stored = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY));
    const lastActivity = Number.isFinite(stored) && stored > 0 ? stored : Date.now();
    const remaining = INACTIVITY_LIMIT_MS - (Date.now() - lastActivity);

    if (remaining <= 0) {
      void performLogout();
      return;
    }

    timeoutRef.current = setTimeout(() => {
      const latestStored = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY));
      const latestActivity = Number.isFinite(latestStored) && latestStored > 0
        ? latestStored
        : lastActivity;

      if (Date.now() - latestActivity >= INACTIVITY_LIMIT_MS) {
        void performLogout();
      } else {
        scheduleCheck();
      }
    }, remaining);
  }, [performLogout]);

  const markActivity = useCallback(() => {
    if (logoutStartedRef.current) return;
    localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
    scheduleCheck();
  }, [scheduleCheck]);

  useEffect(() => {
    const existing = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY));
    if (!Number.isFinite(existing) || existing <= 0) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
    }

    scheduleCheck();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, markActivity, { passive: true });
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_STORAGE_KEY) scheduleCheck();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleCheck();
    };

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, markActivity);
      }
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [markActivity, scheduleCheck]);

  return null;
}
