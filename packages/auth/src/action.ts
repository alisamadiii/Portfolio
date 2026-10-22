"use server";

import { cookies } from "next/headers";

const logout = async () => {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  // Better Auth session cookie names
  const sessionCookieNames = [
    "__Secure-better-auth.session_token",
    "better-auth.session_token",
  ];

  // Delete all cookies with proper security attributes
  cookieStore.getAll().forEach((cookie) => {
    const isSecureCookie = cookie.name.startsWith("__Secure-");
    const isSessionCookie = sessionCookieNames.includes(cookie.name);

    // Secure cookies MUST use Secure flag in production
    // Regular session cookies in production should also use Secure
    const shouldUseSecure = isSecureCookie || (isProduction && isSessionCookie);

    // Delete cookie by setting it with maxAge 0 and matching security attributes
    // This ensures the cookie is deleted even with strict security settings
    cookieStore.set(cookie.name, "", {
      maxAge: 0, // Expire immediately
      path: "/",
      httpOnly: isSessionCookie || isSecureCookie, // Auth cookies are httpOnly
      secure: shouldUseSecure,
      sameSite: "lax",
    });
  });
};

export { logout };
