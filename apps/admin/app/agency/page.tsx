"use client";

import { Separator } from "@workspace/ui/components/separator";

import { CreateProduct } from "@/components/agency/create-product";
import { AgencyProducts } from "@/components/agency/products";

export default function AgencyPage() {
  return (
    <div className="px-48 pt-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Agency</h1>
      <CreateProduct />
      <Separator className="my-4" />
      <AgencyProducts />
    </div>
  );
}
