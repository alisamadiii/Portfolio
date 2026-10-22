import Link from "next/link";

import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { DocumentTitle } from "@/components/document-title";

/** A lead tracker that isn't built yet: what it will do, and where to go meanwhile. */
export function TrackerSoon({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="space-y-6">
      <DocumentTitle title={title} />
      <h2 className="text-[27px] font-extrabold tracking-tight">{title}</h2>
      <Empty className="bg-card rounded-2xl border py-16">
        <EmptyHeader>
          <EmptyTitle>Coming soon</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        {action && (
          <EmptyContent>
            <Button
              variant="outline"
              render={<Link href={action.href}>{action.label}</Link>}
            />
          </EmptyContent>
        )}
      </Empty>
    </div>
  );
}
