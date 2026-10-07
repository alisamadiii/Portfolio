"use client";

import { useState } from "react";
import { Blocks } from "lucide-react";

import { IntegrationsDialog } from "@/components/integrations-dialog";

export const IntegrationsButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Integrations"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors"
      >
        <Blocks className="size-4" />
      </button>
      <IntegrationsDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
