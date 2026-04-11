"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { parseAsString, useQueryState } from "nuqs";

import { Button } from "../components/button";
import { logos, urls } from "../lib/company";

import { authClient } from "@workspace/auth/auth-client";
import { queryClient, useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";

import { SignInForm } from "./auth-sign-in-form";
import { SignUpForm } from "./auth-sign-up-form";
import { VerifyEmail } from "./auth-verify-email";

type AuthView = "sign-in" | "sign-up" | "verify-email";

type AuthDialogProps = {
  children: React.ReactNode;
  defaultView?: "sign-in" | "sign-up";
};

const transition = { duration: 0.2, ease: "easeInOut" as const };

export function AuthDialog({
  children,
  defaultView = "sign-in",
}: AuthDialogProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [mounted, setMounted] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");

  const [authParam, setAuthParam] = useQueryState(
    "auth",
    parseAsString.withDefault("")
  );

  const isOpen = authParam === "sign-in" || authParam === "sign-up" || authParam === "verify-email";
  const view = isOpen ? (authParam as AuthView) : defaultView;

  useEffect(() => {
    setMounted(true);
  }, []);

  const open = useCallback(
    () => setAuthParam(defaultView),
    [setAuthParam, defaultView]
  );

  const close = useCallback(() => setAuthParam(null), [setAuthParam]);

  const setView = useCallback(
    (v: AuthView) => setAuthParam(v),
    [setAuthParam]
  );

  const updateSessionCache = useCallback(async () => {
    const { data, error } = await authClient.getSession();
    if (error || !data) return;

    router.refresh();
    queryClient.setQueryData(trpc.user.getCurrentUser.queryKey(), () => {
      const cached: RouterOutputs["user"]["getCurrentUser"] = {
        session: {
          id: data.session.id,
          createdAt: data.session.createdAt.toISOString(),
          updatedAt: data.session.updatedAt.toISOString(),
          userId: data.session.userId,
          expiresAt: data.session.expiresAt.toISOString(),
          token: data.session.token,
          ipAddress: data.session.ipAddress,
          userAgent: data.session.userAgent,
        },
        user: {
          id: data.user.id,
          createdAt: data.user.createdAt.toISOString(),
          updatedAt: data.user.updatedAt.toISOString(),
          email: data.user.email,
          emailVerified: data.user.emailVerified,
          name: data.user.name,
          image: data.user.image,
          metadata: data.user.metadata,
          phone: data.user.phone,
          company: data.user.company,
          address: data.user.address,
        },
      };
      return cached;
    });
  }, [router, trpc]);

  const handleSignInSuccess = useCallback(async () => {
    await updateSessionCache();
    close();
  }, [updateSessionCache, close]);

  const handleSignUpSuccess = useCallback(
    (email: string) => {
      setSignupEmail(email);
      setView("verify-email");
    },
    [setView]
  );

  const handleVerifySuccess = useCallback(async () => {
    await updateSessionCache();
    close();
  }, [updateSessionCache, close]);

  const forgotPasswordHref = `${urls.portal}/reset-password`;

  const socialRedirectUrl =
    typeof window !== "undefined" ? window.location.href : "/";

  if (!mounted) {
    return (
      <span onClick={open} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && open()}>
        {children}
      </span>
    );
  }

  return (
    <>
      <span onClick={open} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && open()}>
        {children}
      </span>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={transition}
                className="bg-background relative w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={logos.default}
                      alt="Logo"
                      className="size-6 rounded-sm"
                    />
                    <span className="text-sm font-semibold">
                      {view === "sign-in" && "Sign in to continue"}
                      {view === "sign-up" && "Create your account"}
                      {view === "verify-email" && "Verify your email"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={close}
                    className="text-muted-foreground h-auto px-2 py-1 text-xs"
                  >
                    {view === "verify-email" ? "Verify later" : "Cancel"}
                  </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <AnimatePresence mode="wait">
                    {view === "sign-in" && (
                      <motion.div
                        key="sign-in"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={transition}
                      >
                        <SignInForm
                          onSuccess={handleSignInSuccess}
                          onSignUp={() => setView("sign-up")}
                          forgotPasswordHref={forgotPasswordHref}
                          socialRedirectUrl={socialRedirectUrl}
                        />
                      </motion.div>
                    )}

                    {view === "sign-up" && (
                      <motion.div
                        key="sign-up"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={transition}
                      >
                        <SignUpForm
                          onSuccess={handleSignUpSuccess}
                          onSignIn={() => setView("sign-in")}
                          socialRedirectUrl={socialRedirectUrl}
                        />
                      </motion.div>
                    )}

                    {view === "verify-email" && (
                      <motion.div
                        key="verify-email"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={transition}
                      >
                        <VerifyEmail onSuccess={handleVerifySuccess} email={signupEmail} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-3">
                  <p className="text-muted-foreground text-center text-[11px]">
                    Secured by Ali Samadii LLC
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
