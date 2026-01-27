"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@workspace/ui/custom/data-table";

import { useTRPC } from "@workspace/trpc/client";

import { Content } from "@/components/content-admin";
import { paymentColumns } from "@/components/payments/columns";

export default function AdminPaymentsPage() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.payments.getProducts.queryOptions()
  );

  return (
    <Content>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Products</h1>
      <DataTable
        columns={paymentColumns}
        data={data || []}
        isLoading={isLoading}
      />
      {/* <CreatePaymentDialog /> */}
    </Content>
  );
}
