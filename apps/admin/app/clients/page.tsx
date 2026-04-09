"use client";

import { Separator } from "@workspace/ui/components/separator";

import { ClientList } from "@/components/clients/client-list";

export default function ClientsPage() {
  return (
    <div className="container pt-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Clients</h1>
      <Separator className="my-4" />
      <ClientList />
    </div>
  );
}
