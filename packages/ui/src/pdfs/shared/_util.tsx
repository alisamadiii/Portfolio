/**
 * Shared PDF Design System
 *
 * Color tokens, typography components, and layout primitives for consistent
 * PDF design across all clients. Import from '../shared/_util' in any draft.
 */
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";

// ─── Color Tokens ────────────────────────────────────────────────────────────

export const colors = {
  background: "#ffffff",
  foreground: "#161616",
  card: "#ffffff",
  cardForeground: "#161616",
  popover: "#ffffff",
  popoverForeground: "#161616",
  primary: "#FC8464",
  primaryForeground: "#fcfcfc",
  secondary: "#f2f2f2",
  secondaryForeground: "#2b2b2b",
  muted: "#f2f2f2",
  mutedForeground: "#808080",
  accent: "#f2f2f2",
  accentForeground: "#2b2b2b",
  destructive: "#c95748",
  border: "#e5e5e5",
  input: "#e5e5e5",
  ring: "#ababab",
};

// ─── Style Props ─────────────────────────────────────────────────────────────

type Style = Parameters<typeof StyleSheet.create>[0][string];

interface TypographyProps {
  children: ReactNode;
  style?: Style | Style[];
}

interface DividerProps {
  style?: Style | Style[];
}

interface SpacerProps {
  size?: number;
  style?: Style | Style[];
}

interface BulletItemProps {
  children: ReactNode;
  bullet?: string;
  style?: Style | Style[];
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  h1: {
    fontFamily: "Helvetica-Bold",
    fontSize: 28,
    color: colors.foreground,
    marginBottom: 16,
    lineHeight: 1.2,
  },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: colors.foreground,
    marginBottom: 14,
    lineHeight: 1.25,
  },
  h3: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 12,
    lineHeight: 1.3,
  },
  h4: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: colors.foreground,
    marginBottom: 10,
    lineHeight: 1.35,
  },
  h5: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: colors.secondaryForeground,
    marginBottom: 8,
    lineHeight: 1.4,
  },
  h6: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: colors.mutedForeground,
    marginBottom: 6,
    lineHeight: 1.4,
  },
  body: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.foreground,
    marginBottom: 8,
    lineHeight: 1.5,
  },
  small: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.secondaryForeground,
    marginBottom: 6,
    lineHeight: 1.5,
  },
  caption: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: colors.mutedForeground,
    marginBottom: 4,
    lineHeight: 1.4,
  },
  label: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    marginVertical: 16,
  },
  dividerBold: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.foreground,
    marginVertical: 16,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bulletChar: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.foreground,
    width: 14,
  },
  bulletText: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.foreground,
    flex: 1,
    lineHeight: 1.5,
  },
});

// ─── Typography Components ───────────────────────────────────────────────────

export function H1({ children, style }: TypographyProps) {
  return <Text style={style ? [s.h1, style].flat() : s.h1}>{children}</Text>;
}

export function H2({ children, style }: TypographyProps) {
  return <Text style={style ? [s.h2, style].flat() : s.h2}>{children}</Text>;
}

export function H3({ children, style }: TypographyProps) {
  return <Text style={style ? [s.h3, style].flat() : s.h3}>{children}</Text>;
}

export function H4({ children, style }: TypographyProps) {
  return <Text style={style ? [s.h4, style].flat() : s.h4}>{children}</Text>;
}

export function H5({ children, style }: TypographyProps) {
  return <Text style={style ? [s.h5, style].flat() : s.h5}>{children}</Text>;
}

export function H6({ children, style }: TypographyProps) {
  return <Text style={style ? [s.h6, style].flat() : s.h6}>{children}</Text>;
}

export function Body({ children, style }: TypographyProps) {
  return (
    <Text style={style ? [s.body, style].flat() : s.body}>{children}</Text>
  );
}

export function Small({ children, style }: TypographyProps) {
  return (
    <Text style={style ? [s.small, style].flat() : s.small}>{children}</Text>
  );
}

export function Caption({ children, style }: TypographyProps) {
  return (
    <Text style={style ? [s.caption, style].flat() : s.caption}>
      {children}
    </Text>
  );
}

export function Label({ children, style }: TypographyProps) {
  return (
    <Text style={style ? [s.label, style].flat() : s.label}>{children}</Text>
  );
}

// ─── Layout Components ───────────────────────────────────────────────────────

export function Divider({ style }: DividerProps) {
  return <View style={style ? [s.divider, style].flat() : s.divider} />;
}

export function DividerBold({ style }: DividerProps) {
  return <View style={style ? [s.dividerBold, style].flat() : s.dividerBold} />;
}

export function BulletItem({
  children,
  bullet = "\u2022",
  style,
}: BulletItemProps) {
  return (
    <View style={style ? [s.bulletRow, style].flat() : s.bulletRow}>
      <Text style={s.bulletChar}>{bullet}</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

export function Spacer({ size = 16, style }: SpacerProps) {
  return (
    <View
      style={
        style ? [{ marginBottom: size }, style].flat() : { marginBottom: size }
      }
    />
  );
}

// ─── Base Styles (for direct StyleSheet access) ──────────────────────────────

export const baseStyles = s;
