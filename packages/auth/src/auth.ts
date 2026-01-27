import { expo } from "@better-auth/expo";
import { polar, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP } from "better-auth/plugins";

import { db } from "@workspace/drizzle/index";
import {
  account,
  session,
  user,
  verification,
  webhookEvents,
} from "@workspace/drizzle/schema";
import { sendResetPassword, sendVerifyEmail } from "@workspace/email";

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

export const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  // Use 'sandbox' if you're using the Polar Sandbox environment
  // Remember that access tokens, products, etc. are completely separated between environments.
  // Access tokens obtained in Production are for instance not usable in the Sandbox environment.
  server: process.env.POLAR_SERVER as "sandbox" | "production",
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      account,
      session,
      verification,
    },
  }),
  trustedOrigins: [
    // Add your app scheme for deep linking (e.g., "my-expo-app://")
    "my-expo-app://",
    // Development mode - Expo's exp:// scheme
    ...(process.env.NODE_ENV === "development" ? ["exp://", "exp://**"] : []),
  ],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      await sendResetPassword({
        email: user.email,
        resetPasswordLink: `${url}?token=${token}`,
      });
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
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
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain:
        process.env.NODE_ENV === "production"
          ? process.env.NEXT_PUBLIC_DOMAIN
          : "localhost",
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds (5 minutes)
      refreshCache: {
        updateAge: 60, // Refresh when 60 seconds remain before expiry
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async () => {
          // if (process.env.RESEND_AUDIENCE_GENERAL_ID) {
          //   await createAudience({
          //     email: user.email,
          //     firstName: user.name,
          //     unsubscribed: false,
          //     audienceId: process.env.RESEND_AUDIENCE_GENERAL_ID as string,
          //   });
          // }
        },
      },
    },
  },
  plugins: [
    expo(),
    admin(),
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in") {
          // Send the OTP for sign in
        } else if (type === "email-verification") {
          const { error } = await sendVerifyEmail({ email, otp });

          if (error) {
            throw new APIError(403, { message: error });
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
          },
          onOrderRefunded: async ({ data }) => {
            await updateOrder(data);
            await revokeSubscriptionOnRefund(data.subscriptionId ?? "");
          },
          onCustomerDeleted: async ({ data }) => {
            await deleteCustomer(data);
          },
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
