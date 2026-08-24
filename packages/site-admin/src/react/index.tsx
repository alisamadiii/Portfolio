/**
 * The mountable admin app. All configuration arrives via props (adapters read
 * env their own way and pass it down) — this module never touches env.
 */

import { useEffect, useMemo } from "react";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignIn,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { createApiClient } from "./api";
import { Dashboard } from "./app";
import { injectStyles } from "./styles";

export type AdminAppProps = {
  /** Clerk publishable key (pk_…). */
  publishableKey: string;
  /** Pathname the API handler is mounted under. Default "/api/admin". */
  apiBase?: string;
  /** Shown in the top bar. */
  siteName?: string;
  /** "View site" link target. Default "/". */
  siteUrl?: string;
};

export const AdminApp = ({
  publishableKey,
  apiBase = "/api/admin",
  siteName,
  siteUrl = "/",
}: AdminAppProps) => {
  useEffect(injectStyles, []);
  const queryClient = useMemo(() => new QueryClient(), []);

  if (!publishableKey) {
    return (
      <div className="sa-root">
        <div className="sa-center">
          <p>
            Missing Clerk publishable key — set{" "}
            <code>PUBLIC_CLERK_PUBLISHABLE_KEY</code> in the site&apos;s env.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <QueryClientProvider client={queryClient}>
        <div className="sa-root">
          <SignedOut>
            <div className="sa-center">
              <SignIn routing="hash" />
            </div>
          </SignedOut>
          <SignedIn>
            <Shell apiBase={apiBase} siteName={siteName} siteUrl={siteUrl} />
          </SignedIn>
        </div>
      </QueryClientProvider>
    </ClerkProvider>
  );
};

const Shell = ({
  apiBase,
  siteName,
  siteUrl,
}: {
  apiBase: string;
  siteName?: string;
  siteUrl: string;
}) => {
  const { getToken } = useAuth();
  const api = useMemo(
    () => createApiClient(apiBase, getToken),
    // getToken is stable per Clerk session.
    [apiBase, getToken]
  );

  return (
    <>
      <header className="sa-topbar">
        <span className="sa-topbar-title">{siteName ?? "Site admin"}</span>
        <a href={siteUrl} target="_blank" rel="noreferrer">
          View site ↗
        </a>
        <UserButton />
      </header>
      <Dashboard api={api} siteName={siteName} />
    </>
  );
};

export { Dashboard } from "./app";
export { createApiClient, ApiError } from "./api";
export type { ApiClient } from "./api";
