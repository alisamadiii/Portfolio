import { Img, Link, Section, Text } from "@react-email/components";

// Shared header/footer + style constants for all transactional emails.
// Zero-prop components so template prop interfaces stay untouched.

export function EmailHeader() {
  return (
    <Section style={headerSection}>
      <Img
        src="https://cdn.alisamadii.com/company/business-logo-soft-rounded.png"
        width="44"
        height="44"
        alt="Ali Samadii LLC"
        style={{ borderRadius: "10px", display: "block" }}
      />
    </Section>
  );
}

export function EmailFooter() {
  return (
    <Section style={footerSection}>
      <Text style={footerBrand}>Ali Samadii LLC</Text>
      <Text style={footerText}>
        &copy; {new Date().getFullYear()} Ali Samadii LLC. All rights reserved.
      </Text>
      <Text style={footerText}>
        Need help?{" "}
        <Link href="mailto:a@alisamadii.com" style={footerLink}>
          Contact us
        </Link>{" "}
        for assistance. &middot;{" "}
        <Link href="https://www.alisamadii.com/privacy" style={footerLink}>
          Privacy
        </Link>{" "}
        &middot;{" "}
        <Link href="https://www.alisamadii.com/terms" style={footerLink}>
          Terms
        </Link>
      </Text>
    </Section>
  );
}

const headerSection: React.CSSProperties = {
  padding: "0 0 32px",
};

const footerSection: React.CSSProperties = {
  padding: "40px 0 0",
  textAlign: "center",
};

const footerBrand: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "14px",
  fontWeight: 700,
  margin: "0 0 8px",
};

const footerText: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: "0 0 4px",
};

const footerLink: React.CSSProperties = {
  color: "#9ca3af",
  textDecoration: "underline",
};

// ── Shared styles ──────────────────────────────────────────────────

export const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: "32px 16px",
};

export const container: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: "550px",
  padding: "40px 32px",
};

export const heading: React.CSSProperties = {
  color: "#111111",
  fontSize: "26px",
  fontWeight: 700,
  lineHeight: "1.3",
  margin: "0 0 4px",
};

export const subheading: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "22px",
  fontWeight: 400,
  lineHeight: "1.4",
  margin: "0 0 32px",
};

export const paragraph: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "17px",
  lineHeight: "1.6",
  margin: "0 0 20px",
};

export const strong: React.CSSProperties = {
  color: "#111111",
  fontWeight: 700,
};

export const button: React.CSSProperties = {
  backgroundColor: "#fc8464",
  borderRadius: "16px",
  color: "#ffffff",
  display: "block",
  fontSize: "16px",
  fontWeight: 600,
  padding: "16px",
  textAlign: "center",
  textDecoration: "none",
  width: "100%",
};

export const buttonSection: React.CSSProperties = {
  margin: "32px 0",
};

export const hr: React.CSSProperties = {
  borderColor: "#eaeaea",
  margin: "24px 0",
};

export const label: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.04em",
  margin: "16px 0 4px",
  textTransform: "uppercase",
};

export const value: React.CSSProperties = {
  color: "#111111",
  fontSize: "15px",
  lineHeight: "1.5",
  margin: 0,
};

export const mutedText: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 12px",
};

export const codeBox: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #eaeaea",
  borderRadius: "12px",
  margin: "0 0 24px",
  padding: "24px",
  textAlign: "center",
};

export const urlBox: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #eaeaea",
  borderRadius: "8px",
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: 0,
  padding: "12px",
  wordBreak: "break-all",
};

export const textLink: React.CSSProperties = {
  color: "#c2451f",
  textDecoration: "none",
};
