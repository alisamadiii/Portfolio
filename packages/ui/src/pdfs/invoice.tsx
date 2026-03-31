import {
  ClipPath,
  Defs,
  Document,
  Font,
  G,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
  fonts: [],
});

const SALMON = "#E8805A";
const DARK = "#1A1A1A";
const GRAY_BG = "#F0F0F0";
const GRAY_TEXT = "#555555";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    paddingBottom: 60,
  },

  // ── Header ────────────────────────────────────────────────────────────
  header: {
    backgroundColor: DARK,
    height: 110,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 36,
    overflow: "hidden",
  },
  headerDeco1: {
    position: "absolute",
    top: -20,
    right: 60,
    width: 160,
    height: 160,
    backgroundColor: SALMON,
    borderRadius: 4,
    transform: "rotate(45deg)",
  },
  headerDeco2: {
    position: "absolute",
    top: 20,
    right: 10,
    width: 120,
    height: 120,
    backgroundColor: "#3A2420",
    borderRadius: 4,
    transform: "rotate(45deg)",
  },
  headerLeft: {
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: SALMON,
    letterSpacing: 2,
  },
  headerOrderNumber: {
    fontSize: 11,
    color: "#CCCCCC",
    marginTop: 2,
  },
  headerLogo: {
    zIndex: 1,
    alignItems: "center",
  },
  headerSlogan: {
    fontSize: 7,
    color: "#AAAAAA",
    letterSpacing: 2,
    marginTop: 2,
  },

  // ── Body ──────────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 36,
    paddingTop: 28,
  },

  // ── Parties ───────────────────────────────────────────────────────────
  parties: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  partyBlock: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  partyName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  partyLine: {
    fontSize: 10,
    color: GRAY_TEXT,
    marginTop: 2,
  },
  dateBlock: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  dateLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  dateValue: {
    fontSize: 10,
    color: GRAY_TEXT,
    marginTop: 2,
  },

  // ── Table ─────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    backgroundColor: GRAY_BG,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  thText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: GRAY_TEXT,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tdText: {
    fontSize: 10,
    color: DARK,
  },

  // ── Totals ────────────────────────────────────────────────────────────
  totalsSection: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  paymentInfo: {
    flex: 1,
  },
  paymentInfoLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  paymentInfoLine: {
    fontSize: 9,
    color: GRAY_TEXT,
    marginTop: 2,
  },
  totalsBox: {
    width: 200,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  totalsGrandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: GRAY_BG,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color: GRAY_TEXT,
  },
  totalsValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  grandLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grandValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },

  // ── Footer ────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    right: 36,
    alignItems: "flex-end",
  },
  footerLine: {
    fontSize: 9,
    color: GRAY_TEXT,
    marginTop: 2,
    textAlign: "right",
  },
  footerLineBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginTop: 2,
    textAlign: "right",
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  description: string;
  qty: number;
  price: number;
}

export interface InvoicePDFProps {
  orderNumber: string;
  date: string;

  // Payment To (your business)
  fromName: string;
  fromPhone: string;
  fromAddress: string;

  // Billed To (client)
  toName: string;
  toPhone: string;
  toAddress: string;

  items: InvoiceItem[];

  taxRate: number; // e.g. 0.1 for 10%

  paymentInfo: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };

  contact: {
    phone: string;
    email: string;
    website: string;
  };

  // Optional branding
  companyName?: string;
  slogan?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return `$${value.toFixed(2)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoicePDF({
  orderNumber,
  date,
  fromName,
  fromPhone,
  fromAddress,
  toName,
  toPhone,
  toAddress,
  items,
  taxRate,
  paymentInfo,
  contact,
  companyName = "ALISAMADII",
  slogan = "SLOGAN HERE",
}: InvoicePDFProps) {
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const tax = subtotal * taxRate;
  const grandTotal = subtotal + tax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerDeco1} />
          <View style={styles.headerDeco2} />
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>INVOICE</Text>
            <Text style={styles.headerOrderNumber}>Order # {orderNumber}</Text>
          </View>
          <View style={styles.headerLogo}>
            <Svg width={36} height={36} viewBox="0 0 100 100">
              <Defs>
                <ClipPath id="inv_logo_clip">
                  <Rect width={100} height={100} />
                </ClipPath>
              </Defs>
              <G clipPath="url(#inv_logo_clip)">
                <Path
                  d="M70.5869 82.0243H97.8874V100H70.5869V82.0243ZM46.4913 0L34.6717 20.9415H48.0666L29.2434 54.293H58.894L70.5869 33.576V57.6897H13.9329L2.11328 78.6276H15.5081L3.44588 100H33.1L45.1623 78.6276H97.8874V0H46.4913Z"
                  fill="#FFFFFF"
                />
              </G>
            </Svg>
            <Text style={styles.headerSlogan}>{slogan}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* ── Parties ── */}
          <View style={styles.parties}>
            <View style={styles.partyBlock}>
              <Text style={styles.partyLabel}>Payment To:</Text>
              <Text style={styles.partyName}>{fromName}</Text>
              <Text style={styles.partyLine}>{fromPhone}</Text>
              <Text style={styles.partyLine}>{fromAddress}</Text>
            </View>

            <View style={styles.partyBlock}>
              <Text style={styles.partyLabel}>Billed To:</Text>
              <Text style={styles.partyName}>{toName}</Text>
              <Text style={styles.partyLine}>{toPhone}</Text>
              <Text style={styles.partyLine}>{toAddress}</Text>
            </View>

            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>Date:</Text>
              <Text style={styles.dateValue}>{date}</Text>
            </View>
          </View>

          {/* ── Table ── */}
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, styles.colDesc]}>Description</Text>
            <Text style={[styles.thText, styles.colQty]}>QTY</Text>
            <Text style={[styles.thText, styles.colPrice]}>Price</Text>
            <Text style={[styles.thText, styles.colTotal]}>Total</Text>
          </View>

          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tdText, styles.colDesc]}>
                {item.description}
              </Text>
              <Text style={[styles.tdText, styles.colQty]}>{item.qty}</Text>
              <Text style={[styles.tdText, styles.colPrice]}>
                {fmt(item.price)}
              </Text>
              <Text style={[styles.tdText, styles.colTotal]}>
                {fmt(item.qty * item.price)}
              </Text>
            </View>
          ))}

          {/* ── Totals + Payment Info ── */}
          <View style={styles.totalsSection}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentInfoLabel}>Payment Info:</Text>
              <Text style={styles.paymentInfoLine}>
                {paymentInfo.bankName}
              </Text>
              <Text style={styles.paymentInfoLine}>
                {paymentInfo.accountName}
              </Text>
              <Text style={styles.paymentInfoLine}>
                {paymentInfo.accountNumber}
              </Text>
            </View>

            <View style={styles.totalsBox}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total:</Text>
                <Text style={styles.totalsValue}>{fmt(subtotal)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Tax ({(taxRate * 100).toFixed(0)}%):
                </Text>
                <Text style={styles.totalsValue}>{fmt(tax)}</Text>
              </View>
              <View style={styles.totalsGrandRow}>
                <Text style={styles.grandLabel}>Grand Total:</Text>
                <Text style={styles.grandValue}>{fmt(grandTotal)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerLineBold}>{contact.phone}</Text>
          <Text style={styles.footerLine}>{contact.email}</Text>
          <Text style={styles.footerLine}>{contact.website}</Text>
        </View>
      </Page>
    </Document>
  );
}
