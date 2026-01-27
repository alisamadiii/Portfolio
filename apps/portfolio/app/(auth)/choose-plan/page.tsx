"use client";

import Link from "next/link";

import { buttonVariants } from "@workspace/ui/components/button";

import { Pricing } from "@/components/pricing";

export default function ChoosePlanPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Choose a plan</h1>
      <p className="text-muted-foreground">Choose a plan to get started</p>
      <Pricing />
      <Link href="/" className={buttonVariants({ variant: "ghost" })}>
        Continue without a plan
      </Link>
    </div>
  );
}
