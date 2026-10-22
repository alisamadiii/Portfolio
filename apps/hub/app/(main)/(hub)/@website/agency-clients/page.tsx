"use client";

import { notFound } from "next/navigation";

import { AdminAgencyClients } from "@/components/agency/admin-clients";
import { DocumentTitle } from "@/components/document-title";
import { useUser } from "@/contexts/user-context";

export default function AgencyClientsPage() {
  const { user } = useUser();
  if (!user?.isAdmin) notFound();

  return (
    <div className="space-y-6">
      <DocumentTitle title="Agency clients" />
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">Agency clients</h2>
        <p className="text-muted-foreground mt-1 text-[14.5px]">
          Clients on a lead generation plan. They see the agency Hub (leads,
          ads, their one website) instead of this one.
        </p>
      </div>
      <AdminAgencyClients />
    </div>
  );
}
