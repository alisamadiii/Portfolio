"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";

import { authClient } from "@workspace/auth/auth-client";

export const SignOutButton = () => {
  const [pending, setPending] = useState(false);

  return (
    <button
      aria-label="Sign out"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        // Layout session check is SSR — full navigation flips it to signed-out.
        window.location.href = "/home";
      }}
      className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
    </button>
  );
};
