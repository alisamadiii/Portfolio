"use client";

import Link from "next/link";

import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";

import { AgencyProducts } from "@/components/agency/products";

export default function AgencyPage() {
  return (
    <div className="container pt-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Agency</h1>
      <Button asChild size={"lg"}>
        <Link href="/agency/create">Create Product</Link>
      </Button>
      <Separator className="my-4" />
      <AgencyProducts />
    </div>
  );
}
