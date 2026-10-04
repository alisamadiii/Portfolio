import { Suspense } from "react";

import { Skeleton } from "@workspace/ui/components/skeleton";

import { PurchaseSuccess } from "@/components/success/purchase-success";

// Standalone page — outside the (hub) group on purpose so the post-checkout
// confirmation renders centered without the sidebar shell.
export default function SuccessPage() {
  return (
    <div className="bg-shell flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
          <PurchaseSuccess />
        </Suspense>
      </div>
    </div>
  );
}
