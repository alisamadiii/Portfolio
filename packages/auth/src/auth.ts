import { expo } from "@better-auth/expo";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP, magicLink } from "better-auth/plugins";

import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { db } from "@workspace/drizzle/index";
import { account, session, user, verification } from "@workspace/drizzle/schema";
import { email as emailService } from "@workspace/email";
import MagicLink from "@workspace/email/emails/magic-link";
import ResetPassword from "@workspace/email/emails/reset-password";
import VerifyEmail from "@workspace/email/emails/verify-email";

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
    nextCookies(),
  ],
});
