import { Suspense } from "react";

import { Skeleton } from "@workspace/ui/components/skeleton";

import { AgencyWelcome } from "@/components/success/agency-welcome";

export default function AgencySuccessPage() {
  return (
    <main className="bg-background min-h-dvh">
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-6 py-16">
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        }
      >
        <AgencyWelcome />
      </Suspense>
    </main>
  );
}
