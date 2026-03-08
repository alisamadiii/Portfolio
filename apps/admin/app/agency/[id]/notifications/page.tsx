"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import { Notifications } from "@/components/notifications";

export default function NotificationsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-8xl mx-auto flex flex-col items-start gap-6 p-4 md:p-8">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-1.5" asChild>
        <Link href={`/agency/${id}`}>
          <ArrowLeft className="size-4" />
          Back to Agency Product
        </Link>
      </Button>
      <Notifications project="AGENCY" userId={id} />
    </div>
  );
}
