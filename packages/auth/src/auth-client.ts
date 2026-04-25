import { stripeClient } from "@better-auth/stripe/client";
import {
  adminClient,
  emailOTPClient,
  inferAdditionalFields,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  plugins: [
    adminClient(),
    inferAdditionalFields<typeof auth>(),
    emailOTPClient(),
    magicLinkClient(),
    stripeClient({ subscription: true }),
  ],
});
