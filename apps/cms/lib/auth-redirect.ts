const getSafeRedirect = (redirectTo?: string) => {
  if (!redirectTo) return "/";
  return redirectTo.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : "/";
};

export { getSafeRedirect };
