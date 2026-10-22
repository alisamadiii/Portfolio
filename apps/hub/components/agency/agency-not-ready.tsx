"use client";

import Link from "next/link";
import { notFound, usePathname } from "next/navigation";

import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { company } from "@workspace/ui/lib/company";

// Routes that only exist in the @agency slot.
const AGENCY_ROUTES = ["/agency", "/marketing", "/newsletter"];

const isAgencyRoute = (pathname: string) =>
  AGENCY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

export function AgencyNotReady() {
  const pathname = usePathname();
  if (!isAgencyRoute(pathname)) notFound();

  return (
    <Empty className="absolute inset-0 rounded-none border-0">
      <EmptyHeader>
        <EmptyTitle>Your agency workspace isn&apos;t ready yet</EmptyTitle>
        <EmptyDescription>
          Talk with your admin to get access or finish your setup.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button render={<a href={`mailto:${company.email}`}>Email Ali</a>} />
        <Button variant="outline" render={<Link href="/">Go home</Link>} />
      </EmptyContent>
    </Empty>
  );
}
