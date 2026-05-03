import { expo } from "@better-auth/expo";
import { stripe } from "@better-auth/stripe";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP, magicLink } from "better-auth/plugins";
import Stripe from "stripe";

import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { db } from "@workspace/drizzle/index";
import {
  account,
  session,
  user,
  verification,
  webhookEvents,
} from "@workspace/drizzle/schema";
import { sendEmail } from "@workspace/email";

import {
  completeCheckout,
  confirmAsyncPayment,
  createProduct,
  createSubscription,
  deleteProduct,
  deleteSubscription,
  failAsyncPayment,
  processRefund,
  updateProduct,
  updateSubscription,
} from "./auth-action";

export const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
  trustedOrigins: ALLOWED_ORIGINS,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      await sendEmail("resetPassword", user.email, {
        resetPasswordLink: `${url}?token=${token}`,
      });
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
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
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
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
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const { error } = await sendEmail("magicLink", email, {
          magicLinkUrl: url,
        });
        if (error) {
          throw new APIError(403, { message: error });
        }
      },
    }),
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in") {
          // Send the OTP for sign in
        } else if (type === "email-verification") {
          const { error } = await sendEmail("verifyEmail", email, {
            verificationCode: otp,
          });

          if (error) {
            throw new APIError(403, { message: error });
          }
        } else {
          // Send the OTP for password reset
        }
      },
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      onEvent: async (event) => {
        // Audit trail
        await db.insert(webhookEvents).values({
          timestamp: new Date(event.created * 1000),
          type: event.type,
          payload: event.data,
        });

        // Sync products
        if (
          event.type === "product.created" ||
          event.type === "product.updated" ||
          event.type === "product.deleted"
        ) {
          const product = event.data.object as Stripe.Product;
          if (event.type === "product.created") {
            await createProduct(product);
          } else if (event.type === "product.updated") {
            await updateProduct(product);
          } else {
            await deleteProduct(product);
          }
        }

        // Orders — one-time purchase lifecycle
        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          await completeCheckout(session);
        }
        if (event.type === "checkout.session.async_payment_succeeded") {
          const session = event.data.object as Stripe.Checkout.Session;
          await confirmAsyncPayment(session);
        }
        if (event.type === "checkout.session.async_payment_failed") {
          const session = event.data.object as Stripe.Checkout.Session;
          await failAsyncPayment(session);
        }

        // Sync subscriptions
        if (
          event.type === "customer.subscription.created" ||
          event.type === "customer.subscription.updated" ||
          event.type === "customer.subscription.deleted"
        ) {
          const sub = event.data.object as Stripe.Subscription;
          if (event.type === "customer.subscription.created") {
            await createSubscription(sub);
          } else if (event.type === "customer.subscription.updated") {
            await updateSubscription(sub);
          } else {
            await deleteSubscription(sub);
          }
        }

        // Refunds → update order status
        if (event.type === "charge.refunded") {
          const charge = event.data.object as Stripe.Charge;
          await processRefund(charge);
        }
      },
    }),
    nextCookies(),
  ],
});
