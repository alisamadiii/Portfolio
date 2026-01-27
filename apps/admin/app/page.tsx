"use client";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export default function AdminPage() {
  const { data: currentUser } = useCurrentUser();

  return <div>{currentUser?.user?.email}</div>;
}
