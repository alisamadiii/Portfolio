"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Mail } from "lucide-react";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";

import type { RouterOutputs } from "@workspace/trpc/routers/_app";

type Submission =
  RouterOutputs["clients"]["get"]["contactSubmissions"][number];

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  NEW: "destructive",
  READ: "secondary",
  REPLIED: "default",
  ARCHIVED: "outline",
};

export const ClientContactSubmissions = ({
  submissions,
  isLoading,
}: {
  submissions: Submission[] | undefined;
  isLoading: boolean;
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <CardAgency.Card>
        <CardAgency.Header title="Contact Submissions" />
        <Skeleton className="h-32 w-full" />
      </CardAgency.Card>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <CardAgency.Card>
        <CardAgency.Header title="Contact Submissions" />
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-8">
          <Mail className="size-6 opacity-40" />
          <p className="text-sm">No contact submissions yet.</p>
        </div>
      </CardAgency.Card>
    );
  }

  return (
    <CardAgency.Card>
      <CardAgency.Header title="Contact Submissions">
        <Badge variant="secondary">{submissions.length}</Badge>
      </CardAgency.Header>

      <div className="divide-y rounded-md border">
        {submissions.map((sub) => {
          const isExpanded = expandedId === sub.id;
          return (
            <div key={sub.id}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                className="hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="text-muted-foreground size-4 shrink-0" />
                ) : (
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {sub.subject}
                    </span>
                    <Badge
                      variant={STATUS_VARIANT[sub.status] ?? "outline"}
                      className="shrink-0 text-[10px]"
                    >
                      {sub.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {sub.submitterName} &lt;{sub.submitterEmail}&gt;
                  </p>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {format(new Date(sub.createdAt), "MMM d, yyyy")}
                </span>
              </button>
              {isExpanded && (
                <div className="bg-muted/30 border-t px-10 py-3">
                  <p className="whitespace-pre-wrap text-sm">{sub.message}</p>
                  {sub.sourceUrl && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      Source: {sub.sourceUrl}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </CardAgency.Card>
  );
};
