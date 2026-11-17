"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import { formatPhone } from "@workspace/trpc/lib/inbox-shared";

import { useAgency } from "@/components/agency/use-agency";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { StatusText } from "@/components/ds/ui/badge";

import { SmsNumberDialog } from "./sms-number-dialog";

/** Leads > Settings: the project's texting number. Admins only: the agency picks it. */
export function TextingCard() {
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const status = useQuery(trpc.agency.sms.status.queryOptions({ projectId }));
  const [open, setOpen] = useState(false);
  const number = status.data?.number;
  if (!status.data?.canManage) return null;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-3 text-[15px] font-semibold">
          Texting
          {number ? <StatusText>{formatPhone(number)}</StatusText> : <StatusText tone="neutral">Not set up</StatusText>}
        </span>
        <p className="text-[13px] text-dim">
          {number
            ? "Texts to leads come from this number, and their replies land in Conversations."
            : "With a texting number you can text leads from Conversations and get their replies there."}
        </p>
      </div>
      <Button onClick={() => setOpen(true)}>{number ? "Manage number" : "Get a number"}</Button>
      <SmsNumberDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
}
