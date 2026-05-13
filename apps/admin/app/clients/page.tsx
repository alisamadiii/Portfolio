"use client";

import { Separator } from "@workspace/ui/components/separator";

import { ClientList } from "@/components/clients/client-list";
import { CreateClientDialog } from "@/components/clients/create-client-dialog";

export default function ClientsPage() {
  return (
    <div className="container pt-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <CreateClientDialog />
      </div>
      <Separator className="my-4" />
      <ClientList />
    </div>
  );
}
