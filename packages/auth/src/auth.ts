import { expo } from "@better-auth/expo";
import { polar, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP, genericOAuth, magicLink } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { db } from "@workspace/drizzle/index";
import {
  account,
  previousCustomers,
  session,
  user,
  verification,
  webhookEvents,
} from "@workspace/drizzle/schema";
import { email as emailService } from "@workspace/email";
import MagicLink from "@workspace/email/emails/magic-link";
import ResetPassword from "@workspace/email/emails/reset-password";
import VerifyEmail from "@workspace/email/emails/verify-email";

import {
  createOrder,
  createProduct,
  createSubscription,
  deleteCustomer,
  revokeSubscriptionOnRefund,
  updateOrder,
  updateProduct,
  updateSubscription,
} from "./auth-action";

// Cloudflare OAuth scopes for the hub Integrations tab: Workers read/write for
// deploys plus zone/DNS write so client domains can be managed programmatically.
// Slugs must match the scopes selected on the OAuth client in the CF dashboard
// (Manage account → OAuth clients).
export const CLOUDFLARE_SCOPES = [
  // Read is needed to LIST workers/pages for the import flow; write to manage.
  "workers-scripts.read",
  "workers-scripts.write",
  // Deploy flow: create/manage Cloudflare Pages projects + deployments.
  // CF's slug is singular "page.write"/"page.read" (not "pages.*").
  "page.read",
  "page.write",
  "zone.read",
  "dns.write",
  // Yields a refresh token so the access token renews past ~1h (the client must
  // also have the Refresh Token grant enabled).
  "offline_access",
];

export const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  // Use 'sandbox' if you're using the Polar Sandbox environment
  // Remember that access tokens, products, etc. are completely separated between environments.
  // Access tokens obtained in Production are for instance not usable in the Sandbox environment.
  server: process.env.POLAR_SERVER as "sandbox" | "production",
});

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      account,
      session,
      verification,
    },
  }),
  trustedOrigins: ALLOWED_ORIGINS,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      await emailService.send({
        to: user.email,
        subject: "Reset your password",
        react: ResetPassword({ resetPasswordLink: `${url}?token=${token}` }),
      });
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github", "cloudflare"],
      allowDifferentEmails: true,
      updateUserInfoOnLink: true,
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      metadata: {
        type: "json",
      },
      phone: {
        type: "string",
      },
      company: {
        type: "string",
      },
      address: {
        type: "string",
      },
      stripeCustomerId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Offline access so Google issues a refresh token — required to read a
      // client's GA4 data server-side long after the consent flow. The
      // analytics.readonly scope is NOT requested here (that would force it on
      // every login); it's asked for only at connect time via linkSocial.
      accessType: "offline",
      prompt: "consent",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain:
        process.env.NODE_ENV === "production" ? "alisamadii.com" : "localhost",
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds (5 minutes)
    },
  },
  plugins: [
    expo(),
    admin(),
    // Custom OAuth providers for the Integrations tab. Cloudflare clients can't
    // request OIDC scopes (openid/profile/email → invalid_scope), so identity
    // comes from the REST API via getUserInfo: /user when the client has the
    // User Details Read scope, else the first /accounts entry. Refresh tokens
    // come from the client's Refresh Token grant, not an offline_access scope.
    genericOAuth({
      config: [
        {
          providerId: "cloudflare",
          clientId: process.env.CLOUDFLARE_OAUTH_CLIENT_ID as string,
          clientSecret: process.env.CLOUDFLARE_OAUTH_CLIENT_SECRET as string,
          authorizationUrl: "https://dash.cloudflare.com/oauth2/auth",
          tokenUrl: "https://dash.cloudflare.com/oauth2/token",
          scopes: CLOUDFLARE_SCOPES,
          pkce: true,
          getUserInfo: async (tokens) => {
            const cfGet = async (path: string) => {
              const res = await fetch(
                `https://api.cloudflare.com/client/v4${path}`,
                { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
              );
              if (!res.ok) return null;
              const data = (await res.json()) as {
                success?: boolean;
                result?: unknown;
              };
              return data.success ? data.result : null;
            };
            const user = (await cfGet("/user")) as {
              id?: string;
              email?: string;
              first_name?: string | null;
              last_name?: string | null;
            } | null;
            if (user?.id) {
              return {
                id: user.id,
                // Better Auth's callback hard-requires an email even for link
                // flows — synthesize a non-routable one when CF withholds it.
                email: user.email ?? `${user.id}@cloudflare.invalid`,
                name:
                  [user.first_name, user.last_name]
                    .filter(Boolean)
                    .join(" ") || (user.email ?? "Cloudflare user"),
                emailVerified: true,
              };
            }
            // No User Details scope — fall back to the granted account, which
            // is stable for the single-account clients this integration serves.
            const accounts = (await cfGet("/accounts?per_page=1")) as
              | { id?: string; name?: string }[]
              | null;
            const account = accounts?.[0];
            if (!account?.id) return null;
            return {
              id: account.id,
              email: `${account.id}@cloudflare.invalid`,
              name: account.name ?? "Cloudflare account",
              emailVerified: true,
            };
          },
        },
      ],
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const { error: sendError } = await emailService.send({
          to: email,
          subject: "Sign in to your account",
          react: MagicLink({ magicLinkUrl: url }),
        });
        if (sendError) {
          throw new APIError(403, { message: sendError });
        }
      },
    }),
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in") {
          // Send the OTP for sign in
        } else if (type === "email-verification") {
          const { error: sendError } = await emailService.send({
            to: email,
            subject: "Verify your email",
            react: VerifyEmail({ verificationCode: otp }),
          });

          if (sendError) {
            throw new APIError(403, { message: sendError });
          }
        } else {
          // Send the OTP for password reset
        }
      },
    }),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        portal(),
        usage(),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET!,
          onPayload: async (payload) => {
            await db.insert(webhookEvents).values({
              timestamp: payload.timestamp,
              type: payload.type,
              payload: payload.data,
            });

            if (payload.type === "order.updated") {
              await updateOrder(payload.data);
            }
          },
          onProductCreated: async ({ data }) => {
            await createProduct(data);
          },
          onProductUpdated: async ({ data }) => {
            await updateProduct(data);
          },
          onOrderCreated: async ({ data }) => {
            await createOrder(data);
            await db
              .delete(previousCustomers)
              .where(eq(previousCustomers.email, data.customer.email ?? ""));
          },
          onOrderRefunded: async ({ data }) => {
            await updateOrder(data);
            await revokeSubscriptionOnRefund(data.subscriptionId ?? "");
          },
          // onCustomerDeleted: async ({ data }) => {
          //   await deleteCustomer(data);
          // },
          onSubscriptionCreated: async ({ data }) => {
            await createSubscription(data);
          },
          onSubscriptionUpdated: async ({ data }) => {
            await updateSubscription(data);
          },
        }),
      ],
    }),
    nextCookies(),
  ],
});
