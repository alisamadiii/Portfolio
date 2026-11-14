"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CONNECT_ERROR_PARAM, connectErrorMessage } from "@/lib/connect-errors";

/** Shows why an OAuth connect failed, then cleans the URL. Mounted once. */
export function ConnectErrorToast() {
  const router = useRouter();
  useEffect(() => {
    const url = new URL(window.location.href);
    const app = url.searchParams.get(CONNECT_ERROR_PARAM);
    if (!app) return;
    toast.error(connectErrorMessage(app, url.searchParams.get("error")));
    url.searchParams.delete(CONNECT_ERROR_PARAM);
    url.searchParams.delete("error");
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [router]);
  return null;
}
