import { polarClient } from "@polar-sh/better-auth";
import {
  adminClient,
  emailOTPClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { auth } from "./auth";

// Type assertion to work around TypeScript's inability to name the inferred type
// due to deep pnpm path references in the polar checkout plugin types
export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL!,
  plugins: [
    adminClient(),
    inferAdditionalFields<typeof auth>(),
    emailOTPClient(),
    polarClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = createAuthClient();
