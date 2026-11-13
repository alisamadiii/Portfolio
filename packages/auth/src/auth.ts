import { expo } from "@better-auth/expo";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import {
  admin,
  emailOTP,
  genericOAuth,
  magicLink,
} from "better-auth/plugins";

import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { db } from "@workspace/drizzle/index";
import { account, session, user, verification } from "@workspace/drizzle/schema";
import { email as emailService } from "@workspace/email";
import MagicLink from "@workspace/email/emails/magic-link";
import ResetPassword from "@workspace/email/emails/reset-password";
import VerifyEmail from "@workspace/email/emails/verify-email";

/** JWT payload without verification (the token came straight from the issuer). */
const decodeJwtPayload = (
  token: string | undefined
): Record<string, unknown> | null => {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

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
      trustedProviders: ["google", "github", "netlify", "resend"],
      allowDifferentEmails: true,
      // Linking an account (Google, GitHub, Netlify, Resend…) never touches
      // the user row: name/image change only from Account settings.
      updateUserInfoOnLink: false,
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
    // Netlify: link-only (hub Integrations), never a sign-in method. The
    // token deploys the user's upload projects to their own Netlify account.
    // Netlify tokens don't expire, so there is no refresh token.
    genericOAuth({
      config: [
        {
          providerId: "netlify",
          clientId: process.env.NETLIFY_CLIENT_ID ?? "",
          clientSecret: process.env.NETLIFY_CLIENT_SECRET ?? "",
          authorizationUrl: "https://app.netlify.com/authorize",
          tokenUrl: "https://api.netlify.com/oauth/token",
          disableSignUp: true,
          getUserInfo: async (tokens) => {
            const res = await fetch("https://api.netlify.com/api/v1/user", {
              headers: { Authorization: `Bearer ${tokens.accessToken}` },
            });
            if (!res.ok) return null;
            const profile = (await res.json()) as {
              id: string;
              email: string;
            };
            // Identity only: the user row is never updated from a link.
            return { id: profile.id, email: profile.email, emailVerified: true };
          },
        },
        // Resend: link-only, OAuth 2.1 + PKCE. Access tokens live 15 minutes;
        // refresh tokens rotate on every use (Better Auth stores the new one).
        // full_access lets the hub read domains/emails and mint API keys.
        {
          providerId: "resend",
          clientId: process.env.RESEND_CLIENT_ID ?? "",
          clientSecret: process.env.RESEND_CLIENT_SECRET ?? "",
          authorizationUrl: "https://api.resend.com/oauth/authorize",
          tokenUrl: "https://api.resend.com/oauth/token",
          scopes: ["full_access"],
          pkce: true,
          // Always show Resend's consent screen: each project links its own team.
          prompt: "consent",
          authentication: "post",
          disableSignUp: true,
          // No userinfo endpoint: identify the grant from the access-token JWT.
          getUserInfo: async (tokens) => {
            const claims = decodeJwtPayload(tokens.accessToken);
            const id = String(claims?.team_id ?? claims?.sub ?? "");
            if (!id) return null;
            const email =
              typeof claims?.email === "string"
                ? claims.email
                : `resend-${id}@users.noreply.alisamadii.com`;
            // Identity only: the user row is never updated from a link.
            return { id, email, emailVerified: true };
          },
        },
      ],
    }),
    nextCookies(),
  ],
});
