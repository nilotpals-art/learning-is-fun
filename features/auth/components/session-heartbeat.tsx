"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const HEARTBEAT_INTERVAL_MS = 30_000;

export function SessionHeartbeat() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let stopped = false;
    let running = false;

    async function heartbeat() {
      if (stopped || running) return;
      running = true;
      try {
        const { data, error } = await supabase.rpc("touch_current_login_session");
        if (!stopped && (error || data !== true)) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/login?reason=session-ended");
          router.refresh();
        }
      } finally {
        running = false;
      }
    }

    void heartbeat();
    const interval = window.setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void heartbeat();
    }

    window.addEventListener("focus", heartbeat);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", heartbeat);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
