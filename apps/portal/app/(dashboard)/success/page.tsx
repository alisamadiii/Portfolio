import { Suspense } from "react";

import { Skeleton } from "@workspace/ui/components/skeleton";

import { PurchaseSuccess } from "@/components/success/purchase-success";

export default function SuccessPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <PurchaseSuccess />
    </Suspense>
  );
}
