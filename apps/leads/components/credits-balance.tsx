"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins, Plus } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

import { BuyCreditsDialog } from "@/components/buy-credits-dialog";

export const CreditsBalance = () => {
  const trpc = useTRPC();
  const [buyOpen, setBuyOpen] = useState(false);

  const credits = useQuery(trpc.leads.credits.get.queryOptions());

  return (
    <>
      <button
        onClick={() => setBuyOpen(true)}
        className="bg-muted hover:bg-muted/70 flex cursor-pointer items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
      >
        <Coins className="text-primary size-4" />
        {credits.data ? (
          <span>
            {credits.data.balance.toLocaleString()}{" "}
            <span className="text-muted-foreground">credits</span>
          </span>
        ) : (
          <span className="text-muted-foreground">…</span>
        )}
        <Plus className="text-muted-foreground size-3.5" />
      </button>
      <BuyCreditsDialog open={buyOpen} onOpenChange={setBuyOpen} />
    </>
  );
};
