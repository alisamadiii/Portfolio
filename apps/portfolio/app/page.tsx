"use client";

import { HeaderPage } from "apps/portfolio/components/header-page";
import { ProtectRoute } from "apps/portfolio/components/protect-route";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

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
