import { redirect } from "next/navigation";

import { resolveAuthTarget } from "@/lib/auth-redirect";
import { getServerSession } from "@/lib/session-server";

import { SignIn } from "./sign-in-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectUrl?: string; redirect?: string }>;
}) {
  const { redirectUrl, redirect: redirectTo } = await searchParams;
  const session = await getServerSession();

  // Already signed in — bounce straight to the destination
  if (session?.user) {
    const target = resolveAuthTarget(redirectUrl, redirectTo);
    redirect(target === "/sign-in" ? "/" : target);
  }

  return <SignIn />;
}
