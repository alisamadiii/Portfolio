"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";

import { muiTheme } from "./theme";

/**
 * Emotion SSR cache for the App Router + the hub-bridged MUI theme. No
 * CssBaseline — it would fight Tailwind's reset. `enableCssLayer` puts MUI's
 * styles in a lower cascade layer so Tailwind utilities win on conflicts.
 */
export function MuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
