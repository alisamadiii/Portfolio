"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";

import { BillingHistoryDialog } from "@/components/billing-history-dialog";

export const BillingHistoryButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Billing history"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors"
      >
        <Receipt className="size-4" />
      </button>
      <BillingHistoryDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
