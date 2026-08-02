"use client";

import { useState } from "react";

import { useCurrentUser } from "../hooks/use-user";
import { authClient } from "../auth-client";

/**
 * Fixed warning strip shown while an admin is impersonating a user
 * (session.impersonatedBy is set by Better Auth's admin plugin).
 * "Stop" restores the admin's own session and reloads the page.
 */
export function ImpersonationBanner() {
  const { data } = useCurrentUser();
  const [stopping, setStopping] = useState(false);

  if (!data?.session?.impersonatedBy) return null;

  const identity = data.user?.name || data.user?.email || "user";

  const handleStop = async () => {
    setStopping(true);
    try {
      await authClient.admin.stopImpersonating();
      window.location.reload();
    } catch {
      setStopping(false);
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-amber-500 px-4 py-1.5 text-sm font-medium text-amber-950">
      <span className="truncate">
        Viewing as <span className="font-semibold">{identity}</span> —
        impersonation active
      </span>
      <button
        type="button"
        onClick={handleStop}
        disabled={stopping}
        className="shrink-0 rounded-full bg-amber-950 px-3 py-0.5 text-xs font-semibold text-amber-50 hover:bg-amber-900 disabled:opacity-60"
      >
        {stopping ? "Stopping…" : "Stop impersonating"}
      </button>
    </div>
  );
}
