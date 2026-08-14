import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { InviteSignIn } from "@/components/invite-sign-in";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token?.trim()) {
    return (
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>Invite unavailable</EmptyTitle>
          <EmptyDescription>This invitation link is invalid.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <InviteSignIn token={token.trim()} />;
}
