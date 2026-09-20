import { Metadata } from "next";

// API-only app: no UI. This root layout exists solely so the Next.js App
// Router boots; all traffic is served by the route handlers under app/api.
export const metadata: Metadata = {
  title: "API",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
