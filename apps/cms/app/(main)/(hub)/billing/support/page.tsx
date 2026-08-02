"use client";

import { Button } from "@workspace/ui/components/button";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";

export default function SupportPage() {
  return (
    <div className="">
      <RequestDialog>
        <Button size="lg" className="w-full">
          Contact Support
        </Button>
      </RequestDialog>
    </div>
  );
}
