"use client";

import Link from "next/link";
import { format } from "date-fns";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Button } from "@workspace/ui/components/button";
import { urls } from "@workspace/ui/lib/company";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export default function CustomerPage() {
  const { data: user } = useCurrentUser();

  return (
    <CardAgency.Card>
      <CardAgency.Header title="Customer Information">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Link href={`${urls.portfolio}/settings`}>Edit Profile</Link>
        </Button>
      </CardAgency.Header>
      <div className="grid gap-5">
        <CardAgency.DetailRow label="Name" value={user?.user.name ?? ""} />
        <CardAgency.DetailRow label="Email" value={user?.user.email ?? ""} />
        <CardAgency.DetailRow label="Phone" value={user?.user.phone ?? ""} />
        <CardAgency.DetailRow
          label="Company"
          value={user?.user.company ?? ""}
        />
        <CardAgency.DetailRow
          label="Address"
          value={user?.user.address ?? ""}
        />
        <CardAgency.DetailRow
          label="Joined"
          value={format(
            user?.user.createdAt ? new Date(user.user.createdAt) : new Date(),
            "MMMM d, yyyy"
          )}
        />
      </div>
    </CardAgency.Card>
  );
}
