import { createTheme } from "@mui/material/styles";

/**
 * MUI theme bridged to the hub's design tokens. We hand MUI concrete hex values
 * (it needs real colors for contrast/alpha math — CSS vars would break it) that
 * approximate the hub's oklch tokens. Dark mode follows `next-themes` via the
 * `.dark` class (colorSchemeSelector: "class").
 *
 * Focus/label use the hub PRIMARY (green), not Google blue — Google's structure
 * and motion, the hub's color, so it matches the rest of the app + dark mode.
 */
export const muiTheme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#0f9d76", contrastText: "#ffffff" },
        text: { primary: "#1c1917", secondary: "#78716c" },
        divider: "#e7e5e4",
        background: { paper: "#ffffff", default: "#f5f5f4" },
        error: { main: "#dc2626" },
      },
    },
    dark: {
      palette: {
        primary: { main: "#34d3a6", contrastText: "#0b1a14" },
        text: { primary: "#fafaf9", secondary: "#a8a29e" },
        divider: "rgba(255,255,255,0.14)",
        background: { paper: "#262322", default: "#1c1917" },
        error: { main: "#f87171" },
      },
    },
  },
  shape: { borderRadius: 8 },
  typography: { fontFamily: "inherit" },
  components: {
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small", fullWidth: true },
    },
  },
});
