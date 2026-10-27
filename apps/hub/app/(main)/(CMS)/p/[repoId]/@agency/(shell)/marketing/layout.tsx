// Marketing sections are now underline tabs under each page's shared header
// (rendered via PageShell's `tabs` slot), not a left sub-sidebar.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
