"use client";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { HeaderPage } from "@/components/header-page";
import { ProtectRoute } from "@/components/protect-route";

export default function Page() {
  const { data: currentUser } = useCurrentUser();

  return (
    <ProtectRoute>
      <div>
        <HeaderPage />
        <div className="container">
          <p className="text-muted-foreground">
            Welcome back, {currentUser?.user?.name}
          </p>
        </div>
      </div>
    </ProtectRoute>
  );
}
