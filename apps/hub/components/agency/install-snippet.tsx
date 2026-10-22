"use client";

import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import { useAgency } from "@/components/agency/agency-context";
import { Copy } from "@/components/icon";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://api.alisamadii.com").replace(/\/$/, "");

// The one-line capture script, for whoever maintains the site's code.
export function InstallSnippet() {
  const { formKey } = useAgency();
  if (!formKey) return null;

  const snippet = `<script src="${API_URL}/f.js" data-key="${formKey}" defer></script>`;

  return (
    <details className="bg-card rounded-lg border px-5 py-3 text-[14px]">
      <summary className="cursor-pointer font-semibold">Lead capture setup</summary>
      <div className="mt-3 space-y-3">
        <p className="text-muted-foreground">
          Add this tag to every page, then add <code>data-lead-form</code> to
          each form. Submissions land here with the ad that brought them.
        </p>
        <div className="flex items-start gap-2">
          <code className="bg-muted flex-1 rounded-md p-3 text-[12.5px] break-all">
            {snippet}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigator.clipboard.writeText(snippet).then(() => toast.success("Copied."))
            }
          >
            <Copy className="size-4" />
          </Button>
        </div>
      </div>
    </details>
  );
}
