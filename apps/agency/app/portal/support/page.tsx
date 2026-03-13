"use client";

import { Button } from "@workspace/ui/components/button";
import { EmbedNotifications } from "@workspace/ui/custom/embed-notifications";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";

export default function SupportPage() {
  return (
    <div className="">
      <EmbedNotifications project="AGENCY" />

      <RequestDialog>
        <Button size="lg" className="w-full">
          Contact Support
        </Button>
      </RequestDialog>
    </div>
  );
}
