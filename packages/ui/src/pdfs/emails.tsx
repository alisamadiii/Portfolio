/**
 * AliSamadii.LLC — Email Activity report
 *
 * Client-facing export of the email log: primary header band with client and
 * period metadata, a summary line, and a paginating table of every email in
 * the selected range. Shares the invoice's visual language (shared/_util).
 */
import {
  ClipPath,
  Defs,
  Document,
  G,
  Page,
  Path,
  Rect,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import { Body, Caption, colors, H1, H5, Label, Small } from "./shared/_util";

// ─── Data types ───────────────────────────────────────────────────────────────

export interface EmailLogsPdfRow {
  date: string; // pre-formatted, e.g. "Apr 12, 2026 3:41 PM"
  subject: string;
  recipient: string;
  kind: string; // "Sent" | "Contact form"
}

export interface EmailLogsData {
  clientName: string;
  company?: string;
  rangeLabel: string; // "Mar 3 – Apr 2, 2026" or "All time"
  generatedAt: string; // "Apr 2, 2026"
  rows: EmailLogsPdfRow[];
}

// ─── Logo SVG (white on primary box) ────────────────────────────────────────

function Logo() {
  return (
    <Svg width={120} height={120} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="lc">
          <Rect width="100" height="100" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#lc)">
        <Path
          d="M70.5869 82.0243H97.8874V100H70.5869V82.0243ZM46.4913 0L34.6717 20.9415H48.0666L29.2434 54.293H58.894L70.5869 33.576V57.6897H13.9329L2.11328 78.6276H15.5081L3.44588 100H33.1L45.1623 78.6276H97.8874V0H46.4913Z"
          fill={colors.primaryForeground}
        />
      </G>
    </Svg>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 4 }}>
      <Small style={{ width: 82, marginBottom: 0, color: "white" }}>
        {label}
      </Small>
      <Text
        style={{ fontSize: 9, fontFamily: "Courier-Bold", color: "white" }}
      >
        {value}
      </Text>
    </View>
  );
}

export function EmailLogsDocument({ data }: { data: EmailLogsData }) {
  return (
    <Document title={`Email Activity — ${data.clientName}`}>
      <Page
        size="A4"
        style={{
          fontFamily: "Helvetica",
          fontSize: 10,
          color: colors.foreground,
          backgroundColor: colors.primary,
          padding: "52 56 60 56",
        }}
      >
        {/* ── Full-page white layer ── */}
        <View
          fixed
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            backgroundColor: colors.background,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 170,
            backgroundColor: colors.primary,
          }}
        />

        {/* ── Top: title/meta + logo ── */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 32,
          }}
        >
          <View>
            <H1
              style={{
                letterSpacing: -0.5,
                textTransform: "uppercase",
                marginBottom: 12,
                color: "white",
              }}
            >
              Email Activity
            </H1>
            <MetaRow label="Client:" value={data.clientName} />
            <MetaRow label="Period:" value={data.rangeLabel} />
            <MetaRow label="Generated:" value={data.generatedAt} />
          </View>

          <View
            style={{
              width: 64,
              height: 64,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Logo />
          </View>
        </View>

        {/* ── Summary ── */}
        <View style={{ paddingTop: 22, marginBottom: 24 }}>
          <H5 style={{ marginBottom: 2 }}>
            {data.rows.length} email{data.rows.length === 1 ? "" : "s"}
          </H5>
          <Small style={{ marginBottom: 0 }}>
            Prepared for {data.clientName}
            {data.company ? ` — ${data.company}` : ""}
          </Small>
        </View>

        {/* ── Table ── */}
        <View
          style={{
            flexDirection: "row",
            paddingBottom: 8,
            borderBottom: `0.5px solid ${colors.primary}`,
            marginBottom: 2,
          }}
        >
          <Label style={{ width: 110, marginBottom: 0 }}>Date</Label>
          <Label style={{ flex: 1, marginBottom: 0 }}>Subject</Label>
          <Label style={{ width: 140, marginBottom: 0 }}>Recipient</Label>
          <Label style={{ width: 70, textAlign: "right", marginBottom: 0 }}>
            Type
          </Label>
        </View>

        {data.rows.map((row, i) => (
          <View
            key={i}
            wrap={false}
            style={{
              flexDirection: "row",
              paddingVertical: 8,
              borderBottom: `0.5 solid ${colors.border}`,
            }}
          >
            <Caption
              style={{ width: 110, fontFamily: "Courier", marginBottom: 0 }}
            >
              {row.date}
            </Caption>
            <Body style={{ flex: 1, paddingRight: 8, marginBottom: 0 }}>
              {row.subject}
            </Body>
            <Caption style={{ width: 140, paddingRight: 8, marginBottom: 0 }}>
              {row.recipient}
            </Caption>
            <Caption
              style={{
                width: 70,
                textAlign: "right",
                color: colors.primary,
                marginBottom: 0,
              }}
            >
              {row.kind}
            </Caption>
          </View>
        ))}

        {/* ── Footer ── */}
        <View
          fixed
          style={{
            position: "absolute",
            bottom: 28,
            left: 56,
            right: 56,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Caption style={{ marginBottom: 0 }}>
            AliSamadii.LLC — agency.alisamadii.com
          </Caption>
          <Text
            style={{ fontSize: 8, color: colors.mutedForeground }}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
