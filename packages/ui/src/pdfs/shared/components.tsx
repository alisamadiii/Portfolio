/**
 * Design System Showcase
 *
 * Visual reference of all shared PDF components. Open this draft in the
 * preview UI to see every heading, text style, and layout primitive.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DraftModule } from "../../types/draft";
import {
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Body,
  Small,
  Caption,
  Label,
  Divider,
  DividerBold,
  BulletItem,
  Spacer,
  colors,
} from "./_util";

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.foreground,
    padding: "48 56",
    lineHeight: 1.5,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  swatch: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  swatchItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "30%",
    marginBottom: 6,
  },
  swatchBox: {
    width: 14,
    height: 14,
    borderRadius: 2,
    marginRight: 6,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  swatchLabel: {
    fontFamily: "Helvetica",
    fontSize: 7,
    color: colors.mutedForeground,
  },
  annotation: {
    fontFamily: "Helvetica",
    fontSize: 7,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
});

// ─── Showcase helpers ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
      <Spacer size={8} />
    </View>
  );
}

function Annotated({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={s.annotation}>{label}</Text>
      {children}
    </View>
  );
}

function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  return (
    <View style={s.swatchItem}>
      <View style={[s.swatchBox, { backgroundColor: hex }]} />
      <View>
        <Text style={[s.swatchLabel, { fontFamily: "Helvetica-Bold" }]}>{name}</Text>
        <Text style={s.swatchLabel}>{hex}</Text>
      </View>
    </View>
  );
}

// ─── Document ────────────────────────────────────────────────────────────────

function ShowcaseDocument() {
  return (
    <Document title="Design System — Component Showcase">
      <Page size="A4" style={s.page}>
        <H1 style={{ marginBottom: 4 }}>Design System</H1>
        <H3 style={{ color: colors.mutedForeground, fontFamily: "Helvetica", marginBottom: 24 }}>
          Typography, Colors & Components
        </H3>

        <DividerBold />

        {/* ── Colors ──────────────────────────────────────────────── */}
        <Section title="Colors">
          <View style={s.swatch}>
            <ColorSwatch name="primary" hex={colors.primary} />
            <ColorSwatch name="foreground" hex={colors.foreground} />
            <ColorSwatch name="secondary-fg" hex={colors.secondaryForeground} />
            <ColorSwatch name="muted-fg" hex={colors.mutedForeground} />
            <ColorSwatch name="destructive" hex={colors.destructive} />
            <ColorSwatch name="border" hex={colors.border} />
            <ColorSwatch name="background" hex={colors.background} />
            <ColorSwatch name="secondary" hex={colors.secondary} />
            <ColorSwatch name="ring" hex={colors.ring} />
          </View>
        </Section>

        <Divider />

        {/* ── Headings ────────────────────────────────────────────── */}
        <Section title="Headings">
          <Annotated label="H1 — 28px Bold">
            <H1>Heading One</H1>
          </Annotated>
          <Annotated label="H2 — 22px Bold">
            <H2>Heading Two</H2>
          </Annotated>
          <Annotated label="H3 — 16px Bold">
            <H3>Heading Three</H3>
          </Annotated>
          <Annotated label="H4 — 13px Bold">
            <H4>Heading Four</H4>
          </Annotated>
          <Annotated label="H5 — 11px Bold">
            <H5>Heading Five</H5>
          </Annotated>
          <Annotated label="H6 — 10px Bold">
            <H6>Heading Six</H6>
          </Annotated>
        </Section>

        <Divider />

        {/* ── Body Text ───────────────────────────────────────────── */}
        <Section title="Body Text">
          <Annotated label="Body — 10px Regular">
            <Body>
              This is body text used for standard paragraphs and content blocks.
              It provides comfortable reading at 10px with 1.5 line height.
            </Body>
          </Annotated>
          <Annotated label="Small — 9px Regular">
            <Small>
              Small text for secondary information, footnotes, and supporting details
              that don't need primary visual weight.
            </Small>
          </Annotated>
          <Annotated label="Caption — 8px Regular">
            <Caption>
              Caption text for the smallest annotations, timestamps, and fine print.
            </Caption>
          </Annotated>
        </Section>

        <Divider />

        {/* ── Labels ──────────────────────────────────────────────── */}
        <Section title="Labels">
          <Annotated label="Label — 8px Bold Uppercase">
            <Label>Invoice Number</Label>
          </Annotated>
          <Spacer size={4} />
          <Annotated label="Label used with value">
            <Label>Due Date</Label>
            <Body style={{ marginBottom: 0 }}>March 31, 2024</Body>
          </Annotated>
        </Section>

        <Divider />

        {/* ── Dividers ────────────────────────────────────────────── */}
        <Section title="Dividers">
          <Annotated label="Divider — 0.5px border color">
            <Divider />
          </Annotated>
          <Annotated label="DividerBold — 1.5px foreground color">
            <DividerBold />
          </Annotated>
        </Section>

        {/* ── Bullet List ─────────────────────────────────────────── */}
        <Section title="Bullet List">
          <BulletItem>First item in the list</BulletItem>
          <BulletItem>Second item with more detail</BulletItem>
          <BulletItem>Third item to show spacing</BulletItem>
          <Spacer size={8} />
          <Annotated label="Custom bullet character">
            <BulletItem bullet="—">Dash-style bullet item</BulletItem>
            <BulletItem bullet="→">Arrow-style bullet item</BulletItem>
          </Annotated>
        </Section>

        <Divider />

        {/* ── Spacer ──────────────────────────────────────────────── */}
        <Section title="Spacer">
          <Body style={{ marginBottom: 0 }}>Above spacer (16px default)</Body>
          <Spacer />
          <Body style={{ marginBottom: 0 }}>Below spacer</Body>
        </Section>
      </Page>
    </Document>
  );
}

// ─── Draft export ────────────────────────────────────────────────────────────

const draft: DraftModule<Record<string, never>> = {
  meta: {
    title: "Components",
    description: "Design system showcase — typography, colors, and layout primitives",
  },
  mockData: {},
  Document: ShowcaseDocument,
};

export default draft;
