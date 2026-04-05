/**
 * AliSamadii.LLC — Invoice
 *
 * Layout mirrors the Midday/Mobbin invoice reference:
 * title + meta top-left, logo block top-right, From/To columns,
 * clean line-item table, large grand total, payment details footer.
 *
 * Theme: portfolio brand — primary accent, near-black ink.
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

export interface LineItem {
  description: string;
  quantity: number;
  price: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  from: {
    company: string;
    name: string;
    city: string;
    email: string;
    phone: string;
    website: string;
  };
  to: {
    name: string;
    company: string;
    city: string;
    country: string;
    email: string;
    phone: string;
  };
  items: LineItem[];
  vatRate: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockData: InvoiceData = {
  invoiceNumber: "INV-0001",
  issueDate: "04/01/2026",
  dueDate: "05/01/2026",
  from: {
    company: "AliSamadii.LLC",
    name: "Ali Samadii",
    city: "Portland, OR",
    email: "agency@alisamadii.com",
    phone: "(971) 382-8969",
    website: "agency.alisamadii.com",
  },
  to: {
    name: "John Smith",
    company: "Acme Corp",
    city: "New York, NY",
    country: "United States",
    email: "john@acmecorp.com",
    phone: "+1 212 555 0100",
  },
  items: [
    { description: "Website Design & Development", quantity: 1, price: 3500 },
    { description: "Managed Hosting (12 months)", quantity: 12, price: 45 },
    { description: "Domain Management", quantity: 1, price: 25 },
    { description: "SEO Foundation Setup", quantity: 1, price: 400 },
    { description: "Monthly Maintenance", quantity: 3, price: 150 },
  ],
  vatRate: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
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

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const subtotal = data.items.reduce(
    (sum, it) => sum + it.quantity * it.price,
    0
  );
  const vat = subtotal * (data.vatRate / 100);
  const total = subtotal + vat;

  return (
    <Document title={`Invoice ${data.invoiceNumber} — ${data.from.company}`}>
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
              Invoice
            </H1>
            <View style={{ flexDirection: "row", marginBottom: 4 }}>
              <Small style={{ width: 82, marginBottom: 0, color: "white" }}>
                Invoice No:
              </Small>
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: "Courier-Bold",
                  color: "white",
                }}
              >
                {data.invoiceNumber}
              </Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 4 }}>
              <Small style={{ width: 82, marginBottom: 0, color: "white" }}>
                Issue Date:
              </Small>
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: "Courier-Bold",
                  color: "white",
                }}
              >
                {data.issueDate}
              </Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 4 }}>
              <Small style={{ width: 82, marginBottom: 0, color: "white" }}>
                Due Date:
              </Small>
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: "Courier-Bold",
                  color: "white",
                }}
              >
                {data.dueDate}
              </Text>
            </View>
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

        {/* ── From / To ── */}
        <View
          style={{ flexDirection: "row", paddingTop: 22, marginBottom: 32 }}
        >
          <View style={{ flex: 1 }}>
            <Label style={{ color: colors.primary, marginBottom: 8 }}>
              From
            </Label>
            <H5 style={{ marginBottom: 2 }}>{data.from.name}</H5>
            <Small style={{ marginBottom: 1 }}>{data.from.company}</Small>
            <Small style={{ marginBottom: 1 }}>{data.from.city}</Small>
            <Small style={{ marginBottom: 1 }}>{data.from.email}</Small>
            <Small style={{ marginBottom: 1 }}>{data.from.phone}</Small>
          </View>
          <View style={{ flex: 1 }}>
            <Label style={{ color: colors.primary, marginBottom: 8 }}>To</Label>
            <H5 style={{ marginBottom: 2 }}>{data.to.name}</H5>
            <Small style={{ marginBottom: 1 }}>{data.to.company}</Small>
            <Small style={{ marginBottom: 1 }}>{data.to.city}</Small>
            <Small style={{ marginBottom: 1 }}>{data.to.country}</Small>
            <Small style={{ marginBottom: 1 }}>{data.to.email}</Small>
            <Small style={{ marginBottom: 1 }}>{data.to.phone}</Small>
          </View>
        </View>

        {/* ── Line items ── */}
        <View
          style={{
            flexDirection: "row",
            paddingBottom: 8,
            borderBottom: `0.5px solid ${colors.primary}`,
            marginBottom: 2,
          }}
        >
          <Label style={{ flex: 1, marginBottom: 0 }}>Description</Label>
          <Label style={{ width: 56, textAlign: "center", marginBottom: 0 }}>
            Quantity
          </Label>
          <Label style={{ width: 72, textAlign: "right", marginBottom: 0 }}>
            Price
          </Label>
          <Label style={{ width: 72, textAlign: "right", marginBottom: 0 }}>
            Total
          </Label>
        </View>

        {data.items.map((item, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              paddingVertical: 9,
              borderBottom: `0.5 solid ${colors.border}`,
            }}
          >
            <Body style={{ flex: 1, marginBottom: 0 }}>{item.description}</Body>
            <Caption
              style={{
                width: 56,
                fontFamily: "Courier",
                textAlign: "center",
                marginBottom: 0,
              }}
            >
              {item.quantity}
            </Caption>
            <Caption
              style={{
                width: 72,
                fontFamily: "Courier",
                textAlign: "right",
                marginBottom: 0,
              }}
            >
              {fmt(item.price)}
            </Caption>
            <Text
              style={{
                width: 72,
                textAlign: "right",
                fontSize: 10,
                color: colors.foreground,
                fontFamily: "Courier-Bold",
              }}
            >
              {fmt(item.quantity * item.price)}
            </Text>
          </View>
        ))}

        {/* ── Totals ── */}
        <View style={{ marginTop: 16, alignItems: "flex-end" }}>
          <View style={{ width: 230 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 5,
                borderBottom: `0.5 solid ${colors.border}`,
              }}
            >
              <Small style={{ marginBottom: 0 }}>Subtotal</Small>
              <Small style={{ fontFamily: "Courier", marginBottom: 0 }}>
                {fmt(subtotal)}
              </Small>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 5,
              }}
            >
              <Small style={{ marginBottom: 0 }}>VAT ({data.vatRate}%)</Small>
              <Small style={{ fontFamily: "Courier", marginBottom: 0 }}>
                {fmt(vat)}
              </Small>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              marginTop: 14,
            }}
          >
            <Text
              style={{
                fontSize: 32,
                fontFamily: "Courier-Bold",
                color: colors.primary,
                letterSpacing: -1,
              }}
            >
              {fmt(total)}
            </Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
