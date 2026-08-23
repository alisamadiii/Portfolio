"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { format } from "date-fns";
import { FileDown } from "@/components/icon";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import type { EmailLogsData } from "@workspace/ui/pdfs/emails";
import { EmailLogsDocument } from "@workspace/ui/pdfs/emails";

import { useTRPC } from "@workspace/trpc/client";

const EXPORT_LIMIT = 5000; // router max — the PDF covers the whole range

export function ExportEmailsPdfButton({
  owner,
  repo,
  input,
  meta,
}: {
  owner: string;
  repo: string;
  // The list filters without pagination — the export refetches everything.
  input: { from?: string; to?: string; search?: string; type?: string };
  meta: Pick<EmailLogsData, "clientName" | "company" | "rangeLabel">;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { items } = await queryClient.fetchQuery(
        trpc.emails.list.queryOptions({
          owner,
          repo,
          ...input,
          limit: EXPORT_LIMIT,
        })
      );

      const data: EmailLogsData = {
        ...meta,
        generatedAt: format(new Date(), "MMM d, yyyy"),
        rows: items.map((email) => ({
          date: format(new Date(email.createdAt), "MMM d, yyyy h:mm a"),
          subject: email.subject,
          recipient: email.to.join(", "),
          kind:
            email.type === "contact"
              ? "Contact form"
              : email.type === "send"
                ? "Sent"
                : email.type,
        })),
      };

      const blob = await pdf(<EmailLogsDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `email-activity-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export the PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      className="shrink-0 gap-2 rounded-full px-5"
      onClick={handleExport}
      isLoading={isExporting}
    >
      <FileDown className="size-4" />
      Export PDF
    </Button>
  );
}
